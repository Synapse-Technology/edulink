from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from application.models import Application
from internship.models.internship import Internship


class NotificationPreference(models.Model):
    """Model to store user notification preferences."""
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    
    # Email preferences
    email_enabled = models.BooleanField(default=True)
    email_application_updates = models.BooleanField(default=True)
    email_internship_matches = models.BooleanField(default=True)
    email_reminders = models.BooleanField(default=True)
    
    # SMS preferences
    sms_enabled = models.BooleanField(default=False)
    sms_urgent_only = models.BooleanField(default=True)
    
    # Push notification preferences
    push_enabled = models.BooleanField(default=True)
    push_application_updates = models.BooleanField(default=True)
    push_messages = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
        """Validate notification preference settings."""
        # If SMS is disabled, SMS urgent only should also be disabled
        if not self.sms_enabled and self.sms_urgent_only:
            raise ValidationError("SMS urgent notifications cannot be enabled when SMS is disabled")
            
        # If email is disabled, all email-related preferences should be disabled
        if not self.email_enabled:
            if self.email_application_updates or self.email_internship_matches or self.email_reminders:
                raise ValidationError("Email-specific preferences must be disabled when email notifications are disabled")
                
        # If push is disabled, all push-related preferences should be disabled
        if not self.push_enabled:
            if self.push_application_updates or self.push_messages:
                raise ValidationError("Push-specific preferences must be disabled when push notifications are disabled")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Notification preferences for {self.user.email}"


class Notification(models.Model):
    """Model to store notifications for users."""
    
    NOTIFICATION_TYPES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
        ('in_app', 'In-App Notification'),
    ]

    NOTIFICATION_STATUSES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('retry', 'Retry'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text="The recipient of the notification.",
        db_index=True
    )
    subject = models.CharField(max_length=255, help_text="Notification subject/title.")
    message = models.TextField(help_text="The content of the notification.")
    notification_type = models.CharField(
        max_length=10,
        choices=NOTIFICATION_TYPES,
        help_text="Type of notification (email, SMS, push).",
        db_index=True
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_LEVELS,
        default='normal',
        help_text="Priority level of the notification."
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="When the notification was created.",
        db_index=True
    )
    is_read = models.BooleanField(
        default=False,
        help_text="Indicates if the user has read the notification.",
        db_index=True
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the notification was read."
    )

    # Delivery tracking
    status = models.CharField(
        max_length=10,
        choices=NOTIFICATION_STATUSES,
        default='pending',
        help_text="Delivery status of the notification.",
        db_index=True
    )
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the notification was sent."
    )
    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the notification was delivered."
    )
    retry_count = models.PositiveIntegerField(
        default=0,
        validators=[MaxValueValidator(5)],
        help_text="Number of retry attempts."
    )
    next_retry_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When to retry sending the notification."
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error message if delivery failed."
    )

    # Optional: Link to related objects for context
    related_application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text="Link to an application if the notification is status-related."
    )
    related_internship = models.ForeignKey(
        Internship,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text="Link to an internship if the notification is relevant to an internship."
    )
    
    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata for the notification."
    )

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['status', 'next_retry_at']),
            models.Index(fields=['notification_type', 'timestamp']),
            models.Index(fields=['priority', 'timestamp']),
        ]

    def mark_as_read(self):
        """Mark the notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def mark_as_sent(self):
        """Mark the notification as sent."""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])
    
    def mark_as_delivered(self):
        """Mark the notification as delivered."""
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save(update_fields=['status', 'delivered_at'])
    
    def mark_as_failed(self, error_message=''):
        """Mark the notification as failed and schedule retry if applicable."""
        self.status = 'failed'
        self.error_message = error_message
        
        if self.retry_count < 5:  # Max 5 retries
            self.retry_count += 1
            # Exponential backoff: 2^retry_count minutes
            retry_delay = 2 ** self.retry_count
            self.next_retry_at = timezone.now() + timezone.timedelta(minutes=retry_delay)
            self.status = 'retry'
        
        self.save(update_fields=['status', 'error_message', 'retry_count', 'next_retry_at'])

    def __str__(self):
        return f"Notification for {self.user.email} - {self.notification_type} - {self.status}"
