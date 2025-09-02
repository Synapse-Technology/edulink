from shared.message_queue import event_handler, handles_events
from shared.events import EventType
from .tasks import (
    process_application_status_change,
    calculate_priority_score,
    update_application_statistics,
    sync_internship_data,
    process_supervisor_feedback
)
from .models import Application
import logging

logger = logging.getLogger(__name__)


@event_handler(EventType.APPLICATION_CREATED)
def handle_application_created(event_data):
    """
    Handle application creation event
    """
    application_id = event_data.get('application_id')
    if application_id:
        # Calculate initial priority score
        calculate_priority_score.delay(application_id)
        logger.info(f"Started priority score calculation for application {application_id}")


@event_handler(EventType.APPLICATION_UPDATED)
def handle_application_updated(event_data):
    """
    Handle application update event
    """
    application_id = event_data.get('application_id')
    if application_id:
        # Recalculate priority score
        calculate_priority_score.delay(application_id)
        logger.info(f"Recalculating priority score for application {application_id}")


@event_handler(EventType.APPLICATION_STATUS_CHANGED)
def handle_application_status_changed(event_data):
    """
    Handle application status change event
    """
    application_id = event_data.get('application_id')
    internship_id = event_data.get('internship_id')
    new_status = event_data.get('new_status')
    
    if internship_id:
        # Update statistics for the internship
        update_application_statistics.delay(internship_id=internship_id)
        logger.info(f"Updated statistics for internship {internship_id} after status change")


@event_handler(EventType.APPLICATION_FEEDBACK_RECEIVED)
def handle_application_feedback_received(event_data):
    """
    Handle supervisor feedback event
    """
    feedback_id = event_data.get('feedback_id')
    application_id = event_data.get('application_id')
    
    if feedback_id:
        # Process the feedback
        process_supervisor_feedback.delay(feedback_id)
        logger.info(f"Processing supervisor feedback {feedback_id} for application {application_id}")


@event_handler(EventType.INTERNSHIP_CREATED)
def handle_internship_created(event_data):
    """
    Handle internship creation event from internship service
    """
    internship_id = event_data.get('internship_id')
    if internship_id:
        # Update global statistics
        update_application_statistics.delay()
        logger.info(f"Updated global statistics after internship {internship_id} creation")


@event_handler(EventType.INTERNSHIP_UPDATED)
def handle_internship_updated(event_data):
    """
    Handle internship update event
    """
    internship_id = event_data.get('internship_id')
    if internship_id:
        # Sync internship data for related applications
        sync_internship_data.delay(internship_id)
        
        # Recalculate priority scores for applications to this internship
        applications = Application.objects.filter(internship_id=internship_id)
        for app in applications:
            calculate_priority_score.delay(app.id)
        
        logger.info(f"Synced data and recalculated scores for internship {internship_id}")


@event_handler(EventType.INTERNSHIP_VERIFIED)
def handle_internship_verified(event_data):
    """
    Handle internship verification event
    """
    internship_id = event_data.get('internship_id')
    status = event_data.get('status')
    
    if internship_id and status == 'verified':
        # Recalculate priority scores for applications to verified internships
        applications = Application.objects.filter(internship_id=internship_id)
        for app in applications:
            calculate_priority_score.delay(app.id)
        
        logger.info(f"Recalculated scores for applications to verified internship {internship_id}")
    elif status == 'rejected':
        # Handle rejected internship - might need to notify applicants
        applications = Application.objects.filter(
            internship_id=internship_id,
            status__in=['pending', 'under_review']
        )
        for app in applications:
            process_application_status_change.delay(app.id, 'withdrawn')
        
        logger.info(f"Withdrew applications for rejected internship {internship_id}")


@event_handler(EventType.INTERNSHIP_EXPIRED)
def handle_internship_expired(event_data):
    """
    Handle internship expiration event
    """
    internship_id = event_data.get('internship_id')
    if internship_id:
        # Update pending applications to withdrawn status
        applications = Application.objects.filter(
            internship_id=internship_id,
            status__in=['pending', 'under_review']
        )
        
        for app in applications:
            process_application_status_change.delay(app.id, 'withdrawn')
        
        logger.info(f"Withdrew {applications.count()} applications for expired internship {internship_id}")


@event_handler(EventType.USER_UPDATED)
def handle_user_updated(event_data):
    """
    Handle user update event (for students)
    """
    user_id = event_data.get('user_id')
    user_type = event_data.get('user_type')
    
    if user_type == 'student' and user_id:
        # Recalculate priority scores for student's applications
        applications = Application.objects.filter(student_id=user_id)
        for app in applications:
            calculate_priority_score.delay(app.id)
        
        logger.info(f"Recalculated priority scores for student {user_id} applications")


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


@event_handler(EventType.APPLICATION_WITHDRAWN)
def handle_application_withdrawn(event_data):
    """
    Handle application withdrawal event
    """
    application_id = event_data.get('application_id')
    internship_id = event_data.get('internship_id')
    
    if internship_id:
        # Update statistics after withdrawal
        update_application_statistics.delay(internship_id=internship_id)
        logger.info(f"Updated statistics after application {application_id} withdrawal")


# Register all event handlers
@handles_events([
    EventType.APPLICATION_CREATED,
    EventType.APPLICATION_UPDATED,
    EventType.APPLICATION_STATUS_CHANGED,
    EventType.APPLICATION_FEEDBACK_RECEIVED,
    EventType.APPLICATION_WITHDRAWN,
    EventType.INTERNSHIP_CREATED,
    EventType.INTERNSHIP_UPDATED,
    EventType.INTERNSHIP_VERIFIED,
    EventType.INTERNSHIP_EXPIRED,
    EventType.USER_UPDATED,
    EventType.NOTIFICATION_CREATED
])
class ApplicationServiceEventHandlers:
    """
    Event handlers for the application service
    """
    pass