from rest_framework import serializers
from .models import SecurityEvent, UserSession, FailedLoginAttempt, SecurityConfiguration, AuditLog
from django.contrib.auth import get_user_model

User = get_user_model()


class SecurityEventSerializer(serializers.ModelSerializer):
    """Serializer for SecurityEvent model."""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    resolved_by_email = serializers.CharField(source='resolved_by.email', read_only=True)
    
    class Meta:
        model = SecurityEvent
        fields = [
            'id', 'user', 'user_email', 'event_type', 'severity',
            'ip_address', 'user_agent', 'description', 'metadata',
            'timestamp', 'resolved', 'resolved_at', 'resolved_by',
            'resolved_by_email'
        ]
        read_only_fields = ['id', 'timestamp', 'user_email', 'resolved_by_email']


class SecurityEventCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating SecurityEvent instances."""
    
    class Meta:
        model = SecurityEvent
        fields = [
            'user', 'event_type', 'severity', 'ip_address',
            'user_agent', 'description', 'metadata'
        ]


class UserSessionSerializer(serializers.ModelSerializer):
    """Serializer for UserSession model."""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSession
        fields = [
            'id', 'user', 'user_email', 'session_key', 'ip_address',
            'user_agent', 'created_at', 'last_activity', 'is_active',
            'logout_reason', 'duration'
        ]
        read_only_fields = ['id', 'user_email', 'duration']
    
    def get_duration(self, obj):
        """Calculate session duration."""
        if obj.is_active:
            from django.utils import timezone
            return (timezone.now() - obj.created_at).total_seconds()
        elif obj.last_activity:
            return (obj.last_activity - obj.created_at).total_seconds()
        return 0


class FailedLoginAttemptSerializer(serializers.ModelSerializer):
    """Serializer for FailedLoginAttempt model."""
    
    class Meta:
        model = FailedLoginAttempt
        fields = [
            'id', 'email', 'ip_address', 'user_agent',
            'timestamp', 'reason'
        ]
        read_only_fields = ['id', 'timestamp']


class SecurityConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for SecurityConfiguration model."""
    
    updated_by_email = serializers.CharField(source='updated_by.email', read_only=True)
    
    class Meta:
        model = SecurityConfiguration
        fields = [
            'id', 'key', 'value', 'description', 'is_active',
            'created_at', 'updated_at', 'updated_by', 'updated_by_email'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'updated_by_email']


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model."""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action', 'resource_type',
            'resource_id', 'description', 'ip_address', 'user_agent',
            'timestamp', 'changes', 'metadata'
        ]
        read_only_fields = ['id', 'timestamp', 'user_email']


class SecurityDashboardSerializer(serializers.Serializer):
    """Serializer for security dashboard statistics."""
    
    total_events = serializers.IntegerField()
    critical_events = serializers.IntegerField()
    failed_logins_today = serializers.IntegerField()
    active_sessions = serializers.IntegerField()
    recent_events = SecurityEventSerializer(many=True)
    top_threats = serializers.ListField(child=serializers.DictField())
    security_score = serializers.FloatField()


class SecurityReportSerializer(serializers.Serializer):
    """Serializer for security reports."""
    
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField()
    event_summary = serializers.DictField()
    user_activity = serializers.ListField(child=serializers.DictField())
    threat_analysis = serializers.DictField()
    recommendations = serializers.ListField(child=serializers.CharField())


class BulkSecurityEventSerializer(serializers.Serializer):
    """Serializer for bulk operations on security events."""
    
    event_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False
    )
    action = serializers.ChoiceField(
        choices=['resolve', 'escalate', 'delete'],
        required=True
    )
    reason = serializers.CharField(max_length=500, required=False)


class SecurityAlertSerializer(serializers.Serializer):
    """Serializer for security alerts."""
    
    alert_type = serializers.ChoiceField(
        choices=[
            ('brute_force', 'Brute Force Attack'),
            ('suspicious_login', 'Suspicious Login'),
            ('data_breach', 'Data Breach'),
            ('privilege_escalation', 'Privilege Escalation'),
            ('malware', 'Malware Detection'),
        ]
    )
    severity = serializers.ChoiceField(
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')]
    )
    message = serializers.CharField(max_length=1000)
    affected_users = serializers.ListField(
        child=serializers.EmailField(),
        required=False
    )
    recommended_actions = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False
    )