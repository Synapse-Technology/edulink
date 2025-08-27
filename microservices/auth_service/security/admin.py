from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.db.models import Count
from django.http import HttpResponse
import csv
import json

from .models import (
    SecurityEvent,
    AuditLog,
    UserSession,
    FailedLoginAttempt,
    SecurityConfiguration
)


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    """Admin interface for SecurityEvent model."""
    
    list_display = [
        'event_type', 'severity', 'user_display', 'ip_address',
        'timestamp', 'status', 'risk_score', 'notification_sent'
    ]
    list_filter = [
        'event_type', 'severity', 'status', 'timestamp',
        'notification_sent', 'service_name'
    ]
    search_fields = [
        'user__email', 'user_email', 'ip_address', 'description',
        'session_key', 'country', 'city'
    ]
    readonly_fields = [
        'id', 'timestamp', 'risk_score', 'user_email'
    ]
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Event Information', {
            'fields': (
                'id', 'event_type', 'severity', 'description',
                'timestamp', 'risk_score'
            )
        }),
        ('User Information', {
            'fields': ('user', 'user_email')
        }),
        ('Network Information', {
            'fields': (
                'ip_address', 'user_agent', 'session_key',
                'country', 'city'
            )
        }),
        ('Status and Resolution', {
            'fields': (
                'status', 'resolved_at', 'resolved_by',
                'resolution_notes'
            )
        }),
        ('Metadata', {
            'fields': ('metadata', 'service_name'),
            'classes': ('collapse',)
        }),
        ('Notifications', {
            'fields': ('notification_sent', 'notification_sent_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = [
        'mark_as_resolved', 'mark_as_investigating',
        'mark_as_false_positive', 'export_as_csv'
    ]
    
    def user_display(self, obj):
        """Display user information."""
        if obj.user:
            url = reverse('admin:authentication_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return obj.user_email or 'Unknown'
    user_display.short_description = 'User'
    user_display.admin_order_field = 'user__email'
    
    def mark_as_resolved(self, request, queryset):
        """Mark selected events as resolved."""
        updated = queryset.update(
            status='resolved',
            resolved_at=timezone.now(),
            resolved_by=request.user
        )
        self.message_user(
            request,
            f'{updated} security event(s) marked as resolved.'
        )
    mark_as_resolved.short_description = 'Mark selected events as resolved'
    
    def mark_as_investigating(self, request, queryset):
        """Mark selected events as investigating."""
        updated = queryset.update(status='investigating')
        self.message_user(
            request,
            f'{updated} security event(s) marked as investigating.'
        )
    mark_as_investigating.short_description = 'Mark selected events as investigating'
    
    def mark_as_false_positive(self, request, queryset):
        """Mark selected events as false positive."""
        updated = queryset.update(
            status='false_positive',
            resolved_at=timezone.now(),
            resolved_by=request.user
        )
        self.message_user(
            request,
            f'{updated} security event(s) marked as false positive.'
        )
    mark_as_false_positive.short_description = 'Mark selected events as false positive'
    
    def export_as_csv(self, request, queryset):
        """Export selected events as CSV."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="security_events.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Event Type', 'Severity', 'User', 'IP Address',
            'Timestamp', 'Status', 'Risk Score', 'Description'
        ])
        
        for event in queryset:
            writer.writerow([
                str(event.id), event.event_type, event.severity,
                event.user.email if event.user else event.user_email,
                event.ip_address, event.timestamp, event.status,
                event.risk_score, event.description
            ])
        
        return response
    export_as_csv.short_description = 'Export selected events as CSV'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related(
            'user', 'resolved_by'
        )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin interface for AuditLog model."""
    
    list_display = [
        'action', 'resource_type', 'resource_id',
        'user_display', 'ip_address', 'timestamp'
    ]
    list_filter = [
        'action', 'resource_type', 'timestamp', 'service_name'
    ]
    search_fields = [
        'user__email', 'user_email', 'resource_type',
        'resource_id', 'description', 'ip_address'
    ]
    readonly_fields = ['id', 'timestamp']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Action Information', {
            'fields': (
                'id', 'action', 'resource_type', 'resource_id',
                'timestamp', 'description'
            )
        }),
        ('User Information', {
            'fields': ('user', 'user_email')
        }),
        ('Request Context', {
            'fields': (
                'ip_address', 'user_agent', 'session_key'
            )
        }),
        ('Changes', {
            'fields': ('changes', 'old_values', 'new_values'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('metadata', 'service_name'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['export_as_csv']
    
    def user_display(self, obj):
        """Display user information."""
        if obj.user:
            url = reverse('admin:authentication_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return obj.user_email or 'System'
    user_display.short_description = 'User'
    user_display.admin_order_field = 'user__email'
    
    def export_as_csv(self, request, queryset):
        """Export selected audit logs as CSV."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_logs.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Action', 'Resource Type', 'Resource ID',
            'User', 'IP Address', 'Timestamp', 'Description'
        ])
        
        for log in queryset:
            writer.writerow([
                str(log.id), log.action, log.resource_type, log.resource_id,
                log.user.email if log.user else log.user_email,
                log.ip_address, log.timestamp, log.description
            ])
        
        return response
    export_as_csv.short_description = 'Export selected logs as CSV'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user')


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    """Admin interface for UserSession model."""
    
    list_display = [
        'user_display', 'ip_address', 'device_id',
        'created_at', 'last_activity', 'is_active', 'logout_reason'
    ]
    list_filter = [
        'is_active', 'logout_reason', 'created_at',
        'last_activity', 'country'
    ]
    search_fields = [
        'user__email', 'ip_address', 'device_id',
        'session_key', 'country', 'city'
    ]
    readonly_fields = ['id', 'created_at', 'last_activity']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Session Information', {
            'fields': (
                'id', 'user', 'session_key', 'created_at',
                'last_activity', 'expires_at'
            )
        }),
        ('Device and Network', {
            'fields': (
                'ip_address', 'user_agent', 'device_id',
                'country', 'city'
            )
        }),
        ('Status', {
            'fields': ('is_active', 'logout_reason')
        })
    )
    
    actions = ['terminate_sessions', 'export_as_csv']
    
    def user_display(self, obj):
        """Display user information."""
        url = reverse('admin:authentication_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_display.short_description = 'User'
    user_display.admin_order_field = 'user__email'
    
    def terminate_sessions(self, request, queryset):
        """Terminate selected sessions."""
        active_sessions = queryset.filter(is_active=True)
        for session in active_sessions:
            session.terminate(reason='admin_action')
        
        count = active_sessions.count()
        self.message_user(
            request,
            f'{count} session(s) terminated.'
        )
    terminate_sessions.short_description = 'Terminate selected sessions'
    
    def export_as_csv(self, request, queryset):
        """Export selected sessions as CSV."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="user_sessions.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'User', 'IP Address', 'Device ID', 'Created At',
            'Last Activity', 'Is Active', 'Logout Reason'
        ])
        
        for session in queryset:
            writer.writerow([
                str(session.id), session.user.email, session.ip_address,
                session.device_id, session.created_at, session.last_activity,
                session.is_active, session.logout_reason
            ])
        
        return response
    export_as_csv.short_description = 'Export selected sessions as CSV'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user')


@admin.register(FailedLoginAttempt)
class FailedLoginAttemptAdmin(admin.ModelAdmin):
    """Admin interface for FailedLoginAttempt model."""
    
    list_display = [
        'email', 'ip_address', 'reason', 'timestamp', 'country'
    ]
    list_filter = ['reason', 'timestamp', 'country']
    search_fields = ['email', 'ip_address', 'country', 'city']
    readonly_fields = ['id', 'timestamp']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Attempt Information', {
            'fields': (
                'id', 'email', 'reason', 'timestamp'
            )
        }),
        ('Network Information', {
            'fields': (
                'ip_address', 'user_agent', 'country', 'city'
            )
        })
    )
    
    actions = ['export_as_csv']
    
    def export_as_csv(self, request, queryset):
        """Export selected failed attempts as CSV."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="failed_login_attempts.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Email', 'IP Address', 'Reason', 'Timestamp', 'Country'
        ])
        
        for attempt in queryset:
            writer.writerow([
                str(attempt.id), attempt.email, attempt.ip_address,
                attempt.reason, attempt.timestamp, attempt.country
            ])
        
        return response
    export_as_csv.short_description = 'Export selected attempts as CSV'


@admin.register(SecurityConfiguration)
class SecurityConfigurationAdmin(admin.ModelAdmin):
    """Admin interface for SecurityConfiguration model."""
    
    list_display = [
        'key', 'data_type', 'value_preview', 'updated_at', 'updated_by_display'
    ]
    list_filter = ['data_type', 'updated_at']
    search_fields = ['key', 'description', 'value']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['key']
    
    fieldsets = (
        ('Configuration', {
            'fields': (
                'id', 'key', 'value', 'data_type', 'description'
            )
        }),
        ('Metadata', {
            'fields': (
                'created_at', 'updated_at', 'updated_by'
            )
        })
    )
    
    def value_preview(self, obj):
        """Show a preview of the value."""
        value = obj.value
        if len(value) > 50:
            return f"{value[:47]}..."
        return value
    value_preview.short_description = 'Value'
    
    def updated_by_display(self, obj):
        """Display updated by user."""
        if obj.updated_by:
            url = reverse('admin:authentication_user_change', args=[obj.updated_by.pk])
            return format_html('<a href="{}">{}</a>', url, obj.updated_by.email)
        return 'System'
    updated_by_display.short_description = 'Updated By'
    updated_by_display.admin_order_field = 'updated_by__email'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('updated_by')


# Custom admin site configuration
admin.site.site_header = 'Edulink Security Administration'
admin.site.site_title = 'Security Admin'
admin.site.index_title = 'Security Management'