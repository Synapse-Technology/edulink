from rest_framework import serializers
from .models import Notification, EmailVerificationToken, PasswordResetToken


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model.
    Handles serialization/deserialization of notification data.
    """
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient_id', 'type', 'channel', 'status',
            'title', 'body', 'template_name', 'sent_at',
            'delivered_at', 'read_at', 'failure_reason',
            'retry_count', 'related_entity_type', 'related_entity_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'sent_at',
            'delivered_at', 'read_at', 'failure_reason', 'retry_count'
        ]


class NotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new notifications.
    Only allows setting fields that should be user-provided.
    """
    
    class Meta:
        model = Notification
        fields = [
            'recipient_id', 'type', 'channel', 'title', 'body',
            'template_name', 'related_entity_type', 'related_entity_id'
        ]
    
    def validate_recipient_id(self, value):
        """Validate recipient_id is a valid UUID."""
        try:
            import uuid
            uuid.UUID(str(value))
            return value
        except ValueError:
            raise serializers.ValidationError("Invalid UUID format for recipient_id")
    
    def validate_related_entity_id(self, value):
        """Validate related_entity_id is a valid UUID if provided."""
        if value:
            try:
                import uuid
                uuid.UUID(str(value))
                return value
            except ValueError:
                raise serializers.ValidationError("Invalid UUID format for related_entity_id")
        return value


class NotificationStatusUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating notification status.
    """
    status = serializers.ChoiceField(choices=Notification.STATUS_CHOICES)
    
    def validate_status(self, value):
        """Validate status transition is allowed."""
        # Add status transition validation logic here if needed
        return value


class EmailVerificationTokenSerializer(serializers.ModelSerializer):
    """
    Serializer for EmailVerificationToken model.
    """
    
    class Meta:
        model = EmailVerificationToken
        fields = ['id', 'user', 'token', 'is_used', 'expires_at', 'is_expired']
        read_only_fields = ['id', 'token', 'is_expired']


class PasswordResetTokenSerializer(serializers.ModelSerializer):
    """
    Serializer for PasswordResetToken model.
    """
    
    class Meta:
        model = PasswordResetToken
        fields = ['id', 'user', 'token', 'is_used', 'expires_at', 'is_expired']
        read_only_fields = ['id', 'token', 'is_expired']


class UnreadCountSerializer(serializers.Serializer):
    """
    Serializer for unread notification count.
    """
    count = serializers.IntegerField(read_only=True)
    user_id = serializers.UUIDField(read_only=True)