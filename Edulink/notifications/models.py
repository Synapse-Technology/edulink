from django.db import models
from django.conf import settings
# from django.contrib.auth.models import User  # Remove this import

# Assuming you have an Application model and Internship model in other apps
# Replace 'your_application_app' and 'your_internship_app' with actual app names
from application.models import Application
from internship.models.internship import Internship


class Notification(models.Model):
    """
    Model to store notifications for users.
    """
    NOTIFICATION_TYPES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
    ]

    NOTIFICATION_STATUSES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('pending', 'Pending'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name='notifications', help_text="The recipient of the notification.")
    message = models.TextField(help_text="The content of the notification.")
    notification_type = models.CharField(max_length=10, choices=NOTIFICATION_TYPES,
                                         help_text="Type of notification (email, SMS, push).")
    timestamp = models.DateTimeField(auto_now_add=True, help_text="When the notification was created.")
    # type: ignore[attr-defined]
    is_read = models.BooleanField(default=False, help_text="Indicates if the user has read the notification.")

    # Optional: Link to related objects for context
    related_application = models.ForeignKey(
        Application,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        help_text="Link to an application if the notification is status-related."
    )
    related_internship = models.ForeignKey(
        Internship,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        help_text="Link to an internship if the notification is relevant to an internship."
    )
    status = models.CharField(max_length=10, choices=NOTIFICATION_STATUSES, default='pending',
                              help_text="Delivery status of the notification.")

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        # type: ignore[attr-defined]
        return f"Notification for {self.user.email} - {self.notification_type} - {self.status}"
