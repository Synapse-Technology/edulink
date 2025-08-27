from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import (
    User, EmailOTP, Invite, RefreshToken, 
    PasswordResetToken, RoleChoices
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin."""
    
    list_display = (
        'email', 'role', 'is_active', 'is_email_verified', 
        'two_factor_enabled', 'failed_login_attempts', 
        'account_status', 'date_joined', 'last_login'
    )
    list_filter = (
        'role', 'is_active', 'is_email_verified', 
        'two_factor_enabled', 'date_joined'
    )
    search_fields = ('email', 'phone_number', 'national_id')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        ('Personal Info', {
            'fields': ('phone_number', 'national_id')
        }),
        ('Permissions', {
            'fields': (
                'role', 'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions'
            )
        }),
        ('Email Verification', {
            'fields': ('is_email_verified', 'email_verified')
        }),
        ('Security', {
            'fields': (
                'two_factor_enabled', 'failed_login_attempts',
                'account_locked_until', 'password_changed_at',
                'last_password_reset'
            )
        }),
        ('Service Integration', {
            'fields': ('profile_service_id',)
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'password1', 'password2', 'role',
                'is_active', 'is_staff'
            ),
        }),
    )
    
    readonly_fields = (
        'date_joined', 'last_login', 'password_changed_at',
        'last_password_reset'
    )
    
    def account_status(self, obj):
        """Display account status with color coding."""
        if obj.is_account_locked():
            return format_html(
                '<span style="color: red;">🔒 Locked until {}</span>',
                obj.account_locked_until.strftime('%Y-%m-%d %H:%M') if obj.account_locked_until else 'Unknown'
            )
        elif not obj.is_active:
            return format_html('<span style="color: orange;">⚠️ Inactive</span>')
        elif not obj.is_email_verified:
            return format_html('<span style="color: blue;">📧 Unverified</span>')
        else:
            return format_html('<span style="color: green;">✅ Active</span>')
    
    account_status.short_description = 'Status'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related()
    
    actions = ['unlock_accounts', 'verify_emails', 'deactivate_users']
    
    def unlock_accounts(self, request, queryset):
        """Unlock selected user accounts."""
        count = 0
        for user in queryset:
            if user.is_account_locked():
                user.unlock_account()
                count += 1
        self.message_user(request, f'Unlocked {count} accounts.')
    unlock_accounts.short_description = 'Unlock selected accounts'
    
    def verify_emails(self, request, queryset):
        """Verify emails for selected users."""
        count = queryset.filter(is_email_verified=False).update(
            is_email_verified=True,
            email_verified=True
        )
        self.message_user(request, f'Verified {count} email addresses.')
    verify_emails.short_description = 'Verify selected email addresses'
    
    def deactivate_users(self, request, queryset):
        """Deactivate selected users."""
        count = queryset.filter(is_active=True).update(is_active=False)
        self.message_user(request, f'Deactivated {count} users.')
    deactivate_users.short_description = 'Deactivate selected users'


@admin.register(EmailOTP)
class EmailOTPAdmin(admin.ModelAdmin):
    """Email OTP admin."""
    
    list_display = (
        'email', 'purpose', 'code', 'is_used', 
        'attempts', 'created_at', 'status'
    )
    list_filter = ('purpose', 'is_used', 'created_at')
    search_fields = ('email', 'code')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'used_at')
    
    def status(self, obj):
        """Display OTP status."""
        if obj.is_used:
            return format_html('<span style="color: gray;">✅ Used</span>')
        elif obj.is_expired():
            return format_html('<span style="color: red;">⏰ Expired</span>')
        elif obj.attempts >= 3:
            return format_html('<span style="color: orange;">🚫 Max attempts</span>')
        else:
            return format_html('<span style="color: green;">🟢 Valid</span>')
    
    status.short_description = 'Status'
    
    def get_queryset(self, request):
        return super().get_queryset(request)


@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    """Invite admin."""
    
    list_display = (
        'email', 'role', 'invited_by', 'is_used', 
        'created_at', 'expires_at', 'status'
    )
    list_filter = ('role', 'is_used', 'created_at')
    search_fields = ('email', 'invited_by__email')
    ordering = ('-created_at',)
    readonly_fields = ('token', 'created_at', 'used_at')
    
    def status(self, obj):
        """Display invite status."""
        if obj.is_used:
            return format_html('<span style="color: green;">✅ Used</span>')
        elif obj.is_expired():
            return format_html('<span style="color: red;">⏰ Expired</span>')
        else:
            return format_html('<span style="color: blue;">📧 Pending</span>')
    
    status.short_description = 'Status'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('invited_by')


@admin.register(RefreshToken)
class RefreshTokenAdmin(admin.ModelAdmin):
    """Refresh Token admin."""
    
    list_display = (
        'user', 'device_id', 'ip_address', 'is_blacklisted',
        'created_at', 'expires_at', 'status'
    )
    list_filter = ('is_blacklisted', 'created_at')
    search_fields = ('user__email', 'ip_address', 'device_id')
    ordering = ('-created_at',)
    readonly_fields = ('token', 'created_at')
    
    def status(self, obj):
        """Display token status."""
        if obj.is_blacklisted:
            return format_html('<span style="color: red;">🚫 Blacklisted</span>')
        elif obj.is_expired():
            return format_html('<span style="color: orange;">⏰ Expired</span>')
        else:
            return format_html('<span style="color: green;">✅ Valid</span>')
    
    status.short_description = 'Status'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    actions = ['blacklist_tokens']
    
    def blacklist_tokens(self, request, queryset):
        """Blacklist selected tokens."""
        count = queryset.filter(is_blacklisted=False).update(is_blacklisted=True)
        self.message_user(request, f'Blacklisted {count} tokens.')
    blacklist_tokens.short_description = 'Blacklist selected tokens'


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """Password Reset Token admin."""
    
    list_display = (
        'user', 'is_used', 'ip_address', 
        'created_at', 'expires_at', 'status'
    )
    list_filter = ('is_used', 'created_at')
    search_fields = ('user__email', 'ip_address')
    ordering = ('-created_at',)
    readonly_fields = ('token', 'created_at', 'used_at')
    
    def status(self, obj):
        """Display token status."""
        if obj.is_used:
            return format_html('<span style="color: green;">✅ Used</span>')
        elif obj.is_expired():
            return format_html('<span style="color: red;">⏰ Expired</span>')
        else:
            return format_html('<span style="color: blue;">🔗 Valid</span>')
    
    status.short_description = 'Status'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


# Custom admin site configuration
admin.site.site_header = 'Edulink Authentication Service'
admin.site.site_title = 'Auth Service Admin'
admin.site.index_title = 'Authentication & User Management'