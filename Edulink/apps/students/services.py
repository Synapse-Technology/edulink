from edulink.apps.institutions.queries import get_institution_by_domain
from edulink.apps.ledger.services import record_event
from edulink.apps.notifications.services import (
    send_student_profile_updated_notification,
    send_student_profile_completed_notification,
    send_document_verified_notification,
    send_document_rejected_notification,
    send_document_uploaded_notification,
)
from .models import Student, StudentInstitutionAffiliation, TRUST_EVENT_POINTS, TRUST_TIER_THRESHOLDS
from uuid import UUID


def get_or_create_student_profile(*, user) -> Student:
    """
    Get existing student profile or create a new one lazily.
    """
    from .queries import get_student_for_user
    
    student = get_student_for_user(str(user.id))
    if not student:
        student = preregister_student(
            user_id=user.id,
            email=user.email
        )
    return student


def update_student_profile(*, student_id: str, data: dict) -> Student:
    """
    Update student profile information (course, year, skills).
    """
    from .queries import calculate_profile_readiness
    # Calculate readiness before update
    try:
        pre_readiness = calculate_profile_readiness(student_id=student_id)
    except Exception:
        pre_readiness = {"score": 0}

    student = Student.objects.get(id=student_id)
    
    # Update allowed fields
    updated_fields = []
    if 'course_of_study' in data:
        student.course_of_study = data['course_of_study']
        updated_fields.append('course_of_study')
    if 'current_year' in data:
        student.current_year = data['current_year']
        updated_fields.append('current_year')
    if 'skills' in data:
        student.skills = data['skills']
        updated_fields.append('skills')
    if 'registration_number' in data:
        student.registration_number = data['registration_number']
        updated_fields.append('registration_number')
    if 'profile_picture' in data:
        student.profile_picture = data['profile_picture']
        updated_fields.append('profile_picture')
        
    student.save()
    
    # Handle document uploads if present in data
    # We call upload_student_document to reuse event logging and logic
    if 'cv' in data and data['cv']:
        upload_student_document(
            student_id=student_id,
            document_type='cv',
            file_name=getattr(data['cv'], 'name', 'cv.pdf'),
            file=data['cv']
        )
    
    if 'admission_letter' in data and data['admission_letter']:
        upload_student_document(
            student_id=student_id,
            document_type='admission_letter',
            file_name=getattr(data['admission_letter'], 'name', 'admission_letter.pdf'),
            file=data['admission_letter']
        )

    if 'id_document' in data and data['id_document']:
        upload_student_document(
            student_id=student_id,
            document_type='id_document',
            file_name=getattr(data['id_document'], 'name', 'id_document.pdf'),
            file=data['id_document']
        )
    
    # Record profile update event
    record_event(
        event_type="STUDENT_PROFILE_UPDATED",
        actor_id=UUID(student_id),
        entity_type="Student",
        entity_id=student_id,
        payload={
            "updated_fields": updated_fields
        },
    )
    
    # Send update notification
    if updated_fields:
        try:
            send_student_profile_updated_notification(
                user_id=str(student.user_id),
                updated_fields=updated_fields
            )
        except Exception:
            pass
            
    # Check for completion
    try:
        post_readiness = calculate_profile_readiness(student_id=student_id)
        if pre_readiness['score'] < 100 and post_readiness['score'] >= 100:
            send_student_profile_completed_notification(user_id=str(student.user_id))
    except Exception:
        pass
    
    return student


def update_student_affiliation(
    *, 
    student_id: str, 
    institution_id: str, 
    department_id: str = None, 
    cohort_id: str = None, 
    actor_id: str
) -> StudentInstitutionAffiliation:
    """
    Update a student's approved affiliation (department and cohort).
    """
    try:
        affiliation = StudentInstitutionAffiliation.objects.get(
            student_id=student_id,
            institution_id=institution_id,
            status=StudentInstitutionAffiliation.STATUS_APPROVED
        )
    except StudentInstitutionAffiliation.DoesNotExist:
        raise ValueError("Approved affiliation not found")

    updated_fields = []
    if department_id:
        affiliation.department_id = UUID(str(department_id))
        updated_fields.append("department_id")
    if cohort_id:
        affiliation.cohort_id = UUID(str(cohort_id))
        updated_fields.append("cohort_id")

    if updated_fields:
        affiliation.save()
        record_event(
            event_type="STUDENT_AFFILIATION_UPDATED",
            actor_id=UUID(actor_id),
            entity_type="Student",
            entity_id=student_id,
            payload={
                "institution_id": institution_id,
                "department_id": str(department_id) if department_id else None,
                "cohort_id": str(cohort_id) if cohort_id else None
            }
        )
    
    return affiliation

def upload_student_document(*, student_id: str, document_type: str, file_name: str, file: any) -> None:
    """
    Record document upload event for trust scoring and save the file.
    """
    from .models import Student
    
    student = Student.objects.get(id=student_id)
    
    if document_type == 'cv':
        student.cv.save(file_name, file)
    elif document_type == 'admission_letter':
        student.admission_letter.save(file_name, file)
    elif document_type == 'id_document':
        student.id_document.save(file_name, file)
    
    student.save()

    record_event(
        event_type="DOCUMENT_UPLOADED",
        actor_id=UUID(student_id),
        entity_type="Student",
        entity_id=student_id,
        payload={
            "document_type": document_type,
            "file_name": file_name,
        },
    )

    # Send notification
    try:
        send_document_uploaded_notification(
            user_id=str(student.user_id),
            document_type=document_type,
            file_name=file_name
        )
    except Exception:
        pass


def log_internship_activity(*, student_id: str, activity_type: str, description: str) -> None:
    """
    Record internship logging activity for trust scoring
    """
    record_event(
        event_type="INTERNSHIP_LOGGED",
        actor_id=UUID(student_id),
        entity_type="Student",
        entity_id=student_id,
        payload={
            "activity_type": activity_type,
            "description": description,
        },
    )


def approve_supervisor_activity(*, student_id: str, supervisor_id: str, activity_id: str) -> None:
    """
    Record supervisor approval for trust scoring
    """
    record_event(
        event_type="SUPERVISOR_APPROVED",
        actor_id=UUID(supervisor_id),
        entity_type="Student",
        entity_id=student_id,
        payload={
            "supervisor_id": supervisor_id,
            "activity_id": activity_id,
        },
    )


def certify_internship_completion(*, student_id: str, institution_id: str, certificate_id: str) -> None:
    """
    Record institution certification for trust scoring
    """
    record_event(
        event_type="INTERNSHIP_CERTIFIED",
        actor_id=None,
        entity_type="Student",
        entity_id=student_id,
        payload={
            "institution_id": institution_id,
            "certificate_id": certificate_id,
        },
    )


def verify_student_affiliation(*, affiliation_id: str, actor_id: str, review_notes: str = "", department_id: str = None, cohort_id: str = None) -> StudentInstitutionAffiliation:
    """
    Approve a student's affiliation request and verify the student.
    """
    from django.db import transaction
    from edulink.apps.notifications.services import send_student_affiliation_approved_notification
    from edulink.apps.institutions.queries import get_institution_by_id
    from .models import Student
    
    affiliation = StudentInstitutionAffiliation.objects.get(id=affiliation_id)
    
    if affiliation.status != StudentInstitutionAffiliation.STATUS_PENDING:
        raise ValueError("Affiliation is not pending")

    with transaction.atomic():
        # 1. Update Affiliation
        affiliation.status = StudentInstitutionAffiliation.STATUS_APPROVED
        affiliation.reviewed_by = UUID(actor_id)
        affiliation.review_notes = review_notes
        
        # Update department/cohort if provided
        if department_id:
            affiliation.department_id = UUID(department_id)
        if cohort_id:
            affiliation.cohort_id = UUID(cohort_id)
            
        affiliation.save()
        
        # 2. Update Student Verification Status and Linkage
        student = Student.objects.get(id=affiliation.student_id)
        
        # Always ensure student is linked to this institution upon approval
        if str(student.institution_id) != str(affiliation.institution_id):
            student.institution_id = affiliation.institution_id
            
        if not student.is_verified:
            student.is_verified = True
            
        student.save(update_fields=["institution_id", "is_verified"])
        
        # 2b. Propagate Institution Link to Active Internships (The Missing Link)
        # Find any active internship applications for this student and update their institution_id
        from edulink.apps.internships.services import propagate_student_institution_to_applications
        
        propagate_student_institution_to_applications(
            student_id=student.id,
            institution_id=affiliation.institution_id
        )
        
        # 3. Record Verification Event
        record_event(
            event_type="STUDENT_VERIFIED_BY_INSTITUTION",
            actor_id=UUID(actor_id),
            entity_type="Student",
            entity_id=str(student.id),
            payload={
                "institution_id": str(affiliation.institution_id),
                "affiliation_id": str(affiliation.id),
                "method": "individual_approval",
                "review_notes": review_notes
            }
        )
            
    # Send notification
    institution = get_institution_by_id(institution_id=str(affiliation.institution_id))
    
    try:
        send_student_affiliation_approved_notification(
            user_id=str(student.user_id),
            institution_name=institution.name,
            actor_id=actor_id
        )
    except Exception as e:
        logger.error(f"Failed to send affiliation approved notification for {student.user_id}: {e}")
            
    return affiliation


def reject_student_affiliation(*, affiliation_id: str, reason: str, actor_id: str) -> StudentInstitutionAffiliation:
    """
    Reject a student's affiliation request.
    """
    from edulink.apps.notifications.services import send_student_affiliation_rejected_notification
    from edulink.apps.institutions.queries import get_institution_by_id
    from .models import Student
    
    affiliation = StudentInstitutionAffiliation.objects.get(id=affiliation_id)
    
    if affiliation.status != StudentInstitutionAffiliation.STATUS_PENDING:
        raise ValueError("Affiliation is not pending")
        
    affiliation.status = StudentInstitutionAffiliation.STATUS_REJECTED
    affiliation.reviewed_by = UUID(actor_id)
    affiliation.review_notes = reason
    affiliation.save()
    
    record_event(
        event_type="STUDENT_VERIFICATION_REJECTED",
        actor_id=UUID(actor_id),
        entity_type="Student",
        entity_id=str(affiliation.student_id),
        payload={
            "institution_id": str(affiliation.institution_id),
            "affiliation_id": str(affiliation.id),
            "reason": reason
        }
    )
    
    # Send notification
    try:
        institution = get_institution_by_id(institution_id=str(affiliation.institution_id))
        student = Student.objects.get(id=affiliation.student_id)
        
        send_student_affiliation_rejected_notification(
            user_id=str(student.user_id),
            institution_name=institution.name,
            rejection_reason=reason,
            actor_id=actor_id
        )
    except Exception as e:
        # Don't fail the rejection if notification fails
        pass
    
    return affiliation


def process_bulk_verification_preview(*, rows: list[dict], institution_id: str) -> list[dict]:
    """
    Process bulk verification CSV rows and return preview data.
    """
    from .models import Student
    from edulink.apps.institutions.queries import get_institution_by_id
    
    results = []
    institution = get_institution_by_id(institution_id=institution_id)
    institution_domain = institution.domain
    
    for row in rows:
        email = row.get('email', '').strip().lower()
        reg_number = row.get('registration_number', '').strip()
        
        if not email:
            continue
            
        result = {
            'email': email,
            'registration_number': reg_number,
            'status': 'unknown',
            'student_id': None,
            'name': 'Unknown', # Placeholder if we had user profile
            'message': ''
        }
        
        try:
            student = Student.objects.get(email=email)
            result['student_id'] = str(student.id)
            
            # Check verification status
            if student.is_verified:
                result['status'] = 'already_verified'
                result['message'] = 'Student is already verified'
            
            # Check institution linkage
            elif str(student.institution_id) == institution_id:
                result['status'] = 'ready'
                result['message'] = 'Ready for verification'
            
            # Check domain match if not directly linked
            elif email.endswith(f"@{institution_domain}"):
                 result['status'] = 'ready_domain_match'
                 result['message'] = 'Matches institution domain'
            
            else:
                result['status'] = 'conflict'
                result['message'] = 'Linked to another institution or domain mismatch'
                
        except Student.DoesNotExist:
            # Adoption Trigger: Support pre-registration for new emails
            if email.endswith(f"@{institution_domain}"):
                result['status'] = 'ready_new_student'
                result['message'] = 'New student (domain match), will be pre-registered'
            else:
                result['status'] = 'ready_new_student_manual'
                result['message'] = 'New student, will be pre-registered'
            
        results.append(result)
        
    return results


def preregister_student(*, user_id, email: str, institution_id: str = None, registration_number: str = None) -> Student:
    """
    Pre-register a student with optional institution affiliation.
    Handles Case C where institution_id can be None (student skips institution selection).
    Also handles "Adoption Trigger" where an institution pre-registered the email.
    """
    domain = email.split("@")[-1].lower()
    email_lower = email.lower()

    # If institution_id is provided, use it; otherwise try domain-based detection
    detected_institution_id = None
    
    if institution_id:
        from edulink.apps.institutions.queries import institution_exists
        if institution_exists(institution_id=institution_id):
            detected_institution_id = institution_id
    
    if not detected_institution_id:
        # Domain-based detection (existing logic)
        if domain not in ["gmail.com", "yahoo.com", "outlook.com"]:
            try:
                inst = get_institution_by_domain(domain=domain)
                detected_institution_id = str(inst.id)
            except Exception:
                pass

    try:
        # 1. Check for placeholder record (Adoption Trigger)
        student = Student.objects.get(email=email_lower, user_id__isnull=True)
        student.user_id = user_id
        
        # Don't overwrite existing verified institution unless explicitly provided
        if institution_id:
            student.institution_id = UUID(institution_id)
        
        if registration_number and not student.registration_number:
            student.registration_number = registration_number
            
        student.save()
        
    except Student.DoesNotExist:
        # 2. Create new record
        student = Student.objects.create(
            user_id=user_id,
            institution_id=None,  # Don't auto-set, wait for approval
            email=email_lower,
            is_verified=False,
            registration_number=registration_number,
        )

    # 3. Create affiliation claim if institution found and no approved one exists
    if detected_institution_id:
        from .models import StudentInstitutionAffiliation
        approved_exists = StudentInstitutionAffiliation.objects.filter(
            student_id=student.id, 
            institution_id=UUID(detected_institution_id),
            status=StudentInstitutionAffiliation.STATUS_APPROVED
        ).exists()
        
        if not approved_exists:
            create_institution_affiliation_claim(
                student_id=str(student.id),
                institution_id=detected_institution_id,
                claimed_via=StudentInstitutionAffiliation.CLAIMED_VIA_MANUAL if institution_id else StudentInstitutionAffiliation.CLAIMED_VIA_DOMAIN
            )

    record_event(
        event_type="STUDENT_PRE_REGISTERED",
        actor_id=UUID(str(user_id)),
        entity_type="Student",
        entity_id=student.id,
        payload={
            "email": student.email,
            "institution_id": str(student.institution_id) if student.institution_id else None,
            "detected_institution_id": detected_institution_id,
            "provided_institution_id": institution_id,
            "registration_number": student.registration_number,
            "is_adoption": student.user_id is not None and student.is_verified, # True if it was a placeholder
            "case_c": institution_id is None,
        },
    )

    return student


def bulk_verify_students(
    *, 
    student_entries: list[dict], 
    institution_id: str, 
    department_id: str = None,
    cohort_id: str = None,
    actor_id: str = None
) -> list[Student]:
    """
    Bulk verifies students belonging to an institution.
    - Updates/Creates Affiliation as APPROVED.
    - Links student to institution if not already linked.
    - Sets is_verified = True.
    - Updates registration_number if provided.
    - Optionally assigns Department and Cohort (Adoption Trigger).
    - Records ledger events.
    
    student_entries: list of {'student_id': str, 'registration_number': str}
    """
    from .models import StudentInstitutionAffiliation
    from django.db import transaction
    from edulink.apps.notifications.services import send_student_affiliation_approved_notification
    from edulink.apps.institutions.queries import get_institution_by_id
    
    student_ids = [entry['student_id'] for entry in student_entries if entry.get('student_id')]
    reg_map = {str(entry['student_id']): entry.get('registration_number') for entry in student_entries if entry.get('student_id')}
    
    students = Student.objects.filter(id__in=student_ids)
    verified_students = []

    # Get institution name once
    try:
        institution = get_institution_by_id(institution_id=institution_id)
        institution_name = institution.name
    except Exception:
        institution_name = "Institution"

    for student in students:
        # Check if student belongs to institution OR matches domain/logic
        if student.institution_id and str(student.institution_id) != institution_id:
            # Conflict: Linked to another institution. Skip.
            continue
            
        with transaction.atomic():
            # 1. Ensure Linkage & Registration Number
            update_fields = []
            if str(student.institution_id) != institution_id:
                student.institution_id = institution_id
                update_fields.append("institution_id")
            
            new_reg = reg_map.get(str(student.id))
            if new_reg and student.registration_number != new_reg:
                student.registration_number = new_reg
                update_fields.append("registration_number")
                
            if update_fields:
                student.save(update_fields=update_fields)
            
            # 2. Update/Create Affiliation
            defaults = {
                "status": StudentInstitutionAffiliation.STATUS_APPROVED,
                "claimed_via": StudentInstitutionAffiliation.CLAIMED_VIA_MANUAL,
                "reviewed_by": UUID(actor_id) if actor_id else None
            }
            if department_id:
                defaults["department_id"] = UUID(department_id)
            if cohort_id:
                defaults["cohort_id"] = UUID(cohort_id)

            affiliation, created = StudentInstitutionAffiliation.objects.get_or_create(
                student_id=student.id,
                institution_id=institution_id,
                defaults=defaults
            )
            
            status_changed = False
            fields_to_update = []
            
            if not created:
                if affiliation.status != StudentInstitutionAffiliation.STATUS_APPROVED:
                    affiliation.status = StudentInstitutionAffiliation.STATUS_APPROVED
                    affiliation.reviewed_by = UUID(actor_id) if actor_id else None
                    fields_to_update.extend(["status", "reviewed_by"])
                    status_changed = True
                
                # Update department/cohort if provided and different
                if department_id and str(affiliation.department_id) != department_id:
                    affiliation.department_id = UUID(department_id)
                    fields_to_update.append("department_id")
                    
                if cohort_id and str(affiliation.cohort_id) != cohort_id:
                    affiliation.cohort_id = UUID(cohort_id)
                    fields_to_update.append("cohort_id")
                
                if fields_to_update:
                    affiliation.save(update_fields=fields_to_update)

            # 3. Verify Student
            if not student.is_verified:
                student.is_verified = True
                student.save(update_fields=["is_verified"])

                record_event(
                    event_type="STUDENT_VERIFIED_BY_INSTITUTION",
                    actor_id=UUID(actor_id) if actor_id else None,
                    entity_type="Student",
                    entity_id=student.id,
                    payload={
                        "institution_id": str(institution_id),
                        "department_id": str(department_id) if department_id else None,
                        "cohort_id": str(cohort_id) if cohort_id else None,
                        "method": "bulk_csv",
                        "affiliation_id": str(affiliation.id)
                    },
                )
            
            # Send notification if affiliation was just created or status changed to approved
            if created or status_changed:
                try:
                    send_student_affiliation_approved_notification(
                        user_id=str(student.user_id),
                        institution_name=institution_name,
                        actor_id=actor_id
                    )
                except Exception:
                    # Don't fail the verification if notification fails
                    pass
                    
            verified_students.append(student)

    return verified_students


def bulk_pre_register_students(
    *, 
    entries: list[dict], 
    institution_id: str, 
    department_id: str = None, 
    cohort_id: str = None, 
    actor_id: str = None
) -> list[Student]:
    """
    Bulk pre-registers students who do not have accounts yet.
    - Creates Student records (without user_id yet).
    - Creates APPROVED Affiliations.
    - Sets is_verified = True so they are verified upon registration.
    
    entries: list of {'email': str, 'registration_number': str}
    """
    from .models import StudentInstitutionAffiliation
    from django.db import transaction
    
    pre_registered = []
    
    for entry in entries:
        email = entry.get('email', '').strip().lower()
        reg_number = entry.get('registration_number', '').strip()
        
        if not email:
            continue
            
        with transaction.atomic():
            # Create Student record (Case C / Adoption Trigger)
            # Note: user_id will be None until they actually register
            student, created = Student.objects.get_or_create(
                email=email,
                defaults={
                    'institution_id': UUID(institution_id),
                    'registration_number': reg_number,
                    'is_verified': True,
                    'user_id': None
                }
            )
            
            if not created:
                # If student exists but not verified or not linked, we handle it
                update_fields = []
                if not student.is_verified:
                    student.is_verified = True
                    update_fields.append('is_verified')
                if not student.institution_id:
                    student.institution_id = UUID(institution_id)
                    update_fields.append('institution_id')
                if reg_number and student.registration_number != reg_number:
                    student.registration_number = reg_number
                    update_fields.append('registration_number')
                
                if update_fields:
                    student.save(update_fields=update_fields)

            # Create/Update Affiliation
            defaults = {
                'status': StudentInstitutionAffiliation.STATUS_APPROVED,
                'claimed_via': StudentInstitutionAffiliation.CLAIMED_VIA_MANUAL,
                'reviewed_by': UUID(actor_id) if actor_id else None,
                'department_id': UUID(department_id) if department_id else None,
                'cohort_id': UUID(cohort_id) if cohort_id else None
            }
            
            affiliation, aff_created = StudentInstitutionAffiliation.objects.get_or_create(
                student_id=student.id,
                institution_id=UUID(institution_id),
                defaults=defaults
            )
            
            if not aff_created:
                aff_update_fields = []
                if affiliation.status != StudentInstitutionAffiliation.STATUS_APPROVED:
                    affiliation.status = StudentInstitutionAffiliation.STATUS_APPROVED
                    aff_update_fields.append('status')
                if department_id and str(affiliation.department_id) != department_id:
                    affiliation.department_id = UUID(department_id)
                    aff_update_fields.append('department_id')
                if cohort_id and str(affiliation.cohort_id) != cohort_id:
                    affiliation.cohort_id = UUID(cohort_id)
                    aff_update_fields.append('cohort_id')
                
                if aff_update_fields:
                    affiliation.save(update_fields=aff_update_fields)

            record_event(
                event_type="STUDENT_BULK_PRE_REGISTERED",
                actor_id=UUID(actor_id) if actor_id else None,
                entity_type="Student",
                entity_id=student.id,
                payload={
                    "email": email,
                    "institution_id": institution_id,
                    "registration_number": reg_number,
                    "method": "bulk_csv"
                },
            )
            
            pre_registered.append(student)
            
    return pre_registered


def update_student_trust_level(student_id: UUID, new_level: int, new_points: int) -> None:
    """
    Update student trust level and points.
    Used by Trust Service to enforce architectural boundaries.
    """
    student = Student.objects.get(id=student_id)
    student.trust_level = new_level
    student.trust_points = new_points
    student.save(update_fields=["trust_level", "trust_points"])



def create_institution_affiliation_claim(*, student_id: str, institution_id: str, claimed_via: str) -> StudentInstitutionAffiliation:
    """
    Create a student-institution affiliation claim.
    This creates a pending claim that requires institution approval.
    """
    from uuid import UUID
    
    # Check if affiliation already exists
    existing_affiliation = StudentInstitutionAffiliation.objects.filter(
        student_id=student_id,
        institution_id=institution_id
    ).first()
    
    if existing_affiliation:
        return existing_affiliation
    
    affiliation = StudentInstitutionAffiliation.objects.create(
        student_id=student_id,
        institution_id=institution_id,
        status=StudentInstitutionAffiliation.STATUS_PENDING,
        claimed_via=claimed_via
    )
    
    # Record ledger event
    record_event(
        event_type="STUDENT_CLAIMED_INSTITUTION",
        entity_type="StudentInstitutionAffiliation",
        entity_id=affiliation.id,
        payload={
            "student_id": student_id,
            "institution_id": institution_id,
            "claimed_via": claimed_via,
            "status": affiliation.status,
        },
    )
    
    return affiliation


def approve_institution_affiliation(*, affiliation_id: str, reviewed_by: str, review_notes: str = "") -> StudentInstitutionAffiliation:
    """
    Approve a student-institution affiliation claim.
    Only institution admins can approve.
    """
    affiliation = StudentInstitutionAffiliation.objects.get(id=affiliation_id)
    
    if affiliation.status != StudentInstitutionAffiliation.STATUS_PENDING:
        return affiliation
    
    affiliation.status = StudentInstitutionAffiliation.STATUS_APPROVED
    affiliation.reviewed_by = reviewed_by
    affiliation.review_notes = review_notes
    affiliation.save(update_fields=["status", "reviewed_by", "review_notes"])
    
    # Update student's institution_id
    student = Student.objects.get(id=affiliation.student_id)
    student.institution_id = affiliation.institution_id
    student.is_verified = True
    student.save(update_fields=["institution_id", "is_verified"])
    
    # Record ledger events
    record_event(
        event_type="INSTITUTION_VERIFIED_STUDENT",
        entity_type="StudentInstitutionAffiliation",
        entity_id=affiliation.id,
        payload={
            "student_id": str(affiliation.student_id),
            "institution_id": str(affiliation.institution_id),
            "reviewed_by": reviewed_by,
            "review_notes": review_notes,
        },
    )
    
    record_event(
        event_type="STUDENT_VERIFIED",
        entity_type="Student",
        entity_id=student.id,
        payload={
            "institution_id": str(affiliation.institution_id),
            "verified_by": reviewed_by,
        },
    )
    
    return affiliation


def reject_institution_affiliation(*, affiliation_id: str, reviewed_by: str, review_notes: str = "") -> StudentInstitutionAffiliation:
    """
    Reject a student-institution affiliation claim.
    Only institution admins can reject.
    """
    affiliation = StudentInstitutionAffiliation.objects.get(id=affiliation_id)
    
    if affiliation.status != StudentInstitutionAffiliation.STATUS_PENDING:
        return affiliation
    
    affiliation.status = StudentInstitutionAffiliation.STATUS_REJECTED
    affiliation.reviewed_by = reviewed_by
    affiliation.review_notes = review_notes
    affiliation.save(update_fields=["status", "reviewed_by", "review_notes"])
    
    # Record ledger event
    record_event(
        event_type="INSTITUTION_REJECTED_STUDENT",
        actor_id=UUID(reviewed_by),
        entity_type="StudentInstitutionAffiliation",
        entity_id=affiliation.id,
        payload={
            "student_id": str(affiliation.student_id),
            "institution_id": str(affiliation.institution_id),
            "reviewed_by": reviewed_by,
            "review_notes": review_notes,
        },
    )
    
    return affiliation


def get_pending_affiliations_for_institution(*, institution_id: str):
    """
    Get all pending affiliation claims for an institution.
    """
    return StudentInstitutionAffiliation.objects.filter(
        institution_id=institution_id,
        status=StudentInstitutionAffiliation.STATUS_PENDING
    )


def get_student_affiliations(*, student_id: str):
    """
    Get all affiliations for a student.
    """
    return StudentInstitutionAffiliation.objects.filter(student_id=student_id)


def verify_student_document(*, student_id: str, document_type: str, actor_id: str) -> None:
    """
    Verify a student document.
    """
    student = Student.objects.get(id=student_id)
    
    # Record verification event
    record_event(
        event_type="DOCUMENT_VERIFIED",
        actor_id=UUID(actor_id),
        entity_type="Student",
        entity_id=student_id,
        payload={
            "document_type": document_type,
        },
    )
    
    # Send notification
    try:
        send_document_verified_notification(
            user_id=str(student.user_id),
            document_type=document_type
        )
    except Exception as e:
        logger.error(f"Failed to send document verified notification for {student.user_id}: {e}")


def reject_student_document(*, student_id: str, document_type: str, reason: str, actor_id: str) -> None:
    """
    Reject a student document and clear it.
    """
    student = Student.objects.get(id=student_id)
    
    # Clear the file
    if document_type == 'cv':
        student.cv = None
    elif document_type == 'admission_letter':
        student.admission_letter = None
    elif document_type == 'id_document':
        student.id_document = None
    
    student.save()
    
    # Record rejection event
    record_event(
        event_type="DOCUMENT_REJECTED",
        actor_id=UUID(actor_id),
        entity_type="Student",
        entity_id=student_id,
        payload={
            "document_type": document_type,
            "reason": reason
        },
    )
    
    # Send notification
    try:
        send_document_rejected_notification(
            user_id=str(student.user_id),
            document_type=document_type,
            reason=reason
        )
    except Exception:
        pass
