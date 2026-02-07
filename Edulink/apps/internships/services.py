import logging
from uuid import UUID
from django.db import transaction
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

from edulink.apps.students.queries import get_student_for_user
from edulink.shared.pusher_utils import trigger_pusher_event
from .models import InternshipOpportunity, InternshipApplication, OpportunityStatus, ApplicationStatus, InternshipEvidence, Incident
from .workflows import opportunity_workflow, application_workflow
from .policies import (
    can_create_internship, 
    can_submit_evidence, 
    can_review_evidence, 
    can_flag_misconduct,
    can_submit_final_feedback,
    can_assign_supervisor,
    can_bulk_assign_supervisors
)

@transaction.atomic
def _trigger_application_update_pusher(application: InternshipApplication, status_label: str):
    """Trigger real-time notification for student application update."""
    try:
        from edulink.apps.students.queries import get_student_by_id
        student = get_student_by_id(str(application.student_id))
        if not student:
             return
        
        trigger_pusher_event(
            channel=f"user-{student.user_id}",
            event_name="application-status-updated",
            data={
                "application_id": str(application.id),
                "opportunity_title": application.opportunity.title,
                "status": status_label,
                "status_code": application.status
            }
        )
    except Exception as e:
        logger.error(f"Failed to trigger Pusher for application update: {e}")

def propagate_student_institution_to_applications(*, student_id: UUID, institution_id: UUID) -> int:
    """
    Update all active internship applications for a student with their institution.
    Called when a student's institution affiliation is approved.
    """
    # Filter applications that might need updating (active ones)
    # Note: We can't filter by snapshot content easily in all DBs, so we fetch and check
    applications = InternshipApplication.objects.filter(
        student_id=student_id,
        status__in=[
            ApplicationStatus.APPLIED,
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.ACCEPTED,
            ApplicationStatus.ACTIVE
        ]
    )
    
    updated_count = 0
    for app in applications:
        # Check if institution_id is already set in snapshot
        snapshot = app.application_snapshot or {}
        # Only update if missing or different (though usually it's missing if we are here)
        current_inst_id = snapshot.get('institution_id')
        
        if not current_inst_id or str(current_inst_id) != str(institution_id):
            snapshot['institution_id'] = str(institution_id)
            app.application_snapshot = snapshot
            app.save(update_fields=['application_snapshot'])
            updated_count += 1
            
    return updated_count


def create_internship_opportunity(
    title: str, 
    description: str, 
    institution_id: UUID, 
    employer_id: UUID,
    department: str = "",
    skills: list = None,
    capacity: int = 1,
    location: str = "",
    location_type: str = InternshipOpportunity.LOCATION_ONSITE,
    start_date=None,
    end_date=None,
    duration: str = "",
    application_deadline=None,
    is_institution_restricted: bool = False
) -> InternshipOpportunity:
    """
    Creates a new Internship Opportunity in DRAFT state.
    Institution Admins or Employer Admins can do this.
    """
    if not can_create_internship(actor, institution_id, employer_id):
        raise PermissionError("User not authorized to create internship")
    
    if skills is None:
        skills = []

    opportunity = InternshipOpportunity.objects.create(
        title=title,
        description=description,
        department=department,
        skills=skills,
        capacity=capacity,
        location=location,
        location_type=location_type,
        institution_id=institution_id,
        employer_id=employer_id,
        status=OpportunityStatus.DRAFT,
        start_date=start_date,
        end_date=end_date,
        duration=duration,
        application_deadline=application_deadline,
        is_institution_restricted=is_institution_restricted
    )
    
    # Record creation event manually since it's not a transition
    from edulink.apps.ledger.services import record_event
    record_event(
        event_type="OPPORTUNITY_CREATED",
        actor_id=actor.id,
        entity_id=opportunity.id,
        entity_type="internship_opportunity",
        payload={"title": title}
    )
    
    return opportunity

def publish_internship(actor, opportunity_id: UUID) -> InternshipOpportunity:
    """
    Transitions DRAFT -> OPEN.
    """
    opportunity = InternshipOpportunity.objects.get(id=opportunity_id)
    return opportunity_workflow.transition(
        opportunity=opportunity, 
        target_state=OpportunityStatus.OPEN, 
        actor=actor
    )

def apply_for_internship(actor, opportunity_id: UUID, cover_letter: str = "") -> InternshipApplication:
    """
    Student applies for an OPEN opportunity.
    Creates a new InternshipApplication instance in APPLIED state.
    """
    if not actor.is_student:
        raise PermissionError("Only students can apply")
    
    student = get_student_for_user(str(actor.id))
    if not student:
        from edulink.apps.students.services import preregister_student
        student = preregister_student(user_id=actor.id, email=actor.email)
    
    if not student:
        raise ValueError("Student profile could not be initialized")
        
    # Check for CV
    if not student.cv:
        raise ValueError("You must upload a CV to your profile before applying.")

    opportunity = InternshipOpportunity.objects.get(id=opportunity_id)
    if opportunity.status != OpportunityStatus.OPEN:
        raise ValueError("Internship opportunity is not open")
        
    # Check application deadline
    if opportunity.application_deadline and timezone.now() > opportunity.application_deadline:
        raise ValueError("The application deadline for this opportunity has passed.")
        
    # Check duplicate application
    if InternshipApplication.objects.filter(opportunity=opportunity, student_id=student.id).exists():
        raise ValueError("You have already applied to this internship.")

    # Check for overlapping engagements (Double Booking Prevention)
    if InternshipApplication.objects.filter(
        student_id=student.id,
        status__in=[ApplicationStatus.ACCEPTED, ApplicationStatus.ACTIVE]
    ).exists():
        raise ValueError("You already have an active or accepted internship.")

    # Check institution restriction
    if opportunity.is_institution_restricted:
        if not student.institution_id or str(opportunity.institution_id) != str(student.institution_id):
            raise PermissionError("This internship is restricted to students from the hosting institution.")
        
    # Create snapshot of student profile
    snapshot = {
        "student_id": str(student.id),
        "email": student.email,
        "registration_number": student.registration_number,
        "course_of_study": student.course_of_study,
        "current_year": student.current_year,
        "skills": student.skills,
        "cv": str(student.cv) if student.cv else None,
        "institution_id": str(student.institution_id) if student.institution_id else None
    }
    
    with transaction.atomic():
        application = InternshipApplication.objects.create(
            opportunity=opportunity,
            student_id=student.id,
            status=ApplicationStatus.APPLIED,
            application_snapshot=snapshot,
            cover_letter=cover_letter
        )
        
        # Record event
        from edulink.apps.ledger.services import record_event
        record_event(
            event_type="INTERNSHIP_APPLIED",
            actor_id=actor.id,
            entity_id=application.id,
            entity_type="internship_application",
            payload={
                "opportunity_id": str(opportunity.id),
                "title": opportunity.title,
                "snapshot_summary": {
                    "has_cv": bool(student.cv),
                    "skills_count": len(student.skills)
                },
                "has_cover_letter": bool(cover_letter)
            }
        )
        
        # Send notification
        from edulink.apps.notifications.services import send_internship_application_submitted_notification
        
        employer_name = "the employer"
        if opportunity.employer_id:
             from edulink.apps.employers.queries import get_employer_by_id
             emp = get_employer_by_id(opportunity.employer_id)
             if emp: employer_name = emp.name
        elif opportunity.institution_id:
             from edulink.apps.institutions.queries import get_institution_by_id
             inst = get_institution_by_id(opportunity.institution_id)
             if inst: employer_name = inst.name
             
        send_internship_application_submitted_notification(
            application_id=str(application.id),
            student_id=str(student.id),
            opportunity_title=opportunity.title,
            employer_name=employer_name,
            actor_id=str(actor.id)
        )
        
    return application

def submit_evidence(actor, application_id: UUID, title: str, file: any, description: str = "", evidence_type: str = InternshipEvidence.TYPE_OTHER, metadata: dict = None) -> InternshipEvidence:
    application = InternshipApplication.objects.get(id=application_id)
    if not can_submit_evidence(actor, application):
        raise PermissionError("User not authorized to submit evidence")
    
    if metadata is None:
        metadata = {}
        
    evidence = InternshipEvidence.objects.create(
        application=application,
        submitted_by=actor.id,
        title=title,
        description=description,
        file=file,
        evidence_type=evidence_type,
        metadata=metadata,
        status=InternshipEvidence.STATUS_SUBMITTED
    )
    
    from edulink.apps.ledger.services import record_event
    record_event(
        event_type="EVIDENCE_SUBMITTED",
        actor_id=actor.id,
        entity_id=evidence.id,
        entity_type="evidence",
        payload={"application_id": str(application.id), "title": title, "type": evidence_type}
    )
    
    # Recalculate Student Trust Tier (Points for submission)
    from edulink.apps.trust.services import compute_student_trust_tier
    compute_student_trust_tier(student_id=str(application.student_id))
    
    # Send notification
    supervisor_ids = []
    if application.employer_supervisor_id:
        supervisor_ids.append(str(application.employer_supervisor_id))
    if application.institution_supervisor_id:
        supervisor_ids.append(str(application.institution_supervisor_id))
    
    if supervisor_ids:
        from edulink.apps.notifications.services import send_evidence_submitted_notification
        student_name = actor.get_full_name() or actor.username
        
        send_evidence_submitted_notification(
            evidence_id=str(evidence.id),
            supervisor_ids=supervisor_ids,
            student_name=student_name,
            evidence_title=title,
            actor_id=str(actor.id)
        )
    
    return evidence

def create_incident(actor, application_id: UUID, title: str, description: str) -> Incident:
    application = InternshipApplication.objects.get(id=application_id)
    
    if not can_flag_misconduct(actor, application):
        raise PermissionError("User not authorized to report incidents")
        
    incident = Incident.objects.create(
        application=application,
        reported_by=actor.id,
        title=title,
        description=description,
        status=Incident.STATUS_OPEN
    )
    
    from edulink.apps.ledger.services import record_event
    record_event(
        event_type="INCIDENT_REPORTED",
        actor_id=actor.id,
        entity_id=incident.id,
        entity_type="incident",
        payload={"application_id": str(application.id), "title": title}
    )
    
    # Send notification to supervisors
    recipient_ids = []
    if application.employer_supervisor_id:
        recipient_ids.append(str(application.employer_supervisor_id))
    if application.institution_supervisor_id:
        recipient_ids.append(str(application.institution_supervisor_id))
        
    if recipient_ids:
        from edulink.apps.notifications.services import send_incident_reported_notification
        reporter_name = actor.get_full_name() or actor.username
        
        send_incident_reported_notification(
            incident_id=str(incident.id),
            recipient_ids=recipient_ids,
            title=title,
            reporter_name=reporter_name,
            actor_id=str(actor.id)
        )
        
    return incident

def resolve_incident(actor, incident_id: UUID, status: str, notes: str) -> Incident:
    from django.utils import timezone
    incident = Incident.objects.get(id=incident_id)
    
    if not (actor.is_employer_admin or actor.is_institution_admin):
         raise PermissionError("User not authorized to resolve incidents")
    
    incident.status = status
    incident.resolution_notes = notes
    incident.resolved_by = actor.id
    incident.resolved_at = timezone.now()
    incident.save()
    
    from edulink.apps.ledger.services import record_event
    record_event(
        event_type="INCIDENT_RESOLVED",
        actor_id=actor.id,
        entity_id=incident.id,
        entity_type="incident",
        payload={"application_id": str(incident.application.id), "status": status}
    )

    # Send Notification
    from edulink.apps.notifications.services import send_incident_resolved_notification
    send_incident_resolved_notification(
        incident_id=str(incident.id),
        recipient_id=str(incident.reported_by),
        incident_title=incident.title,
        resolution_notes=notes,
        actor_id=str(actor.id)
    )

    return incident

def submit_final_feedback(actor, application_id: UUID, feedback: str, rating: int = None) -> InternshipApplication:
    """
    Submits final feedback and rating for an internship application.
    """
    application = InternshipApplication.objects.get(id=application_id)
    
    if not can_submit_final_feedback(actor, application):
        raise PermissionError("User not authorized to submit final feedback")

    application.final_feedback = feedback
    if rating:
        application.final_rating = rating
    application.save()
    
    from edulink.apps.ledger.services import record_event
    record_event(
        event_type="FINAL_FEEDBACK_SUBMITTED",
        actor_id=actor.id,
        entity_id=application.id,
        entity_type="internship_application",
        payload={
            "has_rating": bool(rating),
            "rating": rating,
            "feedback_length": len(feedback)
        }
    )

    # Send notification
    from edulink.apps.notifications.services import send_internship_final_feedback_submitted_notification
    
    employer_name = "the employer"
    if application.opportunity.employer_id:
            from edulink.apps.employers.queries import get_employer_by_id
            emp = get_employer_by_id(application.opportunity.employer_id)
            if emp: employer_name = emp.name
    elif application.opportunity.institution_id:
            from edulink.apps.institutions.queries import get_institution_by_id
            inst = get_institution_by_id(application.opportunity.institution_id)
            if inst: employer_name = inst.name

    send_internship_final_feedback_submitted_notification(
        application_id=str(application.id),
        student_id=str(application.student_id),
        opportunity_title=application.opportunity.title,
        employer_name=employer_name,
        feedback=feedback,
        rating=rating,
        actor_id=str(actor.id)
    )

    return application

def create_success_story(
    actor, 
    application_id: UUID, 
    student_testimonial: str, 
    employer_feedback: str = ""
) -> 'SuccessStory':
    """
    Create a success story for a completed internship.
    """
    application = InternshipApplication.objects.get(id=application_id)
    
    # Only allow if internship is COMPLETED or CERTIFIED
    if application.status not in [ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED]:
        raise ValueError("Internship must be completed or certified to add a success story.")
        
    # Check if story already exists
    if hasattr(application, 'success_story'):
        raise ValueError("Success story already exists for this internship.")
        
    from .models import SuccessStory
    story = SuccessStory.objects.create(
        application=application,
        student_testimonial=student_testimonial,
        employer_feedback=employer_feedback,
        is_published=False
    )
    
    from edulink.apps.ledger.services import record_event
    record_event(
        event_type="SUCCESS_STORY_CREATED",
        actor_id=actor.id,
        entity_id=story.id,
        entity_type="success_story",
        payload={
            "application_id": str(application.id),
            "student_id": str(application.student_id)
        }
    )
    
    return story

def assign_supervisors(actor, application_id: UUID, supervisor_id: UUID, type: str) -> InternshipApplication:
    application = InternshipApplication.objects.get(id=application_id)
    
    if application.status in [ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED, ApplicationStatus.TERMINATED]:
        raise ValueError("Cannot assign supervisors to a completed or certified internship")
        
    if not can_assign_supervisor(actor, application.opportunity):
         raise PermissionError("User not authorized to assign supervisors")

    if type == 'employer':
        application.employer_supervisor_id = supervisor_id
    elif type == 'institution':
        application.institution_supervisor_id = supervisor_id
    
    application.save()
    
    from edulink.apps.ledger.services import record_event
    record_event(
        event_type="SUPERVISOR_ASSIGNED",
        actor_id=actor.id,
        entity_id=application.id,
        entity_type="internship_application",
        payload={"supervisor_id": str(supervisor_id), "type": type}
    )
    
    # Send Notification
    from edulink.apps.notifications.services import send_supervisor_assigned_notification
    from edulink.apps.students.queries import get_student_by_id
    
    student = get_student_by_id(application.student_id)
    student_name = student.user.get_full_name() or student.user.username if student else "Student"
    
    employer_name = ""
    if application.opportunity.employer_id:
        from edulink.apps.employers.queries import get_employer_by_id
        emp = get_employer_by_id(application.opportunity.employer_id)
        if emp: employer_name = emp.name
        
    send_supervisor_assigned_notification(
        supervisor_id=str(supervisor_id),
        student_name=student_name,
        opportunity_title=application.opportunity.title,
        role_type=type,
        assigned_by_name=actor.get_full_name() or actor.username,
        employer_name=employer_name,
        application_id=str(application.id),
        actor_id=str(actor.id)
    )
    
    return application

def bulk_assign_institution_supervisors(
    *,
    actor,
    institution_id: UUID,
    department_id: UUID,
    cohort_id: UUID = None
) -> dict:
    """
    Assign unassigned internship applications to supervisors in bulk
    for a specific department and cohort.
    """
    # 1. Permission check
    if not can_bulk_assign_supervisors(actor):
        raise PermissionError("Only institution admins can perform bulk assignment")
    
    # 2. Get department/cohort names
    from edulink.apps.institutions.queries import get_department_by_id, get_cohort_by_id, get_supervisors_by_affiliation
    
    try:
        dept = get_department_by_id(department_id=department_id)
    except Exception as e:
        logger.error(f"Failed to get department {department_id}: {e}")
        raise ValueError("Department not found")
        
    cohort_name = ""
    if cohort_id:
        try:
            coh = get_cohort_by_id(cohort_id=cohort_id)
            cohort_name = coh.name
        except Exception as e:
            logger.error(f"Failed to get cohort {cohort_id}: {e}")
            raise ValueError("Cohort not found")
        
    # 3. Get students in this affiliation
    from edulink.apps.students.queries import get_verified_student_ids_by_affiliation
    student_ids = get_verified_student_ids_by_affiliation(
        institution_id=institution_id,
        department_id=department_id,
        cohort_id=cohort_id
    )
    
    if not student_ids:
        return {"assigned_count": 0, "message": "No students found for this department/cohort."}
    
    # 4. Find applications without supervisor
    # Include all applications for these students, regardless of who posted the opportunity
    applications = InternshipApplication.objects.filter(
        student_id__in=student_ids,
        institution_supervisor_id__isnull=True,
        status__in=[ApplicationStatus.SHORTLISTED, ApplicationStatus.ACCEPTED, ApplicationStatus.ACTIVE]
    )
    
    if not applications.exists():
        return {"assigned_count": 0, "message": "No unassigned applications found for this department/cohort."}

    # 5. Find available supervisors
    supervisors = list(get_supervisors_by_affiliation(
        institution_id=institution_id,
        department_name=dept.name,
        cohort_name=cohort_name
    ))
    
    if not supervisors:
        raise ValueError(f"No supervisors found for department '{dept.name}'" + (f" and cohort '{cohort_name}'" if cohort_name else ""))

    # 6. Assign (Round-Robin)
    from edulink.apps.notifications.services import send_supervisor_assigned_notification
    from edulink.apps.students.queries import get_student_by_id
    
    assigned_count = 0
    with transaction.atomic():
        for i, app in enumerate(applications):
            supervisor = supervisors[i % len(supervisors)]
            app.institution_supervisor_id = supervisor.id
            app.save()
            
            # Record event
            from edulink.apps.ledger.services import record_event
            record_event(
                event_type="SUPERVISOR_ASSIGNED",
                actor_id=actor.id,
                entity_id=app.id,
                entity_type="internship_application",
                payload={"supervisor_id": str(supervisor.id), "type": "institution", "bulk": True}
            )
            
            # Send Notification
            student = get_student_by_id(app.student_id)
            student_name = student.user.get_full_name() or student.user.username if student else "Student"
            
            employer_name = ""
            if app.opportunity.employer_id:
                from edulink.apps.employers.queries import get_employer_by_id
                emp = get_employer_by_id(app.opportunity.employer_id)
                if emp: employer_name = emp.name
            
            try:
                send_supervisor_assigned_notification(
                    supervisor_id=str(supervisor.id),
                    student_name=student_name,
                    opportunity_title=app.opportunity.title,
                    role_type="institution",
                    assigned_by_name=actor.get_full_name() or actor.username,
                    employer_name=employer_name,
                    application_id=str(app.id),
                    actor_id=str(actor.id)
                )
            except Exception:
                # Don't fail bulk assignment if notification fails
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send supervisor assignment notification to supervisor {supervisor.id} for application {app.id}", exc_info=True)
                pass
                
            assigned_count += 1
            
    return {
        "assigned_count": assigned_count, 
        "supervisor_count": len(supervisors),
        "message": f"Successfully assigned {assigned_count} students to {len(supervisors)} supervisors."
    }

def review_evidence(actor, evidence_id: UUID, status: str, notes: str = "", private_notes: str = "") -> InternshipEvidence:
    from django.utils import timezone
    evidence = InternshipEvidence.objects.get(id=evidence_id)
    application = evidence.application
    
    if not can_review_evidence(actor, application):
        raise PermissionError("User not authorized to review evidence")
        
    valid_statuses = [
        InternshipEvidence.STATUS_ACCEPTED, 
        InternshipEvidence.STATUS_REJECTED, 
        InternshipEvidence.STATUS_REVIEWED,
        InternshipEvidence.STATUS_REVISION_REQUIRED
    ]
    if status not in valid_statuses:
        raise ValueError("Invalid evidence status")
        
    # Determine which supervisor is reviewing
    is_employer_supervisor = str(application.employer_supervisor_id) == str(actor.id)
    is_institution_supervisor = str(application.institution_supervisor_id) == str(actor.id)
    
    # Fallback for admins who are not supervisors but have review permission
    if not is_employer_supervisor and not is_institution_supervisor:
        # If it's an institution admin, act as institution supervisor
        if actor.is_institution_admin:
            is_institution_supervisor = True
        # If it's an employer admin, act as employer supervisor
        elif actor.is_employer_admin:
            is_employer_supervisor = True

    if is_employer_supervisor:
        evidence.employer_review_status = status
        evidence.employer_reviewed_by = actor.id
        evidence.employer_reviewed_at = timezone.now()
        evidence.employer_review_notes = notes
        evidence.employer_private_notes = private_notes
    
    if is_institution_supervisor:
        evidence.institution_review_status = status
        evidence.institution_reviewed_by = actor.id
        evidence.institution_reviewed_at = timezone.now()
        evidence.institution_review_notes = notes
        evidence.institution_private_notes = private_notes

    # Calculate Aggregate Status
    emp_status = evidence.employer_review_status
    inst_status = evidence.institution_review_status
    has_employer = bool(application.employer_supervisor_id) or bool(application.opportunity.employer_id)
    has_institution = bool(application.institution_supervisor_id) or bool(application.opportunity.institution_id)

    # 1. Any REJECTED -> REJECTED (Immediate failure)
    if emp_status == InternshipEvidence.STATUS_REJECTED or inst_status == InternshipEvidence.STATUS_REJECTED:
        evidence.status = InternshipEvidence.STATUS_REJECTED
    
    # 2. Any REVISION_REQUIRED -> REVISION_REQUIRED (Needs student action)
    elif emp_status == InternshipEvidence.STATUS_REVISION_REQUIRED or inst_status == InternshipEvidence.STATUS_REVISION_REQUIRED:
        evidence.status = InternshipEvidence.STATUS_REVISION_REQUIRED
    
    # 3. Handle successful reviews
    else:
        # Determine if all required parties have accepted
        employer_ok = not has_employer or emp_status == InternshipEvidence.STATUS_ACCEPTED
        institution_ok = not has_institution or inst_status == InternshipEvidence.STATUS_ACCEPTED
        
        if employer_ok and institution_ok:
            evidence.status = InternshipEvidence.STATUS_ACCEPTED
        elif emp_status or inst_status:
            # At least one has reviewed but not all required are finished
            evidence.status = InternshipEvidence.STATUS_REVIEWED
        else:
            evidence.status = InternshipEvidence.STATUS_SUBMITTED

    evidence.save()
    
    from edulink.apps.ledger.services import record_event
    record_event(
        event_type="EVIDENCE_REVIEWED",
        actor_id=actor.id,
        entity_id=evidence.id,
        entity_type="evidence",
        payload={
            "application_id": str(application.id), 
            "status": status, 
            "notes": notes,
            "has_private_notes": bool(private_notes),
            "reviewer_type": "employer" if is_employer_supervisor else "institution" if is_institution_supervisor else "admin",
            "aggregate_status": evidence.status
        }
    )

    # Recalculate Student Trust Tier
    # The student gains points if the evidence is approved
    if evidence.status == InternshipEvidence.STATUS_ACCEPTED:
        from edulink.apps.trust.services import compute_student_trust_tier
        compute_student_trust_tier(student_id=str(application.student_id))
    
    # Send notification if status changed to something final or revision required
    if evidence.status in [InternshipEvidence.STATUS_ACCEPTED, InternshipEvidence.STATUS_REJECTED, InternshipEvidence.STATUS_REVISION_REQUIRED]:
        from edulink.apps.notifications.services import send_evidence_reviewed_notification
        reviewer_name = actor.get_full_name() or actor.username
        
        send_evidence_reviewed_notification(
            evidence_id=str(evidence.id),
            student_id=str(application.student_id),
            evidence_title=evidence.title,
            status=evidence.get_status_display(),
            reviewer_name=reviewer_name,
            actor_id=str(actor.id)
        )
    
    return evidence

def process_application(actor, application_id: UUID, action: str) -> InternshipApplication:
    """
    Shortlist or Reject (Terminate) an application.
    Action: "shortlist" or "reject"
    """
    application = InternshipApplication.objects.get(id=application_id)
    
    if action == "shortlist":
        app = application_workflow.transition(
            application=application,
            target_state=ApplicationStatus.SHORTLISTED,
            actor=actor
        )
        status_label = "Shortlisted"
    elif action == "reject":
        app = application_workflow.transition(
            application=application,
            target_state=ApplicationStatus.REJECTED,
            actor=actor,
            payload={"reason": "Application Rejected"}
        )
        status_label = "Rejected"
    else:
        raise ValueError(f"Invalid action: {action}")
        
    # Send notification
    from edulink.apps.notifications.services import send_internship_application_status_update_notification
    send_internship_application_status_update_notification(
        application_id=str(app.id),
        student_id=str(app.student_id),
        opportunity_title=app.opportunity.title,
        status=status_label,
        actor_id=str(actor.id)
    )
    
    # Trigger Real-time Pusher event
    _trigger_application_update_pusher(app, status_label)
    
    return app

def accept_offer(actor, application_id: UUID) -> InternshipApplication:
    """
    Transition SHORTLISTED -> ACCEPTED.
    """
    application = InternshipApplication.objects.get(id=application_id)
    opportunity = application.opportunity
    
    # Check Capacity
    accepted_count = InternshipApplication.objects.filter(
        opportunity=opportunity,
        status__in=[ApplicationStatus.ACCEPTED, ApplicationStatus.ACTIVE, ApplicationStatus.COMPLETED]
    ).count()
    
    if accepted_count >= opportunity.capacity:
        raise ValueError(f"Opportunity capacity ({opportunity.capacity}) reached.")
        
    app = application_workflow.transition(
        application=application,
        target_state=ApplicationStatus.ACCEPTED,
        actor=actor
    )
    
    from edulink.apps.notifications.services import send_internship_application_status_update_notification
    send_internship_application_status_update_notification(
        application_id=str(app.id),
        student_id=str(app.student_id),
        opportunity_title=app.opportunity.title,
        status="Accepted",
        actor_id=str(actor.id)
    )
    
    # Trigger Real-time Pusher event
    _trigger_application_update_pusher(app, "Accepted")
    
    return app

def start_internship(actor, application_id: UUID) -> InternshipApplication:
    """
    Transition ACCEPTED -> ACTIVE.
    """
    application = InternshipApplication.objects.get(id=application_id)
    app = application_workflow.transition(
        application=application,
        target_state=ApplicationStatus.ACTIVE,
        actor=actor
    )
    
    from edulink.apps.notifications.services import send_internship_application_status_update_notification
    send_internship_application_status_update_notification(
        application_id=str(app.id),
        student_id=str(app.student_id),
        opportunity_title=app.opportunity.title,
        status="Active (Started)",
        actor_id=str(actor.id)
    )
    
    # Trigger Real-time Pusher event
    _trigger_application_update_pusher(app, "Active (Started)")
    
    return app

def complete_internship(actor, application_id: UUID) -> InternshipApplication:
    """
    Transition ACTIVE -> COMPLETED.
    Prerequisites:
    1. No pending evidence reviews (All must be ACCEPTED or REJECTED)
    2. Final Feedback/Assessment must be submitted
    """
    application = InternshipApplication.objects.get(id=application_id)
    
    # 1. Check for Pending Evidence
    # Statuses that are considered "pending" or "in-progress"
    pending_statuses = [
        InternshipEvidence.STATUS_SUBMITTED,
        InternshipEvidence.STATUS_REVIEWED, # Partially reviewed
        InternshipEvidence.STATUS_REVISION_REQUIRED
    ]
    if application.evidence.filter(status__in=pending_statuses).exists():
        raise ValueError("Cannot complete internship with pending evidence reviews. All logbooks must be approved or rejected.")
        
    # 2. Check for Final Feedback/Assessment
    # We assume 'final_feedback' or 'final_rating' indicates assessment.
    # Or strict check: if application.final_feedback is empty.
    if not application.final_feedback:
        raise ValueError("Final assessment/feedback is required before completing the internship.")

    app = application_workflow.transition(
        application=application,
        target_state=ApplicationStatus.COMPLETED,
        actor=actor
    )
    
    from edulink.apps.notifications.services import send_internship_application_status_update_notification
    send_internship_application_status_update_notification(
        application_id=str(app.id),
        student_id=str(app.student_id),
        opportunity_title=app.opportunity.title,
        status="Completed",
        actor_id=str(actor.id)
    )
    
    # Trigger Real-time Pusher event
    _trigger_application_update_pusher(app, "Completed")
    
    return app

def certify_internship(actor, application_id: UUID) -> InternshipApplication:
    """
    Transition COMPLETED -> CERTIFIED.
    """
    application = InternshipApplication.objects.get(id=application_id)
    app = application_workflow.transition(
        application=application,
        target_state=ApplicationStatus.CERTIFIED,
        actor=actor
    )
    
    from edulink.apps.notifications.services import send_internship_application_status_update_notification
    send_internship_application_status_update_notification(
        application_id=str(app.id),
        student_id=str(app.student_id),
        opportunity_title=app.opportunity.title,
        status="Certified",
        actor_id=str(actor.id)
    )
    
    # Trigger Real-time Pusher event
    _trigger_application_update_pusher(app, "Certified")
    
    return app
