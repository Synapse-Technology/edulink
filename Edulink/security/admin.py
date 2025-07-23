from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.db.models import Count
from .models import (
    SecurityEvent, UserSession, FailedLoginAttempt,
    SecurityConfiguration, AuditLog
)


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    """Admin interface for SecurityEvent model."""
    
    list_display = [
        'event_type', 'severity', 'user_link', 'ip_address',
        'timestamp', 'resolved_status', 'action_buttons'
    ]
    list_filter = [
        'event_type', 'severity', 'resolved', 'timestamp',
        ('timestamp', admin.DateFieldListFilter)
    ]
    search_fields = ['user__email', 'ip_address', 'description', 'user_agent']
    readonly_fields = ['timestamp', 'metadata_display']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Event Information', {
            'fields': ('event_type', 'severity', 'description', 'resolved')
        }),
        ('User & Location', {
            'fields': ('user', 'ip_address', 'user_agent')
        }),
        ('Metadata', {
            'fields': ('timestamp', 'metadata_display'),
            'classes': ('collapse',)
        })
    )
    
    def user_link(self, obj):
        """Display user as clickable link."""
        if obj.user:
            url = reverse('admin:authentication_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return '-'
    user_link.short_description = 'User'
    
    def resolved_status(self, obj):
        """Display resolved status with color coding."""
        if obj.resolved:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Resolved</span>'
            )
        else:
            color = {
                'critical': 'red',
                'high': 'orange',
                'medium': 'blue',
                'low': 'gray'
            }.get(obj.severity, 'black')
            return format_html(
                '<span style="color: {}; font-weight: bold;">⚠ Open</span>',
                color
            )
    resolved_status.short_description = 'Status'
    
    def metadata_display(self, obj):
        """Display metadata in a readable format."""
        if obj.metadata:
            import json
            return format_html(
                '<pre>{}</pre>',
                json.dumps(obj.metadata, indent=2)
            )
        return 'No metadata'
    metadata_display.short_description = 'Metadata'
    
    def action_buttons(self, obj):
        """Display action buttons."""
        actions = []
        if not obj.resolved:
            actions.append(
                format_html(
                    '<a class="button" href="#" onclick="resolveEvent({})">Resolve</a>',
                    obj.pk
                )
            )
        return format_html(' '.join(actions))
    action_buttons.short_description = 'Actions'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user')
    
    class Media:
        js = ('admin/js/security_admin.js',)
        css = {
            'all': ('admin/css/security_admin.css',)
        }


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    """Admin interface for UserSession model."""
    
    list_display = [
        'user_link', 'session_key_short', 'ip_address',
        'created_at', 'last_activity', 'is_active', 'action_buttons'
    ]
    list_filter = [
        'is_active', 'created_at', 'last_activity',
        ('created_at', admin.DateFieldListFilter)
    ]
    search_fields = ['user__email', 'ip_address', 'session_key']
    readonly_fields = ['session_key', 'created_at', 'device_info_display']
    date_hierarchy = 'created_at'
    ordering = ['-last_activity']
    
    fieldsets = (
        ('Session Information', {
            'fields': ('user', 'session_key', 'is_active')
        }),
        ('Location & Device', {
            'fields': ('ip_address', 'user_agent', 'device_info_display')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'last_activity')
        })
    )
    
    def user_link(self, obj):
        """Display user as clickable link."""
        if obj.user:
            url = reverse('admin:authentication_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return '-'
    user_link.short_description = 'User'
    
    def session_key_short(self, obj):
        """Display shortened session key."""
        return f"{obj.session_key[:8]}...{obj.session_key[-8:]}"
    session_key_short.short_description = 'Session Key'
    
    def device_info_display(self, obj):
        """Display device info in a readable format."""
        if obj.device_info:
            import json
            return format_html(
                '<pre>{}</pre>',
                json.dumps(obj.device_info, indent=2)
            )
        return 'No device info'
    device_info_display.short_description = 'Device Info'
    
    def action_buttons(self, obj):
        """Display action buttons."""
        if obj.is_active:
            return format_html(
                '<a class="button" href="#" onclick="terminateSession({})">Terminate</a>',
                obj.pk
            )
        return '-'
    action_buttons.short_description = 'Actions'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user')


@admin.register(FailedLoginAttempt)
class FailedLoginAttemptAdmin(admin.ModelAdmin):
    """Admin interface for FailedLoginAttempt model."""
    
    list_display = [
        'email', 'ip_address', 'timestamp', 'user_agent_short', 'reason'
    ]
    list_filter = [
        'timestamp',
        ('timestamp', admin.DateFieldListFilter)
    ]
    search_fields = ['email', 'ip_address', 'user_agent']
    readonly_fields = ['timestamp', 'metadata_display']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Attempt Information', {
            'fields': ('email', 'ip_address', 'timestamp')
        }),
        ('Browser & Location', {
            'fields': ('user_agent', 'location')
        }),
        ('Additional Data', {
            'fields': ('metadata_display',),
            'classes': ('collapse',)
        })
    )
    
    def user_agent_short(self, obj):
        """Display shortened user agent."""
        if obj.user_agent:
            return obj.user_agent[:50] + '...' if len(obj.user_agent) > 50 else obj.user_agent
        return '-'
    user_agent_short.short_description = 'User Agent'
    
    def metadata_display(self, obj):
        """Display metadata in a readable format."""
        if obj.metadata:
            import json
            return format_html(
                '<pre>{}</pre>',
                json.dumps(obj.metadata, indent=2)
            )
        return 'No metadata'
    metadata_display.short_description = 'Metadata'
    
    def changelist_view(self, request, extra_context=None):
        """Add statistics to changelist view."""
        extra_context = extra_context or {}
        
        # Get statistics
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        
        stats = {
            'total_attempts': self.model.objects.count(),
            'today_attempts': self.model.objects.filter(timestamp__date=today).count(),
            'week_attempts': self.model.objects.filter(timestamp__gte=week_ago).count(),
            'top_ips': self.model.objects.values('ip_address').annotate(
                count=Count('id')
            ).order_by('-count')[:5]
        }
        
        extra_context['stats'] = stats
        return super().changelist_view(request, extra_context)


@admin.register(SecurityConfiguration)
class SecurityConfigurationAdmin(admin.ModelAdmin):
    """Admin interface for SecurityConfiguration model."""
    
    list_display = [
        'key', 'value_display', 'description_short', 'is_active', 'updated_at'
    ]
    list_filter = ['is_active', 'updated_at']
    search_fields = ['key', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['key']
    
    fieldsets = (
        ('Configuration', {
            'fields': ('key', 'value', 'description', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def value_display(self, obj):
        """Display value with truncation if too long."""
        if len(str(obj.value)) > 50:
            return f"{str(obj.value)[:50]}..."
        return obj.value
    value_display.short_description = 'Value'
    
    def description_short(self, obj):
        """Display shortened description."""
        if obj.description and len(obj.description) > 100:
            return f"{obj.description[:100]}..."
        return obj.description or '-'
    description_short.short_description = 'Description'


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin interface for AuditLog model."""
    
    list_display = [
        'action', 'user_link', 'resource_type', 'resource_id',
        'timestamp', 'ip_address'
    ]
    list_filter = [
        'action', 'resource_type', 'timestamp',
        ('timestamp', admin.DateFieldListFilter)
    ]
    search_fields = [
        'user__email', 'resource_type', 'resource_id', 'ip_address', 'description'
    ]
    readonly_fields = [
        'timestamp', 'changes_display', 'metadata_display'
    ]
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Action Information', {
            'fields': ('action', 'user', 'description')
        }),
        ('Object Details', {
            'fields': ('resource_type', 'resource_id')
        }),
        ('Context', {
            'fields': ('ip_address', 'user_agent', 'timestamp')
        }),
        ('Changes', {
            'fields': ('changes_display', 'metadata_display'),
            'classes': ('collapse',)
        })
    )
    
    def user_link(self, obj):
        """Display user as clickable link."""
        if obj.user:
            url = reverse('admin:authentication_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'System'
    user_link.short_description = 'User'
    
    def changes_display(self, obj):
        """Display changes in a readable format."""
        if obj.changes:
            import json
            return format_html(
                '<pre>{}</pre>',
                json.dumps(obj.changes, indent=2)
            )
        return 'No changes recorded'
    changes_display.short_description = 'Changes'
    
    def metadata_display(self, obj):
        """Display metadata in a readable format."""
        if obj.metadata:
            import json
            return format_html(
                '<pre>{}</pre>',
                json.dumps(obj.metadata, indent=2)
            )
        return 'No metadata'
    metadata_display.short_description = 'Metadata'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user')
    
    def has_add_permission(self, request):
        """Disable adding audit logs through admin."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Disable changing audit logs through admin."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Disable deleting audit logs through admin."""
        return False


# Custom admin site configuration
class SecurityAdminSite(admin.AdminSite):
    """Custom admin site for security management."""
    
    site_header = 'Security Management'
    site_title = 'Security Admin'
    index_title = 'Security Dashboard'
    
    def index(self, request, extra_context=None):
        """Custom index view with security statistics."""
        extra_context = extra_context or {}
        
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        
        # Security statistics
        stats = {
            'total_events': SecurityEvent.objects.count(),
            'unresolved_events': SecurityEvent.objects.filter(resolved=False).count(),
            'critical_events': SecurityEvent.objects.filter(
                severity='critical', resolved=False
            ).count(),
            'today_failed_logins': FailedLoginAttempt.objects.filter(
                timestamp__date=today
            ).count(),
            'active_sessions': UserSession.objects.filter(is_active=True).count(),
            'week_events': SecurityEvent.objects.filter(
                timestamp__gte=week_ago
            ).count()
        }
        
        # Recent critical events
        recent_critical = SecurityEvent.objects.filter(
            severity='critical',
            resolved=False
        ).order_by('-timestamp')[:5]
        
        extra_context.update({
            'security_stats': stats,
            'recent_critical_events': recent_critical
        })
        
        return super().index(request, extra_context)


# Register models with custom admin site
security_admin_site = SecurityAdminSite(name='security_admin')
security_admin_site.register(SecurityEvent, SecurityEventAdmin)
security_admin_site.register(UserSession, UserSessionAdmin)
security_admin_site.register(FailedLoginAttempt, FailedLoginAttemptAdmin)
security_admin_site.register(SecurityConfiguration, SecurityConfigurationAdmin)
security_admin_site.register(AuditLog, AuditLogAdmin)