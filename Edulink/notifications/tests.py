from celery import shared_task
import logging

from django.conf import settings
from .models import Notification
# Assuming you have email sending capabilities set up in Django
from django.core.mail import send_mail
# For SMS/Push, you'd integrate with external APIs here (e.g., Twilio for SMS, Firebase for Push)

logger = logging.getLogger(__name__)


@shared_task
def send_notification_async(notification_id):
    """
    Asynchronously sends a notification (email, SMS, or push) based on its type.
    """
    try:
        notification = Notification.objects.get(id=notification_id)  # type: ignore[attr-defined]
        user = notification.user
        message = notification.message

        if notification.notification_type == 'email':
            subject = "EduLink KE Notification"  # Customize subject
            recipient_list = [user.email]
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipient_list, fail_silently=False)
            notification.status = 'sent'
        elif notification.notification_type == 'sms':
            # Integrate with SMS API (e.g., Twilio)
            # send_sms(user.phone_number, message)
            logger.info(f"Sending SMS to {user.phone_number}: {message}")  # Placeholder
            notification.status = 'sent'
        elif notification.notification_type == 'push':
            # Integrate with Push Notification API (e.g., Firebase Cloud Messaging)
            # send_push_notification(user.device_token, message)
            logger.info(f"Sending Push Notification to {user.id}: {message}")  # Placeholder
            notification.status = 'sent'
        else:
            notification.status = 'failed'
            logger.error(f"Unknown notification type: {notification.notification_type}")

        notification.save()

    except Notification.DoesNotExist:  # type: ignore[attr-defined]
        logger.error(f"Notification with ID {notification_id} not found.")
    except Exception as e:
        # Log the error
        logger.error(f"Failed to send notification {notification_id}: {e}", exc_info=True)
        notification.status = 'failed'
        notification.save()
