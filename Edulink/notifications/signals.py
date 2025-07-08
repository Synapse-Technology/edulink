from django.db.models.signals import post_save
from django.dispatch import receiver
from application.models import Application  # Assuming this is where application status changes

from .models import Notification
# from .tasks import send_notification_async # If using Celery


@receiver(post_save, sender=Application)
def create_application_status_notification(sender, instance, created, **kwargs):
    """
    Signal to create a notification when an application's status changes.
    """
    if not created and instance.tracker.has_changed('status'):  # Assuming django-model-utils or similar for tracking changes
        # Example: Application status changed
        message = f"Your application for '{instance.internship.title}' has been {instance.status}."
        Notification.objects.create(  # type: ignore[attr-defined]
            user=instance.student_user,  # Assuming a 'student_user' field on Application
            message=message,
            notification_type='push',  # Or email/sms based on preference
            related_application=instance,
            status='pending'  # Will be updated to 'sent' by async task
        )  # type: ignore[attr-defined]
        # if settings.USE_CELERY_FOR_NOTIFICATIONS:
        #     send_notification_async.delay(notification.id)

# Add more signals for other events like:
# - Internship approval
# - Feedback request
# - Deadline reminders (might be a separate cron job triggering notifications)
