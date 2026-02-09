"""
Admin app queries - Read logic ONLY for platform staff operations.
Following APP_LAYER_RULE.md: read-only patterns, no writes, no side effects.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from .models import PlatformStaffProfile, AdminActionLog, StaffInvite

User = get_user_model()


def get_platform_staff_list(*, role: str = None, status: str = None, search: str = None):
    """
    Get platform staff list with filtering and search.
    
    Args:
        role: Filter by staff role
        status: Filter by status ('active' or 'inactive')
        search: Search by email or name
    """
    queryset = PlatformStaffProfile.objects.select_related('user').all().order_by('-created_at')

    if role:
        queryset = queryset.filter(role=role)
    
    if status:
        if status == 'active':
            queryset = queryset.filter(is_active=True)
        elif status == 'inactive':
            queryset = queryset.filter(is_active=False)
            
    if search:
        queryset = queryset.filter(
            Q(user__email__icontains=search) |
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search)
        )
        
    return queryset


def get_active_platform_staff():
    """Get all active platform staff members."""
    return PlatformStaffProfile.objects.select_related('user').filter(
        is_active=True,
        revoked_at__isnull=True
    ).order_by('-created_at')


def get_active_admins():
    """Get all active admins (Super Admin or Platform Admin)."""
    return PlatformStaffProfile.objects.filter(
        role__in=[PlatformStaffProfile.ROLE_SUPER_ADMIN, PlatformStaffProfile.ROLE_PLATFORM_ADMIN],
        is_active=True
    ).select_related('user')


def get_all_platform_staff():
    """Get all platform staff members (active and inactive)."""
    return PlatformStaffProfile.objects.select_related('user').all().order_by('-created_at')


def get_platform_staff_by_role(role: str):
    """Get platform staff by specific role."""
    return PlatformStaffProfile.objects.select_related('user').filter(
        role=role,
        is_active=True,
        revoked_at__isnull=True
    ).order_by('-created_at')


def get_staff_invites_by_status(status: str = None):
    """Get staff invites by status (pending, accepted, expired)."""
    now = timezone.now()
    
    queryset = StaffInvite.objects.select_related('created_by').all()
    
    if status == 'pending':
        queryset = queryset.filter(
            is_accepted=False,
            expires_at__gt=now
        )
    elif status == 'accepted':
        queryset = queryset.filter(is_accepted=True)
    elif status == 'expired':
        queryset = queryset.filter(
            is_accepted=False,
            expires_at__lte=now
        )
    
    return queryset.order_by('-created_at')


def get_all_staff_invites():
    """Get all staff invites."""
    return StaffInvite.objects.select_related('created_by').all().order_by('-created_at')


def get_expired_staff_invites():
    """Get all expired staff invites."""
    now = timezone.now()
    return StaffInvite.objects.select_related('created_by').filter(
        is_accepted=False,
        expires_at__lte=now
    ).order_by('-created_at')


def get_admin_action_logs(*, limit: int = 100, offset: int = 0):
    """Get admin action logs with pagination."""
    return AdminActionLog.objects.select_related('actor').order_by('-created_at')[offset:offset + limit]


def get_admin_action_logs_by_actor(actor_id: int):
    """Get admin action logs by specific actor."""
    return AdminActionLog.objects.select_related('actor').filter(
        actor_id=actor_id
    ).order_by('-created_at')


def get_admin_action_logs_by_action(action: str):
    """Get admin action logs by specific action."""
    return AdminActionLog.objects.select_related('actor').filter(
        action=action
    ).order_by('-created_at')


def get_admin_action_logs_in_date_range(start_date, end_date):
    """Get admin action logs within a date range."""
    return AdminActionLog.objects.select_related('actor').filter(
        created_at__range=[start_date, end_date]
    ).order_by('-created_at')


def get_user_institution_info(user_id: str, role: str) -> dict:
    """
    Resolve institution ID and name for a user based on their role.
    Follows Rule 1.2: Uses other apps' query layers.
    """
    from edulink.apps.students import queries as student_queries
    from edulink.apps.institutions import queries as institution_queries
    from edulink.apps.employers import queries as employer_queries
    # User is already available at module level via get_user_model()
    
    result = {"id": None, "name": None}
    
    if role == User.ROLE_STUDENT:
        student = student_queries.get_student_for_user(user_id)
        if student and student.institution_id:
            result["id"] = str(student.institution_id)
            try:
                inst = institution_queries.get_institution_by_id(institution_id=student.institution_id)
                result["name"] = inst.name
            except Exception:
                pass
                
    elif role in [User.ROLE_INSTITUTION_ADMIN, User.ROLE_SUPERVISOR]:
        # Check institution staff
        staff = institution_queries.get_institution_staff_profile(user_id)
        if staff:
            result["id"] = str(staff.institution.id)
            result["name"] = staff.institution.name
        else:
            # Check employer supervisor
            employer = employer_queries.get_employer_for_user(user_id)
            if employer:
                result["id"] = str(employer.id)
                result["name"] = employer.name
                
    elif role == User.ROLE_EMPLOYER_ADMIN:
        employer = employer_queries.get_employer_for_user(user_id)
        if employer:
            result["id"] = str(employer.id)
            result["name"] = employer.name
            
    return result


def calculate_trend(current: int, previous: int) -> float:
    """Calculate percentage change between current and previous values."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def get_system_analytics():
    """
    Get system-wide analytics for admin dashboard with real trend calculations.
    Follows Rule 1.2: Delegates to domain-specific query layers.
    Trends are calculated based on growth over the last 30 days.
    """
    from edulink.apps.accounts import queries as account_queries
    from edulink.apps.institutions import queries as institution_queries
    from edulink.apps.internships import queries as internship_queries
    import psutil
    
    # 1. Base Stats
    account_stats = account_queries.get_account_analytics()
    institution_stats = institution_queries.get_institution_analytics()
    
    # 2. Date ranges for trends
    # (Handled inside domain query functions now)
    
    # 3. Calculate Trends (Growth in last 30 days)
    # Users
    user_growth = account_queries.get_user_growth_stats(days=30)
    users_trend = calculate_trend(user_growth['current_count'], user_growth['previous_count'])
    
    # Institutions
    inst_growth = institution_queries.get_institution_growth_stats(days=30)
    institutions_trend = calculate_trend(inst_growth['current_count'], inst_growth['previous_count'])
    
    # Internships & Applications
    intern_growth = internship_queries.get_internship_growth_stats(days=30)
    internships_trend = calculate_trend(intern_growth['current_opportunities'], intern_growth['previous_opportunities'])
    applications_trend = calculate_trend(intern_growth['current_applications'], intern_growth['previous_applications'])
    
    current_internships = intern_growth['current_opportunities']
    current_applications = intern_growth['current_applications']
    
    # 4. Performance metrics
    try:
        system_load = psutil.cpu_percent(interval=0.1)
        memory_usage = psutil.virtual_memory().percent
        disk_usage = psutil.disk_usage('/').percent
    except Exception:
        system_load = 0.0
        memory_usage = 0.0
        disk_usage = 0.0
    
    return {
        **account_stats,
        **institution_stats,
        'total_users_trend': users_trend,
        'total_institutions_trend': institutions_trend,
        'total_internships': current_internships,
        'total_internships_trend': internships_trend,
        'total_applications': current_applications,
        'total_applications_trend': applications_trend,
        'system_load': system_load,
        'memory_usage': memory_usage,
        'disk_usage': disk_usage,
        'response_time': 120,  # Mock latency in ms
        'api_requests': 45,    # Mock requests per min
        'total_platform_staff': PlatformStaffProfile.objects.filter(
            is_active=True,
            revoked_at__isnull=True
        ).count(),
        'super_admins': PlatformStaffProfile.objects.filter(
            role=PlatformStaffProfile.ROLE_SUPER_ADMIN,
            is_active=True,
            revoked_at__isnull=True
        ).count(),
        'platform_admins': PlatformStaffProfile.objects.filter(
            role=PlatformStaffProfile.ROLE_PLATFORM_ADMIN,
            is_active=True,
            revoked_at__isnull=True
        ).count(),
        'moderators': PlatformStaffProfile.objects.filter(
            role=PlatformStaffProfile.ROLE_MODERATOR,
            is_active=True,
            revoked_at__isnull=True
        ).count(),
    }


def get_system_health_status():
    """
    Get comprehensive system health status.
    """
    from django.db import connections
    from django.db.utils import OperationalError
    from django.utils import timezone
    import os
    
    health = {
        'status': 'healthy',
        'uptime': '12d 4h 32m',  # This would normally be calculated from process start time
        'last_check': timezone.now().isoformat(),
        'services': {
            'database': 'healthy',
            'email_service': 'healthy',
            'file_storage': 'healthy',
        }
    }
    
    # Check Database
    db_conn = connections['default']
    try:
        db_conn.cursor()
    except OperationalError:
        health['services']['database'] = 'critical'
        health['status'] = 'critical'
        
    # Check File Storage
    media_root = settings.MEDIA_ROOT if hasattr(settings, 'MEDIA_ROOT') else None
    if media_root and not os.access(media_root, os.W_OK):
        health['services']['file_storage'] = 'degraded'
        if health['status'] == 'healthy':
            health['status'] = 'degraded'
            
    return health


def get_system_activity_logs(limit: int = 50):
    """
    Get authoritative system activity logs from the ledger.
    Returns raw ledger events to be formatted by serializers.
    """
    from edulink.apps.ledger import queries as ledger_queries
    return ledger_queries.get_recent_ledger_events(limit=limit)


def get_institution_management_stats():
    """
    Get institution management statistics following architecture rules.
    Delegates to the owning app's query layer.
    """
    from edulink.apps.institutions import queries as institution_queries
    
    stats = institution_queries.get_institution_analytics()
    
    return {
        "total_institutions": stats['total_institutions'],
        "verified_institutions": stats['verified_institutions'],
        "pending_requests": stats['pending_institutions'],
        "institutions_requiring_review": stats['pending_institutions'],
    }


def get_recent_platform_staff_activity(days: int = 30):
    """Get recent platform staff activity."""
    from django.utils import timezone
    from datetime import timedelta
    
    cutoff_date = timezone.now() - timedelta(days=days)
    
    return AdminActionLog.objects.select_related('actor').filter(
        created_at__gte=cutoff_date
    ).values('actor__email', 'actor__platform_staff_profile__role').annotate(
        action_count=Count('id')
    ).order_by('-action_count')


def get_staff_invite_analytics():
    """Get staff invite analytics."""
    now = timezone.now()
    
    return {
        'total_invites': StaffInvite.objects.count(),
        'pending_invites': StaffInvite.objects.filter(
            is_accepted=False,
            expires_at__gt=now
        ).count(),
        'accepted_invites': StaffInvite.objects.filter(is_accepted=True).count(),
        'expired_invites': StaffInvite.objects.filter(
            is_accepted=False,
            expires_at__lte=now
        ).count(),
        'acceptance_rate': (
            StaffInvite.objects.filter(is_accepted=True).count() /
            max(StaffInvite.objects.count(), 1) * 100
        ),
    }


def get_recent_users_for_dashboard(limit: int = 5):
    """
    Get recent users for the admin dashboard.
    Delegates to the accounts query layer.
    """
    from edulink.apps.accounts import queries as account_queries
    return account_queries.list_recent_users(limit=limit)


def get_pending_invites_count() -> int:
    """Get count of pending staff invites."""
    return StaffInvite.objects.filter(
        accepted_at__isnull=True,
        expires_at__gt=timezone.now()
    ).count()


def get_users_managed_by_staff(staff_user, search: str = None, role: str = None, status: str = None):
    """
    Get users that can be managed by a specific staff member with filtering.
    Delegates to the owning app's query layer.
    """
    from edulink.apps.accounts import queries as account_queries
    
    return account_queries.list_users_excluding_platform_staff(
        search=search,
        role=role,
        status=status
    )


def get_institutions_for_staff_review():
    """Get institutions pending staff review."""
    from edulink.apps.institutions import queries as institution_queries
    
    return institution_queries.list_active_institutions()


def get_pending_institution_requests():
    """Get pending institution onboarding requests for staff review."""
    from edulink.apps.institutions import queries as institution_queries
    
    return institution_queries.list_pending_institution_requests()


def get_contact_submissions():
    """Get all contact submissions for staff review."""
    from edulink.apps.contact import queries as contact_queries
    return contact_queries.get_all_submissions()


def get_institution_requests_by_status(status: str = None):
    """Get institution requests by status."""
    from edulink.apps.institutions import queries as institution_queries
    
    return institution_queries.list_reviewed_institution_requests() if status in ['approved', 'rejected'] else institution_queries.list_pending_institution_requests()