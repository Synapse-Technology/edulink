"""
Django admin configuration for notifications app.
Provides admin interface for managing notifications and tokens.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import Notification, EmailVerificationToken, PasswordResetToken


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Admin interface for Notification model.
    """
    
    list_display = [
        'id', 'type', 'recipient_id', 'channel', 'status_colored',
        'title', 'sent_at', 'created_at', 'retry_count'
    ]
    list_filter = [
        'type', 'channel', 'status', 'created_at', 'sent_at'
    ]
    search_fields = [
        'title', 'body', 'recipient_id', 'related_entity_id'
    ]
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'sent_at', 'delivered_at',
        'read_at', 'retry_count'
    ]
    ordering = ['-created_at']
    
    def status_colored(self, obj):
        """Display status with color coding."""
        colors = {
            Notification.STATUS_PENDING: 'orange',
            Notification.STATUS_SENT: 'blue',
            Notification.STATUS_FAILED: 'red',
            Notification.STATUS_DELIVERED: 'green',
            Notification.STATUS_READ: 'purple'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {};">{}</span>',
            color,
            obj.get_status_display()
        )
    status_colored.short_description = 'Status'
    
    def has_add_permission(self, request):
        """Prevent manual creation of notifications through admin."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Allow deletion only for failed notifications."""
        if obj and obj.status == Notification.STATUS_FAILED:
            return True
        return False


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    """
    Admin interface for EmailVerificationToken model.
    """
    
    list_display = [
        'id', 'user', 'token_short', 'is_used', 'is_expired_colored',
        'expires_at', 'created_at'
    ]
    list_filter = [
        'is_used', 'created_at', 'expires_at'
    ]
    search_fields = [
        'user__email', 'user__username', 'token'
    ]
    readonly_fields = [
        'id', 'token', 'created_at', 'updated_at'
    ]
    ordering = ['-created_at']
    
    def token_short(self, obj):
        """Display shortened token for better readability."""
        return f"{str(obj.token)[:8]}..."
    token_short.short_description = 'Token'
    
    def is_expired_colored(self, obj):
        """Display expiration status with color coding."""
        if obj.is_expired:
            return format_html('<span style="color: red;">Expired</span>')
        return format_html('<span style="color: green;">Valid</span>')
    is_expired_colored.short_description = 'Is Expired'
    
    def has_add_permission(self, request):
        """Prevent manual creation of tokens through admin."""
        return False


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """
    Admin interface for PasswordResetToken model.
    """
    
    list_display = [
        'id', 'user', 'token_short', 'is_used', 'is_expired_colored',
        'expires_at', 'created_at'
    ]
    list_filter = [
        'is_used', 'created_at', 'expires_at'
    ]
    search_fields = [
        'user__email', 'user__username', 'token'
    ]
    readonly_fields = [
        'id', 'token', 'created_at', 'updated_at'
    ]
    ordering = ['-created_at']
    
    def token_short(self, obj):
        """Display shortened token for better readability."""
        return f"{str(obj.token)[:8]}..."
    token_short.short_description = 'Token'
    
    def is_expired_colored(self, obj):
        """Display expiration status with color coding."""
        if obj.is_expired:
            return format_html('<span style="color: red;">Expired</span>')
        return format_html('<span style="color: green;">Valid</span>')
    is_expired_colored.short_description = 'Is Expired'
    
    def has_add_permission(self, request):
        """Prevent manual creation of tokens through admin."""
        return False


# Admin actions for bulk operations
@admin.action(description='Mark selected notifications as read')
def mark_notifications_read(modeladmin, request, queryset):
    """Bulk action to mark notifications as read."""
    from .services import mark_notification_read
    
    updated_count = 0
    for notification in queryset:
        if mark_notification_read(notification_id=str(notification.id)):
            updated_count += 1
    
    modeladmin.message_user(
        request,
        f'Successfully marked {updated_count} notifications as read.'
    )


@admin.action(description='Mark selected notifications as delivered')
def mark_notifications_delivered(modeladmin, request, queryset):
    """Bulk action to mark notifications as delivered."""
    from .services import mark_notification_delivered
    
    updated_count = 0
    for notification in queryset:
        if mark_notification_delivered(notification_id=str(notification.id)):
            updated_count += 1
    
    modeladmin.message_user(
        request,
        f'Successfully marked {updated_count} notifications as delivered.'
    )


# Add actions to NotificationAdmin
NotificationAdmin.actions = [mark_notifications_read, mark_notifications_delivered]