from typing import Optional
from django.db.models import Q
from .models import SupportTicket, Feedback

def get_user_tickets(*, user_id: str):
    """Get all tickets for a specific user."""
    return SupportTicket.objects.filter(user_id=user_id).prefetch_related('communications', 'attachments')

def get_admin_tickets(*, staff_profile_id: str = None):
    """Get all tickets for admins, optionally filtered by assignment."""
    queryset = SupportTicket.objects.all().prefetch_related('communications', 'attachments')
    if staff_profile_id:
        queryset = queryset.filter(Q(assigned_to_id=staff_profile_id) | Q(assigned_to_id__isnull=True))
    return queryset

def get_ticket_by_code(*, tracking_code: str) -> Optional[SupportTicket]:
    """Lookup a ticket by its unique tracking code."""
    try:
        return SupportTicket.objects.prefetch_related('communications', 'attachments').get(tracking_code=tracking_code)
    except SupportTicket.DoesNotExist:
        return None

def get_feedback_list():
    """Get all feedback for admins."""
    return Feedback.objects.all().select_related('user')
