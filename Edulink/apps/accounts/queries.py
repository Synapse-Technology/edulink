from typing import Optional, List, Dict
from uuid import UUID
from .models import User

def get_user_by_id(user_id: str) -> Optional[User]:
    """
    Get User by ID.
    """
    try:
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        return User.objects.get(id=user_id)
    except (User.DoesNotExist, ValueError):
        return None


def get_users_map_by_ids(user_ids: List[str]) -> dict:
    """
    Returns a dict mapping user_id -> User object for a list of IDs.
    """
    valid_ids = []
    for uid in user_ids:
        try:
            valid_ids.append(UUID(str(uid)))
        except (ValueError, TypeError):
            continue
            
    users = User.objects.filter(id__in=valid_ids)
    return {str(u.id): u for u in users}


def get_account_analytics() -> dict:
    """
    Get system-wide account analytics.
    Follows Rule 2: Centralize filtering logic.
    """
    return {
        'total_users': User.objects.count(),
        'total_students': User.objects.filter(role=User.ROLE_STUDENT).count(),
        'total_employers': User.objects.filter(role=User.ROLE_EMPLOYER_ADMIN).count(),
        'active_users': User.objects.filter(is_active=True).count(),
        'inactive_users': User.objects.filter(is_active=False).count(),
    }


def list_users_excluding_platform_staff(search: str = None, role: str = None, status: str = None):
    """
    Get all users who are NOT platform staff members with filtering.
    Follows Rule 1.2: Boundary enforcement.
    """
    from django.db.models import Q
    
    queryset = User.objects.exclude(
        platform_staff_profile__is_active=True,
        platform_staff_profile__revoked_at__isnull=True
    ).order_by('-date_joined')

    if search:
        queryset = queryset.filter(
            Q(email__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(username__icontains=search)
        )
    
    if role and role != 'all':
        queryset = queryset.filter(role=role)
        
    if status and status != 'all':
        if status == 'active':
            queryset = queryset.filter(is_active=True)
        elif status == 'suspended':
            queryset = queryset.filter(is_active=False)
        elif status == 'verified':
            queryset = queryset.filter(is_email_verified=True)
        elif status == 'pending':
            queryset = queryset.filter(is_email_verified=False)
            
    return queryset


def list_recent_users(limit: int = 5):
    """
    Get most recently joined users.
    Follows Rule 2: Centralize filtering logic.
    """
    return User.objects.all().order_by('-date_joined')[:limit]


def get_user_growth_stats(days: int = 30) -> dict:
    """
    Get user growth statistics for trend calculation.
    """
    from django.utils import timezone
    from datetime import timedelta
    
    now = timezone.now()
    cutoff = now - timedelta(days=days)
    
    current_count = User.objects.count()
    previous_count = User.objects.filter(date_joined__lt=cutoff).count()
    
    return {
        "current_count": current_count,
        "previous_count": previous_count,
    }
