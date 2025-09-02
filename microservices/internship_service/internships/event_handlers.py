from shared.message_queue import event_handler, handles_events
from shared.events import EventType
from .tasks import (
    verify_internship,
    calculate_analytics,
    update_internship_statistics,
    sync_employer_data
)
from .models import Internship
import logging

logger = logging.getLogger(__name__)


@event_handler(EventType.INTERNSHIP_CREATED)
def handle_internship_created(event_data):
    """
    Handle internship creation event
    """
    internship_id = event_data.get('internship_id')
    if internship_id:
        # Start verification process
        verify_internship.delay(internship_id)
        logger.info(f"Started verification for internship {internship_id}")


@event_handler(EventType.INTERNSHIP_UPDATED)
def handle_internship_updated(event_data):
    """
    Handle internship update event
    """
    internship_id = event_data.get('internship_id')
    if internship_id:
        # Recalculate analytics
        calculate_analytics.delay(internship_id)
        logger.info(f"Recalculating analytics for internship {internship_id}")


@event_handler(EventType.APPLICATION_CREATED)
def handle_application_created(event_data):
    """
    Handle application creation event from application service
    """
    internship_id = event_data.get('internship_id')
    if internship_id:
        # Update internship statistics
        update_internship_statistics.delay()
        # Recalculate analytics for the specific internship
        calculate_analytics.delay(internship_id)
        logger.info(f"Updated statistics for internship {internship_id} after new application")


@event_handler(EventType.APPLICATION_STATUS_CHANGED)
def handle_application_status_changed(event_data):
    """
    Handle application status change event
    """
    internship_id = event_data.get('internship_id')
    new_status = event_data.get('new_status')
    
    if internship_id and new_status in ['accepted', 'rejected']:
        # Update internship analytics when applications are finalized
        calculate_analytics.delay(internship_id)
        logger.info(f"Updated analytics for internship {internship_id} after status change to {new_status}")


@event_handler(EventType.USER_UPDATED)
def handle_user_updated(event_data):
    """
    Handle user update event (for employers)
    """
    user_id = event_data.get('user_id')
    user_type = event_data.get('user_type')
    
    if user_type == 'employer' and user_id:
        # Sync employer data
        sync_employer_data.delay(user_id)
        logger.info(f"Syncing employer data for user {user_id}")


@event_handler(EventType.INTERNSHIP_EXPIRED)
def handle_internship_expired(event_data):
    """
    Handle internship expiration event
    """
    internship_id = event_data.get('internship_id')
    if internship_id:
        try:
            internship = Internship.objects.get(id=internship_id)
            internship.is_active = False
            internship.save()
            logger.info(f"Marked internship {internship_id} as inactive due to expiration")
        except Internship.DoesNotExist:
            logger.warning(f"Internship {internship_id} not found for expiration handling")


@event_handler(EventType.NOTIFICATION_CREATED)
def handle_notification_created(event_data):
    """
    Handle notification creation event
    """
    # This service might not need to handle notifications directly,
    # but we can log for monitoring purposes
    notification_type = event_data.get('type')
    recipient_id = event_data.get('recipient_id')
    logger.info(f"Notification of type {notification_type} created for user {recipient_id}")


# Register all event handlers
@handles_events([
    EventType.INTERNSHIP_CREATED,
    EventType.INTERNSHIP_UPDATED,
    EventType.APPLICATION_CREATED,
    EventType.APPLICATION_STATUS_CHANGED,
    EventType.USER_UPDATED,
    EventType.INTERNSHIP_EXPIRED,
    EventType.NOTIFICATION_CREATED
])
class InternshipServiceEventHandlers:
    """
    Event handlers for the internship service
    """
    pass