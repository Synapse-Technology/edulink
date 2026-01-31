"""
Admin app services - Platform staff business actions.
Following the platform admin blueprint for controlled authority management.
"""

import secrets
import uuid
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

import logging
from edulink.apps.ledger.services import record_event
from edulink.apps.notifications.services import send_staff_invite_notification
from .models import PlatformStaffProfile, AdminActionLog, StaffInvite

logger = logging.getLogger(__name__)

User = get_user_model()


def create_genesis_super_admin(*, email: str, password: str) -> User:
    """
    Create the first super admin (genesis creation).
    Used once at system birth, out-of-band.
    """
    # Check if any super admin already exists
    if PlatformStaffProfile.objects.filter(
        role=PlatformStaffProfile.ROLE_SUPER_ADMIN,
        is_active=True
    ).exists():
        raise ValidationError("Genesis super admin already exists")
    
    # Create the user
    user = User.objects.create_superuser(
        username=email,  # Use email as username since USERNAME_FIELD is email
        email=email,
        password=password
    )
    
    # Set the correct role for system admin
    user.role = User.ROLE_SYSTEM_ADMIN
    user.save()
    
    # Create the platform staff profile
    profile = PlatformStaffProfile.objects.create(
        user=user,
        role=PlatformStaffProfile.ROLE_SUPER_ADMIN,
        created_by=None  # Genesis creation
    )
    
    # Record the ledger event
    record_event(
        event_type="PLATFORM_SUPER_ADMIN_CREATED",
        entity_type="user",
        entity_id=user.id,
        actor_id=user.id,
        actor_role="SUPER_ADMIN",
        payload={"method": "genesis_creation"}
    )
    
    return user


@transaction.atomic
def create_staff_invite(*, email: str, role: str, created_by: User, note: str = "") -> StaffInvite:
    """
    Create a staff invite for controlled onboarding.
    Only super admins can create invites.
    """
    # Validate the creator has authority
    creator_profile = PlatformStaffProfile.objects.filter(
        user=created_by,
        role=PlatformStaffProfile.ROLE_SUPER_ADMIN,
        is_active=True
    ).first()
    
    if not creator_profile:
        raise ValidationError("Only super admins can create staff invites")
    
    # Validate role is not super admin (genesis only)
    if role == PlatformStaffProfile.ROLE_SUPER_ADMIN:
        raise ValidationError("Super admin role can only be assigned via genesis creation")
    
    # Check for existing invites
    existing_invite = StaffInvite.objects.filter(email=email).first()
    if existing_invite:
        if existing_invite.is_accepted:
            raise ValidationError("User has already accepted an invitation")
        
        if not existing_invite.is_expired:
            raise ValidationError("A valid invitation already exists for this email")
            
        # Delete expired invite to allow re-invitation
        # This is safe because it's expired and not accepted
        existing_invite.delete()
    
    # Generate secure token
    token = secrets.token_urlsafe(32)
    
    # Create invite with 48-hour expiration
    invite = StaffInvite.objects.create(
        email=email,
        role=role,
        token=token,
        expires_at=timezone.now() + timedelta(hours=48),
        created_by=created_by,
        note=note
    )
    
    # Record the ledger event
    # Use deterministic UUID based on email for StaffInvite (since it has integer ID)
    invite_uuid = uuid.uuid5(uuid.NAMESPACE_URL, f"mailto:{email}")
    
    record_event(
        event_type="PLATFORM_STAFF_INVITE_CREATED",
        actor_id=created_by.id,
        entity_type="staff_invite",
        entity_id=invite_uuid,
        payload={
            "invite_id": invite.id,
            "target_email": email,
            "role": role,
            "expires_at": invite.expires_at.isoformat(),
            "actor_id": str(created_by.id)
        }
    )
    
    # Send email notification
    role_display = dict(PlatformStaffProfile.ROLE_CHOICES).get(role, role)
    sender_name = created_by.get_full_name() or created_by.email
    
    send_staff_invite_notification(
        recipient_email=email,
        invite_token=token,
        role_display=role_display,
        sender_name=sender_name,
        expires_at=invite.expires_at.strftime("%B %d, %Y at %I:%M %p")
    )
    
    return invite


@transaction.atomic
def accept_staff_invite(*, token: str, password: str, first_name: str = "", last_name: str = "") -> PlatformStaffProfile:
    """
    Accept a staff invite, create user account, and create platform staff profile.
    """
    # Get the invite
    invite = StaffInvite.objects.filter(
        token=token,
        accepted_at__isnull=True
    ).first()
    
    if not invite:
        raise ValidationError("Invalid or already accepted invite")
    
    if invite.is_expired:
        raise ValidationError("Invite has expired")
    
    # Check if user already exists
    user = User.objects.filter(email=invite.email).first()
    if user:
        # If user exists, we verify if they are already staff
        if hasattr(user, 'platform_staff_profile') and user.platform_staff_profile.is_active:
             raise ValidationError("User is already a platform staff member")
             
        # If user exists but not staff, we just link them. 
        # We do NOT update password for existing users here for security.
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        
        # Ensure user has system admin role (overriding any previous role)
        if user.role != User.ROLE_SYSTEM_ADMIN:
            user.role = User.ROLE_SYSTEM_ADMIN
            
        user.is_email_verified = True  # Verified upon activation from invite
        user.save()
    else:
        # Create new user
        username = invite.email  # Use email as username
        user = User.objects.create_user(
            username=username,
            email=invite.email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=User.ROLE_SYSTEM_ADMIN,
            is_active=True,
            is_email_verified=True  # Verified upon activation from invite
        )

    # Create platform staff profile
    profile = PlatformStaffProfile.objects.create(
        user=user,
        role=invite.role,
        created_by=invite.created_by,
        invite_token=token,
        invite_expires_at=invite.expires_at
    )
    
    # Mark invite as accepted
    invite.accepted_at = timezone.now()
    invite.accepted_by = user
    invite.save()
    
    # Record the ledger event
    record_event(
        event_type="PLATFORM_STAFF_INVITE_ACCEPTED",
        actor_id=user.id,
        entity_type="user",
        entity_id=user.id,
        payload={
            "role": invite.role,
            "invited_by": str(invite.created_by.id),
            "actor_id": str(user.id)
        }
    )
    
    return profile


@transaction.atomic
def revoke_staff_authority(*, staff_user: User, revoked_by: User, reason: str = "") -> PlatformStaffProfile:
    """
    Revoke a staff member's platform authority.
    Only super admins can revoke authority.
    """
    # Validate the revoker has authority
    revoker_profile = PlatformStaffProfile.objects.filter(
        user=revoked_by,
        role=PlatformStaffProfile.ROLE_SUPER_ADMIN,
        is_active=True
    ).first()
    
    if not revoker_profile:
        raise ValidationError("Only super admins can revoke staff authority")
    
    # Get the staff profile
    profile = PlatformStaffProfile.objects.filter(
        user=staff_user,
        is_active=True,
        revoked_at__isnull=True
    ).first()
    
    if not profile:
        raise ValidationError("Staff member not found or already revoked")
    
    # Cannot revoke self
    if staff_user.id == revoked_by.id:
        raise ValidationError("Cannot revoke your own authority")
    
    # Revoke authority
    profile.is_active = False
    profile.revoked_at = timezone.now()
    profile.save()
    
    # Log the admin action
    AdminActionLog.objects.create(
        actor=revoked_by,
        action=AdminActionLog.ACTION_STAFF_REVOKED,
        target_user=staff_user,
        details={"reason": reason, "role": profile.role}
    )
    
    # Record the ledger event
    record_event(
        event_type="PLATFORM_STAFF_AUTHORITY_REVOKED",
        entity_type="user",
        entity_id=staff_user.id,
        payload={"role": profile.role, "reason": reason, "actor_id": revoked_by.id}
    )
    
    return profile


@transaction.atomic
def verify_institution(*, institution_id: int, verified_by: User, reason: str = "") -> None:
    """
    Verify an institution by platform admin.
    Uses the institutions app's service layer to maintain proper boundaries.
    """
    # Validate the verifier has authority
    verifier_profile = PlatformStaffProfile.objects.filter(
        user=verified_by,
        role__in=[
            PlatformStaffProfile.ROLE_SUPER_ADMIN,
            PlatformStaffProfile.ROLE_PLATFORM_ADMIN
        ],
        is_active=True
    ).first()
    
    if not verifier_profile:
        raise ValidationError("Only platform admins can verify institutions")
    
    # Execute verification through institutions service layer
    from edulink.apps.institutions import services as institution_services
    
    try:
        institution = institution_services.verify_institution(
            institution_id=institution_id,
            verification_method="ADMIN_APPROVED",
            reviewer_id=str(verified_by.id)
        )
    except Exception as e:
        # Log the error but let it bubble up
        logger.error(f"Failed to verify institution {institution_id}: {e}")
        raise
    
    # Log the admin action
    AdminActionLog.objects.create(
        actor=verified_by,
        action=AdminActionLog.ACTION_INSTITUTION_VERIFIED,
        target_institution_id=institution_id,
        details={"reason": reason}
    )
    
    # Record the ledger event
    record_event(
        event_type="INSTITUTION_VERIFIED_BY_ADMIN",
        entity_type="institution",
        entity_id=institution_id,
        payload={"reason": reason, "actor_id": verified_by.id}
    )


@transaction.atomic
def suspend_user(*, user_id: int, suspended_by: User, reason: str = "") -> None:
    """
    Suspend a user.
    Platform admins can suspend users.
    """
    # Validate the suspender has authority
    suspender_profile = PlatformStaffProfile.objects.filter(
        user=suspended_by,
        role__in=[
            PlatformStaffProfile.ROLE_SUPER_ADMIN,
            PlatformStaffProfile.ROLE_PLATFORM_ADMIN
        ],
        is_active=True
    ).first()
    
    if not suspender_profile:
        raise ValidationError("Only platform admins can suspend users")
    
    # Get the target user
    target_user = User.objects.filter(id=user_id).first()
    if not target_user:
        raise ValidationError("User not found")
    
    # Cannot suspend self
    if user_id == suspended_by.id:
        raise ValidationError("Cannot suspend yourself")
    
    # Suspend the user
    target_user.is_active = False
    target_user.save()
    
    # Log the admin action
    AdminActionLog.objects.create(
        actor=suspended_by,
        action=AdminActionLog.ACTION_USER_SUSPENDED,
        target_user=target_user,
        details={"reason": reason}
    )
    
    # Record the ledger event
    record_event(
        event_type="USER_SUSPENDED_BY_ADMIN",
        actor_id=suspended_by.id,
        entity_type="user",
        entity_id=user_id,
        payload={"reason": reason}
    )


@transaction.atomic
def reactivate_user(*, user_id: int, reactivated_by: User, reason: str = "") -> None:
    """
    Reactivate a suspended user.
    Platform admins can reactivate users.
    """
    # Validate the reactivator has authority
    reactivator_profile = PlatformStaffProfile.objects.filter(
        user=reactivated_by,
        role__in=[
            PlatformStaffProfile.ROLE_SUPER_ADMIN,
            PlatformStaffProfile.ROLE_PLATFORM_ADMIN
        ],
        is_active=True
    ).first()
    
    if not reactivator_profile:
        raise ValidationError("Only platform admins can reactivate users")
    
    # Get the target user
    target_user = User.objects.filter(id=user_id).first()
    if not target_user:
        raise ValidationError("User not found")
    
    # Reactivate the user
    target_user.is_active = True
    target_user.save()
    
    # Log the admin action
    AdminActionLog.objects.create(
        actor=reactivated_by,
        action=AdminActionLog.ACTION_USER_REACTIVATED,
        target_user=target_user,
        details={"reason": reason}
    )
    
    # Record the ledger event
    record_event(
        event_type="USER_REACTIVATED_BY_ADMIN",
        actor_id=reactivated_by.id,
        entity_type="user",
        entity_id=user_id,
        payload={"reason": reason}
    )


@transaction.atomic
def send_institution_interest_outreach(*, interest_id: str, actor: User) -> bool:
    """
    Send automated outreach email for an institution interest record.
    Follows Rule 3: Business actions live in services.
    """
    from edulink.apps.institutions.queries import get_institution_interest_by_id
    from edulink.apps.notifications.services import send_institution_interest_outreach_notification
    
    interest = get_institution_interest_by_id(interest_id)
    if not interest:
        raise ValidationError("Interest record not found")
        
    if not interest.user_email:
        raise ValidationError("No email associated with this interest request")
            
    try:
        success = send_institution_interest_outreach_notification(
            recipient_email=interest.user_email,
            institution_name=interest.raw_name,
            actor_id=str(actor.id)
        )
        
        if success:
            # Log the admin action
            AdminActionLog.objects.create(
                actor=actor,
                action=AdminActionLog.ACTION_OUTREACH_SENT,
                details={
                    "interest_id": str(interest_id),
                    "institution_name": interest.raw_name,
                    "recipient_email": interest.user_email
                }
            )
            
            # Record ledger event
            record_event(
                event_type="INSTITUTION_INTEREST_OUTREACH_SENT",
                actor_id=actor.id,
                entity_type="institution_interest",
                entity_id=interest_id,
                payload={
                    "institution_name": interest.raw_name,
                }
            )
            
        return success
        
    except Exception as e:
        raise ValidationError(f"Failed to send outreach: {str(e)}")