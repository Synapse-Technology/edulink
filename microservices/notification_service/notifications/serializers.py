from rest_framework import serializers
from .models import (
    Notification, NotificationTemplate, NotificationLog,
    NotificationPreference, NotificationBatch,
    NotificationType, NotificationStatus, NotificationPriority, NotificationCategory
)
from django.utils import timezone


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for notification templates"""
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'name', 'category', 'notification_type',
            'subject_template', 'body_template', 'html_template',
            'description', 'variables', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_variables(self, value):
        """Validate that variables is a dictionary"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Variables must be a dictionary")
        return value


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating notifications"""
    
    class Meta:
        model = Notification
        fields = [
            'recipient_email', 'recipient_phone', 'recipient_user_id',
            'notification_type', 'category', 'priority',
            'subject', 'message', 'html_content',
            'template', 'template_variables',
            'scheduled_at', 'max_retries',
            'source_service', 'reference_id', 'metadata'
        ]
    
    def validate(self, data):
        """Validate notification data"""
        notification_type = data.get('notification_type')
        
        # Ensure at least one recipient is provided
        if not any([
            data.get('recipient_email'),
            data.get('recipient_phone'),
            data.get('recipient_user_id')
        ]):
            raise serializers.ValidationError(
                "At least one recipient (email, phone, or user_id) must be provided"
            )
        
        # Validate recipient based on notification type
        if notification_type == NotificationType.EMAIL and not data.get('recipient_email'):
            raise serializers.ValidationError(
                "Email address is required for email notifications"
            )
        
        if notification_type == NotificationType.SMS and not data.get('recipient_phone'):
            raise serializers.ValidationError(
                "Phone number is required for SMS notifications"
            )
        
        # Validate scheduled time
        scheduled_at = data.get('scheduled_at')
        if scheduled_at and scheduled_at < timezone.now():
            raise serializers.ValidationError(
                "Scheduled time cannot be in the past"
            )
        
        return data
    
    def validate_template_variables(self, value):
        """Validate template variables"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Template variables must be a dictionary")
        return value


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notification details"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient_email', 'recipient_phone', 'recipient_user_id',
            'notification_type', 'category', 'priority',
            'subject', 'message', 'html_content',
            'template', 'template_name', 'template_variables',
            'status', 'scheduled_at', 'sent_at', 'delivered_at',
            'retry_count', 'max_retries', 'error_message',
            'external_id', 'provider',
            'source_service', 'reference_id', 'metadata',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'sent_at', 'delivered_at',
            'retry_count', 'error_message', 'external_id', 'provider',
            'created_at', 'updated_at'
        ]


class NotificationLogSerializer(serializers.ModelSerializer):
    """Serializer for notification logs"""
    
    class Meta:
        model = NotificationLog
        fields = [
            'id', 'notification', 'attempt_number', 'status',
            'provider_response', 'error_message',
            'attempted_at', 'response_time_ms'
        ]
        read_only_fields = ['id']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for notification preferences"""
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'user_id',
            'email_enabled', 'email_categories',
            'sms_enabled', 'sms_categories',
            'push_enabled', 'push_categories',
            'in_app_enabled', 'in_app_categories',
            'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end', 'quiet_hours_timezone',
            'max_emails_per_day', 'max_sms_per_day',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_email_categories(self, value):
        """Validate email categories"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Email categories must be a list")
        
        valid_categories = [choice[0] for choice in NotificationCategory.choices]
        for category in value:
            if category not in valid_categories:
                raise serializers.ValidationError(f"Invalid category: {category}")
        
        return value
    
    def validate_sms_categories(self, value):
        """Validate SMS categories"""
        if not isinstance(value, list):
            raise serializers.ValidationError("SMS categories must be a list")
        
        valid_categories = [choice[0] for choice in NotificationCategory.choices]
        for category in value:
            if category not in valid_categories:
                raise serializers.ValidationError(f"Invalid category: {category}")
        
        return value


class NotificationBatchSerializer(serializers.ModelSerializer):
    """Serializer for notification batches"""
    progress_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = NotificationBatch
        fields = [
            'id', 'name', 'description',
            'total_count', 'processed_count', 'success_count', 'failed_count',
            'status', 'progress_percentage',
            'scheduled_at', 'started_at', 'completed_at',
            'source_service', 'created_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'processed_count', 'success_count', 'failed_count',
            'progress_percentage', 'started_at', 'completed_at',
            'created_at', 'updated_at'
        ]


class BulkNotificationSerializer(serializers.Serializer):
    """Serializer for bulk notification creation"""
    batch_name = serializers.CharField(max_length=100)
    batch_description = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    template_id = serializers.UUIDField(required=False)
    notification_type = serializers.ChoiceField(choices=NotificationType.choices)
    category = serializers.ChoiceField(choices=NotificationCategory.choices)
    priority = serializers.ChoiceField(choices=NotificationPriority.choices, default=NotificationPriority.NORMAL)
    
    subject = serializers.CharField(max_length=200, required=False, allow_blank=True)
    message = serializers.CharField()
    html_content = serializers.CharField(required=False, allow_blank=True)
    
    recipients = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        help_text="List of recipient objects with email/phone/user_id and optional template variables"
    )
    
    scheduled_at = serializers.DateTimeField(required=False)
    source_service = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    def validate_recipients(self, value):
        """Validate recipients list"""
        for i, recipient in enumerate(value):
            if not any([
                recipient.get('email'),
                recipient.get('phone'),
                recipient.get('user_id')
            ]):
                raise serializers.ValidationError(
                    f"Recipient {i+1}: At least one of email, phone, or user_id must be provided"
                )
        return value
    
    def validate_scheduled_at(self, value):
        """Validate scheduled time"""
        if value and value < timezone.now():
            raise serializers.ValidationError("Scheduled time cannot be in the past")
        return value


class NotificationStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating notification status"""
    status = serializers.ChoiceField(choices=NotificationStatus.choices)
    external_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    provider = serializers.CharField(max_length=50, required=False, allow_blank=True)
    error_message = serializers.CharField(required=False, allow_blank=True)
    provider_response = serializers.JSONField(required=False)
    
    def validate_status(self, value):
        """Validate status transitions"""
        valid_transitions = {
            NotificationStatus.PENDING: [NotificationStatus.PROCESSING, NotificationStatus.CANCELLED],
            NotificationStatus.PROCESSING: [NotificationStatus.SENT, NotificationStatus.FAILED],
            NotificationStatus.SENT: [NotificationStatus.DELIVERED, NotificationStatus.FAILED],
            NotificationStatus.FAILED: [NotificationStatus.PROCESSING],  # For retries
        }
        
        # This validation would need the current status, which we'll handle in the view
        return value


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics"""
    total_notifications = serializers.IntegerField()
    pending_notifications = serializers.IntegerField()
    sent_notifications = serializers.IntegerField()
    failed_notifications = serializers.IntegerField()
    
    email_notifications = serializers.IntegerField()
    sms_notifications = serializers.IntegerField()
    push_notifications = serializers.IntegerField()
    
    success_rate = serializers.FloatField()
    average_delivery_time = serializers.FloatField()  # in seconds
    
    daily_stats = serializers.ListField(
        child=serializers.DictField(),
        help_text="Daily statistics for the last 30 days"
    )