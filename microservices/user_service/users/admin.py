from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import User, UserSession, UserActivity, UserPreference


class CustomUserCreationForm(UserCreationForm):
    """
    Custom user creation form for admin.
    """
    class Meta:
        model = User
        fields = ('email', 'username', 'first_name', 'last_name')


class CustomUserChangeForm(UserChangeForm):
    """
    Custom user change form for admin.
    """
    class Meta:
        model = User
        fields = '__all__'


class UserSessionInline(admin.TabularInline):
    """
    Inline admin for user sessions.
    """
    model = UserSession
    extra = 0
    readonly_fields = (
        'session_key', 'ip_address', 'user_agent', 'device_type',
        'location', 'created_at', 'last_activity', 'expires_at'
    )
    fields = (
        'session_key', 'ip_address', 'device_type', 'is_active',
        'created_at', 'last_activity', 'expires_at'
    )
    
    def has_add_permission(self, request, obj=None):
        return False


class UserActivityInline(admin.TabularInline):
    """
    Inline admin for user activities.
    """
    model = UserActivity
    extra = 0
    readonly_fields = (
        'action', 'description', 'ip_address', 'user_agent',
        'metadata', 'created_at'
    )
    fields = ('action', 'description', 'ip_address', 'created_at')
    ordering = ['-created_at']
    
    def has_add_permission(self, request, obj=None):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


class UserPreferenceInline(admin.StackedInline):
    """
    Inline admin for user preferences.
    """
    model = UserPreference
    extra = 0
    fields = (
        ('email_frequency', 'preferred_contact_method'),
        ('show_email', 'show_phone', 'allow_search'),
        ('theme', 'items_per_page'),
        'settings'
    )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom user admin.
    """
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    
    list_display = (
        'email', 'username', 'full_name', 'is_active', 'is_verified',
        'is_staff', 'date_joined', 'last_login', 'failed_login_attempts'
    )
    list_filter = (
        'is_active', 'is_verified', 'is_staff', 'is_superuser',
        'two_factor_enabled', 'date_joined', 'last_login'
    )
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    filter_horizontal = ('groups', 'user_permissions')
    
    fieldsets = (
        (None, {
            'fields': ('email', 'username', 'password')
        }),
        ('Personal Info', {
            'fields': (
                ('first_name', 'last_name'),
                'phone_number',
                'avatar',
                'bio'
            )
        }),
        ('Permissions', {
            'fields': (
                ('is_active', 'is_verified', 'is_staff', 'is_superuser'),
                'groups',
                'user_permissions'
            )
        }),
        ('Preferences', {
            'fields': (
                ('language', 'timezone'),
                'profile_visibility',
                ('email_notifications', 'sms_notifications', 'push_notifications')
            )
        }),
        ('Security', {
            'fields': (
                'two_factor_enabled',
                ('failed_login_attempts', 'account_locked_until'),
                'password_changed_at'
            )
        }),
        ('Important Dates', {
            'fields': (
                'date_joined',
                'last_login',
                'email_verified_at',
                'deleted_at'
            )
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        })
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'username', 'first_name', 'last_name',
                'password1', 'password2'
            )
        }),
    )
    
    readonly_fields = (
        'date_joined', 'last_login', 'email_verified_at',
        'password_changed_at', 'deleted_at'
    )
    
    inlines = [UserPreferenceInline, UserSessionInline, UserActivityInline]
    
    def full_name(self, obj):
        """
        Display full name.
        """
        return obj.get_full_name()
    full_name.short_description = 'Full Name'
    
    def get_queryset(self, request):
        """
        Optimize queryset with select_related.
        """
        return super().get_queryset(request).select_related()
    
    def save_model(self, request, obj, form, change):
        """
        Custom save logic.
        """
        if not change:  # Creating new user
            obj.set_password(form.cleaned_data.get('password1', ''))
        super().save_model(request, obj, form, change)
    
    actions = [
        'activate_users', 'deactivate_users', 'verify_users',
        'unverify_users', 'reset_failed_logins'
    ]
    
    def activate_users(self, request, queryset):
        """
        Activate selected users.
        """
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'{updated} users were successfully activated.'
        )
    activate_users.short_description = 'Activate selected users'
    
    def deactivate_users(self, request, queryset):
        """
        Deactivate selected users.
        """
        # Exclude superusers
        queryset = queryset.exclude(is_superuser=True)
        updated = queryset.update(is_active=False)
        
        # Terminate sessions for deactivated users
        UserSession.objects.filter(user__in=queryset).update(is_active=False)
        
        self.message_user(
            request,
            f'{updated} users were successfully deactivated.'
        )
    deactivate_users.short_description = 'Deactivate selected users'
    
    def verify_users(self, request, queryset):
        """
        Verify selected users.
        """
        updated = queryset.update(
            is_verified=True,
            email_verified_at=timezone.now()
        )
        self.message_user(
            request,
            f'{updated} users were successfully verified.'
        )
    verify_users.short_description = 'Verify selected users'
    
    def unverify_users(self, request, queryset):
        """
        Unverify selected users.
        """
        updated = queryset.update(
            is_verified=False,
            email_verified_at=None
        )
        self.message_user(
            request,
            f'{updated} users were successfully unverified.'
        )
    unverify_users.short_description = 'Unverify selected users'
    
    def reset_failed_logins(self, request, queryset):
        """
        Reset failed login attempts.
        """
        updated = queryset.update(
            failed_login_attempts=0,
            account_locked_until=None
        )
        self.message_user(
            request,
            f'Failed login attempts reset for {updated} users.'
        )
    reset_failed_logins.short_description = 'Reset failed login attempts'


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    """
    User session admin.
    """
    list_display = (
        'user', 'session_key_short', 'ip_address', 'device_type',
        'is_active', 'created_at', 'last_activity', 'is_expired'
    )
    list_filter = (
        'is_active', 'device_type', 'created_at', 'last_activity'
    )
    search_fields = ('user__email', 'user__username', 'ip_address', 'session_key')
    ordering = ('-last_activity',)
    readonly_fields = (
        'session_key', 'ip_address', 'user_agent', 'device_type',
        'location', 'created_at', 'last_activity', 'expires_at'
    )
    
    def session_key_short(self, obj):
        """
        Display shortened session key.
        """
        return f"{obj.session_key[:8]}..." if obj.session_key else ''
    session_key_short.short_description = 'Session Key'
    
    def is_expired(self, obj):
        """
        Check if session is expired.
        """
        return obj.is_expired()
    is_expired.boolean = True
    is_expired.short_description = 'Expired'
    
    def get_queryset(self, request):
        """
        Optimize queryset.
        """
        return super().get_queryset(request).select_related('user')
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    actions = ['terminate_sessions']
    
    def terminate_sessions(self, request, queryset):
        """
        Terminate selected sessions.
        """
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'{updated} sessions were successfully terminated.'
        )
    terminate_sessions.short_description = 'Terminate selected sessions'


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    """
    User activity admin.
    """
    list_display = (
        'user', 'action', 'description_short', 'ip_address',
        'created_at'
    )
    list_filter = ('action', 'created_at')
    search_fields = ('user__email', 'user__username', 'action', 'description')
    ordering = ('-created_at',)
    readonly_fields = (
        'user', 'action', 'description', 'ip_address',
        'user_agent', 'metadata', 'created_at'
    )
    
    def description_short(self, obj):
        """
        Display shortened description.
        """
        return (obj.description[:50] + '...') if len(obj.description) > 50 else obj.description
    description_short.short_description = 'Description'
    
    def get_queryset(self, request):
        """
        Optimize queryset.
        """
        return super().get_queryset(request).select_related('user')
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    """
    User preference admin.
    """
    list_display = (
        'user', 'email_frequency', 'theme', 'preferred_contact_method',
        'items_per_page'
    )
    list_filter = (
        'email_frequency', 'theme', 'preferred_contact_method',
        'show_email', 'show_phone', 'allow_search'
    )
    search_fields = ('user__email', 'user__username')
    
    fieldsets = (
        ('Notification Preferences', {
            'fields': (
                'email_frequency',
                'preferred_contact_method'
            )
        }),
        ('Privacy Settings', {
            'fields': (
                ('show_email', 'show_phone'),
                'allow_search'
            )
        }),
        ('UI Preferences', {
            'fields': (
                'theme',
                'items_per_page'
            )
        }),
        ('Custom Settings', {
            'fields': ('settings',),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        """
        Optimize queryset.
        """
        return super().get_queryset(request).select_related('user')


# Customize admin site
admin.site.site_header = 'Edulink User Service Administration'
admin.site.site_title = 'User Service Admin'
admin.site.index_title = 'Welcome to User Service Administration'