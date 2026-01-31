from uuid import UUID
from typing import Optional
from django.db.models import QuerySet
from .models import Employer, Supervisor, EmployerStaffProfileRequest, EmployerRequest

def get_employer_request_by_tracking_code(code: str) -> Optional[EmployerRequest]:
    """
    Get an employer request by its tracking code.
    """
    try:
        return EmployerRequest.objects.get(tracking_code=code)
    except EmployerRequest.DoesNotExist:
        return None

def get_employer_supervisor_by_user(*, user_id: UUID, employer_id: UUID) -> Optional[Supervisor]:
    """
    Get an active supervisor for a user and employer.
    """
    try:
        return Supervisor.objects.get(user_id=user_id, employer_id=employer_id, is_active=True)
    except Supervisor.DoesNotExist:
        return None

def get_supervisor_by_id(supervisor_id: UUID) -> Optional[Supervisor]:
    """
    Get an employer supervisor by their UUID.
    Supports both Profile ID and User ID for robustness.
    """
    try:
        # 1. Try fetching by Profile PK
        return Supervisor.objects.select_related('user').get(id=supervisor_id)
    except Supervisor.DoesNotExist:
        # 2. Try fetching by User ID fallback
        return Supervisor.objects.select_related('user').filter(user_id=supervisor_id, is_active=True).first()
    except (ValueError, TypeError):
        return None


def list_active_supervisors_for_employer(employer_id: UUID) -> QuerySet[Supervisor]:
    """
    List all active supervisors for an employer.
    """
    return Supervisor.objects.filter(employer_id=employer_id, is_active=True).select_related('user')

def get_employer_by_id(employer_id: UUID) -> Optional[Employer]:
    try:
        return Employer.objects.get(id=employer_id)
    except Employer.DoesNotExist:
        return None

def get_supervisor_id_for_user(user_id: UUID) -> Optional[UUID]:
    """
    Get the supervisor profile ID for a user.
    """
    supervisor = Supervisor.objects.filter(user_id=user_id, is_active=True).only('id').first()
    return supervisor.id if supervisor else None

def get_employer_for_user(user_id: UUID) -> Optional[Employer]:
    """
    Get the employer for a user (if they are a supervisor/admin).
    """
    supervisor = Supervisor.objects.filter(user_id=user_id, is_active=True).first()
    if supervisor:
        return supervisor.employer
    return None

def get_employers_by_ids(employer_ids: list[str]) -> dict:
    """
    Returns a dict mapping employer_id -> Employer object for a list of IDs.
    """
    valid_ids = []
    for eid in employer_ids:
        try:
            valid_ids.append(UUID(str(eid)))
        except (ValueError, TypeError):
            continue
    employers = Employer.objects.filter(id__in=valid_ids)
    return {str(e.id): e for e in employers}


def get_employer_details_for_trust(*, employer_id: UUID) -> dict:
    """
    Get employer details required for trust computation.
    Returns a dict to avoid exposing the model.
    """
    employer = Employer.objects.get(id=employer_id)
    return {
        "id": employer.id,
        "status": employer.status,
        "trust_level": employer.trust_level,
        "trust_label": employer.get_trust_level_display(),
    }


from django.db.models import QuerySet

def list_employer_staff_profile_requests_for_employer(employer_id: UUID, status: str = None) -> QuerySet[EmployerStaffProfileRequest]:
    """
    List profile update requests for an employer.
    Optional status filter (pending, approved, rejected).
    """
    queryset = EmployerStaffProfileRequest.objects.filter(employer_id=employer_id).select_related('staff__user').order_by('-created_at')
    if status:
        queryset = queryset.filter(status=status)
    return queryset
