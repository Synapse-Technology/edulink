"""
Admin app policies - Platform staff authority & permission logic.
Following the platform admin blueprint for explicit authority boundaries.
"""

from django.contrib.auth import get_user_model
from .models import PlatformStaffProfile

User = get_user_model()

PLATFORM_STAFF_PERMISSIONS = {
    PlatformStaffProfile.ROLE_SUPER_ADMIN: {
        "access_admin_panel",
        "view_dashboard",
        "view_analytics",
        "view_audit_logs",
        "export_audit_logs",
        "manage_staff",
        "manage_users",
        "suspend_users",
        "change_user_roles",
        "manage_institutions",
        "review_institution_requests",
        "manage_employers",
        "review_employer_requests",
        "manage_contact_submissions",
        "respond_to_support_tickets",
        "moderate_content",
        "perform_ledger_audits",
        "system_config",
        "emergency_actions",
    },
    PlatformStaffProfile.ROLE_PLATFORM_ADMIN: {
        "access_admin_panel",
        "view_dashboard",
        "view_analytics",
        "manage_users",
        "suspend_users",
        "change_user_roles",
        "manage_institutions",
        "review_institution_requests",
        "manage_employers",
        "review_employer_requests",
        "manage_contact_submissions",
        "respond_to_support_tickets",
        "moderate_content",
    },
    PlatformStaffProfile.ROLE_MODERATOR: {
        "access_admin_panel",
        "view_dashboard",
        "manage_contact_submissions",
        "respond_to_support_tickets",
        "moderate_content",
        "flag_suspicious_behavior",
    },
    PlatformStaffProfile.ROLE_AUDITOR: {
        "access_admin_panel",
        "view_dashboard",
        "view_analytics",
        "view_audit_logs",
        "export_audit_logs",
        "perform_ledger_audits",
        "view_user_activity",
    },
}


def get_platform_staff_permissions_for_role(role: str) -> list[str]:
    """Return stable frontend/API permission keys for a platform staff role."""
    return sorted(PLATFORM_STAFF_PERMISSIONS.get(role, set()))


def get_platform_staff_permissions(*, actor: User) -> list[str]:
    """Return all platform permissions granted to the active actor."""
    role = get_platform_staff_role(actor=actor)
    return get_platform_staff_permissions_for_role(role)


def has_platform_permission(*, actor: User, permission: str) -> bool:
    """Centralized platform permission check used by policies and serializers."""
    return permission in set(get_platform_staff_permissions(actor=actor))


def is_platform_staff(*, actor: User) -> bool:
    """Check if user has any platform staff authority."""
    if not actor or not actor.is_authenticated:
        return False
        
    if actor.is_superuser:
        return True
        
    return PlatformStaffProfile.objects.filter(
        user_id=actor.id,
        is_active=True,
        revoked_at__isnull=True
    ).exists()


def get_platform_staff_role(*, actor: User) -> str:
    """Get the platform staff role for a user."""
    if not actor or not actor.is_authenticated:
        return None
        
    profile = PlatformStaffProfile.objects.filter(
        user_id=actor.id,
        is_active=True,
        revoked_at__isnull=True
    ).first()
    
    if profile:
        return profile.role
        
    if actor.is_superuser:
        return PlatformStaffProfile.ROLE_SUPER_ADMIN
        
    return None


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
    return has_platform_permission(actor=actor, permission="manage_staff")


def can_revoke_staff_authority(*, actor: User, target_staff: User) -> bool:
    """
    Only super admins can revoke staff authority.
    Cannot revoke your own authority.
    """
    if actor.id == target_staff.id:
        return False
    
    return has_platform_permission(actor=actor, permission="manage_staff")


def can_manage_institutions(*, actor: User) -> bool:
    """
    Super admins and platform admins can manage institutions.
    This includes reviewing and approving institution requests.
    """
    return has_platform_permission(actor=actor, permission="manage_institutions")


def can_manage_users(*, actor: User) -> bool:
    """
    Super admins and platform admins can manage users.
    This includes suspending, reactivating, and changing user roles.
    """
    return has_platform_permission(actor=actor, permission="manage_users")


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
    
    return has_platform_permission(actor=actor, permission="suspend_users")


def can_reactivate_user(*, actor: User) -> bool:
    """
    Platform admins can reactivate suspended users.
    """
    return has_platform_permission(actor=actor, permission="suspend_users")


def can_change_user_roles(*, actor: User, target_user: User) -> bool:
    """
    Platform admins can change user roles.
    Cannot change roles of platform staff members.
    """
    # Cannot change roles of platform staff
    if is_platform_staff(actor=target_user):
        return False
    
    return has_platform_permission(actor=actor, permission="change_user_roles")


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
    return has_platform_permission(actor=actor, permission="emergency_actions")


def can_perform_ledger_audits(*, actor: User) -> bool:
    """
    Super admins and auditors can perform ledger audits.
    """
    return has_platform_permission(actor=actor, permission="perform_ledger_audits")


def can_respond_to_support_tickets(*, actor: User) -> bool:
    """
    Moderators and above can respond to support tickets.
    """
    return has_platform_permission(actor=actor, permission="respond_to_support_tickets")


def can_manage_contact_submissions(*, actor: User) -> bool:
    """
    Moderators and above can manage contact submissions.
    """
    return can_respond_to_support_tickets(actor=actor)


def can_flag_suspicious_behavior(*, actor: User) -> bool:
    """
    All platform staff can flag suspicious behavior.
    """
    return is_platform_staff(actor=actor)
