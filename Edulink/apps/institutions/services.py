from uuid import UUID
import uuid
import logging
from django.utils import timezone
from django.conf import settings

from django.contrib.auth import get_user_model
from edulink.apps.ledger.services import record_event
from edulink.apps.notifications.services import (
    send_institution_request_confirmation,
    send_institution_approval_notification,
    send_institution_rejection_notification,
    send_institution_admin_setup_completion_notification,
    send_institution_staff_invite_notification,
    send_admin_new_onboarding_request_notification,
    send_institution_admin_welcome_notification,
    send_institution_supervisor_activated_notification,
)
from edulink.apps.accounts.services import (
    update_user_profile, 
    create_activated_user, 
    get_user_by_id, 
    get_user_by_email
)
from .models import (
    Institution,
    InstitutionSuggestion,
    InstitutionInterest,
    InstitutionRequest,
    InstitutionInvite,
    InstitutionStaff,
    Department,
    Cohort,
    InstitutionStaffProfileRequest,
)
from .request_helpers import generate_tracking_code

import secrets
from django.db import transaction
from django.contrib.auth.hashers import make_password, check_password

logger = logging.getLogger(__name__)


@transaction.atomic
def update_institution_staff_details(
    *, staff_id: str, institution_id: str, actor_id: str, data: dict
) -> InstitutionStaff:
    """
    Update a staff member's personal details (User model).
    """
    try:
        staff = InstitutionStaff.objects.get(id=staff_id, institution_id=institution_id)
    except InstitutionStaff.DoesNotExist:
        raise ValueError("Staff member not found or does not belong to your institution")
    
    # Update user profile
    update_user_profile(
        user_id=str(staff.user_id),
        actor_id=actor_id,
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        email=data.get("email"),
    )
    
    record_event(
        event_type="INSTITUTION_STAFF_DETAILS_UPDATED",
        actor_id=actor_id,
        entity_type="InstitutionStaff",
        entity_id=staff_id,
        payload={
            "first_name": data.get("first_name"),
            "last_name": data.get("last_name"),
            "email": data.get("email"),
        }
    )
    
    return staff


def remove_institution_staff(
    *,
    staff_id: str,
    actor_id: str,
) -> None:
    """
    Remove a staff member from an institution (soft delete).
    Records event in ledger.
    """
    try:
        staff = InstitutionStaff.objects.get(id=staff_id)
    except InstitutionStaff.DoesNotExist:
        raise ValueError("Staff member not found")

    if not staff.is_active:
        return # Already removed

    staff.is_active = False
    staff.save()

    record_event(
        event_type="INSTITUTION_STAFF_REMOVED",
        entity_type="InstitutionStaff",
        entity_id=staff.id,
        actor_id=actor_id,
        payload={
            "institution_id": str(staff.institution.id),
            "user_id": str(staff.user.id),
            "removed_by": actor_id,
            "role": staff.role,
        },
    )


def update_institution_staff_personal_details(
    *,
    staff_id: str,
    actor_id: str,
    first_name: str | None = None,
    last_name: str | None = None,
    email: str | None = None,
) -> InstitutionStaff:
    try:
        staff = (
            InstitutionStaff.objects
            .select_related("user", "institution")
            .get(id=staff_id, is_active=True)
        )
    except InstitutionStaff.DoesNotExist:
        raise ValueError("Staff member not found")

    update_data: dict[str, str] = {}
    if first_name is not None:
        update_data["first_name"] = first_name
    if last_name is not None:
        update_data["last_name"] = last_name
    if email is not None:
        update_data["email"] = email

    if not update_data:
        return staff

    update_user_profile(
        user_id=str(staff.user.id),
        actor_id=actor_id,
        **update_data,
    )

    staff.user.refresh_from_db()
    return staff


def submit_institution_staff_profile_request(
    *,
    staff_id: str,
    actor_id: str,
    requested_changes: dict,
) -> InstitutionStaffProfileRequest:
    try:
        staff = (
            InstitutionStaff.objects
            .select_related("user", "institution")
            .get(id=staff_id, is_active=True)
        )
    except InstitutionStaff.DoesNotExist:
        raise ValueError("Staff member not found")

    if str(staff.user.id) != str(actor_id):
        raise PermissionError("Only the staff member can submit a profile update request")

    if staff.role != InstitutionStaff.ROLE_SUPERVISOR:
        raise PermissionError("Only supervisors can submit profile update requests")

    if InstitutionStaffProfileRequest.objects.filter(
        staff=staff,
        status=InstitutionStaffProfileRequest.STATUS_PENDING,
    ).exists():
        raise ValueError("There is already a pending profile update request")

    cleaned_changes: dict[str, str] = {}
    for field in ["first_name", "last_name", "email"]:
        if field in requested_changes:
            value = requested_changes[field]
            if value is not None:
                cleaned_changes[field] = value

    if not cleaned_changes:
        raise ValueError("No valid changes provided")

    request = InstitutionStaffProfileRequest.objects.create(
        staff=staff,
        institution=staff.institution,
        requested_changes=cleaned_changes,
        status=InstitutionStaffProfileRequest.STATUS_PENDING,
    )

    record_event(
        event_type="INSTITUTION_STAFF_PROFILE_UPDATE_REQUESTED",
        entity_type="InstitutionStaffProfileRequest",
        entity_id=request.id,
        actor_id=str(actor_id),
        payload={
            "staff_id": str(staff.id),
            "institution_id": str(staff.institution.id),
            "requested_changes": cleaned_changes,
        },
    )

    return request


def review_institution_staff_profile_request(
    *,
    request_id: UUID,
    action: str,
    reviewer_id: str,
    admin_feedback: str | None = None,
) -> InstitutionStaffProfileRequest:
    try:
        request = (
            InstitutionStaffProfileRequest.objects
            .select_related("staff__user", "institution")
            .get(id=request_id)
        )
    except InstitutionStaffProfileRequest.DoesNotExist:
        raise ValueError("Profile update request not found")

    if request.status != InstitutionStaffProfileRequest.STATUS_PENDING:
        raise ValueError("Profile update request is not pending")

    if action not in ["approve", "reject"]:
        raise ValueError("Action must be 'approve' or 'reject'")

    if not InstitutionStaff.objects.filter(
        user__id=reviewer_id,
        role=InstitutionStaff.ROLE_ADMIN,
        is_active=True,
        institution=request.institution,
    ).exists():
        raise PermissionError("Only institution admins can review profile update requests")

    if action == "approve":
        update_institution_staff_personal_details(
            staff_id=str(request.staff.id),
            actor_id=reviewer_id,
            **request.requested_changes,
        )
        request.status = InstitutionStaffProfileRequest.STATUS_APPROVED
        event_type = "INSTITUTION_STAFF_PROFILE_UPDATE_REQUEST_APPROVED"
    else:
        request.status = InstitutionStaffProfileRequest.STATUS_REJECTED
        event_type = "INSTITUTION_STAFF_PROFILE_UPDATE_REQUEST_REJECTED"

    request.reviewed_by_id = reviewer_id
    request.reviewed_at = timezone.now()
    request.admin_feedback = admin_feedback or ""
    request.save()

    record_event(
        event_type=event_type,
        entity_type="InstitutionStaffProfileRequest",
        entity_id=request.id,
        actor_id=str(reviewer_id),
        payload={
            "staff_id": str(request.staff.id),
            "institution_id": str(request.institution.id),
            "requested_changes": request.requested_changes,
            "admin_feedback": request.admin_feedback,
            "status": request.status,
        },
    )

    return request


def create_institution_by_admin(
    *,
    name: str,
    domain: str,
    admin_id: str | None = None,
    website_url: str = "",
    contact_email: str = "",
    contact_phone: str = "",
    address: str = "",
    description: str = "",
) -> Institution:
    institution = Institution.objects.create(
        name=name,
        domain=domain.lower(),
        is_active=False,
        is_verified=True,
        status=Institution.STATUS_VERIFIED,
        verification_method="ADMIN_APPROVED",
        website_url=website_url,
        contact_email=contact_email,
        contact_phone=contact_phone,
        address=address,
        description=description,
    )

    record_event(
        event_type="INSTITUTION_CREATED",
        actor_id=admin_id,
        entity_type="Institution",
        entity_id=institution.id,
        payload={
            "name": institution.name,
            "domain": institution.domain,
            "created_by": admin_id,
            "verification_method": institution.verification_method,
            "is_active": False,
            "status": institution.status,
            "website_url": website_url,
            "contact_email": contact_email,
        },
    )

    record_event(
        event_type="INSTITUTION_VERIFIED",
        actor_id=admin_id,
        entity_type="Institution",
        entity_id=institution.id,
        payload={
            "verification_method": institution.verification_method,
            "verified_by": admin_id,
        },
    )

    return institution


def request_institution(
    *,
    name: str,
    domain: str,
    requested_by_user_id: str | None = None,
    proof: str | None = None,
) -> InstitutionRequest:
    """
    Legacy function - now creates an InstitutionRequest instead of Institution.
    This maintains backward compatibility while implementing the new Path B flow.
    """
    return submit_institution_request(
        institution_name=name,
        website_url=f"https://{domain.lower()}",  # Construct basic URL from domain
        requested_domains=[domain.lower()],
        representative_name="Unknown",  # Legacy requests don't have rep info
        representative_email=f"unknown@{domain.lower()}",  # Placeholder email
        representative_role="Unknown",
        representative_phone=None,
        department=None,
        notes=proof or "Legacy institution request",
    )


def update_institution(
    *,
    institution_id: UUID,
    name: str,
    domain: str,
) -> Institution:
    institution = Institution.objects.get(id=institution_id)

    old_name = institution.name
    old_domain = institution.domain

    institution.name = name
    institution.domain = domain.lower()
    institution.save(update_fields=["name", "domain"])

    record_event(
        event_type="INSTITUTION_UPDATED",
        entity_type="Institution",
        entity_id=institution.id,
        payload={
            "old": {
                "name": old_name,
                "domain": old_domain,
            },
            "new": {
                "name": institution.name,
                "domain": institution.domain,
            },
        },
    )

    return institution


def verify_institution(
    *,
    institution_id: UUID,
    verification_method: str,
    reviewer_id: str | None = None,
) -> Institution:
    institution = Institution.objects.get(id=institution_id)

    if institution.is_verified and institution.is_active:
        return institution

    institution.is_verified = True
    institution.is_active = True
    institution.status = Institution.STATUS_ACTIVE
    institution.verification_method = verification_method
    institution.save(update_fields=["is_verified", "is_active", "status", "verification_method"])

    record_event(
        event_type="INSTITUTION_VERIFIED",
        entity_type="Institution",
        entity_id=institution.id,
        payload={
            "verification_method": verification_method,
            "reviewer_id": reviewer_id,
            "is_active": institution.is_active,
        },
    )

    # Notify users who expressed interest in this institution
    try:
        from edulink.apps.notifications.services import notify_institution_interested_users
        notify_institution_interested_users(
            institution_name=institution.name,
            institution_domain=institution.domain
        )
    except Exception as e:
        # Log the error but don't fail the verification process
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to notify interested users about {institution.name} verification: {e}")

    return institution


def deactivate_institution(*, institution_id: UUID, actor_id: str | None = None) -> Institution:
    institution = Institution.objects.get(id=institution_id)

    if not institution.is_active and institution.status == Institution.STATUS_SUSPENDED:
        return institution

    institution.is_active = False
    institution.status = Institution.STATUS_SUSPENDED
    institution.save(update_fields=["is_active", "status"])

    record_event(
        event_type="INSTITUTION_DEACTIVATED",
        entity_type="Institution",
        entity_id=institution.id,
        payload={
            "is_active": False,
            "status": institution.status,
            "actor_id": actor_id,
        },
    )

    return institution


def suggest_institution(
    *,
    name: str,
    domain: str,
    student_id: str | None = None,
) -> InstitutionSuggestion:
    suggestion = InstitutionSuggestion.objects.create(
        name=name,
        domain=domain.lower(),
        student_id=student_id,
    )

    record_event(
        event_type="INSTITUTION_SUGGESTED",
        entity_type="InstitutionSuggestion",
        entity_id=suggestion.id,
        payload={
            "name": suggestion.name,
            "domain": suggestion.domain,
            "student_id": student_id,
        },
    )

    return suggestion


def review_institution_suggestion(*, suggestion_id: UUID, actor_id: str) -> InstitutionSuggestion:
    """
    Mark an institution suggestion as reviewed.
    """
    suggestion = InstitutionSuggestion.objects.get(id=suggestion_id)
    suggestion.status = "reviewed"
    suggestion.save(update_fields=["status"])
    
    record_event(
        event_type="INSTITUTION_SUGGESTION_REVIEWED",
        entity_type="InstitutionSuggestion",
        entity_id=suggestion.id,
        actor_id=actor_id,
        payload={"status": suggestion.status}
    )
    return suggestion

def accept_institution_suggestion(*, suggestion_id: UUID, actor_id: str) -> InstitutionSuggestion:
    """
    Accept an institution suggestion.
    """
    suggestion = InstitutionSuggestion.objects.get(id=suggestion_id)
    suggestion.status = "accepted"
    suggestion.save(update_fields=["status"])
    
    record_event(
        event_type="INSTITUTION_SUGGESTION_ACCEPTED",
        entity_type="InstitutionSuggestion",
        entity_id=suggestion.id,
        actor_id=actor_id,
        payload={"status": suggestion.status}
    )
    return suggestion

def reject_institution_suggestion(*, suggestion_id: UUID, actor_id: str) -> InstitutionSuggestion:
    """
    Reject an institution suggestion.
    """
    suggestion = InstitutionSuggestion.objects.get(id=suggestion_id)
    suggestion.status = "rejected"
    suggestion.save(update_fields=["status"])
    
    record_event(
        event_type="INSTITUTION_SUGGESTION_REJECTED",
        entity_type="InstitutionSuggestion",
        entity_id=suggestion.id,
        actor_id=actor_id,
        payload={"status": suggestion.status}
    )
    return suggestion


def get_institution_by_id(*, institution_id: UUID) -> Institution:
    """Get institution by ID."""
    try:
        return Institution.objects.get(id=institution_id)
    except Institution.DoesNotExist:
        raise ValueError("Institution not found")


def record_institution_interest(
    *,
    student_id: str,
    raw_name: str,
    email_domain: str | None = None,
    user_email: str | None = None,
) -> InstitutionInterest:
    """
    Used when students skip institution selection but provide intent.
    Does not affect trust levels or create actual associations.
    """
    interest = InstitutionInterest.objects.create(
        student_id=student_id,
        user_email=user_email or "",
        raw_name=raw_name,
        email_domain=email_domain or "",
    )

    # Use student_id as actor if available, otherwise use None for anonymous
    actor_id = UUID(student_id) if student_id else None

    record_event(
        event_type="INSTITUTION_INTEREST_RECORDED",
        actor_id=actor_id,
        entity_type="InstitutionInterest",
        entity_id=interest.id,
        payload={
            "student_id": student_id,
            "user_email": user_email,
            "raw_name": raw_name,
            "email_domain": email_domain,
        },
    )

    return interest


def submit_institution_request(
    *,
    institution_name: str,
    website_url: str,
    requested_domains: list[str],
    representative_name: str,
    representative_email: str,
    representative_role: str,
    representative_phone: str | None = None,
    supporting_document=None,
    department: str | None = None,
    notes: str | None = None,
) -> InstitutionRequest:
    """
    Submit an institution onboarding request for admin review.
    This creates a request, not an institution - following Path B architecture.
    """
    # Generate unique tracking code
    tracking_code = generate_tracking_code()
    
    request = InstitutionRequest.objects.create(
        institution_name=institution_name,
        website_url=website_url,
        requested_domains=requested_domains,
        representative_name=representative_name,
        representative_email=representative_email.lower(),
        representative_role=representative_role,
        representative_phone=representative_phone or "",
        supporting_document=supporting_document,
        department=department or "",
        notes=notes or "",
        status=InstitutionRequest.STATUS_PENDING,
        tracking_code=tracking_code,
    )

    record_event(
        event_type="INSTITUTION_REQUEST_SUBMITTED",
        actor_id=None,
        entity_type="InstitutionRequest",
        entity_id=request.id,
        payload={
            "institution_name": institution_name,
            "website_url": website_url,
            "requested_domains": requested_domains,
            "representative_name": representative_name,
            "representative_email": representative_email,
            "representative_role": representative_role,
            "tracking_code": tracking_code,
        },
    )

    # Send confirmation email with tracking code
    try:
        send_institution_request_confirmation(institution_request=request)
    except Exception as e:
        # Log email failure but don't fail the request submission
        logger.warning(f"Failed to send institution request confirmation email: {e}")

    # Notify platform admins
    try:
        send_admin_new_onboarding_request_notification(
            request_type="Institution",
            name=institution_name,
            representative_name=representative_name,
            email=representative_email,
            tracking_code=tracking_code,
            review_link=f"{settings.FRONTEND_URL}/admin/institutions/requests"
        )
    except Exception as e:
        logger.warning(f"Failed to send admin notification for institution request: {e}")

    return request


def get_institution_contact_info(*, institution_id: UUID) -> dict:
    """
    Get institution contact information from the most recent approved request.
    
    Returns:
        dict: Contact information including representative name, email, phone, and department
    """
    try:
        # Get the most recent approved institution request for this institution
        institution_request = InstitutionRequest.objects.filter(
            institution_name__iexact=Institution.objects.get(id=institution_id).name,
            status=InstitutionRequest.STATUS_APPROVED
        ).order_by('-reviewed_at').first()
        
        if not institution_request:
            return {
                "representative_name": None,
                "representative_email": None,
                "representative_phone": None,
                "department": None,
                "website_url": None,
                "tracking_code": None,
                "source": "no_approved_request"
            }
        
        # Record event for auditability
        record_event(
            event_type="INSTITUTION_CONTACT_INFO_RETRIEVED",
            actor_id=None,
            entity_type="Institution",
            entity_id=institution_id,
            payload={
                "request_id": str(institution_request.id),
                "representative_name": institution_request.representative_name,
                "representative_email": institution_request.representative_email,
                "department": institution_request.department,
            },
        )
        
        return {
            "representative_name": institution_request.representative_name,
            "representative_email": institution_request.representative_email,
            "representative_phone": institution_request.representative_phone,
            "department": institution_request.department,
            "website_url": institution_request.website_url,
            "tracking_code": institution_request.tracking_code,
            "source": "approved_request"
        }
    except Institution.DoesNotExist:
        raise ValueError(f"Institution with ID {institution_id} not found")
    except Exception as e:
        logger.error(f"Error retrieving institution contact info for {institution_id}: {e}")
        # Return empty/null data instead of raising to allow serialization to continue
        return {
            "representative_name": None,
            "representative_email": None,
            "representative_phone": None,
            "department": None,
            "website_url": None,
            "tracking_code": None,
            "source": "error"
        }


def submit_institution_request_step(
    *,
    step: int,
    step_data: dict,
    session_id: str | None = None,
) -> dict:
    """
    Submit a step of institution request using progressive disclosure.
    
    Args:
        step: Step number (1-4)
        step_data: Data for the current step
        session_id: Optional session ID to maintain state across steps
        
    Returns:
        dict: Result with validation status and any errors
    """
    from .serializers import (
        InstitutionRequestStep1Serializer,
        InstitutionRequestStep2Serializer,
        InstitutionRequestStep3Serializer,
        InstitutionRequestStep4Serializer,
    )
    
    step_serializers = {
        1: InstitutionRequestStep1Serializer,
        2: InstitutionRequestStep2Serializer,
        3: InstitutionRequestStep3Serializer,
        4: InstitutionRequestStep4Serializer,
    }
    
    if step not in step_serializers:
        return {
            "success": False,
            "errors": {"step": [f"Invalid step number: {step}. Must be 1-4."]},
            "session_id": session_id,
        }
    
    serializer_class = step_serializers[step]
    serializer = serializer_class(data=step_data)
    
    if not serializer.is_valid():
        return {
            "success": False,
            "errors": serializer.errors,
            "session_id": session_id,
        }
    
    # If this is the final step, submit the complete request
    if step == 4:
        # Combine all step data (in a real implementation, you'd store intermediate steps)
        # For now, we'll use the step 4 data as the complete request
        complete_data = serializer.validated_data
        
        try:
            # Submit the complete institution request
            institution_request = submit_institution_request(
                institution_name=complete_data.get("institution_name", ""),
                website_url=complete_data.get("website_url", ""),
                requested_domains=complete_data.get("requested_domains", []),
                representative_name=complete_data.get("representative_name", ""),
                representative_email=complete_data.get("representative_email", ""),
                representative_role=complete_data.get("representative_role", ""),
                representative_phone=complete_data.get("representative_phone"),
                supporting_document=complete_data.get("supporting_document"),
                department=complete_data.get("department"),
                notes=complete_data.get("notes"),
            )
            
            record_event(
                event_type="INSTITUTION_REQUEST_SUBMITTED_PROGRESSIVE",
                actor_id=None,
                entity_type="InstitutionRequest",
                entity_id=institution_request.id,
                payload={
                    "step": step,
                    "institution_name": institution_request.institution_name,
                    "tracking_code": institution_request.tracking_code,
                    "session_id": session_id,
                },
            )
            
            return {
                "success": True,
                "institution_request_id": str(institution_request.id),
                "tracking_code": institution_request.tracking_code,
                "session_id": session_id,
            }
            
        except Exception as e:
            logger.error(f"Failed to submit complete institution request: {e}")
            return {
                "success": False,
                "errors": {"submission": ["Failed to submit institution request. Please try again."]},
                "session_id": session_id,
            }
    
    # For intermediate steps, just validate and return success
    try:
        event_entity_id = uuid.UUID(session_id) if session_id else uuid.uuid4()
    except ValueError:
        event_entity_id = uuid.uuid4()

    record_event(
        event_type="INSTITUTION_REQUEST_STEP_VALIDATED",
        actor_id=None,
        entity_type="InstitutionRequest",
        entity_id=event_entity_id,
        payload={
            "step": step,
            "step_data_keys": list(step_data.keys()),
            "session_id": session_id,
        },
    )
    
    return {
        "success": True,
        "step_validated": step,
        "session_id": session_id,
    }


from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

def review_institution_request(
    *,
    request_id: UUID,
    action: str,
    reviewer_id: str,
    rejection_reason_code: str | None = None,
    rejection_reason: str | None = None,
) -> InstitutionRequest:
    """
    Review an institution onboarding request (approve or reject).
    
    Args:
        request_id: UUID of the InstitutionRequest
        action: 'approve' or 'reject'
        reviewer_id: ID of the platform admin performing the review
        rejection_reason: Required when action is 'reject'
    
    Returns:
        Updated InstitutionRequest
    """
    try:
        institution_request = InstitutionRequest.objects.get(id=request_id)
    except InstitutionRequest.DoesNotExist:
        raise ValueError(f"Institution request {request_id} not found")
    
    if institution_request.status != InstitutionRequest.STATUS_PENDING:
        raise ValueError(f"Institution request {request_id} is not pending review")
    
    if action not in ['approve', 'reject']:
        raise ValueError("Action must be 'approve' or 'reject'")
    
    if action == 'reject' and not rejection_reason_code:
        raise ValueError("Rejection reason code is required when rejecting a request")
    
    if rejection_reason_code and rejection_reason_code not in [
        code for code, _ in InstitutionRequest.REJECTION_REASON_CHOICES
    ]:
        raise ValueError(f"Invalid rejection reason code: {rejection_reason_code}")
    
    # Update the request status
    institution_request.status = (
        InstitutionRequest.STATUS_APPROVED if action == 'approve' 
        else InstitutionRequest.STATUS_REJECTED
    )
    institution_request.rejection_reason_code = rejection_reason_code if action == 'reject' else ""
    institution_request.rejection_reason = rejection_reason if action == 'reject' else ""
    institution_request.reviewed_at = timezone.now()
    institution_request.save()
    
    if action == 'approve':
        # Create the institution
        institution = create_institution_by_admin(
            name=institution_request.institution_name,
            domain=institution_request.requested_domains[0] if institution_request.requested_domains else '',
            admin_id=reviewer_id,
            website_url=institution_request.website_url,
            contact_email=institution_request.representative_email,
            contact_phone=institution_request.representative_phone,
            description=institution_request.notes,
        )
        
        # Generate secure invite token
        raw_token = secrets.token_urlsafe(32)
        token_hash = make_password(raw_token)
        
        # Create invite record
        # Expires in 72 hours per blueprint
        invite = InstitutionInvite.objects.create(
            institution=institution,
            email=institution_request.representative_email,
            role=User.ROLE_INSTITUTION_ADMIN,
            token_hash=token_hash,
            expires_at=timezone.now() + timezone.timedelta(hours=72),
            status=InstitutionInvite.STATUS_PENDING,
            created_by=UUID(reviewer_id) if reviewer_id else None
        )
        
        # Record approval event
        record_event(
            event_type="INSTITUTION_REQUEST_APPROVED",
            actor_id=reviewer_id,
            entity_type="InstitutionRequest",
            entity_id=institution_request.id,
            payload={
                "institution_name": institution_request.institution_name,
                "representative_name": institution_request.representative_name,
                "representative_email": institution_request.representative_email,
                "institution_id": str(institution.id),
                "reviewer_id": reviewer_id,
                "invite_id": str(invite.id),
            },
        )
        
        # Send approval notification with raw token
        try:
            send_institution_approval_notification(
                institution_request=institution_request,
                invite_token=raw_token,
                invite_id=str(invite.id)
            )
        except Exception as e:
            logger.warning(f"Failed to send institution approval notification: {e}")
            
    else:  # reject
        # Record rejection event
        record_event(
            event_type="INSTITUTION_REQUEST_REJECTED",
            actor_id=reviewer_id,
            entity_type="InstitutionRequest",
            entity_id=institution_request.id,
            payload={
                "institution_name": institution_request.institution_name,
                "representative_name": institution_request.representative_name,
                "representative_email": institution_request.representative_email,
                "rejection_reason_code": rejection_reason_code,
                "rejection_reason": rejection_reason,
                "reviewer_id": reviewer_id,
            },
        )
        
        # Send rejection notification
        try:
            send_institution_rejection_notification(
                institution_request=institution_request,
                rejection_reason_code=rejection_reason_code,
                rejection_reason=rejection_reason
            )
        except Exception as e:
            logger.warning(f"Failed to send institution rejection notification: {e}")
            
    return institution_request


def validate_institution_invite_token(invite_id: str, token: str) -> InstitutionInvite:
    """
    Validate an institution invite token.
    Checks if token matches hash and is not expired/used.
    """
    try:
        invite = InstitutionInvite.objects.get(id=invite_id)
    except InstitutionInvite.DoesNotExist:
        raise ValueError("Invalid invitation link")
        
    if invite.status != InstitutionInvite.STATUS_PENDING:
        raise ValueError("Invitation is no longer valid")
        
    if timezone.now() > invite.expires_at:
        invite.status = InstitutionInvite.STATUS_EXPIRED
        invite.save()
        raise ValueError("Invitation has expired")
        
    if not check_password(token, invite.token_hash):
        raise ValueError("Invalid invitation token")
        
    return invite


@transaction.atomic
def activate_institution_admin_from_invite(
    *,
    invite_id: str,
    token: str,
    password: str,
    first_name: str,
    last_name: str,
    phone_number: str = "",
) -> User:
    """
    Activate an institution admin account from an invite.
    
    Phase 2 of canonical blueprint:
    - Validate token
    - Create/Activate User
    - Set Password
    - Invalidate Invite
    """
    from django.contrib.auth.hashers import check_password
    
    invite = validate_institution_invite_token(invite_id, token)
    
    # Check if user already exists (shouldn't happen in standard flow, but handle it)
    if User.objects.filter(email=invite.email).exists():
        # Ideally we should link, but for security in this strict flow, 
        # we might want to error or handle carefully.
        # Blueprint says: "System does NOT: Create a usable login... until activation"
        # So user shouldn't exist.
        raise ValueError("User with this email already exists")

    # Create User
    # Note: AbstractUser requires username, we use email as username
    user = create_activated_user(
        email=invite.email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=User.ROLE_INSTITUTION_ADMIN,
        phone_number=phone_number,
    )
    
    # Create InstitutionStaff record
    InstitutionStaff.objects.create(
        institution=invite.institution,
        user=user,
        role=InstitutionStaff.ROLE_ADMIN,
        is_active=True
    )
    
    # Update Invite Status
    invite.status = InstitutionInvite.STATUS_ACCEPTED
    invite.save()
    
    # Activate Institution if not already active (Trust Tier Level 1 logic)
    institution = invite.institution
    
    # Enhancement: Ensure profile data is populated from the original request if missing
    # This handles cases where data might have been missed during creation or if using legacy flows
    if not institution.website_url or not institution.contact_phone:
        try:
            # Find the approved request associated with this invite/email
            original_request = InstitutionRequest.objects.filter(
                representative_email=invite.email,
                status=InstitutionRequest.STATUS_APPROVED
            ).order_by('-reviewed_at').first()
            
            if original_request:
                updates = []
                if not institution.website_url and original_request.website_url:
                    institution.website_url = original_request.website_url
                    updates.append('website_url')
                
                if not institution.contact_phone and original_request.representative_phone:
                    institution.contact_phone = original_request.representative_phone
                    updates.append('contact_phone')
                    
                if not institution.contact_email and original_request.representative_email:
                    institution.contact_email = original_request.representative_email
                    updates.append('contact_email')
                
                if updates:
                    institution.save(update_fields=updates)
                    logger.info(f"Auto-populated institution profile fields {updates} from request {original_request.id}")
        except Exception as e:
            logger.warning(f"Failed to auto-populate institution profile from request: {e}")

    if not institution.is_active:
        institution.is_active = True
        institution.status = Institution.STATUS_ACTIVE
        institution.save(update_fields=['is_active', 'status'])
        
        record_event(
            event_type="INSTITUTION_ACTIVATED_BY_ADMIN",
            actor_id=user.id,
            entity_type="Institution",
            entity_id=institution.id,
            payload={
                "admin_id": str(user.id),
                "reason": "First admin activation"
            }
        )
        
        # Recompute trust tier to ensure it moves to Level 1
        from edulink.apps.trust.services import compute_institution_trust_tier
        compute_institution_trust_tier(institution_id=institution.id)
    
    record_event(
        event_type="INSTITUTION_ADMIN_ACTIVATED",
        actor_id=user.id,
        entity_type="User",
        entity_id=str(user.id),
        payload={
            "invite_id": str(invite_id),
            "institution_id": str(invite.institution.id),
            "email": invite.email,
            "first_name": first_name,
            "last_name": last_name,
        }
    )
    
    # Send welcome email
    send_institution_admin_welcome_notification(
        user=user,
        institution_name=institution.name,
        actor_id=str(user.id)
    )
    
    return user


@transaction.atomic
def update_institution_profile(
    *,
    institution_id: str,
    data: dict,
    actor_id: str
) -> Institution:
    """
    Update institution profile information.
    """
    try:
        institution = Institution.objects.get(id=institution_id)
    except Institution.DoesNotExist:
        raise ValueError("Institution not found")

    updated_fields = []
    allowed_fields = ['website_url', 'contact_email', 'contact_phone', 'address', 'description']

    for field in allowed_fields:
        if field in data:
            setattr(institution, field, data[field])
            updated_fields.append(field)

    if updated_fields:
        institution.save()
        
        record_event(
            event_type="INSTITUTION_PROFILE_UPDATED",
            entity_type="Institution",
            entity_id=institution.id,
            actor_id=actor_id,
            payload={
                "updated_fields": updated_fields
            }
        )

    return institution


def create_institution_supervisor_invite(
    *,
    institution_id: UUID,
    admin_user_id: str,
    email: str,
    department_id: UUID,
    cohort_id: UUID | None = None,
) -> InstitutionInvite:
    """
    Create an invite for an institution supervisor.
    """
    institution = Institution.objects.get(id=institution_id)
    
    # Validate Department
    try:
        dept = Department.objects.get(id=department_id, institution=institution)
    except Department.DoesNotExist:
        raise ValueError("Invalid department or not found in this institution")
    
    department_name = dept.name
    
    # Validate Cohort
    cohort_name = ""
    if cohort_id:
        try:
            coh = Cohort.objects.get(id=cohort_id, department=dept)
        except Cohort.DoesNotExist:
             raise ValueError("Invalid cohort or not found in this department")
        cohort_name = coh.name
    
    # Check if user already exists
    if User.objects.filter(email=email).exists():
        raise ValueError("User with this email already exists")

    # Check if invite already exists
    if InstitutionInvite.objects.filter(
        institution=institution,
        email=email,
        status=InstitutionInvite.STATUS_PENDING
    ).exists():
        raise ValueError("An active invitation already exists for this email")

    raw_token = secrets.token_urlsafe(32)
    token_hash = make_password(raw_token)
    
    invite = InstitutionInvite.objects.create(
        institution=institution,
        email=email,
        role=InstitutionStaff.ROLE_SUPERVISOR,
        department=department_name,
        cohort=cohort_name,
        token_hash=token_hash,
        expires_at=timezone.now() + timezone.timedelta(hours=72),
        status=InstitutionInvite.STATUS_PENDING,
        created_by=UUID(admin_user_id)
    )
    
    # Record event
    record_event(
        event_type="INSTITUTION_SUPERVISOR_INVITED",
        actor_id=admin_user_id,
        entity_type="InstitutionInvite",
        entity_id=invite.id,
        payload={
            "institution_id": str(institution.id),
            "email": email,
            "department": department_name,
            "cohort": cohort_name,
            "department_id": str(department_id),
            "cohort_id": str(cohort_id) if cohort_id else None,
        }
    )
    
    # Send email
    try:
        admin_user = User.objects.get(id=admin_user_id)
        send_institution_staff_invite_notification(
            recipient_email=email,
            invite_token=raw_token,
            invite_id=str(invite.id),
            role_display="Supervisor",
            institution_name=institution.name,
            sender_name=admin_user.get_full_name(),
            actor_id=admin_user_id
        )
    except Exception as e:
        logger.warning(f"Failed to send supervisor invite email: {e}")
        
    return invite


@transaction.atomic
def activate_institution_supervisor_from_invite(
    *,
    invite_id: str,
    token: str,
    password: str,
    first_name: str,
    last_name: str,
) -> User:
    """
    Activate an institution supervisor account from an invite.
    """
    invite = validate_institution_invite_token(invite_id, token)
    
    if invite.role != InstitutionStaff.ROLE_SUPERVISOR:
        raise ValueError("Invalid invite role for supervisor activation")

    if User.objects.filter(email=invite.email).exists():
        raise ValueError("User with this email already exists")

    # Create User
    user = create_activated_user(
        email=invite.email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=User.ROLE_SUPERVISOR,
        institution_id=invite.institution.id  # Link to institution
    )
    
    # Create InstitutionStaff record
    InstitutionStaff.objects.create(
        institution=invite.institution,
        user=user,
        role=InstitutionStaff.ROLE_SUPERVISOR,
        department=invite.department,
        cohort=invite.cohort,
        is_active=True
    )
    
    # Update Invite Status
    invite.status = InstitutionInvite.STATUS_ACCEPTED
    invite.save()
    
    record_event(
        event_type="INSTITUTION_SUPERVISOR_ACTIVATED",
        actor_id=user.id,
        entity_type="User",
        entity_id=str(user.id),
        payload={
            "invite_id": str(invite_id),
            "institution_id": str(invite.institution.id),
            "department": invite.department,
            "cohort": invite.cohort,
        }
    )

    # Send activation email
    try:
        send_institution_supervisor_activated_notification(
            user=user,
            institution_name=invite.institution.name,
            department=invite.department,
            cohort=invite.cohort,
            actor_id=str(user.id)
        )
    except Exception as e:
        logger.warning(f"Failed to send supervisor activation email: {e}")
    
    return user


def complete_institution_admin_setup(
    *,
    admin_user_id: str,
    institution_name: str,
    institution_website: str,
    primary_domain: str,
    admin_title: str,
    institution_size: str,
    primary_use_case: str,
    backup_admin_email: str,
    backup_admin_name: str,
    agree_to_verification_authority: bool,
    admin_phone: str | None = None,
    department: str | None = None,
) -> dict:
    """
    Complete setup for institution admin after account creation.
    
    Phase 3 of canonical blueprint:
    - Mandatory setup before operational access
    - Confirm institution profile
    - Register official domains
    - Add backup admin
    - Explicitly accept verification authority
    """
    admin_user = get_user_by_id(user_id=admin_user_id)
    if admin_user.role != User.ROLE_INSTITUTION_ADMIN:
        raise ValueError("User must be an institution admin to complete setup")

    staff_record = InstitutionStaff.objects.filter(
        user=admin_user, 
        role=InstitutionStaff.ROLE_ADMIN
    ).first()
    
    if staff_record:
        institution = staff_record.institution
    else:
        # Fallback to invite for legacy/transition support
        invite = InstitutionInvite.objects.filter(
            email=admin_user.email, 
            status=InstitutionInvite.STATUS_ACCEPTED
        ).order_by('-created_at').first()
        
        if not invite:
            raise ValueError("No institution association found for this user.")
        
        institution = invite.institution
        
        # Self-heal: Create InstitutionStaff record
        InstitutionStaff.objects.create(
            institution=institution,
            user=admin_user,
            role=InstitutionStaff.ROLE_ADMIN,
            is_active=True
        )
    
    # Update institution details
    institution.name = institution_name
    institution.domain = primary_domain
    institution.is_active = True
    institution.status = Institution.STATUS_ACTIVE
    institution.verification_method = 'admin_setup'
    institution.save()
    
    # Update admin user profile
    from edulink.apps.accounts.services import update_user_profile
    update_user_profile(
        user_id=str(admin_user.id),
        actor_id=admin_user_id,
        phone_number=admin_phone or ""
    )

    # Create backup admin invite if provided
    if backup_admin_email:
        # Check if invite already exists to avoid duplicates
        existing_invite = InstitutionInvite.objects.filter(
            institution=institution,
            email=backup_admin_email,
            status=InstitutionInvite.STATUS_PENDING
        ).exists()
        
        if not existing_invite:
            raw_token = secrets.token_urlsafe(32)
            token_hash = make_password(raw_token)
            
            invite = InstitutionInvite.objects.create(
                institution=institution,
                email=backup_admin_email,
                role=User.ROLE_INSTITUTION_ADMIN,
                token_hash=token_hash,
                expires_at=timezone.now() + timezone.timedelta(hours=72),
                status=InstitutionInvite.STATUS_PENDING,
                created_by=admin_user.id
            )
            
            # Send invite email to backup admin
            try:
                send_institution_staff_invite_notification(
                    recipient_email=backup_admin_email,
                    invite_token=raw_token,
                    invite_id=str(invite.id),
                    role_display="Institution Admin (Backup)",
                    institution_name=institution_name,
                    sender_name=admin_user.get_full_name() or admin_user.email,
                    actor_id=admin_user_id
                )
                logger.info(f"Sent backup admin invite to {backup_admin_email}")
            except Exception as e:
                logger.error(f"Failed to send backup admin invite to {backup_admin_email}: {e}")

    # Record setup completion event
    record_event(
        event_type="INSTITUTION_ADMIN_SETUP_COMPLETED",
        entity_type="Institution",
        entity_id=institution.id,
        payload={
            "admin_user_id": admin_user_id,
            "institution_id": str(institution.id),
            "institution_name": institution_name,
            "institution_website": institution_website,
            "primary_domain": primary_domain,
            "admin_full_name": admin_user.get_full_name(),
            "admin_title": admin_title,
            "department": department,
            "institution_size": institution_size,
            "primary_use_case": primary_use_case,
            "backup_admin_email": backup_admin_email,
            "backup_admin_name": backup_admin_name,
            "agree_to_verification_authority": agree_to_verification_authority,
            "setup_completed_at": timezone.now().isoformat(),
        },
    )
    
    # Send setup completion notification
    try:
        send_institution_admin_setup_completion_notification(
            admin_user_id=admin_user_id,
            institution_name=institution_name,
            institution_domain=primary_domain,
        )
    except Exception as e:
        logger.warning(f"Failed to send institution admin setup completion notification: {e}")
    
    return {
        "institution": {
            "id": str(institution.id),
            "name": institution.name,
            "domain": institution.domain,
            "is_active": institution.is_active,
            "is_verified": institution.is_verified,
            "status": institution.status,
        },
        "admin": {
            "id": str(admin_user.id),
            "email": admin_user.email,
            "full_name": admin_user.get_full_name(),
            "title": admin_title,
            "phone": admin_phone,
            "department": department,
        },
        "setup_completed": True,
    }


def get_rejection_reason_choices() -> list[tuple[str, str]]:
    """
    Get available rejection reason choices for institution requests.
    
    Returns:
        List of tuples containing (code, description) pairs
    """
    return InstitutionRequest.REJECTION_REASON_CHOICES


def create_department(
    *,
    institution_id: str,
    name: str,
    code: str = "",
    aliases: list[str] = None,
    actor_id: str = None,
) -> Department:
    """
    Create a new department for an institution.
    """
    if Department.objects.filter(institution_id=institution_id, name__iexact=name).exists():
        raise ValueError(f"Department with name '{name}' already exists.")
    
    department = Department.objects.create(
        institution_id=institution_id,
        name=name,
        code=code,
        aliases=aliases or [],
    )
    
    record_event(
        event_type="DEPARTMENT_CREATED",
        entity_type="Department",
        entity_id=department.id,
        actor_id=actor_id,
        payload={
            "institution_id": str(institution_id),
            "name": name,
            "code": code,
            "aliases": aliases,
        },
    )
    return department


def update_department(
    *,
    department_id: str,
    name: str = None,
    code: str = None,
    aliases: list[str] = None,
    is_active: bool = None,
    actor_id: str = None,
) -> Department:
    """
    Update an existing department.
    """
    department = Department.objects.get(id=department_id)
    old_data = {
        "name": department.name,
        "code": department.code,
        "aliases": department.aliases,
        "is_active": department.is_active,
    }

    if name and name.lower() != department.name.lower():
        if Department.objects.filter(institution_id=department.institution_id, name__iexact=name).exclude(id=department_id).exists():
            raise ValueError(f"Department with name '{name}' already exists.")
        department.name = name

    if code is not None:
        department.code = code
    if aliases is not None:
        department.aliases = aliases
    if is_active is not None:
        department.is_active = is_active

    department.save()

    record_event(
        event_type="DEPARTMENT_UPDATED",
        entity_type="Department",
        entity_id=department.id,
        actor_id=actor_id,
        payload={
            "institution_id": str(department.institution_id),
            "old_data": old_data,
            "new_data": {
                "name": department.name,
                "code": department.code,
                "aliases": department.aliases,
                "is_active": department.is_active,
            }
        },
    )
    return department


def delete_department(
    *,
    department_id: str,
    actor_id: str = None,
) -> None:
    """
    Soft delete a department (set is_active=False).
    """
    department = Department.objects.get(id=department_id)
    if not department.is_active:
        return

    department.is_active = False
    department.save()

    record_event(
        event_type="DEPARTMENT_DELETED",
        entity_type="Department",
        entity_id=department.id,
        actor_id=actor_id,
        payload={
            "institution_id": str(department.institution_id),
            "name": department.name,
            "is_active": False,
        },
    )


def create_cohort(
    *,
    department_id: str,
    name: str,
    start_year: int,
    end_year: int = None,
    intake_label: str = "",
    actor_id: str = None,
) -> Cohort:
    """
    Create a new cohort for a department.
    """
    if Cohort.objects.filter(department_id=department_id, name__iexact=name).exists():
        raise ValueError(f"Cohort with name '{name}' already exists in this department.")
    
    cohort = Cohort.objects.create(
        department_id=department_id,
        name=name,
        start_year=start_year,
        end_year=end_year,
        intake_label=intake_label,
    )
    
    record_event(
        event_type="COHORT_CREATED",
        entity_type="Cohort",
        entity_id=cohort.id,
        actor_id=actor_id,
        payload={
            "department_id": str(department_id),
            "name": name,
            "start_year": start_year,
            "end_year": end_year,
            "intake_label": intake_label,
        },
    )
    return cohort


def update_cohort(
    *,
    cohort_id: str,
    name: str = None,
    start_year: int = None,
    end_year: int = None,
    intake_label: str = None,
    is_active: bool = None,
    actor_id: str = None,
) -> Cohort:
    """
    Update an existing cohort.
    """
    cohort = Cohort.objects.get(id=cohort_id)
    old_data = {
        "name": cohort.name,
        "start_year": cohort.start_year,
        "end_year": cohort.end_year,
        "intake_label": cohort.intake_label,
        "is_active": cohort.is_active,
    }

    if name and name.lower() != cohort.name.lower():
        if Cohort.objects.filter(department_id=cohort.department_id, name__iexact=name).exclude(id=cohort_id).exists():
            raise ValueError(f"Cohort with name '{name}' already exists in this department.")
        cohort.name = name

    if start_year is not None:
        cohort.start_year = start_year
    if end_year is not None:
        cohort.end_year = end_year
    if intake_label is not None:
        cohort.intake_label = intake_label
    if is_active is not None:
        cohort.is_active = is_active

    cohort.save()

    record_event(
        event_type="COHORT_UPDATED",
        entity_type="Cohort",
        entity_id=cohort.id,
        actor_id=actor_id,
        payload={
            "department_id": str(cohort.department_id),
            "old_data": old_data,
            "new_data": {
                "name": cohort.name,
                "start_year": cohort.start_year,
                "end_year": cohort.end_year,
                "intake_label": cohort.intake_label,
                "is_active": cohort.is_active,
            }
        },
    )
    return cohort


def update_institution_trust_level(institution_id: UUID, new_level: int) -> None:
    """
    Update institution trust level.
    Used by Trust Service to enforce architectural boundaries.
    """
    institution = Institution.objects.get(id=institution_id)
    institution.trust_level = new_level
    institution.save(update_fields=["trust_level"])


def delete_cohort(
    *,
    cohort_id: str,
    actor_id: str = None,
) -> None:
    """
    Soft delete a cohort.
    """
    cohort = Cohort.objects.get(id=cohort_id)
    if not cohort.is_active:
        return

    cohort.is_active = False
    cohort.save()

    record_event(
        event_type="COHORT_DELETED",
        entity_type="Cohort",
        entity_id=cohort.id,
        actor_id=actor_id,
        payload={
            "department_id": str(cohort.department_id),
            "name": cohort.name,
            "is_active": False,
        },
    )

