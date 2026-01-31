"""
Admin app policies - Platform staff authority & permission logic.
Following the platform admin blueprint for explicit authority boundaries.
"""

from django.contrib.auth import get_user_model
from .models import PlatformStaffProfile

User = get_user_model()


def is_platform_staff(*, actor: User) -> bool:
    """Check if user has any platform staff authority."""
    return PlatformStaffProfile.objects.filter(
        user=actor,
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def get_platform_staff_role(*, actor: User) -> str:
    """Get the platform staff role for a user."""
    profile = PlatformStaffProfile.objects.filter(
        user=actor,
        is_active=True,
        revoked_at__isnull=True
    ).first()
    return profile.role if profile else None


def can_view_staff_list(*, actor: User) -> bool:
    """
    All active platform staff can view the staff list.
    """
    return is_platform_staff(actor=actor)


def can_create_staff_invites(*, actor: User) -> bool:
    """
    Only super admins can create staff invites.
    This is the controlled creation path for all future staff.
    """
    return PlatformStaffProfile.objects.filter(
        user=actor,
        role=PlatformStaffProfile.ROLE_SUPER_ADMIN,
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def can_revoke_staff_authority(*, actor: User, target_staff: User) -> bool:
    """
    Only super admins can revoke staff authority.
    Cannot revoke your own authority.
    """
    if actor.id == target_staff.id:
        return False
    
    return PlatformStaffProfile.objects.filter(
        user=actor,
        role=PlatformStaffProfile.ROLE_SUPER_ADMIN,
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def can_manage_institutions(*, actor: User) -> bool:
    """
    Super admins and platform admins can manage institutions.
    This includes reviewing and approving institution requests.
    """
    return PlatformStaffProfile.objects.filter(
        user=actor,
        role__in=[
            PlatformStaffProfile.ROLE_SUPER_ADMIN,
            PlatformStaffProfile.ROLE_PLATFORM_ADMIN
        ],
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def can_manage_users(*, actor: User) -> bool:
    """
    Super admins and platform admins can manage users.
    This includes suspending, reactivating, and changing user roles.
    """
    return PlatformStaffProfile.objects.filter(
        user=actor,
        role__in=[
            PlatformStaffProfile.ROLE_SUPER_ADMIN,
            PlatformStaffProfile.ROLE_PLATFORM_ADMIN
        ],
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def can_suspend_user(*, actor: User, target_user: User) -> bool:
    """
    Platform admins can suspend users.
    Cannot suspend yourself or other platform staff.
    """
    if actor.id == target_user.id:
        return False
    
    # Cannot suspend other platform staff
    if is_platform_staff(actor=target_user):
        return False
    
    return PlatformStaffProfile.objects.filter(
        user=actor,
        role__in=[
            PlatformStaffProfile.ROLE_SUPER_ADMIN,
            PlatformStaffProfile.ROLE_PLATFORM_ADMIN
        ],
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def can_reactivate_user(*, actor: User) -> bool:
    """
    Platform admins can reactivate suspended users.
    """
    return PlatformStaffProfile.objects.filter(
        user=actor,
        role__in=[
            PlatformStaffProfile.ROLE_SUPER_ADMIN,
            PlatformStaffProfile.ROLE_PLATFORM_ADMIN
        ],
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def can_change_user_roles(*, actor: User, target_user: User) -> bool:
    """
    Platform admins can change user roles.
    Cannot change roles of platform staff members.
    """
    # Cannot change roles of platform staff
    if is_platform_staff(actor=target_user):
        return False
    
    return PlatformStaffProfile.objects.filter(
        user=actor,
        role__in=[
            PlatformStaffProfile.ROLE_SUPER_ADMIN,
            PlatformStaffProfile.ROLE_PLATFORM_ADMIN
        ],
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def can_view_system_analytics(*, actor: User) -> bool:
    """
    All platform staff can view system analytics.
    Different roles may see different levels of detail.
    """
    return is_platform_staff(actor=actor)


def can_view_admin_dashboard(*, actor: User) -> bool:
    """
    All platform staff can access the admin dashboard.
    """
    return is_platform_staff(actor=actor)


def can_view_admin_action_logs(*, actor: User) -> bool:
    """
    All platform staff can view admin action logs for transparency.
    """
    return is_platform_staff(actor=actor)


def can_perform_emergency_actions(*, actor: User) -> bool:
    """
    Only super admins can perform emergency actions.
    This includes emergency suspensions and policy overrides.
    """
    return PlatformStaffProfile.objects.filter(
        user=actor,
        role=PlatformStaffProfile.ROLE_SUPER_ADMIN,
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def can_perform_ledger_audits(*, actor: User) -> bool:
    """
    Super admins and auditors can perform ledger audits.
    """
    return PlatformStaffProfile.objects.filter(
        user=actor,
        role__in=[
            PlatformStaffProfile.ROLE_SUPER_ADMIN,
            PlatformStaffProfile.ROLE_AUDITOR
        ],
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def can_respond_to_support_tickets(*, actor: User) -> bool:
    """
    Moderators and above can respond to support tickets.
    """
    return PlatformStaffProfile.objects.filter(
        user=actor,
        role__in=[
            PlatformStaffProfile.ROLE_SUPER_ADMIN,
            PlatformStaffProfile.ROLE_PLATFORM_ADMIN,
            PlatformStaffProfile.ROLE_MODERATOR
        ],
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def can_flag_suspicious_behavior(*, actor: User) -> bool:
    """
    All platform staff can flag suspicious behavior.
    """
    return is_platform_staff(actor=actor)