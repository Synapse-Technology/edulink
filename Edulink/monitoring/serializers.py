from rest_framework import serializers
from .models import SystemHealthCheck, APIMetrics, SystemAlert, MonitoringConfiguration


class SystemHealthCheckSerializer(serializers.ModelSerializer):
    """Serializer for SystemHealthCheck model"""
    
    duration_minutes = serializers.SerializerMethodField()
    is_healthy = serializers.ReadOnlyField()
    has_warnings = serializers.ReadOnlyField()
    is_critical = serializers.ReadOnlyField()
    
    class Meta:
        model = SystemHealthCheck
        fields = [
            'id', 'timestamp', 'overall_status', 'database_status', 'cache_status',
            'storage_status', 'email_status', 'cpu_usage', 'memory_usage', 'disk_usage',
            'database_response_time', 'cache_response_time', 'details', 'errors', 'warnings',
            'duration_minutes', 'is_healthy', 'has_warnings', 'is_critical'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def get_duration_minutes(self, obj):
        """Calculate how long ago this health check was performed"""
        from django.utils import timezone
        delta = timezone.now() - obj.timestamp
        return round(delta.total_seconds() / 60, 1)


class APIMetricsSerializer(serializers.ModelSerializer):
    """Serializer for APIMetrics model"""
    
    is_slow = serializers.ReadOnlyField()
    is_error = serializers.ReadOnlyField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = APIMetrics
        fields = [
            'id', 'timestamp', 'endpoint', 'method', 'status_code', 'response_time',
            'request_size', 'response_size', 'user', 'user_email', 'user_agent',
            'ip_address', 'metadata', 'is_slow', 'is_error'
        ]
        read_only_fields = ['id', 'timestamp']


class SystemAlertSerializer(serializers.ModelSerializer):
    """Serializer for SystemAlert model"""
    
    is_active = serializers.ReadOnlyField()
    duration = serializers.SerializerMethodField()
    acknowledged_by_email = serializers.CharField(source='acknowledged_by.email', read_only=True)
    resolved_by_email = serializers.CharField(source='resolved_by.email', read_only=True)
    
    class Meta:
        model = SystemAlert
        fields = [
            'id', 'timestamp', 'title', 'message', 'severity', 'alert_type', 'status',
            'source', 'affected_endpoints', 'metrics', 'acknowledged_at', 'acknowledged_by',
            'acknowledged_by_email', 'resolved_at', 'resolved_by', 'resolved_by_email',
            'resolution_notes', 'notification_sent', 'notification_channels',
            'is_active', 'duration'
        ]
        read_only_fields = [
            'id', 'timestamp', 'acknowledged_at', 'acknowledged_by', 'resolved_at', 'resolved_by'
        ]
    
    def get_duration(self, obj):
        """Get alert duration in a human-readable format"""
        duration = obj.duration
        
        if duration.days > 0:
            return f"{duration.days}d {duration.seconds // 3600}h"
        elif duration.seconds >= 3600:
            return f"{duration.seconds // 3600}h {(duration.seconds % 3600) // 60}m"
        elif duration.seconds >= 60:
            return f"{duration.seconds // 60}m"
        else:
            return f"{duration.seconds}s"


class MonitoringConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for MonitoringConfiguration model"""
    
    class Meta:
        model = MonitoringConfiguration
        fields = [
            'id', 'created_at', 'updated_at', 'health_check_interval', 'health_check_enabled',
            'api_monitoring_enabled', 'slow_query_threshold', 'error_rate_threshold',
            'alerts_enabled', 'email_notifications', 'notification_emails',
            'metrics_retention_days', 'health_check_retention_days', 'alert_retention_days',
            'cpu_warning_threshold', 'cpu_critical_threshold', 'memory_warning_threshold',
            'memory_critical_threshold', 'disk_warning_threshold', 'disk_critical_threshold'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AlertCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new alerts"""
    
    class Meta:
        model = SystemAlert
        fields = [
            'title', 'message', 'severity', 'alert_type', 'source',
            'affected_endpoints', 'metrics'
        ]


class AlertActionSerializer(serializers.Serializer):
    """Serializer for alert actions (acknowledge, resolve)"""
    
    action = serializers.ChoiceField(choices=['acknowledge', 'resolve'])
    notes = serializers.CharField(required=False, allow_blank=True)


class HealthCheckSummarySerializer(serializers.Serializer):
    """Serializer for health check summary data"""
    
    overall_status = serializers.CharField()
    timestamp = serializers.DateTimeField()
    total_checks = serializers.IntegerField()
    healthy_checks = serializers.IntegerField()
    warning_checks = serializers.IntegerField()
    critical_checks = serializers.IntegerField()
    average_response_time = serializers.FloatField()
    system_metrics = serializers.DictField()


class APIMetricsSummarySerializer(serializers.Serializer):
    """Serializer for API metrics summary data"""
    
    total_requests = serializers.IntegerField()
    average_response_time = serializers.FloatField()
    error_rate = serializers.FloatField()
    slow_requests = serializers.IntegerField()
    top_endpoints = serializers.ListField()
    status_codes = serializers.DictField()
    time_range = serializers.DictField()


class MonitoringDashboardSerializer(serializers.Serializer):
    """Serializer for monitoring dashboard data"""
    
    system_status = serializers.DictField()
    alerts = serializers.DictField()
    api_performance = serializers.DictField()
    configuration = MonitoringConfigurationSerializer()


class SystemMetricsTimeSeriesSerializer(serializers.Serializer):
    """Serializer for time series metrics data"""
    
    timestamp = serializers.DateTimeField()
    cpu_usage = serializers.FloatField()
    memory_usage = serializers.FloatField()
    disk_usage = serializers.FloatField()
    response_time = serializers.FloatField()
    request_count = serializers.IntegerField()
    error_count = serializers.IntegerField()


class AlertStatisticsSerializer(serializers.Serializer):
    """Serializer for alert statistics"""
    
    total_alerts = serializers.IntegerField()
    active_alerts = serializers.IntegerField()
    resolved_alerts = serializers.IntegerField()
    critical_alerts = serializers.IntegerField()
    warning_alerts = serializers.IntegerField()
    average_resolution_time = serializers.FloatField()
    alert_types_distribution = serializers.DictField()
    alerts_by_day = serializers.ListField()