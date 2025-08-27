from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import json

from .models import (
    SecurityEvent,
    AuditLog,
    UserSession,
    FailedLoginAttempt,
    SecurityConfiguration,
    SecurityEventType,
    SeverityLevel
)

User = get_user_model()


class SecurityEventSerializer(serializers.ModelSerializer):
    """Serializer for security events."""
    
    user_email = serializers.EmailField(read_only=True)
    user_display = serializers.SerializerMethodField()
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    time_since = serializers.SerializerMethodField()
    
    class Meta:
        model = SecurityEvent
        fields = [
            'id', 'event_type', 'event_type_display', 'severity', 'severity_display',
            'description', 'user', 'user_email', 'user_display', 'ip_address',
            'user_agent', 'session_key', 'country', 'city', 'timestamp',
            'resolved_at', 'status', 'status_display', 'metadata', 'risk_score',
            'resolution_notes', 'resolved_by', 'notification_sent',
            'notification_sent_at', 'service_name', 'time_since'
        ]
        read_only_fields = [
            'id', 'timestamp', 'risk_score', 'user_email', 'notification_sent',
            'notification_sent_at'
        ]
    
    def get_user_display(self, obj):
        """Get user display name."""
        if obj.user:
            return obj.user.email
        return obj.user_email or 'Unknown'
    
    def get_time_since(self, obj):
        """Get human-readable time since event."""
        now = timezone.now()
        diff = now - obj.timestamp
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"


class SecurityEventCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating security events."""
    
    class Meta:
        model = SecurityEvent
        fields = [
            'event_type', 'severity', 'description', 'user', 'user_email',
            'ip_address', 'user_agent', 'session_key', 'country', 'city',
            'metadata', 'service_name'
        ]
    
    def validate(self, attrs):
        """Validate security event data."""
        if not attrs.get('user') and not attrs.get('user_email'):
            raise serializers.ValidationError(
                "Either user or user_email must be provided."
            )
        return attrs
    
    def create(self, validated_data):
        """Create security event with calculated risk score."""
        event = SecurityEvent(**validated_data)
        event.risk_score = event.calculate_risk_score()
        event.save()
        return event


class SecurityEventUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating security events (resolution)."""
    
    class Meta:
        model = SecurityEvent
        fields = ['status', 'resolution_notes', 'resolved_by']
    
    def update(self, instance, validated_data):
        """Update security event and set resolved_at if status is resolved."""
        if validated_data.get('status') == 'resolved' and not instance.resolved_at:
            validated_data['resolved_at'] = timezone.now()
        
        return super().update(instance, validated_data)


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs."""
    
    user_display = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    time_since = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'action', 'action_display', 'resource_type', 'resource_id',
            'user', 'user_email', 'user_display', 'ip_address', 'user_agent',
            'session_key', 'changes', 'old_values', 'new_values', 'timestamp',
            'description', 'metadata', 'service_name', 'time_since'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def get_user_display(self, obj):
        """Get user display name."""
        if obj.user:
            return obj.user.email
        return obj.user_email or 'System'
    
    def get_time_since(self, obj):
        """Get human-readable time since log entry."""
        now = timezone.now()
        diff = now - obj.timestamp
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"


class AuditLogCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating audit logs."""
    
    class Meta:
        model = AuditLog
        fields = [
            'action', 'resource_type', 'resource_id', 'user', 'user_email',
            'ip_address', 'user_agent', 'session_key', 'changes', 'old_values',
            'new_values', 'description', 'metadata', 'service_name'
        ]


class UserSessionSerializer(serializers.ModelSerializer):
    """Serializer for user sessions."""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    is_expired = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    logout_reason_display = serializers.CharField(source='get_logout_reason_display', read_only=True)
    
    class Meta:
        model = UserSession
        fields = [
            'id', 'user', 'user_email', 'session_key', 'ip_address',
            'user_agent', 'device_id', 'country', 'city', 'created_at',
            'last_activity', 'expires_at', 'is_active', 'logout_reason',
            'logout_reason_display', 'is_expired', 'duration'
        ]
        read_only_fields = ['id', 'created_at', 'last_activity']
    
    def get_is_expired(self, obj):
        """Check if session is expired."""
        return obj.is_expired()
    
    def get_duration(self, obj):
        """Get session duration in minutes."""
        if obj.is_active:
            duration = timezone.now() - obj.created_at
        else:
            duration = obj.last_activity - obj.created_at
        
        return int(duration.total_seconds() / 60)


class FailedLoginAttemptSerializer(serializers.ModelSerializer):
    """Serializer for failed login attempts."""
    
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    time_since = serializers.SerializerMethodField()
    
    class Meta:
        model = FailedLoginAttempt
        fields = [
            'id', 'email', 'ip_address', 'user_agent', 'timestamp',
            'reason', 'reason_display', 'country', 'city', 'time_since'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def get_time_since(self, obj):
        """Get human-readable time since attempt."""
        now = timezone.now()
        diff = now - obj.timestamp
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"


class SecurityConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for security configuration."""
    
    parsed_value = serializers.SerializerMethodField()
    data_type_display = serializers.CharField(source='get_data_type_display', read_only=True)
    updated_by_email = serializers.EmailField(source='updated_by.email', read_only=True)
    
    class Meta:
        model = SecurityConfiguration
        fields = [
            'id', 'key', 'value', 'parsed_value', 'description', 'data_type',
            'data_type_display', 'created_at', 'updated_at', 'updated_by',
            'updated_by_email'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_parsed_value(self, obj):
        """Get the parsed value."""
        try:
            return obj.get_value()
        except (ValueError, json.JSONDecodeError):
            return obj.value


class SecurityConfigurationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating security configuration."""
    
    class Meta:
        model = SecurityConfiguration
        fields = ['value', 'description', 'data_type']
    
    def validate_value(self, value):
        """Validate value based on data type."""
        data_type = self.initial_data.get('data_type', 'string')
        
        if data_type == 'integer':
            try:
                int(value)
            except ValueError:
                raise serializers.ValidationError("Value must be a valid integer.")
        elif data_type == 'float':
            try:
                float(value)
            except ValueError:
                raise serializers.ValidationError("Value must be a valid float.")
        elif data_type == 'boolean':
            if value.lower() not in ('true', 'false', '1', '0', 'yes', 'no', 'on', 'off'):
                raise serializers.ValidationError(
                    "Value must be a valid boolean (true/false, 1/0, yes/no, on/off)."
                )
        elif data_type == 'json':
            try:
                json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Value must be valid JSON.")
        
        return value


class SecurityDashboardSerializer(serializers.Serializer):
    """Serializer for security dashboard data."""
    
    total_events = serializers.IntegerField()
    critical_events = serializers.IntegerField()
    high_risk_events = serializers.IntegerField()
    failed_logins_today = serializers.IntegerField()
    active_sessions = serializers.IntegerField()
    locked_accounts = serializers.IntegerField()
    recent_events = SecurityEventSerializer(many=True)
    event_trends = serializers.DictField()
    risk_distribution = serializers.DictField()
    top_risk_ips = serializers.ListField()


class SecurityReportSerializer(serializers.Serializer):
    """Serializer for security reports."""
    
    report_type = serializers.ChoiceField(choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('custom', 'Custom')
    ])
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField()
    include_resolved = serializers.BooleanField(default=True)
    severity_filter = serializers.MultipleChoiceField(
        choices=SeverityLevel.CHOICES,
        required=False
    )
    event_type_filter = serializers.MultipleChoiceField(
        choices=SecurityEventType.CHOICES,
        required=False
    )
    
    def validate(self, attrs):
        """Validate report parameters."""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                "Start date must be before end date."
            )
        
        # Limit report range to 1 year
        if start_date and end_date:
            if (end_date - start_date).days > 365:
                raise serializers.ValidationError(
                    "Report range cannot exceed 1 year."
                )
        
        return attrs


class BulkSecurityEventActionSerializer(serializers.Serializer):
    """Serializer for bulk actions on security events."""
    
    event_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100
    )
    action = serializers.ChoiceField(choices=[
        ('resolve', 'Resolve'),
        ('investigate', 'Mark as Investigating'),
        ('false_positive', 'Mark as False Positive'),
        ('delete', 'Delete')
    ])
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    
    def validate_event_ids(self, value):
        """Validate that all event IDs exist."""
        existing_ids = SecurityEvent.objects.filter(
            id__in=value
        ).values_list('id', flat=True)
        
        missing_ids = set(value) - set(existing_ids)
        if missing_ids:
            raise serializers.ValidationError(
                f"The following event IDs do not exist: {list(missing_ids)}"
            )
        
        return value