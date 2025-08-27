from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.db.models import Count
from django.http import HttpResponseRedirect
from django.contrib import messages
from django.utils.safestring import mark_safe
import json

from .models import (
    NotificationTemplate, Notification, NotificationLog, 
    NotificationPreference, NotificationBatch, NotificationStatus
)
from .tasks import send_notification, retry_failed_notifications


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'notification_type', 'category', 'is_active', 'created_at', 'usage_count']
    list_filter = ['notification_type', 'category', 'is_active', 'created_at']
    search_fields = ['name', 'subject', 'message']
    readonly_fields = ['created_at', 'updated_at', 'usage_count']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'notification_type', 'category', 'is_active')
        }),
        ('Template Content', {
            'fields': ('subject', 'message', 'html_content')
        }),
        ('Variables', {
            'fields': ('variables',),
            'description': 'JSON object defining available template variables and their descriptions'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'usage_count'),
            'classes': ('collapse',)
        })
    )
    
    def usage_count(self, obj):
        return obj.notifications.count()
    usage_count.short_description = 'Usage Count'
    
    actions = ['duplicate_template', 'activate_templates', 'deactivate_templates']
    
    def duplicate_template(self, request, queryset):
        for template in queryset:
            template.pk = None
            template.name = f"{template.name} (Copy)"
            template.is_active = False
            template.save()
        self.message_user(request, f"Duplicated {queryset.count()} templates")
    duplicate_template.short_description = "Duplicate selected templates"
    
    def activate_templates(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"Activated {updated} templates")
    activate_templates.short_description = "Activate selected templates"
    
    def deactivate_templates(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"Deactivated {updated} templates")
    deactivate_templates.short_description = "Deactivate selected templates"


class NotificationLogInline(admin.TabularInline):
    model = NotificationLog
    extra = 0
    readonly_fields = ['attempted_at', 'attempt_number', 'status', 'response_time_ms', 'error_message']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'notification_type', 'recipient_display', 'status', 'priority', 
        'category', 'created_at', 'sent_at', 'retry_count', 'source_service'
    ]
    list_filter = [
        'notification_type', 'status', 'priority', 'category', 'source_service',
        'created_at', 'sent_at'
    ]
    search_fields = [
        'recipient_email', 'recipient_phone', 'recipient_user_id', 
        'subject', 'reference_id', 'external_id'
    ]
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'sent_at', 'delivered_at', 
        'external_id', 'provider', 'retry_count'
    ]
    
    fieldsets = (
        ('Recipient Information', {
            'fields': ('recipient_email', 'recipient_phone', 'recipient_user_id')
        }),
        ('Notification Details', {
            'fields': (
                'notification_type', 'category', 'priority', 'status',
                'subject', 'message', 'html_content'
            )
        }),
        ('Template & Variables', {
            'fields': ('template', 'template_variables'),
            'classes': ('collapse',)
        }),
        ('Scheduling & Delivery', {
            'fields': (
                'scheduled_at', 'sent_at', 'delivered_at', 'max_retries', 'retry_count'
            )
        }),
        ('Tracking & Metadata', {
            'fields': (
                'source_service', 'reference_id', 'external_id', 'provider',
                'error_message', 'metadata'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [NotificationLogInline]
    
    def recipient_display(self, obj):
        if obj.recipient_email:
            return obj.recipient_email
        elif obj.recipient_phone:
            return obj.recipient_phone
        elif obj.recipient_user_id:
            return f"User: {obj.recipient_user_id}"
        return "Unknown"
    recipient_display.short_description = 'Recipient'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('template')
    
    actions = ['retry_notifications', 'cancel_notifications', 'mark_as_sent']
    
    def retry_notifications(self, request, queryset):
        failed_notifications = queryset.filter(status=NotificationStatus.FAILED)
        count = 0
        for notification in failed_notifications:
            if notification.can_retry():
                notification.status = NotificationStatus.PENDING
                notification.error_message = ''
                notification.save(update_fields=['status', 'error_message', 'updated_at'])
                send_notification.delay(str(notification.id))
                count += 1
        
        self.message_user(request, f"Queued {count} notifications for retry")
    retry_notifications.short_description = "Retry failed notifications"
    
    def cancel_notifications(self, request, queryset):
        pending_notifications = queryset.filter(
            status__in=[NotificationStatus.PENDING, NotificationStatus.PROCESSING]
        )
        updated = pending_notifications.update(status=NotificationStatus.CANCELLED)
        self.message_user(request, f"Cancelled {updated} notifications")
    cancel_notifications.short_description = "Cancel pending notifications"
    
    def mark_as_sent(self, request, queryset):
        pending_notifications = queryset.filter(status=NotificationStatus.PENDING)
        updated = 0
        for notification in pending_notifications:
            notification.mark_as_sent()
            updated += 1
        self.message_user(request, f"Marked {updated} notifications as sent")
    mark_as_sent.short_description = "Mark as sent (manual)"


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = [
        'notification', 'attempt_number', 'status', 'attempted_at', 
        'response_time_ms', 'has_error'
    ]
    list_filter = ['status', 'attempted_at']
    search_fields = ['notification__id', 'notification__recipient_email', 'error_message']
    readonly_fields = ['attempted_at']
    
    def has_error(self, obj):
        return bool(obj.error_message)
    has_error.boolean = True
    has_error.short_description = 'Has Error'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'email_enabled', 'sms_enabled', 'push_enabled', 'updated_at']
    list_filter = ['email_enabled', 'sms_enabled', 'push_enabled', 'updated_at']
    search_fields = ['user_id']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user_id',)
        }),
        ('Notification Types', {
            'fields': ('email_enabled', 'sms_enabled', 'push_enabled')
        }),
        ('Category Preferences', {
            'fields': ('enabled_categories', 'disabled_categories'),
            'description': 'JSON arrays of category names'
        }),
        ('Quiet Hours', {
            'fields': ('quiet_hours_start', 'quiet_hours_end', 'timezone'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(NotificationBatch)
class NotificationBatchAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'name', 'status', 'total_count', 'success_count', 
        'failed_count', 'progress_percentage', 'created_at', 'completed_at'
    ]
    list_filter = ['status', 'created_at', 'completed_at']
    search_fields = ['name', 'description']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'started_at', 'completed_at',
        'total_count', 'processed_count', 'success_count', 'failed_count',
        'progress_percentage'
    ]
    
    fieldsets = (
        ('Batch Information', {
            'fields': ('name', 'description', 'status')
        }),
        ('Progress', {
            'fields': (
                'total_count', 'processed_count', 'success_count', 'failed_count',
                'progress_percentage'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'started_at', 'completed_at'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        })
    )
    
    def progress_percentage(self, obj):
        if obj.total_count > 0:
            percentage = (obj.processed_count / obj.total_count) * 100
            return f"{percentage:.1f}%"
        return "0%"
    progress_percentage.short_description = 'Progress'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


# Custom admin views
class NotificationAdminSite(admin.AdminSite):
    site_header = "Edulink Notification Service Admin"
    site_title = "Notification Admin"
    index_title = "Notification Management"
    
    def index(self, request, extra_context=None):
        extra_context = extra_context or {}
        
        # Add notification statistics to the admin index
        from django.db.models import Count, Q
        from datetime import timedelta
        
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        
        # Today's stats
        today_notifications = Notification.objects.filter(created_at__date=today)
        today_stats = {
            'total': today_notifications.count(),
            'sent': today_notifications.filter(
                status__in=[NotificationStatus.SENT, NotificationStatus.DELIVERED]
            ).count(),
            'failed': today_notifications.filter(status=NotificationStatus.FAILED).count(),
            'pending': today_notifications.filter(
                status__in=[NotificationStatus.PENDING, NotificationStatus.PROCESSING]
            ).count()
        }
        
        # Weekly stats
        week_notifications = Notification.objects.filter(created_at__gte=week_ago)
        week_stats = {
            'total': week_notifications.count(),
            'sent': week_notifications.filter(
                status__in=[NotificationStatus.SENT, NotificationStatus.DELIVERED]
            ).count(),
            'failed': week_notifications.filter(status=NotificationStatus.FAILED).count()
        }
        
        # Active batches
        active_batches = NotificationBatch.objects.filter(
            status__in=['pending', 'processing']
        ).count()
        
        extra_context.update({
            'today_stats': today_stats,
            'week_stats': week_stats,
            'active_batches': active_batches
        })
        
        return super().index(request, extra_context)


# Register with custom admin site if needed
# notification_admin_site = NotificationAdminSite(name='notification_admin')
# notification_admin_site.register(NotificationTemplate, NotificationTemplateAdmin)
# notification_admin_site.register(Notification, NotificationAdmin)
# notification_admin_site.register(NotificationLog, NotificationLogAdmin)
# notification_admin_site.register(NotificationPreference, NotificationPreferenceAdmin)
# notification_admin_site.register(NotificationBatch, NotificationBatchAdmin)