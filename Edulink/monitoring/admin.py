from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse, path
from django.utils import timezone
from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from .models import SystemHealthCheck, APIMetrics, SystemAlert, MonitoringConfiguration
from .views import DetailedHealthCheckView
import json
import csv
from datetime import datetime, timedelta


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


class MonitoringAdminSite(admin.AdminSite):
    """Custom admin site with monitoring dashboard integration"""
    
    site_header = 'Edulink Monitoring Dashboard'
    site_title = 'Monitoring Admin'
    index_title = 'System Monitoring & Health'
    
    def get_urls(self):
        """Add custom URLs for monitoring dashboard"""
        urls = super().get_urls()
        custom_urls = [
            path('monitoring-dashboard/', self.admin_view(self.monitoring_dashboard_view), name='monitoring_dashboard'),
            path('run-health-check/', self.admin_view(self.run_health_check), name='run_health_check'),
            path('export-report/', self.admin_view(self.export_report), name='export_report'),
            path('system-status/', self.admin_view(self.system_status_api), name='system_status_api'),
        ]
        return custom_urls + urls
    
    def monitoring_dashboard_view(self, request):
        """Custom monitoring dashboard view for admin"""
        # Get latest system health
        latest_health = SystemHealthCheck.objects.first()
        
        # Get active alerts
        active_alerts = SystemAlert.objects.filter(status='active').order_by('-timestamp')[:5]
        
        # Get recent API metrics
        recent_metrics = APIMetrics.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=24)
        )
        
        # Calculate statistics
        context = {
            'title': 'Monitoring Dashboard',
            'latest_health': latest_health,
            'active_alerts': active_alerts,
            'alert_count': active_alerts.count(),
            'critical_alerts': active_alerts.filter(severity='critical').count(),
            'total_requests_24h': recent_metrics.count(),
            'avg_response_time': recent_metrics.aggregate(avg=models.Avg('response_time'))['avg'] or 0,
            'error_rate': (
                recent_metrics.filter(status_code__gte=400).count() / 
                max(recent_metrics.count(), 1) * 100
            ),
            'config': MonitoringConfiguration.get_current(),
        }
        
        return render(request, 'admin/monitoring/dashboard.html', context)
    
    @method_decorator(csrf_exempt)
    def run_health_check(self, request):
        """Run a manual health check"""
        if request.method == 'POST':
            try:
                # Create a temporary request object for the health check view
                health_view = DetailedHealthCheckView()
                health_view.request = request
                response = health_view.get(request)
                
                if hasattr(response, 'data'):
                    return JsonResponse({
                        'success': True,
                        'data': response.data,
                        'message': 'Health check completed successfully'
                    })
                else:
                    return JsonResponse({
                        'success': False,
                        'message': 'Health check failed'
                    })
            except Exception as e:
                return JsonResponse({
                    'success': False,
                    'message': f'Health check error: {str(e)}'
                })
        
        return JsonResponse({'success': False, 'message': 'Invalid request method'})
    
    def export_report(self, request):
        """Export system health report"""
        # Get date range from request
        days = int(request.GET.get('days', 7))
        start_date = timezone.now() - timedelta(days=days)
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="monitoring_report_{datetime.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        
        # Write health check data
        writer.writerow(['System Health Report', f'Generated: {datetime.now()}'])
        writer.writerow([])
        writer.writerow(['Health Checks'])
        writer.writerow([
            'Timestamp', 'Overall Status', 'CPU Usage', 'Memory Usage', 
            'Disk Usage', 'Database Status', 'Cache Status'
        ])
        
        health_checks = SystemHealthCheck.objects.filter(
            timestamp__gte=start_date
        ).order_by('-timestamp')
        
        for check in health_checks:
            writer.writerow([
                check.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                check.overall_status,
                f'{check.cpu_usage:.1f}%' if check.cpu_usage else 'N/A',
                f'{check.memory_usage:.1f}%' if check.memory_usage else 'N/A',
                f'{check.disk_usage:.1f}%' if check.disk_usage else 'N/A',
                check.database_status,
                check.cache_status
            ])
        
        # Write alerts data
        writer.writerow([])
        writer.writerow(['Active Alerts'])
        writer.writerow(['Timestamp', 'Title', 'Severity', 'Type', 'Status', 'Message'])
        
        alerts = SystemAlert.objects.filter(
            timestamp__gte=start_date
        ).order_by('-timestamp')
        
        for alert in alerts:
            writer.writerow([
                alert.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                alert.title,
                alert.severity,
                alert.alert_type,
                alert.status,
                alert.message[:100] + '...' if len(alert.message) > 100 else alert.message
            ])
        
        return response
    
    def system_status_api(self, request):
        """API endpoint for real-time system status"""
        latest_health = SystemHealthCheck.objects.first()
        active_alerts = SystemAlert.objects.filter(status='active').count()
        
        return JsonResponse({
            'overall_status': latest_health.overall_status if latest_health else 'unknown',
            'cpu_usage': latest_health.cpu_usage if latest_health else None,
            'memory_usage': latest_health.memory_usage if latest_health else None,
            'disk_usage': latest_health.disk_usage if latest_health else None,
            'active_alerts': active_alerts,
            'last_check': latest_health.timestamp.isoformat() if latest_health else None
        })
    
    def index(self, request, extra_context=None):
        """Custom admin index with monitoring widgets"""
        extra_context = extra_context or {}
        
        # Add monitoring data to context
        latest_health = SystemHealthCheck.objects.first()
        active_alerts = SystemAlert.objects.filter(status='active').count()
        
        extra_context.update({
            'monitoring_status': {
                'overall_health': latest_health.overall_status if latest_health else 'unknown',
                'cpu_usage': latest_health.cpu_usage if latest_health else None,
                'memory_usage': latest_health.memory_usage if latest_health else None,
                'active_alerts': active_alerts,
                'last_check': latest_health.timestamp if latest_health else None
            }
        })
        
        return super().index(request, extra_context)


    def dashboard_view(self, request):
        """Custom dashboard view for monitoring admin"""
        from django.utils import timezone
        from datetime import timedelta
        
        # Get latest health check
        latest_health = SystemHealthCheck.objects.order_by('-timestamp').first()
        
        # Get active alerts
        active_alerts = SystemAlert.objects.filter(
            status__in=['active', 'acknowledged']
        ).order_by('-timestamp')[:5]
        
        # Get API metrics for last 24 hours
        yesterday = timezone.now() - timedelta(days=1)
        api_metrics = APIMetrics.objects.filter(timestamp__gte=yesterday)
        
        total_requests_24h = api_metrics.count()
        avg_response_time = api_metrics.aggregate(
            avg_time=models.Avg('response_time')
        )['avg_time'] or 0
        
        # Calculate error rate
        error_requests = api_metrics.filter(status_code__gte=400).count()
        error_rate = (error_requests / total_requests_24h * 100) if total_requests_24h > 0 else 0
        
        # Get monitoring configuration
        config = MonitoringConfiguration.objects.first()
        if not config:
            config = MonitoringConfiguration.objects.create()
        
        context = {
            'title': 'Monitoring Dashboard',
            'latest_health': latest_health,
            'active_alerts': active_alerts,
            'alert_count': active_alerts.count(),
            'total_requests_24h': total_requests_24h,
            'avg_response_time': avg_response_time,
            'error_rate': error_rate,
            'config': config,
            'site_title': self.site_title,
            'site_header': self.site_header,
        }
        
        return render(request, 'admin/monitoring/dashboard.html', context)
    
    def run_health_check_view(self, request):
        """Run manual health check"""
        if request.method == 'POST':
            try:
                # Run detailed health check
                health_view = DetailedHealthCheckView()
                health_view.request = request
                response = health_view.get(request)
                
                if response.status_code == 200:
                    data = json.loads(response.content)
                    return JsonResponse({
                        'success': True,
                        'message': 'Health check completed successfully',
                        'data': data
                    })
                else:
                    return JsonResponse({
                        'success': False,
                        'message': 'Health check failed'
                    })
            except Exception as e:
                return JsonResponse({
                    'success': False,
                    'message': str(e)
                })
        
        return JsonResponse({'success': False, 'message': 'Invalid request method'})
    
    def export_report_view(self, request):
        """Export system health report"""
        from django.utils import timezone
        from datetime import timedelta
        
        # Get data for the last 7 days
        week_ago = timezone.now() - timedelta(days=7)
        health_checks = SystemHealthCheck.objects.filter(
            timestamp__gte=week_ago
        ).order_by('-timestamp')
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="system_health_report.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Timestamp', 'Overall Status', 'CPU Usage (%)', 'Memory Usage (%)', 
            'Disk Usage (%)', 'Database Status', 'Cache Status'
        ])
        
        for check in health_checks:
            writer.writerow([
                check.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                check.overall_status,
                check.cpu_usage or 'N/A',
                check.memory_usage or 'N/A',
                check.disk_usage or 'N/A',
                check.database_status,
                check.cache_status
            ])
        
        return response
    
    def system_status_api_view(self, request):
        """API endpoint for real-time system status"""
        latest_health = SystemHealthCheck.objects.order_by('-timestamp').first()
        
        if latest_health:
            data = {
                'overall_status': latest_health.overall_status,
                'cpu_usage': latest_health.cpu_usage,
                'memory_usage': latest_health.memory_usage,
                'disk_usage': latest_health.disk_usage,
                'timestamp': latest_health.timestamp.isoformat()
            }
        else:
            data = {
                'overall_status': 'unknown',
                'cpu_usage': None,
                'memory_usage': None,
                'disk_usage': None,
                'timestamp': None
            }
        
        return JsonResponse(data)


# Create custom admin site instance
monitoring_admin_site = MonitoringAdminSite(name='monitoring_admin')

# Register models with both default admin and custom admin site
monitoring_admin_site.register(SystemHealthCheck, SystemHealthCheckAdmin)
monitoring_admin_site.register(APIMetrics, APIMetricsAdmin)
monitoring_admin_site.register(SystemAlert, SystemAlertAdmin)
monitoring_admin_site.register(MonitoringConfiguration, MonitoringConfigurationAdmin)

# Import models for the aggregate function
from django.db import models