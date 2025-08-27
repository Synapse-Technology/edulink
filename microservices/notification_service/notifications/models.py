from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import EmailValidator
import uuid
import json


class NotificationType(models.TextChoices):
    EMAIL = 'email', 'Email'
    SMS = 'sms', 'SMS'
    PUSH = 'push', 'Push Notification'
    IN_APP = 'in_app', 'In-App Notification'


class NotificationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    SENT = 'sent', 'Sent'
    DELIVERED = 'delivered', 'Delivered'
    FAILED = 'failed', 'Failed'
    CANCELLED = 'cancelled', 'Cancelled'


class NotificationPriority(models.TextChoices):
    LOW = 'low', 'Low'
    NORMAL = 'normal', 'Normal'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'


class NotificationCategory(models.TextChoices):
    AUTHENTICATION = 'authentication', 'Authentication'
    REGISTRATION = 'registration', 'Registration'
    VERIFICATION = 'verification', 'Verification'
    PASSWORD_RESET = 'password_reset', 'Password Reset'
    INTERNSHIP = 'internship', 'Internship'
    APPLICATION = 'application', 'Application'
    SYSTEM = 'system', 'System'
    MARKETING = 'marketing', 'Marketing'
    REMINDER = 'reminder', 'Reminder'


class NotificationTemplate(models.Model):
    """Template for notifications"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, choices=NotificationCategory.choices)
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices)
    
    # Template content
    subject_template = models.CharField(max_length=200, blank=True)  # For email/SMS
    body_template = models.TextField()
    html_template = models.TextField(blank=True)  # For email HTML version
    
    # Template metadata
    description = models.TextField(blank=True)
    variables = models.JSONField(default=dict, help_text="Expected template variables")
    
    # Settings
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_templates'
        indexes = [
            models.Index(fields=['category', 'notification_type']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_notification_type_display()})"


class Notification(models.Model):
    """Individual notification instance"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Recipient information
    recipient_email = models.EmailField(validators=[EmailValidator()], blank=True)
    recipient_phone = models.CharField(max_length=20, blank=True)
    recipient_user_id = models.CharField(max_length=50, blank=True)  # External user ID
    
    # Notification details
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices)
    category = models.CharField(max_length=50, choices=NotificationCategory.choices)
    priority = models.CharField(max_length=10, choices=NotificationPriority.choices, default=NotificationPriority.NORMAL)
    
    # Content
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    html_content = models.TextField(blank=True)
    
    # Template reference
    template = models.ForeignKey(NotificationTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    template_variables = models.JSONField(default=dict)
    
    # Delivery information
    status = models.CharField(max_length=20, choices=NotificationStatus.choices, default=NotificationStatus.PENDING)
    scheduled_at = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    # Retry and error handling
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)
    error_message = models.TextField(blank=True)
    
    # External service tracking
    external_id = models.CharField(max_length=100, blank=True)  # Provider message ID
    provider = models.CharField(max_length=50, blank=True)  # Email/SMS provider used
    
    # Metadata
    source_service = models.CharField(max_length=50, blank=True)  # Which service requested this
    reference_id = models.CharField(max_length=100, blank=True)  # External reference
    metadata = models.JSONField(default=dict)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['recipient_email']),
            models.Index(fields=['recipient_phone']),
            models.Index(fields=['recipient_user_id']),
            models.Index(fields=['category', 'created_at']),
            models.Index(fields=['source_service', 'reference_id']),
            models.Index(fields=['notification_type', 'status']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        recipient = self.recipient_email or self.recipient_phone or self.recipient_user_id
        return f"{self.get_notification_type_display()} to {recipient} - {self.status}"
    
    def can_retry(self):
        """Check if notification can be retried"""
        return (
            self.status == NotificationStatus.FAILED and
            self.retry_count < self.max_retries
        )
    
    def mark_as_sent(self, external_id=None, provider=None):
        """Mark notification as sent"""
        self.status = NotificationStatus.SENT
        self.sent_at = timezone.now()
        if external_id:
            self.external_id = external_id
        if provider:
            self.provider = provider
        self.save(update_fields=['status', 'sent_at', 'external_id', 'provider', 'updated_at'])
    
    def mark_as_delivered(self):
        """Mark notification as delivered"""
        self.status = NotificationStatus.DELIVERED
        self.delivered_at = timezone.now()
        self.save(update_fields=['status', 'delivered_at', 'updated_at'])
    
    def mark_as_failed(self, error_message=None):
        """Mark notification as failed"""
        self.status = NotificationStatus.FAILED
        self.retry_count += 1
        if error_message:
            self.error_message = error_message
        self.save(update_fields=['status', 'retry_count', 'error_message', 'updated_at'])


class NotificationLog(models.Model):
    """Log of notification delivery attempts"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='logs')
    
    # Attempt details
    attempt_number = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=NotificationStatus.choices)
    
    # Provider response
    provider_response = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    
    # Timing
    attempted_at = models.DateTimeField(auto_now_add=True)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'notification_logs'
        indexes = [
            models.Index(fields=['notification', 'attempt_number']),
            models.Index(fields=['status', 'attempted_at']),
        ]
        ordering = ['-attempted_at']
    
    def __str__(self):
        return f"Attempt {self.attempt_number} for {self.notification.id} - {self.status}"


class NotificationPreference(models.Model):
    """User notification preferences"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=50, unique=True)  # External user ID
    
    # Email preferences
    email_enabled = models.BooleanField(default=True)
    email_categories = models.JSONField(default=list)  # List of enabled categories
    
    # SMS preferences
    sms_enabled = models.BooleanField(default=False)
    sms_categories = models.JSONField(default=list)
    
    # Push notification preferences
    push_enabled = models.BooleanField(default=True)
    push_categories = models.JSONField(default=list)
    
    # In-app notification preferences
    in_app_enabled = models.BooleanField(default=True)
    in_app_categories = models.JSONField(default=list)
    
    # Quiet hours
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    quiet_hours_timezone = models.CharField(max_length=50, default='UTC')
    
    # Frequency limits
    max_emails_per_day = models.PositiveIntegerField(default=50)
    max_sms_per_day = models.PositiveIntegerField(default=10)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_preferences'
        indexes = [
            models.Index(fields=['user_id']),
        ]
    
    def __str__(self):
        return f"Preferences for user {self.user_id}"
    
    def is_category_enabled(self, notification_type, category):
        """Check if a category is enabled for a notification type"""
        if notification_type == NotificationType.EMAIL:
            return self.email_enabled and (not self.email_categories or category in self.email_categories)
        elif notification_type == NotificationType.SMS:
            return self.sms_enabled and (not self.sms_categories or category in self.sms_categories)
        elif notification_type == NotificationType.PUSH:
            return self.push_enabled and (not self.push_categories or category in self.push_categories)
        elif notification_type == NotificationType.IN_APP:
            return self.in_app_enabled and (not self.in_app_categories or category in self.in_app_categories)
        return False


class NotificationBatch(models.Model):
    """Batch processing for bulk notifications"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Batch details
    total_count = models.PositiveIntegerField(default=0)
    processed_count = models.PositiveIntegerField(default=0)
    success_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    
    # Status
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    
    # Timing
    scheduled_at = models.DateTimeField(default=timezone.now)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    source_service = models.CharField(max_length=50, blank=True)
    created_by = models.CharField(max_length=50, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_batches'
        indexes = [
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['source_service']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Batch: {self.name} ({self.status})"
    
    @property
    def progress_percentage(self):
        """Calculate batch progress percentage"""
        if self.total_count == 0:
            return 0
        return (self.processed_count / self.total_count) * 100