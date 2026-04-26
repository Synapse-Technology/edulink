import logging
from uuid import UUID
from typing import Optional, TYPE_CHECKING
from django.db import transaction
from django.conf import settings
from django.utils import timezone

if TYPE_CHECKING:
    from .models import SuccessStory, SupervisorAssignment

logger = logging.getLogger(__name__)

from edulink.apps.students.queries import get_student_for_user
from edulink.shared.pusher_utils import trigger_pusher_event
from edulink.apps.shared.error_handling import (
    AuthorizationError,
    ConflictError,
    ValidationError,
    NotFoundError,
    ErrorContext,
)
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

PENDING_EVIDENCE_STATUSES = [
    InternshipEvidence.STATUS_SUBMITTED,
    InternshipEvidence.STATUS_REVIEWED,
    InternshipEvidence.STATUS_REVISION_REQUIRED,
]

OPEN_INCIDENT_STATUSES = [
    Incident.STATUS_OPEN,
    Incident.STATUS_ASSIGNED,
    Incident.STATUS_INVESTIGATING,
    Incident.STATUS_PENDING_APPROVAL,
]


def get_completion_readiness(application: InternshipApplication) -> dict:
    """
    Return user-facing readiness signals for ACTIVE -> COMPLETED and
    COMPLETED -> CERTIFIED transitions. This is intentionally read-only so
    every role can see the same lifecycle blockers.
    """
    evidence_qs = application.evidence.all()
    accepted_evidence_count = evidence_qs.filter(
        status=InternshipEvidence.STATUS_ACCEPTED
    ).count()
    pending_evidence_count = evidence_qs.filter(
        status__in=PENDING_EVIDENCE_STATUSES
    ).count()
    unresolved_incident_count = application.incidents.filter(
        status__in=OPEN_INCIDENT_STATUSES
    ).count()
    has_final_feedback = bool(application.final_feedback)
    is_active = application.status == ApplicationStatus.ACTIVE
    is_completed = application.status == ApplicationStatus.COMPLETED
    is_certified = application.status == ApplicationStatus.CERTIFIED

    checks = [
        {
            "key": "active_status",
            "label": "Internship is active",
            "passed": application.status in [
                ApplicationStatus.ACTIVE,
                ApplicationStatus.COMPLETED,
                ApplicationStatus.CERTIFIED,
            ],
        },
        {
            "key": "accepted_evidence",
            "label": "At least one approved logbook or evidence item",
            "passed": accepted_evidence_count > 0,
            "count": accepted_evidence_count,
        },
        {
            "key": "pending_evidence",
            "label": "No pending evidence reviews",
            "passed": pending_evidence_count == 0,
            "count": pending_evidence_count,
        },
        {
            "key": "final_feedback",
            "label": "Final supervisor assessment submitted",
            "passed": has_final_feedback,
        },
        {
            "key": "unresolved_incidents",
            "label": "No unresolved incidents",
            "passed": unresolved_incident_count == 0,
            "count": unresolved_incident_count,
        },
    ]
    can_mark_completed = is_active and all(check["passed"] for check in checks)
    can_certify = is_completed

    missing = [check["label"] for check in checks if not check["passed"]]

    if is_certified:
        next_owner = "Completed"
        next_action = "Certificate available"
        summary = "This internship is certified. The student can generate verified artifacts."
    elif is_completed:
        next_owner = "Institution"
        next_action = "Certify internship"
        summary = "The internship is completed and waiting for institution certification."
    elif can_mark_completed:
        next_owner = "Employer or supervisor"
        next_action = "Mark internship completed"
        summary = "All completion requirements are met."
    else:
        next_owner = "Supervisor or placement owner"
        next_action = "Resolve completion requirements"
        summary = "Completion is blocked until the missing requirements are handled."

    return {
        "checks": checks,
        "missing": missing,
        "can_mark_completed": can_mark_completed,
        "can_certify": can_certify,
        "next_owner": next_owner,
        "next_action": next_action,
        "summary": summary,
    }

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
    *,
    actor,
    title: str, 
    description: str, 
    institution_id: Optional[UUID] = None, 
    employer_id: Optional[UUID] = None,
    department: str = "",
    skills: list = None,
    capacity: int = 1,
    location: str = "",
    location_type: str = InternshipOpportunity.LOCATION_ONSITE,
    start_date=None,
    end_date=None,
    duration: str = "",
    application_deadline=None,
    is_institution_restricted: bool = False,
    **kwargs
) -> InternshipOpportunity:
    """
    Creates a new Internship Opportunity in DRAFT state.
    Institution Admins or Employer Admins can do this.
    """
    if not can_create_internship(actor, institution_id, employer_id):
        ctx = (ErrorContext()
               .with_user_id(actor.id)
               .with_reason(f"User role {getattr(actor, 'role', 'unknown')} lacks permission to create internship"))
        raise AuthorizationError(
            user_message="You are not authorized to create internship opportunities",
            developer_message="User lacks INTERNSHIP_CREATE permission",
            context=ctx.build(),
        )
    
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
    
    Enforces:
    - Email must be verified
    - Student must have CV uploaded
    - Opportunity must be OPEN and not past deadline
    - Student cannot apply twice to same opportunity
    - Trust tier graduated restrictions (Level 0: 3/month, Level 1: 5/month, Level 2+: unlimited)
    """
    if not actor.is_student:
        raise AuthorizationError(
            user_message="Only students can apply for internships",
            developer_message=f"User {actor.id} with role {getattr(actor, 'role', 'unknown')} attempted to apply",
        )
    
    # Require email verification
    if settings.REQUIRE_EMAIL_VERIFICATION_FOR_APPLICATIONS and not getattr(actor, "is_email_verified", getattr(actor, "is_verified", False)):
        raise ConflictError(
            user_message="Please verify your email before applying. Check your inbox for verification link.",
            developer_message=f"User {actor.id} email not verified",
            context=ErrorContext().with_user_id(actor.id).build(),
        )
    
    student = get_student_for_user(str(actor.id))
    if not student:
        from edulink.apps.students.services import preregister_student
        student = preregister_student(user_id=actor.id, email=actor.email)
    
    if not student:
        raise ConflictError(
            user_message="Your student profile could not be initialized. Please contact support.",
            developer_message=f"Failed to initialize student profile for user {actor.id}",
        )
        
    # Check for CV
    if settings.REQUIRE_CV_FOR_APPLICATIONS and not student.cv:
        raise ConflictError(
            user_message="You must upload a CV to your profile before applying.",
            developer_message=f"Student {student.id} has no CV",
            context=ErrorContext().with_resource("student", student.id).build(),
        )

    opportunity = InternshipOpportunity.objects.get(id=opportunity_id)
    if opportunity.status != OpportunityStatus.OPEN:
        raise ConflictError(
            user_message=f"This internship opportunity is {opportunity.status.lower()} and is not accepting applications.",
            developer_message=f"Opportunity {opportunity_id} status: {opportunity.status}",
            context=ErrorContext().with_resource("opportunity", opportunity_id).with_current_state(opportunity.status).build(),
        )
        
    # Check for duplicate application
    existing_application = InternshipApplication.objects.filter(
        student_id=student.id,
        opportunity_id=opportunity_id,
        status__in=[
            ApplicationStatus.APPLIED,
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.ACCEPTED,
            ApplicationStatus.ACTIVE
        ]
    ).first()
    
    if existing_application:
        raise ConflictError(
            user_message=f"You have already applied for this opportunity. Your current status is: {existing_application.get_status_display()}",
            developer_message=f"Duplicate application from student {student.id} to opportunity {opportunity_id}",
            context=ErrorContext().with_resource("application", existing_application.id).build(),
        )
    
    # Check application deadline
    if opportunity.is_deadline_expired:
        raise ConflictError(
            user_message="The application deadline for this opportunity has passed.",
            developer_message=f"Deadline {opportunity.application_deadline} has passed",
            context=ErrorContext().with_resource("opportunity", opportunity_id).build(),
        )
    
    # Trust-gated graduated restrictions
    # Trust Level 0: 3 applications per month
    # Trust Level 1: 5 applications per month
    # Trust Level 2+: unlimited
    if student.trust_level <= 1:
        from django.utils import timezone
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        applications_this_month = InternshipApplication.objects.filter(
            student_id=student.id,
            created_at__gte=month_start,
            status__in=[
                ApplicationStatus.APPLIED,
                ApplicationStatus.SHORTLISTED,
                ApplicationStatus.ACCEPTED,
                ApplicationStatus.ACTIVE,
                ApplicationStatus.COMPLETED,
                ApplicationStatus.CERTIFIED
            ]
        ).count()
        
        max_applications = 3 if student.trust_level == 0 else 5
        if applications_this_month >= max_applications:
            raise ConflictError(
                user_message=f"You've reached your monthly application limit ({max_applications}). Your limit increases as your trust tier improves. Current tier: Level {student.trust_level}",
                developer_message=f"Student {student.id} trust level {student.trust_level} has {applications_this_month} applications this month",
                context=ErrorContext().with_user_id(actor.id).with_reason(f"Trust level {student.trust_level} limits to {max_applications} applications/month").build(),
            )

    # Check for overlapping engagements (Double Booking Prevention)
    if InternshipApplication.objects.filter(
        student_id=student.id,
        status__in=[ApplicationStatus.ACCEPTED, ApplicationStatus.ACTIVE]
    ).exists():
        raise ConflictError(
            user_message="You already have an active or accepted internship engagement.",
            developer_message=f"Student {student.id} already has active/accepted internship",
            context=ErrorContext().with_user_id(actor.id).with_reason("Double booking prevention").build(),
        )

    # Check institution restriction
    if opportunity.is_institution_restricted:
        if not student.institution_id or str(opportunity.institution_id) != str(student.institution_id):
            raise AuthorizationError(
                user_message="This internship is restricted to students from the hosting institution.",
                developer_message=f"Student {student.id} institution {student.institution_id} does not match opportunity {opportunity.institution_id}",
                context=ErrorContext().with_user_id(actor.id).with_resource("opportunity", opportunity_id).build(),
            )
        
    # Create snapshot of student profile
    snapshot = {
        "student_id": str(student.id),
        "email": student.email,
        "registration_number": student.registration_number,
        "course_of_study": student.course_of_study,
        "current_year": student.current_year,
        "skills": student.skills,
        "cv": student.cv.url if student.cv else None,
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
             inst = get_institution_by_id(institution_id=opportunity.institution_id)
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
        raise AuthorizationError(
            user_message="You are not authorized to submit evidence for this application.",
            developer_message=f"User {actor.id} lacks permission for application {application_id}",
            context=ErrorContext().with_user_id(actor.id).with_resource("application", application_id).build(),
        )
    
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
        raise AuthorizationError(
            user_message="You are not authorized to report incidents for this application.",
            developer_message=f"User {actor.id} lacks permission to flag misconduct for application {application.id}",
            context=ErrorContext()
                .with_user_id(actor.id)
                .with_resource("application", application.id)
                .build(),
        )
        
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

def assign_incident_investigator(actor, incident_id: UUID, investigator_id: UUID) -> Incident:
    """
    Assign an investigator to an incident.
    Transitions incident from OPEN → ASSIGNED
    """
    from .workflows import incident_workflow
    
    incident = Incident.objects.select_for_update().get(id=incident_id)
    
    # Only admins can assign investigators
    if not (actor.is_employer_admin or actor.is_institution_admin or actor.is_system_admin):
        raise AuthorizationError(
            user_message="Only administrators can assign incident investigators.",
            developer_message=f"User {actor.id} is not an admin. Required: employer_admin, institution_admin, or system_admin.",
            context=ErrorContext()
                .with_user_id(actor.id)
                .with_resource("incident", incident_id)
                .build(),
        )
    
    # Transition via workflow
    incident = incident_workflow.transition(
        incident=incident,
        target_state=Incident.STATUS_ASSIGNED,
        actor=actor,
        payload={"investigator_id": str(investigator_id)}
    )
    
    # Send notification to investigator
    try:
        from edulink.apps.notifications.services import send_incident_assigned_notification
        send_incident_assigned_notification(
            incident_id=str(incident.id),
            investigator_id=str(investigator_id),
            incident_title=incident.title,
            application_id=str(incident.application.id) if incident.application else None,
            assigned_by_name=actor.get_full_name() or actor.username,
            actor_id=str(actor.id)
        )
    except Exception as e:
        logger.error(f"Failed to send incident assignment notification: {e}")
    
    return incident

def start_incident_investigation(actor, incident_id: UUID, investigation_plan: str = None) -> Incident:
    """
    Start investigation on an assigned incident.
    Transitions incident from ASSIGNED → INVESTIGATING
    """
    from .workflows import incident_workflow
    from django.utils import timezone
    
    incident = Incident.objects.select_for_update().get(id=incident_id)
    
    # Only the assigned investigator or admin can start investigation
    if not (
        actor.id == incident.investigator_id 
        or actor.is_employer_admin 
        or actor.is_institution_admin
        or actor.is_system_admin
    ):
        raise AuthorizationError(
            user_message="Only the assigned investigator or an administrator can start this investigation.",
            developer_message=f"User {actor.id} is not the assigned investigator (expected: {incident.investigator_id}) and is not an admin.",
            context=ErrorContext()
                .with_user_id(actor.id)
                .with_resource("incident", incident_id)
                .build(),
        )
    
    # Transition via workflow
    incident = incident_workflow.transition(
        incident=incident,
        target_state=Incident.STATUS_INVESTIGATING,
        actor=actor,
        payload={"investigation_started_by": str(actor.id), "plan": investigation_plan}
    )
    
    # Record investigation notes
    if investigation_plan:
        incident.investigation_notes = investigation_plan
        incident.save()
    
    return incident

def propose_incident_resolution(actor, incident_id: UUID, resolution_notes: str) -> Incident:
    """
    Propose a resolution for an incident.
    Transitions incident from INVESTIGATING → PENDING_APPROVAL
    """
    from .workflows import incident_workflow
    
    incident = Incident.objects.select_for_update().get(id=incident_id)
    
    # Only investigators can propose resolutions
    if not (
        actor.id == incident.investigator_id 
        or actor.is_employer_admin 
        or actor.is_institution_admin
    ):
        raise AuthorizationError(
            user_message="Only the assigned investigator or an administrator can propose a resolution.",
            developer_message=f"User {actor.id} is not the assigned investigator (expected: {incident.investigator_id}) and is not an admin.",
            context=ErrorContext()
                .with_user_id(actor.id)
                .with_resource("incident", incident_id)
                .build(),
        )
    
    # Store proposed resolution
    incident.resolution_notes = resolution_notes
    
    # Transition via workflow
    incident = incident_workflow.transition(
        incident=incident,
        target_state=Incident.STATUS_PENDING_APPROVAL,
        actor=actor,
        payload={"proposed_by": str(actor.id)}
    )
    
    # Send notification for approval
    try:
        from edulink.apps.notifications.services import send_incident_resolution_proposed_notification
        send_incident_resolution_proposed_notification(
            incident_id=str(incident.id),
            incident_title=incident.title,
            resolution_notes=resolution_notes,
            proposed_by=actor.get_full_name() or actor.username,
            actor_id=str(actor.id)
        )
    except Exception as e:
        logger.error(f"Failed to send incident resolution proposal notification: {e}")
    
    return incident

def approve_incident_resolution(actor, incident_id: UUID, approval_notes: str = None) -> Incident:
    """
    Approve a proposed incident resolution.
    Transitions incident from PENDING_APPROVAL → RESOLVED
    """
    from .workflows import incident_workflow
    
    incident = Incident.objects.select_for_update().get(id=incident_id)
    
    # Only admins can approve resolutions (different from investigator)
    if not (actor.is_employer_admin or actor.is_institution_admin or actor.is_system_admin):
        raise AuthorizationError(
            user_message="Only administrators can approve incident resolutions.",
            developer_message=f"User {actor.id} is not an admin. Required: employer_admin, institution_admin, or system_admin.",
            context=ErrorContext()
                .with_user_id(actor.id)
                .with_resource("incident", incident_id)
                .build(),
        )
    
    # Transition via workflow
    incident = incident_workflow.transition(
        incident=incident,
        target_state=Incident.STATUS_RESOLVED,
        actor=actor,
        payload={"approval_notes": approval_notes or ""}
    )
    
    # Send notification to reporter and supervisors
    try:
        from edulink.apps.notifications.services import send_incident_resolved_notification
        send_incident_resolved_notification(
            incident_id=str(incident.id),
            recipient_id=str(incident.reported_by),
            incident_title=incident.title,
            resolution_notes=incident.resolution_notes,
            actor_id=str(actor.id)
        )
    except Exception as e:
        logger.error(f"Failed to send incident resolution notification: {e}")
    
    return incident

def dismiss_incident(actor, incident_id: UUID, dismissal_reason: str = None) -> Incident:
    """
    Dismiss an incident (from OPEN, ASSIGNED, or INVESTIGATING states).
    Can only be done by admins with justification.
    """
    from .workflows import incident_workflow
    
    incident = Incident.objects.select_for_update().get(id=incident_id)
    
    # Only admins can dismiss
    if not (actor.is_employer_admin or actor.is_institution_admin or actor.is_system_admin):
        raise AuthorizationError(
            user_message="Only administrators can dismiss incidents.",
            developer_message=f"User {actor.id} lacks admin role",
            context=ErrorContext().with_user_id(actor.id).with_resource("incident", incident_id).build(),
        )
    
    # Store dismissal reason
    if dismissal_reason:
        incident.resolution_notes = f"Dismissed: {dismissal_reason}"
    
    # Transition via workflow
    incident = incident_workflow.transition(
        incident=incident,
        target_state=Incident.STATUS_DISMISSED,
        actor=actor,
        payload={"reason": dismissal_reason or "No reason provided"}
    )
    
    return incident

def resolve_incident(actor, incident_id: UUID, status: str, notes: str) -> Incident:
    """
    Legacy resolve_incident function - redirects to workflow-based functions.
    Kept for backward compatibility.
    """
    from .workflows import incident_workflow
    
    incident = Incident.objects.select_for_update().get(id=incident_id)
    
    # Map old status values to new workflow states
    status_map = {
        "RESOLVED": Incident.STATUS_RESOLVED,
        "DISMISSED": Incident.STATUS_DISMISSED,
    }
    
    target_state = status_map.get(status, status)
    
    # Validate target state
    if target_state not in [Incident.STATUS_RESOLVED, Incident.STATUS_DISMISSED]:
        raise ValidationError(
            user_message=f"Invalid incident resolution status: {status}",
            developer_message=f"Status {status} not in allowed values",
        )
    
    if not (actor.is_employer_admin or actor.is_institution_admin or actor.is_system_admin):
        raise AuthorizationError(
            user_message="Only administrators can resolve incidents.",
            developer_message=f"User {actor.id} lacks admin role",
            context=ErrorContext().with_user_id(actor.id).with_resource("incident", incident_id).build(),
        )
    
    # Transition via workflow
    incident = incident_workflow.transition(
        incident=incident,
        target_state=target_state,
        actor=actor,
        payload={"legacy_call": True}
    )
    
    # Update resolution fields
    incident.resolution_notes = notes
    incident.save()
    
    # Send notification
    try:
        from edulink.apps.notifications.services import send_incident_resolved_notification
        send_incident_resolved_notification(
            incident_id=str(incident.id),
            recipient_id=str(incident.reported_by),
            incident_title=incident.title,
            resolution_notes=notes,
            actor_id=str(actor.id)
        )
    except Exception as e:
        logger.error(f"Failed to send incident resolution notification: {e}")

    return incident

def submit_final_feedback(actor, application_id: UUID, feedback: str, rating: int = None) -> InternshipApplication:
    """
    Submits final feedback and rating for an internship application.
    """
    application = InternshipApplication.objects.get(id=application_id)
    
    if not can_submit_final_feedback(actor, application):
        raise AuthorizationError(
            user_message="You are not authorized to submit final feedback for this application.",
            developer_message=f"User {actor.id} lacks permission for application {application_id}",
            context=ErrorContext().with_user_id(actor.id).with_resource("application", application_id).build(),
        )

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
    from .models import SuccessStory
    
    application = InternshipApplication.objects.get(id=application_id)
    
    # Only allow if internship is COMPLETED or CERTIFIED
    if application.status not in [ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED]:
        raise ValidationError(
            user_message="Internship must be completed or certified before adding a success story.",
            developer_message=f"Application {application_id} status: {application.status}",
            context=ErrorContext().with_resource("application", application_id).build(),
        )
        
    # Check if story already exists
    if hasattr(application, 'success_story'):
        raise ValidationError(
            user_message="A success story already exists for this internship.",
            developer_message=f"Success story already exists for application {application_id}",
            context=ErrorContext().with_resource("application", application_id).build(),
        )
        
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
    application = InternshipApplication.objects.select_for_update().get(id=application_id)
    
    if application.status in [ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED, ApplicationStatus.TERMINATED]:
        raise ConflictError(
            user_message="Cannot assign supervisors to a completed, certified, or terminated internship.",
            developer_message=f"Application {application_id} status: {application.status}",
            context=ErrorContext().with_resource("application", application_id).build(),
        )
        
    if not can_assign_supervisor(actor, application.opportunity):
        raise AuthorizationError(
            user_message="You are not authorized to assign supervisors for this application.",
            developer_message=f"User {actor.id} lacks permission for opportunity {application.opportunity_id}",
            context=ErrorContext().with_user_id(actor.id).with_resource("application", application_id).build(),
        )

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
        raise AuthorizationError(
            user_message="Only institution administrators can perform bulk supervisor assignment.",
            developer_message=f"User {actor.id} lacks BULK_ASSIGN_SUPERVISORS permission",
            context=ErrorContext().with_user_id(actor.id).build(),
        )
    
    # 2. Get department/cohort names
    from edulink.apps.institutions.queries import get_department_by_id, get_cohort_by_id, get_supervisors_by_affiliation
    
    try:
        dept = get_department_by_id(department_id=department_id)
    except Exception as e:
        logger.error(f"Failed to get department {department_id}: {e}")
        raise NotFoundError(
            user_message="The specified department could not be found.",
            developer_message=f"Department {department_id} not found",
            context=ErrorContext().with_resource("department", department_id).build(),
        )
        
    cohort_name = ""
    if cohort_id:
        try:
            coh = get_cohort_by_id(cohort_id=cohort_id)
            cohort_name = coh.name
        except Exception as e:
            logger.error(f"Failed to get cohort {cohort_id}: {e}")
            raise NotFoundError(
                user_message="The specified cohort could not be found.",
                developer_message=f"Cohort {cohort_id} not found",
                context=ErrorContext().with_resource("cohort", cohort_id).build(),
            )
        
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
    # Use select_for_update() to prevent concurrent modification during bulk assignment
    applications = list(InternshipApplication.objects.select_for_update().filter(
        student_id__in=student_ids,
        institution_supervisor_id__isnull=True,
        status__in=[ApplicationStatus.SHORTLISTED, ApplicationStatus.ACCEPTED, ApplicationStatus.ACTIVE]
    ))
    
    if not applications:
        return {"assigned_count": 0, "message": "No unassigned applications found for this department/cohort."}

    # 5. Find available supervisors
    supervisors = list(get_supervisors_by_affiliation(
        institution_id=institution_id,
        department_name=dept.name,
        cohort_name=cohort_name
    ))
    
    if not supervisors:
        raise NotFoundError(
            user_message=f"No supervisors found for department '{dept.name}'" + (f" and cohort '{cohort_name}'" if cohort_name else "") + ". Please assign supervisors first.",
            developer_message=f"No supervisors found for dept {dept.name}, cohort {cohort_name}",
            context=ErrorContext().with_data(department=dept.name, cohort=cohort_name).build(),
        )

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
    from .workflows import evidence_workflow
    
    evidence = InternshipEvidence.objects.select_for_update().get(id=evidence_id)
    application = evidence.application
    old_status = evidence.status
    
    if not can_review_evidence(actor, application):
        raise AuthorizationError(
            user_message="You are not authorized to review evidence for this application.",
            developer_message=f"User {actor.id} lacks permission for application {application.id}",
            context=ErrorContext().with_user_id(actor.id).with_resource("application", application.id).build(),
        )
        
    valid_statuses = [
        InternshipEvidence.STATUS_ACCEPTED, 
        InternshipEvidence.STATUS_REJECTED, 
        InternshipEvidence.STATUS_REVIEWED,
        InternshipEvidence.STATUS_REVISION_REQUIRED
    ]
    if status not in valid_statuses:
        raise ValidationError(
            user_message=f"Invalid evidence status: {status}",
            developer_message=f"Status {status} not in valid statuses",
        )
        
    # Determine which supervisor is reviewing
    is_employer_supervisor = str(application.employer_supervisor_id) == str(actor.id)
    is_institution_supervisor = str(application.institution_supervisor_id) == str(actor.id)
    if not is_employer_supervisor and application.opportunity.employer_id:
        from edulink.apps.employers.queries import get_employer_supervisor_by_user
        supervisor = get_employer_supervisor_by_user(
            user_id=actor.id,
            employer_id=application.opportunity.employer_id,
        )
        is_employer_supervisor = bool(
            supervisor and str(application.employer_supervisor_id) == str(supervisor.id)
        )
    if not is_institution_supervisor:
        from edulink.apps.institutions.queries import get_institution_staff_profile
        staff = get_institution_staff_profile(str(actor.id))
        is_institution_supervisor = bool(
            staff and str(application.institution_supervisor_id) == str(staff.id)
        )
    
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
        new_status = InternshipEvidence.STATUS_REJECTED
    
    # 2. Any REVISION_REQUIRED -> REVISION_REQUIRED (Needs student action)
    elif emp_status == InternshipEvidence.STATUS_REVISION_REQUIRED or inst_status == InternshipEvidence.STATUS_REVISION_REQUIRED:
        new_status = InternshipEvidence.STATUS_REVISION_REQUIRED
    
    # 3. Handle successful reviews
    else:
        # Determine if all required parties have accepted
        employer_ok = not has_employer or emp_status == InternshipEvidence.STATUS_ACCEPTED
        institution_ok = not has_institution or inst_status == InternshipEvidence.STATUS_ACCEPTED
        
        if employer_ok and institution_ok:
            new_status = InternshipEvidence.STATUS_ACCEPTED
        elif emp_status or inst_status:
            # At least one has reviewed but not all required are finished
            new_status = InternshipEvidence.STATUS_REVIEWED
        else:
            new_status = InternshipEvidence.STATUS_SUBMITTED

    # Transition aggregate status via workflow if it changed
    if new_status != old_status:
        evidence = evidence_workflow.transition(
            evidence=evidence,
            target_state=new_status,
            actor=actor,
            payload={
                "application_id": str(application.id),
                "reviewer_type": "employer" if is_employer_supervisor else "institution" if is_institution_supervisor else "admin",
                "notes": notes,
                "has_private_notes": bool(private_notes)
            }
        )
    else:
        # No status change, but still save reviewer annotations
        try:
            evidence.save()
        except Exception as e:
            logger.error(f"Failed to save evidence review for {evidence_id} by {actor.id}: {e}")
            raise ConflictError(
                user_message="Failed to save evidence review. Please try again.",
                developer_message=f"Failed to save InternshipEvidence {evidence_id} after review by {actor.id}: {str(e)}",
                context=ErrorContext()
                    .with_user_id(actor.id)
                    .with_resource("evidence", evidence_id)
                    .with_resource("application", application.id)
                    .build(),
            )

    # Recalculate Student Trust Tier
    # The student gains points if the evidence is approved
    if evidence.status == InternshipEvidence.STATUS_ACCEPTED:
        try:
            from edulink.apps.trust.services import compute_student_trust_tier
            compute_student_trust_tier(student_id=str(application.student_id))
        except Exception as e:
            logger.error(f"Failed to compute trust tier for student {application.student_id} after evidence acceptance: {e}")
            # Don't fail the evidence review if trust computation fails - log and continue
    
    # Send notification if status changed to something final or revision required
    if evidence.status in [InternshipEvidence.STATUS_ACCEPTED, InternshipEvidence.STATUS_REJECTED, InternshipEvidence.STATUS_REVISION_REQUIRED]:
        try:
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
        except Exception as e:
            logger.error(f"Failed to send evidence reviewed notification for evidence {evidence.id}: {e}")
            # Don't fail the review if notification fails - log and continue
    
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
        raise ValidationError(
            user_message=f"Invalid application action: {action}",
            developer_message=f"Action '{action}' is not 'shortlist' or 'reject'",
        )
        
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
        raise ValidationError(
            user_message=f"This opportunity has reached its capacity ({opportunity.capacity} spots). No more applications can be accepted.",
            developer_message=f"Opportunity {opportunity.id} capacity ({opportunity.capacity}) reached",
            context=ErrorContext()
                .with_resource("opportunity", opportunity.id)
                .with_resource("application", application.id)
                .build(),
        )
        
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

def withdraw_application(actor, application_id: UUID, reason: str = None) -> InternshipApplication:
    """
    Allow student to withdraw from an internship application at any point before it starts.
    
    Can transition from: APPLIED, SHORTLISTED, ACCEPTED  
    Cannot transition from: ACTIVE (ongoing), COMPLETED, REJECTED, TERMINATED, WITHDRAWN, CERTIFIED
    
    Withdrawal records audit trail and notifies student and employer.
    Reason is stored in metadata for historical record.
    """
    from edulink.apps.notifications.services import (
        send_internship_application_status_update_notification,
        send_internship_application_withdrawn_to_employer_notification
    )
    from edulink.apps.employers.queries import get_employer_by_id
    
    application = InternshipApplication.objects.get(id=application_id)
    
    student = get_student_for_user(str(actor.id)) if actor.is_student else None
    is_student_owner = student and str(student.id) == str(application.student_id)

    # Check authorization (student or admin only)
    if not (is_student_owner or actor.is_system_admin):
        raise AuthorizationError(
            user_message="Only the student or a system administrator can withdraw this application.",
            developer_message=f"User {actor.id} is not the student profile ({application.student_id}) and is not a system admin",
            context=ErrorContext()
                .with_user_id(actor.id)
                .with_resource("application", application.id)
                .build(),
        )
    
    # Transition to WITHDRAWN via workflow (handles state validation and event recording)
    app = application_workflow.transition(
        application=application,
        target_state=ApplicationStatus.WITHDRAWN,
        actor=actor
    )
    
    # Store withdrawal audit data on the dedicated model fields.
    if reason:
        app.withdrawal_reason = reason
    app.withdrawn_at = timezone.now()
    app.save(update_fields=["withdrawal_reason", "withdrawn_at"])
    
    # Notify student of withdrawal
    send_internship_application_status_update_notification(
        application_id=str(app.id),
        student_id=str(app.student_id),
        opportunity_title=app.opportunity.title,
        status="Withdrawn",
        actor_id=str(actor.id)
    )
    
    # Notify employer (with reason) if this is an employer opportunity
    if app.opportunity.employer_id:
        employer = get_employer_by_id(app.opportunity.employer_id)
        if employer:
            try:
                send_internship_application_withdrawn_to_employer_notification(
                    application_id=str(app.id),
                    employer_id=str(app.opportunity.employer_id),
                    student_name=app.application_snapshot.get("email", "Student"),
                    opportunity_title=app.opportunity.title,
                    reason=reason,
                    actor_id=str(actor.id)
                )
            except Exception as e:
                # Log but don't block withdrawal - async safe
                logger.error(f"Failed to send withdrawal notification to employer: {e}")
    
    # Trigger Real-time Pusher event for live updates
    _trigger_application_update_pusher(app, "Withdrawn")
    
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
    readiness = get_completion_readiness(application)

    if application.evidence.filter(status__in=PENDING_EVIDENCE_STATUSES).exists():
        raise ValidationError(
            user_message="Cannot complete internship. All logbooks must be reviewed and either approved or rejected before completion.",
            developer_message=f"Application {application.id} has pending evidence reviews",
            context=ErrorContext()
                .with_resource("application", application.id)
                .build(),
        )
        
    # 2. Check for Final Feedback/Assessment
    # We assume 'final_feedback' or 'final_rating' indicates assessment.
    # Or strict check: if application.final_feedback is empty.
    if not application.final_feedback:
        raise ValidationError(
            user_message="Final feedback or assessment is required before completing the internship.",
            developer_message=f"Application {application.id} is missing final_feedback",
            context=ErrorContext()
                .with_resource("application", application.id)
                .build(),
        )

    if application.incidents.filter(status__in=OPEN_INCIDENT_STATUSES).exists():
        raise ValidationError(
            user_message="Cannot complete internship while incidents are unresolved. Resolve or dismiss all open incidents first.",
            developer_message=f"Application {application.id} has unresolved incidents",
            context=ErrorContext()
                .with_resource("application", application.id)
                .build(),
        )

    if not readiness["can_mark_completed"]:
        raise ValidationError(
            user_message="Cannot complete internship until all completion requirements are met.",
            developer_message=f"Application {application.id} missing requirements: {readiness['missing']}",
            context=ErrorContext()
                .with_resource("application", application.id)
                .build(),
        )

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


@transaction.atomic
def close_expired_opportunities() -> int:
    """
    SYSTEM SERVICE: Close all OPEN opportunities whose deadline has passed.
    
    Called by: internships.tasks.close_expired_deadlines (scheduled task)
    Returns: Count of opportunities closed
    
    Per architecture rules:
    - This is a business action (write operation)
    - Transitions state via workflow
    - Records events in ledger
    - Operates in atomic transaction
    """
    now = timezone.now()
    
    # Find all OPEN opportunities with passed deadlines
    expired = InternshipOpportunity.objects.filter(
        status=OpportunityStatus.OPEN,
        application_deadline__isnull=False,
        application_deadline__lt=now
    )
    
    closed_count = 0
    for opportunity in expired:
        try:
            # Transition via workflow
            opportunity_workflow.transition(
                opportunity,
                target_status=OpportunityStatus.CLOSED,
                actor_role="SYSTEM"
            )
            opportunity.save()
            closed_count += 1
            logger.info(f"Auto-closed expired opportunity: {opportunity.id} ({opportunity.title})")
        except Exception as e:
            logger.error(f"Failed to close expired opportunity {opportunity.id}: {e}")
            continue
    
    return closed_count


@transaction.atomic
def bulk_extend_opportunity_deadlines(
    actor,
    opportunity_ids: list,
    new_deadline,
    reason: str = ""
):
    """
    Service function: Extend application deadlines for multiple opportunities at once.
    
    Business logic:
    - Only employer admins can extend deadlines for their own opportunities
    - Can only extend OPEN opportunities
    - New deadline must be in the future
    - Records extension event in ledger for audit trail
    
    Returns: dict with success count, failed count, and details
    """
    from edulink.apps.ledger.services import record_event
    
    success_count = 0
    failed_count = 0
    errors = []
    
    # Fetch all requested opportunities
    opportunities = InternshipOpportunity.objects.filter(id__in=opportunity_ids)
    
    if opportunities.count() != len(opportunity_ids):
        failed_count += len(opportunity_ids) - opportunities.count()
        errors.append("Some opportunity IDs could not be found")
    
    for opportunity in opportunities:
        try:
            # Policy check: Can user extend this opportunity?
            from .policies import can_transition_opportunity
            if not can_transition_opportunity(actor, opportunity, OpportunityStatus.OPEN):
                failed_count += 1
                errors.append(f"Not authorized to extend deadline for {opportunity.title}")
                continue
            
            # Only OPEN opportunities can have deadlines extended
            if opportunity.status != OpportunityStatus.OPEN:
                failed_count += 1
                errors.append(f"Cannot extend closed or draft opportunity: {opportunity.title}")
                continue
            
            # Store old deadline for audit trail
            old_deadline = opportunity.application_deadline
            
            # Update deadline
            opportunity.application_deadline = new_deadline
            opportunity.save(update_fields=['application_deadline'])
            
            # Record event in ledger
            record_event(
                event_type="INTERNSHIP_OPPORTUNITY_DEADLINE_EXTENDED",
                entity_id=opportunity.id,
                entity_type="InternshipOpportunity",
                actor_id=actor.id,
                actor_role="EMPLOYER_ADMIN",
                payload={
                    "opportunity_title": opportunity.title,
                    "old_deadline": old_deadline.isoformat() if old_deadline else None,
                    "new_deadline": new_deadline.isoformat(),
                    "extension_reason": reason,
                    "extended_by_admin_id": str(actor.id)
                }
            )
            
            success_count += 1
            logger.info(f"Extended deadline for opportunity {opportunity.id}: {old_deadline} → {new_deadline}")
            
        except Exception as e:
            failed_count += 1
            errors.append(f"Error extending {opportunity.title}: {str(e)}")
            logger.error(f"Failed to extend deadline for opportunity {opportunity.id}: {e}")
            continue
    
    return {
        "success_count": success_count,
        "failed_count": failed_count,
        "total_processed": success_count + failed_count,
        "errors": errors if errors else None
    }


def get_deadline_analytics(employer_id):
    """
    Service function: Calculate deadline performance analytics for an employer.
    
    Returns comprehensive metrics about:
    - Opportunity posting and closure rates
    - Application conversion metrics
    - Deadline performance trends
    - Upcoming and expired opportunity counts
    
    Used for employer analytics dashboard.
    """
    from datetime import timedelta
    from django.utils import timezone
    from django.db.models import Count, Q, F, Case, When, IntegerField
    
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    
    # Get all opportunities for this employer
    opportunities = InternshipOpportunity.objects.filter(employer_id=employer_id)
    
    total_opportunities = opportunities.count()
    open_opportunities = opportunities.filter(status=OpportunityStatus.OPEN).count()
    closed_opportunities = opportunities.filter(status=OpportunityStatus.CLOSED).count()
    
    # Count opportunities by deadline status
    opportunities_with_valid_deadline = opportunities.filter(
        application_deadline__isnull=False
    )
    
    opportunities_closing_in_24h = opportunities_with_valid_deadline.filter(
        status=OpportunityStatus.OPEN,
        application_deadline__gte=now,
        application_deadline__lte=now + timedelta(hours=24)
    ).count()
    
    opportunities_closing_in_48h = opportunities_with_valid_deadline.filter(
        status=OpportunityStatus.OPEN,
        application_deadline__gte=now,
        application_deadline__lte=now + timedelta(hours=48)
    ).count()
    
    expired_recently = opportunities.filter(
        status=OpportunityStatus.CLOSED,
        application_deadline__gte=week_ago,
        application_deadline__lt=now
    ).count()
    
    # Calculate application metrics
    total_applications = 0
    total_offers = 0
    zero_app_count = 0
    
    for opp in opportunities:
        app_count = opp.internshipapplication_set.filter(
            status__in=["APPLIED", "SHORTLISTED", "ACCEPTED", "OFFERED", "REJECTED"]
        ).count()
        total_applications += app_count
        
        offer_count = opp.internshipapplication_set.filter(
            status__in=["ACCEPTED", "OFFERED"]
        ).count()
        total_offers += offer_count
        
        if app_count == 0:
            zero_app_count += 1
    
    # Calculate averages
    avg_applications = total_applications / total_opportunities if total_opportunities > 0 else 0
    
    # Calculate average days to deadline (for opportunities with deadlines)
    avg_days_to_deadline = 0
    if opportunities_with_valid_deadline.count() > 0:
        total_days = 0
        for opp in opportunities_with_valid_deadline:
            days_left = max(0, (opp.application_deadline - now).days)
            total_days += days_left
        avg_days_to_deadline = total_days / opportunities_with_valid_deadline.count()
    
    # Calculate conversion rate
    conversion_rate = 0.0
    if total_applications > 0:
        conversion_rate = (total_offers / total_applications) * 100
    
    return {
        "total_opportunities": total_opportunities,
        "open_opportunities": open_opportunities,
        "closed_opportunities": closed_opportunities,
        "opportunities_with_zero_applications": zero_app_count,
        "total_applications_received": total_applications,
        "total_offers_made": total_offers,
        "average_applications_per_opportunity": round(avg_applications, 2),
        "average_days_to_deadline": round(avg_days_to_deadline, 1),
        "conversion_rate": round(conversion_rate, 2),
        "opportunities_closing_in_24h": opportunities_closing_in_24h,
        "opportunities_closing_in_48h": opportunities_closing_in_48h,
        "expired_recently": expired_recently,
        "period_start": week_ago,
        "period_end": now,
        "generated_at": now
    }


# ==================== Phase 2.4: Supervisor Acceptance Workflow ====================

def create_supervisor_assignment(*, actor, application_id: UUID, supervisor_id: UUID, assignment_type: str) -> "SupervisorAssignment":
    """
    Create a supervisor assignment in PENDING state.
    Admin calls this when assigning a supervisor.
    Supervisor must then accept or reject.
    
    Args:
        actor: Admin performing the assignment
        application_id: The internship application
        supervisor_id: The supervisor being assigned
        assignment_type: "EMPLOYER" or "INSTITUTION"
    
    Returns:
        SupervisorAssignment in PENDING state
    """
    from .models import SupervisorAssignment
    from .policies import can_assign_supervisor
    from edulink.apps.ledger.services import record_event
    
    application = InternshipApplication.objects.get(id=application_id)
    
    # Authorization: Only admins can create assignments
    if not (actor.is_employer_admin or actor.is_institution_admin or actor.is_system_admin):
        raise AuthorizationError(
            user_message="Only administrators can create supervisor assignments.",
            developer_message=f"User {actor.id} is not an admin. Required: employer_admin, institution_admin, or system_admin.",
            context=ErrorContext()
                .with_user_id(actor.id)
                .with_resource("application", application.id)
                .build(),
        )
    
    # Check if supervisor can be assigned to this opportunity
    if not can_assign_supervisor(actor, application.opportunity):
        raise AuthorizationError(
            user_message="You are not authorized to assign supervisors to this opportunity.",
            developer_message=f"User {actor.id} lacks permission to assign supervisors to opportunity {application.opportunity.id}",
            context=ErrorContext()
                .with_user_id(actor.id)
                .with_resource("opportunity", application.opportunity.id)
                .with_resource("application", application.id)
                .build(),
        )
    
    # Create assignment in PENDING state (supervisor must accept)
    with transaction.atomic():
        assignment = SupervisorAssignment.objects.create(
            application=application,
            supervisor_id=supervisor_id,
            assigned_by_id=actor.id,
            assignment_type=assignment_type,
            status=SupervisorAssignment.STATUS_PENDING
        )
        
        # Record event
        record_event(
            event_type="SUPERVISOR_ASSIGNMENT_CREATED",
            actor_id=actor.id,
            entity_id=assignment.id,
            entity_type="supervisor_assignment",
            payload={
                "application_id": str(application.id),
                "supervisor_id": str(supervisor_id),
                "assignment_type": assignment_type,
                "assigned_by": str(actor.id)
            }
        )
        
        # Send notification to supervisor
        try:
            from edulink.apps.notifications.services import send_supervisor_assignment_notification
            from edulink.apps.students.queries import get_student_by_id
            
            student = get_student_by_id(application.student_id)
            student_name = student.user.get_full_name() or student.user.username if student else "Student"
            
            send_supervisor_assignment_notification(
                supervisor_id=str(supervisor_id),
                student_name=student_name,
                opportunity_title=application.opportunity.title,
                assignment_type=assignment_type,
                assignment_id=str(assignment.id),
                actor_id=str(actor.id)
            )
        except Exception as e:
            logger.error(f"Failed to send supervisor assignment notification: {e}")
    
    return assignment


def accept_supervisor_assignment(actor, assignment_id: UUID) -> "SupervisorAssignment":
    """
    Supervisor accepts a supervisor assignment.
    Transitions: PENDING → ACCEPTED
    Updates the application to point to this supervisor.
    
    Args:
        actor: The supervisor accepting the assignment
        assignment_id: The assignment being accepted
    
    Returns:
        SupervisorAssignment in ACCEPTED state
    """
    from .models import SupervisorAssignment
    from .workflows import supervisor_assignment_workflow
    from edulink.apps.ledger.services import record_event
    
    assignment = SupervisorAssignment.objects.select_for_update().get(id=assignment_id)
    
    # Only the assigned supervisor can accept
    if actor.id != assignment.supervisor_id:
        raise AuthorizationError(
            user_message="Only the assigned supervisor can accept this assignment.",
            developer_message=f"User {actor.id} is not the assigned supervisor (expected: {assignment.supervisor_id})",
            context=ErrorContext()
                .with_user_id(actor.id)
                .with_resource("assignment", assignment_id)
                .build(),
        )
    
    # Transition via workflow (PENDING → ACCEPTED)
    assignment = supervisor_assignment_workflow.transition(
        assignment=assignment,
        target_state=SupervisorAssignment.STATUS_ACCEPTED,
        actor=actor,
        payload={"accepted_by": str(actor.id)}
    )
    
    # Send notification to admin
    try:
        from edulink.apps.notifications.services import send_supervisor_accepted_notification
        from edulink.apps.students.queries import get_student_by_id
        
        student = get_student_by_id(assignment.application.student_id)
        student_name = student.user.get_full_name() or student.user.username if student else "Student"
        
        send_supervisor_accepted_notification(
            assigned_by_id=str(assignment.assigned_by_id),
            student_name=student_name,
            supervisor_name=actor.get_full_name() or actor.username,
            opportunity_title=assignment.application.opportunity.title,
            assignment_type=assignment.assignment_type,
            actor_id=str(actor.id)
        )
    except Exception as e:
        logger.error(f"Failed to send supervisor accepted notification: {e}")
    
    return assignment


def reject_supervisor_assignment(actor, assignment_id: UUID, reason: str = None) -> "SupervisorAssignment":
    """
    Supervisor rejects a supervisor assignment.
    Transitions: PENDING → REJECTED
    Does NOT update the application (supervisor still needs to be assigned).
    
    Args:
        actor: The supervisor rejecting the assignment
        assignment_id: The assignment being rejected
        reason: Optional reason for rejection
    
    Returns:
        SupervisorAssignment in REJECTED state
    """
    from .models import SupervisorAssignment
    from .workflows import supervisor_assignment_workflow
    from edulink.apps.ledger.services import record_event
    
    assignment = SupervisorAssignment.objects.select_for_update().get(id=assignment_id)
    
    # Only the assigned supervisor can reject
    if actor.id != assignment.supervisor_id:
        raise AuthorizationError(
            user_message="Only the assigned supervisor can reject this assignment.",
            developer_message=f"User {actor.id} is not the assigned supervisor (expected: {assignment.supervisor_id})",
            context=ErrorContext()
                .with_user_id(actor.id)
                .with_resource("assignment", assignment_id)
                .build(),
        )
    
    # Transition via workflow (PENDING → REJECTED)
    assignment = supervisor_assignment_workflow.transition(
        assignment=assignment,
        target_state=SupervisorAssignment.STATUS_REJECTED,
        actor=actor,
        payload={"reason": reason or "No reason provided", "rejected_by": str(actor.id)}
    )
    
    # Send notification to admin
    try:
        from edulink.apps.notifications.services import send_supervisor_rejected_notification
        from edulink.apps.students.queries import get_student_by_id
        
        student = get_student_by_id(assignment.application.student_id)
        student_name = student.user.get_full_name() or student.user.username if student else "Student"
        
        send_supervisor_rejected_notification(
            assigned_by_id=str(assignment.assigned_by_id),
            student_name=student_name,
            supervisor_name=actor.get_full_name() or actor.username,
            opportunity_title=assignment.application.opportunity.title,
            assignment_type=assignment.assignment_type,
            rejection_reason=reason,
            actor_id=str(actor.id)
        )
    except Exception as e:
        logger.error(f"Failed to send supervisor rejected notification: {e}")
    
    return assignment
