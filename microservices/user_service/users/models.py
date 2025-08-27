from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.core.validators import EmailValidator
from utils.validators import validate_phone_number
from utils.helpers import generate_file_path
from shared.models import BaseModel


class UserManager(models.Manager):
    """
    Custom user manager.
    """
    
    def create_user(self, email, password=None, **extra_fields):
        """
        Create and return a regular user with an email and password.
        """
        if not email:
            raise ValueError('The Email field must be set')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and return a superuser with an email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class UserProfile(BaseModel):
    """
    User profile model for managing user data (separated from authentication).
    """
    
    # Reference to Auth Service
    auth_user_id = models.UUIDField(unique=True, db_index=True, help_text='Reference to AuthUser in auth service')
    
    # Basic Information
    email = models.EmailField(
        unique=True,
        validators=[EmailValidator()],
        help_text='User email address (synchronized from auth service)'
    )
    username = models.CharField(
        max_length=150,
        unique=True,
        null=True,
        blank=True,
        help_text='Optional username'
    )
    first_name = models.CharField(max_length=150, help_text='User first name')
    last_name = models.CharField(max_length=150, help_text='User last name')
    
    # Contact Information
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        validators=[validate_phone_number],
        help_text='User phone number'
    )
    national_id = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text='National identification number'
    )
    
    # Status Fields (synchronized from auth service)
    is_active = models.BooleanField(
        default=True,
        help_text='Designates whether this user should be treated as active (synced from auth).'
    )
    is_verified = models.BooleanField(
        default=False,
        help_text='Designates whether the user has verified their email address (synced from auth).'
    )
    role = models.CharField(
        max_length=30,
        help_text='User role (synchronized from auth service)'
    )
    
    # Timestamps
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    
    # Profile Information
    avatar = models.ImageField(
        upload_to=lambda instance, filename: generate_file_path(instance, filename, 'avatars'),
        null=True,
        blank=True,
        help_text='User profile picture'
    )
    bio = models.TextField(
        max_length=500,
        blank=True,
        help_text='Short bio or description'
    )
    
    # Preferences
    language = models.CharField(
        max_length=10,
        default='en',
        choices=[
            ('en', 'English'),
            ('es', 'Spanish'),
            ('fr', 'French'),
            ('de', 'German'),
            ('ar', 'Arabic'),
        ],
        help_text='Preferred language'
    )
    timezone = models.CharField(
        max_length=50,
        default='UTC',
        help_text='User timezone'
    )
    
    # Privacy Settings
    profile_visibility = models.CharField(
        max_length=20,
        default='PUBLIC',
        choices=[
            ('PUBLIC', 'Public'),
            ('INSTITUTION', 'Institution Only'),
            ('PRIVATE', 'Private'),
        ],
        help_text='Profile visibility setting'
    )
    
    # Notification Preferences
    email_notifications = models.BooleanField(
        default=True,
        help_text='Receive email notifications'
    )
    sms_notifications = models.BooleanField(
        default=False,
        help_text='Receive SMS notifications'
    )
    push_notifications = models.BooleanField(
        default=True,
        help_text='Receive push notifications'
    )
    
    # Security (read-only, for display purposes only)
    two_factor_enabled = models.BooleanField(
        default=False,
        help_text='Two-factor authentication enabled (synced from auth service)'
    )
    
    # Metadata
    last_ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    objects = models.Manager()
    
    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
        indexes = [
            models.Index(fields=['auth_user_id']),
            models.Index(fields=['email']),
            models.Index(fields=['username']),
            models.Index(fields=['is_active', 'is_verified']),
            models.Index(fields=['date_joined']),
            models.Index(fields=['role']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """
        Return the first_name plus the last_name, with a space in between.
        """
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        """
        Return the short name for the user.
        """
        return self.first_name
    
    def get_initials(self):
        """
        Return user initials.
        """
        return f"{self.first_name[0] if self.first_name else ''}{self.last_name[0] if self.last_name else ''}".upper()


# Keep the old User model temporarily for migration purposes
class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """
    Deprecated: Use UserProfile instead. Kept for migration compatibility.
    Legacy user model that will be phased out.
    """
    
    # Basic Information
    email = models.EmailField(
        unique=True,
        validators=[EmailValidator()],
        help_text='User email address (used for login)'
    )
    username = models.CharField(
        max_length=150,
        unique=True,
        null=True,
        blank=True,
        help_text='Optional username'
    )
    first_name = models.CharField(max_length=150, help_text='User first name')
    last_name = models.CharField(max_length=150, help_text='User last name')
    
    # Contact Information
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        validators=[validate_phone_number],
        help_text='User phone number'
    )
    
    # Status Fields
    is_active = models.BooleanField(
        default=True,
        help_text='Designates whether this user should be treated as active.'
    )
    is_staff = models.BooleanField(
        default=False,
        help_text='Designates whether the user can log into the admin site.'
    )
    is_verified = models.BooleanField(
        default=False,
        help_text='Designates whether the user has verified their email address.'
    )
    
    # Timestamps
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    
    # Security
    two_factor_enabled = models.BooleanField(
        default=False,
        help_text='Two-factor authentication enabled'
    )
    password_changed_at = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        db_table = 'users_legacy'
        verbose_name = 'User (Legacy)'
        verbose_name_plural = 'Users (Legacy)'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['username']),
            models.Index(fields=['is_active', 'is_verified']),
            models.Index(fields=['date_joined']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """
        Return the first_name plus the last_name, with a space in between.
        """
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        """
        Return the short name for the user.
        """
        return self.first_name
    
    def verify_email(self):
        """
        Mark email as verified.
        """
        self.is_verified = True
        self.email_verified_at = timezone.now()
        self.save(update_fields=['is_verified', 'email_verified_at'])
    
    def lock_account(self, duration_minutes=30):
        """
        Lock user account for specified duration.
        """
        self.account_locked_until = timezone.now() + timezone.timedelta(minutes=duration_minutes)
        self.save(update_fields=['account_locked_until'])
    
    def unlock_account(self):
        """
        Unlock user account.
        """
        self.account_locked_until = None
        self.failed_login_attempts = 0
        self.save(update_fields=['account_locked_until', 'failed_login_attempts'])
    
    def is_account_locked(self):
        """
        Check if account is currently locked.
        """
        if self.account_locked_until:
            return timezone.now() < self.account_locked_until
        return False
    
    def increment_failed_login(self):
        """
        Increment failed login attempts.
        """
        self.failed_login_attempts += 1
        
        # Lock account after 5 failed attempts
        if self.failed_login_attempts >= 5:
            self.lock_account()
        
        self.save(update_fields=['failed_login_attempts'])
    
    def reset_failed_login(self):
        """
        Reset failed login attempts.
        """
        self.failed_login_attempts = 0
        self.save(update_fields=['failed_login_attempts'])
    
    def has_role(self, role_name):
        """
        Check if user has a specific role.
        """
        if not hasattr(self, 'roles'):
            return False
        
        return self.roles.filter(
            role=role_name,
            is_active=True
        ).exists()
    
    def get_active_roles(self):
        """
        Get all active roles for the user.
        """
        if not hasattr(self, 'roles'):
            return []
        
        return list(self.roles.filter(is_active=True).values_list('role', flat=True))
    
    def get_permissions(self):
        """
        Get all permissions for the user based on their roles.
        """
        if not hasattr(self, 'roles'):
            return []
        
        permissions = []
        for role in self.roles.filter(is_active=True):
            role_permissions = role.permissions.filter(is_active=True).values_list('name', flat=True)
            permissions.extend(role_permissions)
        
        return list(set(permissions))  # Remove duplicates
    
    def has_permission(self, permission_name):
        """
        Check if user has a specific permission.
        """
        return permission_name in self.get_permissions()
    
    def get_institution_ids(self):
        """
        Get institution IDs where user has admin role.
        """
        if not hasattr(self, 'roles'):
            return []
        
        institution_roles = self.roles.filter(
            role='INSTITUTION_ADMIN',
            is_active=True
        )
        
        return [role.organization_id for role in institution_roles if role.organization_id]
    
    def can_manage_institution(self, institution_id):
        """
        Check if user can manage a specific institution.
        """
        if self.is_superuser:
            return True
        
        return institution_id in self.get_institution_ids()
    
    def update_last_login_info(self, ip_address=None, user_agent=None):
        """
        Update last login information.
        """
        self.last_login = timezone.now()
        if ip_address:
            self.last_ip_address = ip_address
        if user_agent:
            self.user_agent = user_agent
        
        self.save(update_fields=['last_login', 'last_ip_address', 'user_agent'])
    
    def soft_delete(self):
        """
        Soft delete user by deactivating account.
        """
        self.is_active = False
        self.email = f"deleted_{self.id}@deleted.com"
        self.save(update_fields=['is_active', 'email'])
    
    @property
    def is_student(self):
        """
        Check if user is a student.
        """
        return self.has_role('STUDENT')
    
    @property
    def is_employer(self):
        """
        Check if user is an employer.
        """
        return self.has_role('EMPLOYER')
    
    @property
    def is_institution_admin(self):
        """
        Check if user is an institution admin.
        """
        return self.has_role('INSTITUTION_ADMIN')
    
    @property
    def is_system_admin(self):
        """
        Check if user is a system admin.
        """
        return self.has_role('SUPER_ADMIN') or self.is_superuser


class UserSession(BaseModel):
    """
    Model to track user sessions.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    device_type = models.CharField(
        max_length=20,
        choices=[
            ('DESKTOP', 'Desktop'),
            ('MOBILE', 'Mobile'),
            ('TABLET', 'Tablet'),
            ('UNKNOWN', 'Unknown'),
        ],
        default='UNKNOWN'
    )
    location = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField()
    last_activity = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_sessions'
        verbose_name = 'User Session'
        verbose_name_plural = 'User Sessions'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.device_type} ({self.ip_address})"
    
    def is_expired(self):
        """
        Check if session is expired.
        """
        return timezone.now() > self.expires_at
    
    def extend_session(self, hours=24):
        """
        Extend session expiration.
        """
        self.expires_at = timezone.now() + timezone.timedelta(hours=hours)
        self.save(update_fields=['expires_at'])
    
    def terminate(self):
        """
        Terminate session.
        """
        self.is_active = False
        self.save(update_fields=['is_active'])


class UserActivity(BaseModel):
    """
    Model to track user activities.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    action = models.CharField(
        max_length=50,
        choices=[
            ('LOGIN', 'Login'),
            ('LOGOUT', 'Logout'),
            ('PROFILE_UPDATE', 'Profile Update'),
            ('PASSWORD_CHANGE', 'Password Change'),
            ('EMAIL_CHANGE', 'Email Change'),
            ('ROLE_ASSIGNED', 'Role Assigned'),
            ('ROLE_REVOKED', 'Role Revoked'),
            ('ACCOUNT_LOCKED', 'Account Locked'),
            ('ACCOUNT_UNLOCKED', 'Account Unlocked'),
            ('EMAIL_VERIFIED', 'Email Verified'),
            ('TWO_FACTOR_ENABLED', 'Two Factor Enabled'),
            ('TWO_FACTOR_DISABLED', 'Two Factor Disabled'),
            ('DATA_EXPORT', 'Data Export'),
            ('ACCOUNT_DELETED', 'Account Deleted'),
        ]
    )
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'user_activities'
        verbose_name = 'User Activity'
        verbose_name_plural = 'User Activities'
        indexes = [
            models.Index(fields=['user', 'action']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.action} at {self.created_at}"


class UserPreference(BaseModel):
    """
    Model to store user preferences and settings.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='preferences'
    )
    
    # Notification Preferences
    email_frequency = models.CharField(
        max_length=20,
        default='IMMEDIATE',
        choices=[
            ('IMMEDIATE', 'Immediate'),
            ('DAILY', 'Daily Digest'),
            ('WEEKLY', 'Weekly Digest'),
            ('NEVER', 'Never'),
        ]
    )
    
    # Privacy Preferences
    show_email = models.BooleanField(default=False)
    show_phone = models.BooleanField(default=False)
    allow_search = models.BooleanField(default=True)
    
    # UI Preferences
    theme = models.CharField(
        max_length=10,
        default='LIGHT',
        choices=[
            ('LIGHT', 'Light'),
            ('DARK', 'Dark'),
            ('AUTO', 'Auto'),
        ]
    )
    items_per_page = models.PositiveIntegerField(default=20)
    
    # Communication Preferences
    preferred_contact_method = models.CharField(
        max_length=10,
        default='EMAIL',
        choices=[
            ('EMAIL', 'Email'),
            ('SMS', 'SMS'),
            ('PHONE', 'Phone'),
        ]
    )
    
    # Additional Settings
    settings = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'user_preferences'
        verbose_name = 'User Preference'
        verbose_name_plural = 'User Preferences'
    
    def __str__(self):
        return f"{self.user.email} - Preferences"
    
    def get_setting(self, key, default=None):
        """
        Get a specific setting value.
        """
        return self.settings.get(key, default)
    
    def set_setting(self, key, value):
        """
        Set a specific setting value.
        """
        self.settings[key] = value
        self.save(update_fields=['settings'])
    
    def update_settings(self, settings_dict):
        """
        Update multiple settings at once.
        """
        self.settings.update(settings_dict)
        self.save(update_fields=['settings'])