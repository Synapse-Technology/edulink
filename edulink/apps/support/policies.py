from .models import SupportTicket

def is_platform_staff(user):
    """Check if user is a platform staff member."""
    return hasattr(user, 'platform_staff_profile') and user.platform_staff_profile.is_active

def can_view_ticket(user, ticket: SupportTicket):
    """Authority to view a specific ticket."""
    if is_platform_staff(user):
        return True
    return ticket.user_id == user.id

def can_reply_to_ticket(user, ticket: SupportTicket):
    """Authority to reply to a ticket."""
    if ticket.status == SupportTicket.STATUS_CLOSED:
        return False
    return can_view_ticket(user, ticket)

def can_manage_support(user):
    """Authority to manage the support system (Admin/Moderator)."""
    from edulink.apps.platform_admin.policies import can_respond_to_support_tickets
    return can_respond_to_support_tickets(actor=user)
