from django.conf import settings
from django.core.mail import send_mail
import logging
import uuid
import secrets
from django.utils import timezone
from django.db import transaction
from .models import SupportTicket, Feedback, TicketCommunication, TicketAttachment
from edulink.apps.ledger.services import record_event
from edulink.shared.pusher_utils import trigger_pusher_event

logger = logging.getLogger(__name__)

def generate_tracking_code():
    """Generate a unique tracking code: EL-SUP-XXXXXX"""
    random_part = secrets.token_hex(3).upper()
    return f"EL-SUP-{random_part}"

@transaction.atomic
def create_support_ticket(*, 
    name: str, 
    email: str, 
    subject: str, 
    message: str, 
    category: str = 'OTHER',
    priority: str = 'LOW',
    related_entity_type: str = '',
    related_entity_id: str = None,
    user=None,
    attachments=None
) -> SupportTicket:
    """
    Create a new support ticket with tracking code.
    """
    tracking_code = generate_tracking_code()
    # Ensure uniqueness
    while SupportTicket.objects.filter(tracking_code=tracking_code).exists():
        tracking_code = generate_tracking_code()

    ticket = SupportTicket.objects.create(
        user=user,
        tracking_code=tracking_code,
        name=name,
        email=email,
        subject=subject,
        message=message,
        category=category,
        priority=priority,
        related_entity_type=related_entity_type,
        related_entity_id=uuid.UUID(related_entity_id) if related_entity_id else None
    )
    
    # Process attachments
    if attachments:
        for file in attachments:
            TicketAttachment.objects.create(
                ticket=ticket,
                file=file,
                file_name=file.name
            )

    # Initial communication (the original message)
    TicketCommunication.objects.create(
        ticket=ticket,
        sender=user,
        message=message
    )

    # Send email to support team
    from edulink.apps.notifications.services import send_support_ticket_confirmation
    try:
        send_support_ticket_confirmation(ticket=ticket)
    except Exception as e:
        logger.error(f"Failed to send support ticket confirmation email: {e}")

    # Also notify support team (original implementation)
    try:
        send_mail(
            subject=f"New Support Ticket [{tracking_code}]: {subject}",
            message=f"Tracking Code: {tracking_code}\nFrom: {name} <{email}>\nCategory: {category}\nPriority: {priority}\n\nMessage:\n{message}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL],
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send support ticket team email: {e}")

    record_event(
        event_type="SUPPORT_TICKET_CREATED",
        actor_id=user.id if user else None,
        entity_type="support_ticket",
        entity_id=ticket.id,
        payload={
            "tracking_code": tracking_code,
            "subject": subject,
            "category": category,
            "priority": priority
        }
    )
    
    # Trigger Pusher event for staff dashboard
    def trigger_create_notifications():
        trigger_pusher_event(
            channel="support-global",
            event_name="ticket-activity",
            data={
                "type": "TICKET_CREATED",
                "tracking_code": ticket.tracking_code
            }
        )
    
    transaction.on_commit(trigger_create_notifications)
    
    return ticket

@transaction.atomic
def add_ticket_message(*, ticket_id: str, sender, message: str, is_internal: bool = False) -> TicketCommunication:
    """Add a message to a ticket thread."""
    ticket = SupportTicket.objects.get(id=ticket_id)
    
    comm = TicketCommunication.objects.create(
        ticket=ticket,
        sender=sender,
        message=message,
        is_internal=is_internal
    )
    
    # Update status if admin is replying
    if hasattr(sender, 'platform_staff_profile') and ticket.status == SupportTicket.STATUS_OPEN:
        ticket.status = SupportTicket.STATUS_IN_PROGRESS
        ticket.save()

    # Send notification
    from edulink.apps.notifications.services import send_support_ticket_reply_notification
    
    def trigger_notifications():
        try:
            # Don't send notification for internal messages
            if not is_internal:
                send_support_ticket_reply_notification(ticket=ticket, communication=comm)
                
                # Trigger Pusher event for real-time update in TicketDetail.tsx
                trigger_pusher_event(
                    channel=f"ticket-{ticket.tracking_code}",
                    event_name="ticket-updated",
                    data={
                        "type": "NEW_MESSAGE",
                        "tracking_code": ticket.tracking_code,
                        "status": ticket.status
                    }
                )
                
                # Trigger Pusher event for staff dashboard
                trigger_pusher_event(
                    channel="support-global",
                    event_name="ticket-activity",
                    data={
                        "type": "TICKET_REPLY",
                        "tracking_code": ticket.tracking_code
                    }
                )
        except Exception as e:
            logger.error(f"Failed to send support ticket reply notification: {e}")

    transaction.on_commit(trigger_notifications)

    record_event(
        event_type="SUPPORT_TICKET_REPLIED",
        actor_id=sender.id,
        entity_type="support_ticket",
        entity_id=ticket.id,
        payload={
            "is_internal": is_internal
        }
    )
    
    return comm

@transaction.atomic
def resolve_ticket(*, ticket_id: str, actor, notes: str) -> SupportTicket:
    """Mark a ticket as resolved."""
    ticket = SupportTicket.objects.get(id=ticket_id)
    
    ticket.status = SupportTicket.STATUS_RESOLVED
    ticket.resolved_at = timezone.now()
    ticket.resolution_notes = notes
    ticket.save()
    
    # Add resolution message to thread
    TicketCommunication.objects.create(
        ticket=ticket,
        sender=actor,
        message=f"TICKET RESOLVED: {notes}"
    )

    # Send notification
    from edulink.apps.notifications.services import send_support_ticket_resolved_notification
    
    def trigger_resolve_notifications():
        try:
            send_support_ticket_resolved_notification(ticket=ticket)
            
            # Trigger Pusher event
            trigger_pusher_event(
                channel=f"ticket-{ticket.tracking_code}",
                event_name="ticket-updated",
                data={
                    "type": "TICKET_RESOLVED",
                    "tracking_code": ticket.tracking_code,
                    "status": ticket.status
                }
            )
        except Exception as e:
            logger.error(f"Failed to send support ticket resolved notification: {e}")

    transaction.on_commit(trigger_resolve_notifications)

    record_event(
        event_type="SUPPORT_TICKET_RESOLVED",
        actor_id=actor.id,
        entity_type="support_ticket",
        entity_id=ticket.id,
        payload={
            "notes": notes
        }
    )
    
    return ticket

def assign_ticket(*, ticket_id: str, staff_profile_id: str, actor) -> SupportTicket:
    """Assign ticket to a staff member."""
    ticket = SupportTicket.objects.get(id=ticket_id)
    ticket.assigned_to_id = staff_profile_id
    ticket.status = SupportTicket.STATUS_IN_PROGRESS
    ticket.save()

    # Send notification
    from edulink.apps.notifications.services import send_support_ticket_assigned_notification
    try:
        # We need to get the staff profile for notification purposes
        # but we don't store it as a FK
        from edulink.apps.platform_admin.queries import get_staff_profile_by_id
        staff_profile = get_staff_profile_by_id(staff_profile_id)
        if staff_profile:
            send_support_ticket_assigned_notification(ticket=ticket, staff_profile=staff_profile)
    except Exception as e:
        logger.error(f"Failed to send support ticket assigned notification: {e}")
    
    record_event(
        event_type="SUPPORT_TICKET_ASSIGNED",
        actor_id=actor.id,
        entity_type="support_ticket",
        entity_id=ticket.id,
        payload={
            "assigned_to_id": staff_profile_id
        }
    )
    
    return ticket

def submit_feedback(*, message: str, user=None) -> Feedback:
    feedback = Feedback.objects.create(
        user=user,
        message=message,
        is_anonymous=user is None
    )
    
    # Send email to support team (optional, maybe digest is better, but per-item for now)
    try:
        user_info = f"User: {user.email}" if user else "Anonymous User"
        send_mail(
            subject="New Feedback Received",
            message=f"{user_info}\n\nFeedback:\n{message}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL],
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send feedback email: {e}")

    record_event(
        event_type="FEEDBACK_SUBMITTED",
        actor_id=user.id if user else None,
        entity_type="feedback",
        entity_id=feedback.id,
        payload={
            "is_anonymous": user is None
        }
    )
    
    return feedback
