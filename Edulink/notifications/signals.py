from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings # If you need settings like using Celery
from Application.app import Application # Assuming this is where application status changes
from Application.app import Internship # For internship-related triggers
from Application.app import User # If user creation triggers a welcome notification

from .models import Notification
# from .tasks import send_notification_async # If using Celery

@receiver(post_save, sender=Application)
def create_application_status_notification(sender, instance, created, **kwargs):
    """
    Signal to create a notification when an application's status changes.
    """
    if not created and instance.tracker.has_changed('status'): # Assuming django-model-utils or similar for tracking changes
        # Example: Application status changed
        message = f"Your application for '{instance.internship.title}' has been {instance.status}."
        Notification.objects.create(
            user=instance.student_user, # Assuming a 'student_user' field on Application
            message=message,
            notification_type='push', # Or email/sms based on preference
            related_application=instance,
            status='pending' # Will be updated to 'sent' by async task
        )
        # if settings.USE_CELERY_FOR_NOTIFICATIONS:
        #     send_notification_async.delay(notification.id)

@receiver(post_save, sender=User)
def send_welcome_notification(sender, instance, created, **kwargs):
    """
    Signal to send a welcome notification to a new user upon registration.
    """
    if created:
        message = f"Welcome to EduLink KE, {instance.first_name}! We're excited to have you."
        Notification.objects.create(
            user=instance,
            message=message,
            notification_type='email', # Or push notification
            status='pending'
        )
        # if settings.USE_CELERY_FOR_NOTIFICATIONS:
        #     send_notification_async.delay(notification.id)

# Add more signals for other events like:
# - Internship approval
# - Feedback request
# - Deadline reminders (might be a separate cron job triggering notifications)