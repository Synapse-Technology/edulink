from uuid import UUID
from typing import Iterable, Optional
from django.db.models import Count
from django.db.models.functions import TruncMonth
from .models import (
    Institution,
    InstitutionSuggestion,
    InstitutionRequest,
    InstitutionStaff,
    InstitutionInvite,
    InstitutionStaffProfileRequest,
    Department,
    Cohort,
    InstitutionInterest,
)


from django.db.models import QuerySet

def get_institution_staff_by_id(*, staff_id: UUID) -> Optional[InstitutionStaff]:
    """
    Get an institution staff member by their UUID.
    Supports both Profile ID and User ID for robustness.
    """
    try:
        # 1. Try fetching by Profile PK
        return InstitutionStaff.objects.select_related('user').get(id=staff_id)
    except InstitutionStaff.DoesNotExist:
        # 2. Try fetching by User ID fallback
        return InstitutionStaff.objects.select_related('user').filter(user_id=staff_id, is_active=True).first()
    except (ValueError, TypeError):
        return None


def get_institution_by_id(*, institution_id: UUID) -> Institution:
    return Institution.objects.get(id=institution_id)


def get_department_by_id(*, department_id: UUID) -> Department:
    return Department.objects.get(id=department_id)


def get_cohort_by_id(*, cohort_id: UUID) -> Cohort:
    return Cohort.objects.get(id=cohort_id)


def institution_exists(*, institution_id: str) -> bool:
    try:
        if isinstance(institution_id, str):
            institution_id = UUID(institution_id)
        return Institution.objects.filter(id=institution_id).exists()
    except (ValueError, TypeError):
        return False


def get_institution_for_user(user_id: str) -> Optional[Institution]:
    """
    Get the institution that a user administers.
    Returns the first active institution found for the user.
    """
    # Check for InstitutionStaff record (Primary Method)
    staff = InstitutionStaff.objects.filter(
        user__id=user_id, 
        role=InstitutionStaff.ROLE_ADMIN, 
        is_active=True
    ).select_related('institution').first()
    
    if staff:
        return staff.institution

    return None


def get_institution_staff_profile(user_id: str) -> Optional[InstitutionStaff]:
    """
    Get the staff profile for a user, regardless of role (Admin, Member, Supervisor).
    """
    return InstitutionStaff.objects.filter(
        user__id=user_id,
        is_active=True
    ).select_related('institution').first()


def get_institution_staff_id_for_user(user_id: str) -> Optional[UUID]:
    """
    Get the institution staff profile ID for a user.
    """
    staff = InstitutionStaff.objects.filter(user__id=user_id, is_active=True).only('id').first()
    return staff.id if staff else None


def get_institution_interest_by_id(interest_id: str) -> Optional[InstitutionInterest]:
    """Get InstitutionInterest by ID."""
    try:
        return InstitutionInterest.objects.get(id=interest_id)
    except (InstitutionInterest.DoesNotExist, ValueError):
        return None


def get_interested_users_for_institution(institution_name: str):
    """Get all interested users for a specific institution name."""
    return InstitutionInterest.objects.filter(
        raw_name__icontains=institution_name,
        user_email__isnull=False
    ).exclude(user_email='')

def get_institution_by_domain(*, domain: str) -> Institution:
    return Institution.objects.get(domain=domain.lower())


def check_department_ownership(department_id: str, institution_id: UUID) -> bool:
    """Check if a department belongs to an institution."""
    return Department.objects.filter(id=department_id, institution_id=institution_id).exists()


def check_cohort_ownership(cohort_id: str, institution_id: UUID) -> bool:
    """Check if a cohort belongs to an institution's department."""
    return Cohort.objects.filter(id=cohort_id, department__institution_id=institution_id).exists()


def get_institution_by_name(*, name: str) -> Institution:
    return Institution.objects.get(name=name)


def list_all_institutions() -> Iterable[Institution]:
    return Institution.objects.all()


def list_active_institutions() -> Iterable[Institution]:
    return Institution.objects.filter(is_active=True, is_verified=True)


def list_inactive_institutions() -> Iterable[Institution]:
    return Institution.objects.filter(is_active=False)


def list_public_institutions(search_query: str = "") -> Iterable[Institution]:
    queryset = Institution.objects.filter(is_active=True, is_verified=True)
    if search_query:
        queryset = queryset.filter(name__icontains=search_query)
    return queryset


def list_open_suggestions() -> Iterable[InstitutionSuggestion]:
    return InstitutionSuggestion.objects.filter(status="open")


def list_reviewed_suggestions() -> Iterable[InstitutionSuggestion]:
    return InstitutionSuggestion.objects.filter(status="reviewed")


def get_institution_request_by_id(*, request_id: UUID) -> InstitutionRequest:
    return InstitutionRequest.objects.get(id=request_id)


def list_pending_institution_requests() -> Iterable[InstitutionRequest]:
    return InstitutionRequest.objects.filter(status=InstitutionRequest.STATUS_PENDING)


def list_reviewed_institution_requests() -> Iterable[InstitutionRequest]:
    return InstitutionRequest.objects.filter(
        status__in=[InstitutionRequest.STATUS_APPROVED, InstitutionRequest.STATUS_REJECTED]
    )


def list_institution_requests_by_representative(*, representative_email: str) -> Iterable[InstitutionRequest]:
    return InstitutionRequest.objects.filter(representative_email=representative_email.lower())


def check_domain_conflicts(*, domains: list[str]) -> list[dict]:
    """
    Check if any of the requested domains are already in use.
    Returns list of conflicts with existing institutions.
    """
    conflicts = []
    existing_domains = Institution.objects.filter(
        domain__in=[domain.lower() for domain in domains]
    ).values('id', 'name', 'domain', 'is_verified')
    
    for existing in existing_domains:
        conflicts.append({
            'domain': existing['domain'],
            'institution_name': existing['name'],
            'is_verified': existing['is_verified']
        })
        
    return conflicts


def get_institution_details_for_trust(*, institution_id: UUID) -> dict:
    """
    Get institution details required for trust computation.
    Returns a dict to avoid exposing the model.
    """
    institution = Institution.objects.get(id=institution_id)
    return {
        "id": institution.id,
        "status": institution.status,
        "trust_level": institution.trust_level,
        "trust_label": institution.get_trust_level_display(),
    }


def list_institution_staff_profile_requests_for_institution(
    *,
    institution_id: str,
    status: str | None = None,
) -> Iterable[InstitutionStaffProfileRequest]:
    queryset = (
        InstitutionStaffProfileRequest.objects.filter(institution_id=institution_id)
        .select_related("staff__user")
        .order_by("-created_at")
    )
    if status:
        queryset = queryset.filter(status=status)
    return queryset


def get_supervisors_by_affiliation(
    *, 
    institution_id: UUID, 
    department_name: str, 
    cohort_name: str = ""
) -> Iterable[InstitutionStaff]:
    """
    Get supervisors for an institution filtered by department and cohort names.
    """
    filters = {
        "institution_id": institution_id,
        "role": InstitutionStaff.ROLE_SUPERVISOR,
        "is_active": True,
        "department": department_name
    }
    if cohort_name:
        filters["cohort"] = cohort_name
        
    return InstitutionStaff.objects.filter(**filters).select_related('user')

def get_institution_staff_list(*, institution_id: UUID) -> Iterable[InstitutionStaff]:
    """
    List all staff members for an institution.
    """
    return InstitutionStaff.objects.filter(institution_id=institution_id).select_related('user')

def get_staff_count_for_institution(institution_id: str, role: str = None) -> int:
    """
    Get staff count for an institution, optionally filtered by role.
    """
    queryset = InstitutionStaff.objects.filter(institution_id=institution_id, is_active=True)
    if role:
        queryset = queryset.filter(role=role)
    return queryset.count()

def get_active_institution_staff_member(*, staff_id: UUID, institution_id: UUID) -> Optional[InstitutionStaff]:
    """
    Get an active staff member for a specific institution.
    """
    try:
        return InstitutionStaff.objects.get(id=staff_id, institution_id=institution_id, is_active=True)
    except InstitutionStaff.DoesNotExist:
        return None

def list_departments_for_institution(*, institution_id: UUID) -> Iterable[Department]:
    """
    List active departments for an institution.
    """
    return Department.objects.filter(institution_id=institution_id, is_active=True)

def list_cohorts_for_institution(*, institution_id: UUID) -> Iterable[Cohort]:
    """
    List active cohorts for an institution.
    """
    return Cohort.objects.filter(department__institution_id=institution_id, is_active=True)


def get_departments_map_by_ids(department_ids: list[str]) -> dict:
    """
    Returns a dict mapping department_id -> department name for a list of IDs.
    """
    valid_ids = []
    for did in department_ids:
        try:
            if did:
                valid_ids.append(UUID(str(did)))
        except (ValueError, TypeError):
            continue
            
    departments = Department.objects.filter(id__in=valid_ids).values('id', 'name')
    return {str(d['id']): d['name'] for d in departments}


def get_institution_analytics() -> dict:
    """
    Get system-wide institution analytics.
    Follows Rule 2: Centralize filtering logic.
    """
    return {
        'total_institutions': Institution.objects.count(),
        'verified_institutions': Institution.objects.filter(is_verified=True).count(),
        'pending_institutions': InstitutionRequest.objects.filter(status=InstitutionRequest.STATUS_PENDING).count(),
        'total_student_interests': InstitutionInterest.objects.count(),
    }


def get_institution_growth_stats(days: int = 30) -> dict:
    """
    Get institution growth statistics for trend calculation.
    """
    from django.utils import timezone
    from datetime import timedelta
    
    now = timezone.now()
    cutoff = now - timedelta(days=days)
    
    current_count = Institution.objects.count()
    previous_count = Institution.objects.filter(created_at__lt=cutoff).count()
    
    return {
        "current_count": current_count,
        "previous_count": previous_count,
    }


def get_institution_interest_statistics():
    """
    Aggregate statistics for institutions students want to join.
    Used for platform analytics and growth planning.
    """
    from django.db.models import F
    # 1. Top requested institutions
    top_requested = InstitutionInterest.objects.values(name=F('raw_name')).annotate(
        request_count=Count('id')
    ).order_by('-request_count')[:10]
    
    # 2. Requests over time (Monthly)
    requests_over_time = InstitutionInterest.objects.annotate(
        month=TruncMonth('created_at')
    ).values('month').annotate(
        count=Count('id')
    ).order_by('month')
    
    # 3. Recent requests
    recent_requests = InstitutionInterest.objects.values(
        'id', 'email_domain', 'created_at', 'user_email', name=F('raw_name')
    ).order_by('-created_at')[:20]
    
    return {
        "top_requested": list(top_requested),
        "requests_over_time": list(requests_over_time),
        "recent_requests": list(recent_requests),
        "total_requests": InstitutionInterest.objects.count()
    }


def get_institution_request_queryset(*, status_filter: str = None) -> QuerySet:
    """
    Get queryset for institution requests with optional filtering.
    """
    if status_filter == "pending":
        return list_pending_institution_requests()
    elif status_filter == "reviewed":
        return list_reviewed_institution_requests()
    else:
        return InstitutionRequest.objects.all().order_by("-created_at")
