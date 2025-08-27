from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Q
from .models import UserRole, RolePermission, RoleAssignmentHistory, RoleInvitation


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = [
        'user_id', 'role', 'institution_id', 'company_id', 
        'is_active', 'is_expired', 'assigned_by_user_id', 'created_at'
    ]
    list_filter = [
        'role', 'is_active', 'created_at', 'expires_at',
        'institution_id', 'company_id'
    ]
    search_fields = ['user_id', 'role', 'institution_id', 'company_id']
    readonly_fields = ['created_at', 'updated_at', 'is_expired']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user_id', 'role', 'is_active')
        }),
        ('Organization', {
            'fields': ('institution_id', 'company_id'),
            'description': 'Select the appropriate organization based on the role'
        }),
        ('Assignment Details', {
            'fields': ('assigned_by_user_id', 'expires_at')
        }),
        ('Permissions & Metadata', {
            'fields': ('permissions', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def is_expired(self, obj):
        """Check if the role is expired."""
        if obj.expires_at and obj.expires_at <= timezone.now():
            return format_html(
                '<span style="color: red;">Yes</span>'
            )
        return format_html(
            '<span style="color: green;">No</span>'
        )
    is_expired.short_description = 'Expired'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related()
    
    actions = ['activate_roles', 'deactivate_roles', 'extend_expiration']
    
    def activate_roles(self, request, queryset):
        """Activate selected roles."""
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'{updated} role(s) were successfully activated.'
        )
    activate_roles.short_description = 'Activate selected roles'
    
    def deactivate_roles(self, request, queryset):
        """Deactivate selected roles."""
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'{updated} role(s) were successfully deactivated.'
        )
    deactivate_roles.short_description = 'Deactivate selected roles'
    
    def extend_expiration(self, request, queryset):
        """Extend expiration by 30 days."""
        from datetime import timedelta
        
        updated = 0
        for role in queryset:
            if role.expires_at:
                role.expires_at += timedelta(days=30)
                role.save()
                updated += 1
        
        self.message_user(
            request,
            f'{updated} role(s) expiration extended by 30 days.'
        )
    extend_expiration.short_description = 'Extend expiration by 30 days'


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'description', 'category']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'category', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['activate_permissions', 'deactivate_permissions']
    
    def activate_permissions(self, request, queryset):
        """Activate selected permissions."""
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'{updated} permission(s) were successfully activated.'
        )
    activate_permissions.short_description = 'Activate selected permissions'
    
    def deactivate_permissions(self, request, queryset):
        """Deactivate selected permissions."""
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'{updated} permission(s) were successfully deactivated.'
        )
    deactivate_permissions.short_description = 'Deactivate selected permissions'


@admin.register(RoleAssignmentHistory)
class RoleAssignmentHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'user_id', 'role', 'action', 'performed_by_user_id', 
        'institution_id', 'employer_id', 'created_at'
    ]
    list_filter = ['role', 'action', 'created_at', 'institution_id', 'employer_id']
    search_fields = ['user_id', 'role', 'performed_by_user_id', 'reason']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user_id', 'role', 'action', 'performed_by_user_id')
        }),
        ('Organization', {
            'fields': ('institution_id', 'employer_id')
        }),
        ('Details', {
            'fields': ('reason', 'previous_data', 'new_data')
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        })
    )
    
    def has_add_permission(self, request):
        """Disable adding history records manually."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Disable editing history records."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Disable deleting history records."""
        return False


@admin.register(RoleInvitation)
class RoleInvitationAdmin(admin.ModelAdmin):
    list_display = [
        'email', 'role', 'is_used', 'is_expired', 
        'invited_by_user_id', 'institution_id', 'employer_id', 'created_at'
    ]
    list_filter = [
        'role', 'is_used', 'created_at', 'expires_at',
        'institution_id', 'employer_id'
    ]
    search_fields = ['email', 'role', 'invited_by_user_id']
    readonly_fields = ['token', 'created_at', 'updated_at', 'used_at', 'is_expired']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Invitation Details', {
            'fields': ('email', 'role', 'invited_by_user_id')
        }),
        ('Organization', {
            'fields': ('institution_id', 'employer_id'),
            'description': 'Select the appropriate organization based on the role'
        }),
        ('Expiration & Usage', {
            'fields': ('expires_at', 'is_used', 'used_at', 'used_by_user_id')
        }),
        ('Token & Metadata', {
            'fields': ('token', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def is_expired(self, obj):
        """Check if the invitation is expired."""
        if obj.expires_at <= timezone.now():
            return format_html(
                '<span style="color: red;">Yes</span>'
            )
        return format_html(
            '<span style="color: green;">No</span>'
        )
    is_expired.short_description = 'Expired'
    
    def get_queryset(self, request):
        return super().get_queryset(request)
    
    actions = ['resend_invitations', 'extend_invitations']
    
    def resend_invitations(self, request, queryset):
        """Resend selected invitations."""
        from user_service.utils import ServiceClient
        import logging
        
        logger = logging.getLogger(__name__)
        sent_count = 0
        
        for invitation in queryset.filter(is_used=False, expires_at__gt=timezone.now()):
            try:
                service_client = ServiceClient()
                service_client.post(
                    'notification',
                    '/api/notifications/send-role-invitation/',
                    {
                        'email': invitation.email,
                        'role': invitation.role,
                        'invitation_token': str(invitation.token),
                        'expires_at': invitation.expires_at.isoformat(),
                        'invited_by': invitation.invited_by_user_id,
                        'institution_id': invitation.institution_id,
                        'employer_id': invitation.employer_id
                    }
                )
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to resend invitation to {invitation.email}: {e}")
        
        self.message_user(
            request,
            f'{sent_count} invitation(s) were successfully resent.'
        )
    resend_invitations.short_description = 'Resend selected invitations'
    
    def extend_invitations(self, request, queryset):
        """Extend invitation expiration by 7 days."""
        from datetime import timedelta
        
        updated = queryset.filter(
            is_used=False,
            expires_at__gt=timezone.now()
        ).update(
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        self.message_user(
            request,
            f'{updated} invitation(s) expiration extended by 7 days.'
        )
    extend_invitations.short_description = 'Extend expiration by 7 days'