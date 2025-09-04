from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import SystemHealthCheck, APIMetrics, SystemAlert, MonitoringConfiguration


@admin.register(SystemHealthCheck)
class SystemHealthCheckAdmin(admin.ModelAdmin):
    """Admin interface for SystemHealthCheck"""
    
    list_display = [
        'timestamp', 'overall_status_badge', 'database_status', 'cache_status',
        'storage_status', 'cpu_usage_display', 'memory_usage_display', 'response_time_display'
    ]
    list_filter = [
        'overall_status', 'database_status', 'cache_status', 'storage_status', 'timestamp'
    ]
    search_fields = ['overall_status', 'errors', 'warnings']
    readonly_fields = [
        'id', 'timestamp', 'overall_status', 'database_status', 'cache_status',
        'storage_status', 'email_status', 'cpu_usage', 'memory_usage', 'disk_usage',
        'database_response_time', 'cache_response_time', 'details', 'errors', 'warnings'
    ]
    ordering = ['-timestamp']
    date_hierarchy = 'timestamp'
    
    def overall_status_badge(self, obj):
        """Display status with color coding"""
        colors = {
            'healthy': 'green',
            'warning': 'orange',
            'critical': 'red',
            'unknown': 'gray'
        }
        color = colors.get(obj.overall_status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.overall_status.upper()
        )
    overall_status_badge.short_description = 'Status'
    
    def cpu_usage_display(self, obj):
        """Display CPU usage with formatting"""
        if obj.cpu_usage is not None:
            color = 'red' if obj.cpu_usage > 90 else 'orange' if obj.cpu_usage > 80 else 'green'
            return format_html(
                '<span style="color: {};">{:.1f}%</span>',
                color, obj.cpu_usage
            )
        return '-'
    cpu_usage_display.short_description = 'CPU Usage'
    
    def memory_usage_display(self, obj):
        """Display memory usage with formatting"""
        if obj.memory_usage is not None:
            color = 'red' if obj.memory_usage > 90 else 'orange' if obj.memory_usage > 80 else 'green'
            return format_html(
                '<span style="color: {};">{:.1f}%</span>',
                color, obj.memory_usage
            )
        return '-'
    memory_usage_display.short_description = 'Memory Usage'
    
    def response_time_display(self, obj):
        """Display response time with formatting"""
        if obj.database_response_time is not None:
            color = 'red' if obj.database_response_time > 1000 else 'orange' if obj.database_response_time > 500 else 'green'
            return format_html(
                '<span style="color: {};">{:.1f}ms</span>',
                color, obj.database_response_time
            )
        return '-'
    response_time_display.short_description = 'DB Response Time'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(APIMetrics)
class APIMetricsAdmin(admin.ModelAdmin):
    """Admin interface for APIMetrics"""
    
    list_display = [
        'timestamp', 'method', 'endpoint_short', 'status_code_badge',
        'response_time_display', 'user_display', 'is_slow_badge'
    ]
    list_filter = [
        'method', 'status_code', 'timestamp'
    ]
    search_fields = ['endpoint', 'user__email', 'ip_address']
    readonly_fields = [
        'id', 'timestamp', 'endpoint', 'method', 'status_code', 'response_time',
        'request_size', 'response_size', 'user', 'user_agent', 'ip_address', 'metadata'
    ]
    ordering = ['-timestamp']
    date_hierarchy = 'timestamp'
    
    def endpoint_short(self, obj):
        """Display shortened endpoint"""
        if len(obj.endpoint) > 50:
            return obj.endpoint[:47] + '...'
        return obj.endpoint
    endpoint_short.short_description = 'Endpoint'
    
    def status_code_badge(self, obj):
        """Display status code with color coding"""
        if obj.status_code >= 500:
            color = 'red'
        elif obj.status_code >= 400:
            color = 'orange'
        elif obj.status_code >= 300:
            color = 'blue'
        else:
            color = 'green'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.status_code
        )
    status_code_badge.short_description = 'Status'
    
    def response_time_display(self, obj):
        """Display response time with formatting"""
        color = 'red' if obj.response_time > 2000 else 'orange' if obj.response_time > 1000 else 'green'
        return format_html(
            '<span style="color: {};">{:.1f}ms</span>',
            color, obj.response_time
        )
    response_time_display.short_description = 'Response Time'
    
    def user_display(self, obj):
        """Display user email or anonymous"""
        if obj.user:
            return obj.user.email
        return 'Anonymous'
    user_display.short_description = 'User'
    
    def is_slow_badge(self, obj):
        """Display slow request indicator"""
        if obj.is_slow:
            return format_html('<span style="color: red;">🐌 SLOW</span>')
        return '✓'
    is_slow_badge.short_description = 'Performance'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SystemAlert)
class SystemAlertAdmin(admin.ModelAdmin):
    """Admin interface for SystemAlert"""
    
    list_display = [
        'timestamp', 'title_short', 'severity_badge', 'alert_type',
        'status_badge', 'duration_display', 'acknowledged_by_display'
    ]
    list_filter = [
        'severity', 'alert_type', 'status', 'timestamp', 'notification_sent'
    ]
    search_fields = ['title', 'message', 'source']
    readonly_fields = [
        'id', 'timestamp', 'duration', 'acknowledged_at', 'resolved_at'
    ]
    ordering = ['-timestamp']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Alert Information', {
            'fields': ('title', 'message', 'severity', 'alert_type', 'status', 'source')
        }),
        ('Context', {
            'fields': ('affected_endpoints', 'metrics')
        }),
        ('Resolution', {
            'fields': (
                'acknowledged_at', 'acknowledged_by', 'resolved_at', 
                'resolved_by', 'resolution_notes'
            )
        }),
        ('Notifications', {
            'fields': ('notification_sent', 'notification_channels')
        }),
        ('Metadata', {
            'fields': ('id', 'timestamp', 'duration'),
            'classes': ('collapse',)
        })
    )
    
    def title_short(self, obj):
        """Display shortened title"""
        if len(obj.title) > 50:
            return obj.title[:47] + '...'
        return obj.title
    title_short.short_description = 'Title'
    
    def severity_badge(self, obj):
        """Display severity with color coding"""
        colors = {
            'info': 'blue',
            'warning': 'orange',
            'error': 'red',
            'critical': 'darkred'
        }
        color = colors.get(obj.severity, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.severity.upper()
        )
    severity_badge.short_description = 'Severity'
    
    def status_badge(self, obj):
        """Display status with color coding"""
        colors = {
            'active': 'red',
            'acknowledged': 'orange',
            'resolved': 'green',
            'suppressed': 'gray'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = 'Status'
    
    def duration_display(self, obj):
        """Display alert duration"""
        duration = obj.duration
        if duration.days > 0:
            return f"{duration.days}d {duration.seconds // 3600}h"
        elif duration.seconds >= 3600:
            return f"{duration.seconds // 3600}h {(duration.seconds % 3600) // 60}m"
        elif duration.seconds >= 60:
            return f"{duration.seconds // 60}m"
        else:
            return f"{duration.seconds}s"
    duration_display.short_description = 'Duration'
    
    def acknowledged_by_display(self, obj):
        """Display who acknowledged the alert"""
        if obj.acknowledged_by:
            return obj.acknowledged_by.email
        return '-'
    acknowledged_by_display.short_description = 'Acknowledged By'
    
    actions = ['acknowledge_alerts', 'resolve_alerts']
    
    def acknowledge_alerts(self, request, queryset):
        """Bulk acknowledge alerts"""
        count = 0
        for alert in queryset.filter(status='active'):
            alert.acknowledge(request.user)
            count += 1
        self.message_user(request, f'Acknowledged {count} alerts.')
    acknowledge_alerts.short_description = 'Acknowledge selected alerts'
    
    def resolve_alerts(self, request, queryset):
        """Bulk resolve alerts"""
        count = 0
        for alert in queryset.filter(status__in=['active', 'acknowledged']):
            alert.resolve(request.user, 'Bulk resolved from admin')
            count += 1
        self.message_user(request, f'Resolved {count} alerts.')
    resolve_alerts.short_description = 'Resolve selected alerts'


@admin.register(MonitoringConfiguration)
class MonitoringConfigurationAdmin(admin.ModelAdmin):
    """Admin interface for MonitoringConfiguration"""
    
    list_display = ['updated_at', 'health_check_enabled', 'api_monitoring_enabled', 'alerts_enabled']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Health Check Settings', {
            'fields': ('health_check_enabled', 'health_check_interval')
        }),
        ('Performance Monitoring', {
            'fields': (
                'api_monitoring_enabled', 'slow_query_threshold', 'error_rate_threshold'
            )
        }),
        ('Alert Settings', {
            'fields': (
                'alerts_enabled', 'email_notifications', 'notification_emails'
            )
        }),
        ('Data Retention', {
            'fields': (
                'metrics_retention_days', 'health_check_retention_days', 
                'alert_retention_days'
            )
        }),
        ('System Thresholds', {
            'fields': (
                'cpu_warning_threshold', 'cpu_critical_threshold',
                'memory_warning_threshold', 'memory_critical_threshold',
                'disk_warning_threshold', 'disk_critical_threshold'
            )
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def has_add_permission(self, request):
        # Only allow one configuration instance
        return not MonitoringConfiguration.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False