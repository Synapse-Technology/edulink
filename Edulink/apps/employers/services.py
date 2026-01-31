from uuid import UUID
from typing import Dict, Any, Optional, List
import secrets
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth import get_user_model
from edulink.apps.ledger.services import record_event
from edulink.apps.notifications.services import (
    send_employer_request_confirmation,
    send_employer_approval_notification,
    send_employer_rejection_notification,
    send_employer_onboarded_notification,
    send_employer_supervisor_invite_notification,
    send_supervisor_account_activated_notification,
    send_admin_new_onboarding_request_notification,
)
from .models import Employer, Supervisor, EmployerRequest, EmployerInvite, EmployerStaffProfileRequest
from .tracking_helpers import generate_tracking_code
from edulink.apps.accounts.models import User as UserType
from edulink.apps.accounts.services import update_user_profile

User = get_user_model()


@transaction.atomic
def update_employer_profile(
    *,
    employer_id: UUID,
    actor: UserType,
    data: Dict[str, Any]
) -> Employer:
    """
    Update employer profile details.
    
    Args:
        employer_id: ID of the employer to update
        actor: User performing the update (must be authorized by policy layer)
        data: Dictionary of fields to update
        
    Returns:
        Updated Employer instance
    """
    employer = Employer.objects.get(id=employer_id)
    
    # Filter allowed fields to prevent arbitrary updates
    allowed_fields = {
        'name', 'official_email', 'domain', 'organization_type', 
        'contact_person', 'phone_number', 'website_url', 'registration_number'
    }
    
    updates = {}
    for field, value in data.items():
        if field in allowed_fields and getattr(employer, field) != value:
            updates[field] = value
            setattr(employer, field, value)
            
    if not updates:
        return employer
        
    employer.save()
    
    # Record event
    record_event(
        event_type="EMPLOYER_PROFILE_UPDATED",
        actor_id=actor.id,
        entity_type="Employer",
        entity_id=employer.id,
        payload={
            "updated_fields": list(updates.keys())
        }
    )
    
    return employer

@transaction.atomic
def submit_employer_request(
    *,
    name: str,
    official_email: str,
    domain: str,
    organization_type: str,
    contact_person: str,
    phone_number: str = "",
    website_url: str = "",
    registration_number: str = "",
) -> EmployerRequest:
    """
    Submit an employer onboarding request.
    Minimal friction.
    """
    tracking_code = generate_tracking_code()
    
    request = EmployerRequest.objects.create(
        name=name,
        official_email=official_email,
        domain=domain,
        organization_type=organization_type,
        contact_person=contact_person,
        phone_number=phone_number,
        website_url=website_url,
        registration_number=registration_number,
        status=EmployerRequest.STATUS_PENDING,
        tracking_code=tracking_code
    )
    
    record_event(
        event_type="EMPLOYER_ONBOARDING_REQUESTED",
        actor_id=None,
        entity_id=request.id,
        entity_type="employer_request",
        payload={
            "name": name,
            "domain": domain,
            "tracking_code": tracking_code
        }
    )
    
    # Send email confirmation
    try:
        send_employer_request_confirmation(request)
    except Exception:
        # Don't fail the transaction if email fails, but log it
        # logger.error("Failed to send employer request confirmation", exc_info=True)
        pass
    
    # Notify platform admins
    try:
        send_admin_new_onboarding_request_notification(
            request_type="Employer",
            name=name,
            representative_name=contact_person,
            email=official_email,
            tracking_code=tracking_code,
            review_link=f"{settings.FRONTEND_URL}/admin/employers/requests"
        )
    except Exception:
        pass

    return request

@transaction.atomic
def review_employer_request(
    *,
    request_id: UUID,
    action: str,
    reviewer_id: str,
    rejection_reason_code: str = "",
    rejection_reason: str = ""
) -> EmployerRequest:
    """
    Review employer request (Approve/Reject).
    """
    try:
        request = EmployerRequest.objects.get(id=request_id)
    except EmployerRequest.DoesNotExist:
        raise ValueError("Request not found")
    
    if request.status != EmployerRequest.STATUS_PENDING:
        raise ValueError("Request is not pending.")
        
    if action == "approve":
        request.status = EmployerRequest.STATUS_APPROVED
        request.reviewed_by = UUID(reviewer_id)
        request.reviewed_at = timezone.now()
        request.save()
        
        # Create Employer
        # Blueprint: Step 3 - Approval -> Invite-based activation
        # Ledger: EMPLOYER_APPROVED
        employer = Employer.objects.create(
            name=request.name,
            official_email=request.official_email,
            domain=request.domain,
            organization_type=request.organization_type,
            contact_person=request.contact_person,
            phone_number=request.phone_number,
            website_url=request.website_url,
            registration_number=request.registration_number,
            status=Employer.STATUS_APPROVED, # Created as Approved (pending admin activation)
            trust_level=Employer.TRUST_UNVERIFIED
        )
        
        # Create Invite
        raw_token = secrets.token_urlsafe(32)
        token_hash = make_password(raw_token)
        
        invite = EmployerInvite.objects.create(
            employer=employer,
            email=request.official_email,
            role="ADMIN",  # Explicitly set role for clarity
            token_hash=token_hash,
            expires_at=timezone.now() + timezone.timedelta(hours=72),
            status=EmployerInvite.STATUS_PENDING,
            created_by=UUID(reviewer_id)
        )
        
        record_event(
            event_type="EMPLOYER_APPROVED",
            actor_id=UUID(reviewer_id),
            entity_id=employer.id,
            entity_type="employer",
            payload={"request_id": str(request.id)}
        )
        
        record_event(
            event_type="EMPLOYER_ADMIN_INVITE_CREATED",
            actor_id=UUID(reviewer_id),
            entity_id=invite.id,
            entity_type="employer_invite",
            payload={"email": invite.email, "invite_id": str(invite.id)}
        )
        
        # Send approval notification with invite
        try:
            # We need to attach invite to request temporarily or fetch it in service
            request.employer_invite = invite
            send_employer_approval_notification(request, raw_token)
        except Exception:
            pass
        
    elif action == "reject":
        if not rejection_reason_code:
            raise ValueError("Rejection reason code required.")
            
        request.status = EmployerRequest.STATUS_REJECTED
        request.rejection_reason_code = rejection_reason_code
        request.rejection_reason = rejection_reason
        request.reviewed_by = UUID(reviewer_id)
        request.reviewed_at = timezone.now()
        request.save()
        
        record_event(
            event_type="EMPLOYER_ONBOARDING_REJECTED",
            actor_id=UUID(reviewer_id),
            entity_id=request.id,
            entity_type="employer_request",
            payload={"reason": rejection_reason}
        )
        
        # Send rejection notification
        try:
            send_employer_rejection_notification(request)
        except Exception:
            pass
        
    else:
        raise ValueError("Invalid action")
        
    return request


@transaction.atomic
def complete_employer_profile(
    *,
    employer_id: UUID,
    user: UserType,
    profile_data: Dict[str, Any]
) -> Employer:
    """
    Step 5 - Mandatory first-time setup.
    """
    employer = Employer.objects.get(id=employer_id)
    
    # Update profile
    # Note: Capacities (max_active_students, supervisor_ratio) are now system-calculated.
    
    # Activate
    employer.status = Employer.STATUS_ACTIVE
    employer.trust_level = Employer.TRUST_VERIFIED # Trust level -> 1
    employer.save()
    
    # Ensure user is Admin Supervisor
    Supervisor.objects.get_or_create(
        employer=employer,
        user=user,
        defaults={"role": Supervisor.ROLE_ADMIN}
    )
    
    record_event(
        event_type="EMPLOYER_PROFILE_COMPLETED",
        actor_id=user.id,
        entity_id=employer.id,
        entity_type="employer",
        payload=profile_data
    )
    
    return employer

def validate_employer_invite_token(invite_id: str, token: str) -> EmployerInvite:
    try:
        invite = EmployerInvite.objects.get(id=invite_id)
    except EmployerInvite.DoesNotExist:
        raise ValueError("Invalid invitation link")
        
    if invite.status != EmployerInvite.STATUS_PENDING:
        raise ValueError("Invitation is no longer valid")
        
    if timezone.now() > invite.expires_at:
        invite.status = EmployerInvite.STATUS_EXPIRED
        invite.save()
        raise ValueError("Invitation has expired")
        
    if not check_password(token, invite.token_hash):
        raise ValueError("Invalid invitation token")
        
    return invite



@transaction.atomic
def invite_supervisor(
    *,
    employer_id: UUID,
    email: str,
    role: str,
    actor_id: str
) -> EmployerInvite:
    """
    Invite a new supervisor/staff to the employer organization.
    Uses secure token flow.
    """
    employer = Employer.objects.get(id=employer_id)
    actor = User.objects.get(id=actor_id)
    
    # Check if user is already a supervisor for this employer
    if Supervisor.objects.filter(employer=employer, user__email=email, is_active=True).exists():
        raise ValueError(f"User with email {email} is already a supervisor for this employer.")

    # Check for pending invites
    if EmployerInvite.objects.filter(
        employer=employer, 
        email=email, 
        status=EmployerInvite.STATUS_PENDING,
        expires_at__gt=timezone.now()
    ).exists():
        raise ValueError(f"A pending invitation already exists for {email}.")

    # Create secure token
    raw_token = secrets.token_urlsafe(32)
    token_hash = make_password(raw_token)
    
    invite = EmployerInvite.objects.create(
        employer=employer,
        email=email,
        role=role,
        token_hash=token_hash,
        expires_at=timezone.now() + timezone.timedelta(hours=72),
        status=EmployerInvite.STATUS_PENDING,
        created_by=UUID(actor_id)
    )
    
    # Record event
    record_event(
        event_type="EMPLOYER_SUPERVISOR_INVITE_CREATED",
        actor_id=UUID(actor_id),
        entity_id=invite.id,
        entity_type="EmployerInvite",
        payload={
            "employer_id": str(employer.id),
            "email": email,
            "role": role,
            "invited_by": str(actor.id)
        }
    )
    
    # Send notification
    try:
        send_employer_supervisor_invite_notification(
            recipient_email=email,
            invite_token=raw_token,
            invite_id=str(invite.id),
            role_display=role,
            employer_name=employer.name,
            sender_name=f"{actor.first_name} {actor.last_name}",
            actor_id=actor_id
        )
    except Exception as e:
        # Log error but don't fail transaction
        pass
        
    return invite


@transaction.atomic
def activate_supervisor_invite(
    *,
    invite_id: str,
    token: str,
    password: str,
    first_name: str,
    last_name: str,
    phone_number: str = ""
) -> UserType:
    """
    Activate a supervisor account from an invite.
    Handles both Admin and Regular Supervisor roles.
    """
    invite = validate_employer_invite_token(invite_id, token)
    
    # Check if user exists
    user_created = False
    if User.objects.filter(email=invite.email).exists():
        user = User.objects.get(email=invite.email)
    else:
        # Determine user role based on invite role
        # invite.role comes from Supervisor.ROLE_CHOICES (ADMIN or SUPERVISOR)
        # We map this to User.ROLE_CHOICES (employer_admin or supervisor)
        user_role = "supervisor" # Default to supervisor
        if invite.role == "ADMIN":
            user_role = "employer_admin"
            
        user = User.objects.create_user(
            username=invite.email,
            email=invite.email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=user_role,
            phone_number=phone_number,
            is_active=True,
            is_email_verified=True # Verified upon activation from invite
        )
        user_created = True
    
    # Mark invite accepted
    invite.status = EmployerInvite.STATUS_ACCEPTED
    invite.save()
    
    # Create Supervisor record
    Supervisor.objects.create(
        employer=invite.employer,
        user=user,
        role=invite.role,
        is_active=True
    )
    
    # If this is the admin activating the account, activate the employer profile as well
    # This ensures the employer reaches Trust Level 1 (Verified) immediately upon account activation
    if invite.role == "ADMIN" and invite.employer.status == Employer.STATUS_APPROVED:
        invite.employer.status = Employer.STATUS_ACTIVE
        invite.employer.trust_level = Employer.TRUST_VERIFIED
        invite.employer.save()
        
        record_event(
            event_type="EMPLOYER_ACTIVATED",
            actor_id=user.id,
            entity_id=invite.employer.id,
            entity_type="Employer",
            payload={
                "trust_level": Employer.TRUST_VERIFIED,
                "via": "admin_activation"
            }
        )

    # Determine event type based on role
    event_type = "EMPLOYER_SUPERVISOR_ACTIVATED"
    if invite.role == "ADMIN":
        event_type = "EMPLOYER_ADMIN_ACTIVATED"
    
    record_event(
        event_type=event_type,
        actor_id=user.id,
        entity_id=user.id,
        entity_type="User",
        payload={
            "employer_id": str(invite.employer.id),
            "invite_id": str(invite.id),
            "user_created": user_created,
            "role": invite.role,
            "user_role": user.role if hasattr(user, 'role') else "unknown"
        }
    )
    
    # If this was the initial admin activation, we might want to send the onboarded notification
    # But strictly speaking, that's for when the employer is fully active?
    # The initial flow used activate_employer_admin which sent send_employer_onboarded_notification.
    # We should probably preserve that behavior if it's an ADMIN.
    if invite.role == "ADMIN" and user_created:
        try:
             send_employer_onboarded_notification(user, invite.employer)
        except Exception:
             pass
             
    # Send account activation confirmation to the user
    try:
        role_display = "Administrator" if invite.role == "ADMIN" else "Supervisor"
        send_supervisor_account_activated_notification(
            user=user,
            employer=invite.employer,
            role_display=role_display,
            actor_id=str(user.id)
        )
    except Exception:
        pass
    
    return user


@transaction.atomic
def remove_supervisor(
    *,
    supervisor_id: UUID,
    actor_id: str
) -> None:
    """
    Remove a supervisor (soft delete).
    """
    try:
        supervisor = Supervisor.objects.get(id=supervisor_id)
    except Supervisor.DoesNotExist:
        raise ValueError("Supervisor not found")
        
    if str(supervisor.user.id) == str(actor_id):
        raise ValueError("Cannot remove your own account. Use Deactivate Account in settings.")

    if not supervisor.is_active:
        return # Already removed
        
    supervisor.is_active = False
    supervisor.save()
    
    record_event(
        event_type="EMPLOYER_SUPERVISOR_REMOVED",
        actor_id=UUID(actor_id),
        entity_id=supervisor.id,
        entity_type="Supervisor",
        payload={
            "employer_id": str(supervisor.employer.id),
            "user_id": str(supervisor.user.id),
            "role": supervisor.role
        }
    )


def update_employer_trust_level(employer_id: UUID, new_level: int) -> None:
    """
    Update employer trust level.
    Used by Trust Service to enforce architectural boundaries.
    """
    employer = Employer.objects.get(id=employer_id)
    employer.trust_level = new_level
    employer.save(update_fields=["trust_level"])
