import uuid
from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager,
)
from django.db import models
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from typing import Optional


class RoleChoices:
    STUDENT = 'student'
    INSTITUTION_ADMIN = 'institution_admin'
    EMPLOYER = 'employer'
    SUPER_ADMIN = 'super_admin'

    CHOICES = [
        (STUDENT, 'Student'),
        (INSTITUTION_ADMIN, 'Institution Admin'),
        (EMPLOYER, 'Employer'),
        (SUPER_ADMIN, 'Super Admin'),
    ]


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        extra_fields.setdefault("role", RoleChoices.STUDENT)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", RoleChoices.SUPER_ADMIN)
        if extra_fields.get("role") != RoleChoices.SUPER_ADMIN:
            raise ValueError("Superuser must have role of SUPER_ADMIN.")
        return self.create_user(email, password, **extra_fields)


class AuthUser(AbstractBaseUser, PermissionsMixin):
    """Authentication-only user model for auth service."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Email verification
    is_email_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)

    # Role-based access (minimal)
    role = models.CharField(
        max_length=30,
        choices=RoleChoices.CHOICES,
        default=RoleChoices.STUDENT,
    )

    # Security fields
    failed_login_attempts = models.PositiveIntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(default=timezone.now)
    last_password_reset = models.DateTimeField(null=True, blank=True)
    
    # Two-factor authentication
    two_factor_enabled = models.BooleanField(default=False)
    backup_tokens = models.JSONField(default=list, blank=True)
    
    # Reference to User Service Profile
    user_profile_id = models.UUIDField(null=True, blank=True, help_text="ID in User Service")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'auth_user'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['is_active']),
            models.Index(fields=['user_profile_id']),
            models.Index(fields=['created_at']),
            models.Index(fields=['updated_at']),
        ]

    def __str__(self):
        return self.email


# Keep the old User model temporarily for migration purposes
class User(AuthUser):
    """Deprecated: Use AuthUser instead. Kept for migration compatibility."""
    
    # Legacy fields that will be moved to User Service
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    national_id = models.CharField(max_length=20, blank=True, null=True)
    email_verified = models.BooleanField(default=False)  # Duplicate of is_email_verified
    profile_service_id = models.UUIDField(null=True, blank=True)  # Renamed to user_profile_id
    
    class Meta:
        db_table = 'auth_user_legacy'
        indexes = [
            models.Index(fields=['profile_service_id']),
        ]

    def is_account_locked(self):
        """Check if account is currently locked."""
        if self.account_locked_until:
            return timezone.now() < self.account_locked_until
        return False

    def lock_account(self, duration_minutes=30):
        """Lock the account for specified duration."""
        self.account_locked_until = timezone.now() + timedelta(minutes=duration_minutes)
        self.save(update_fields=['account_locked_until'])

    def unlock_account(self):
        """Unlock the account and reset failed attempts."""
        self.account_locked_until = None
        self.failed_login_attempts = 0
        self.save(update_fields=['account_locked_until', 'failed_login_attempts'])

    def increment_failed_login(self):
        """Increment failed login attempts and lock if threshold reached."""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:  # Configurable threshold
            self.lock_account()
        self.save(update_fields=['failed_login_attempts'])

    def reset_failed_login(self):
        """Reset failed login attempts on successful login."""
        self.failed_login_attempts = 0
        self.save(update_fields=['failed_login_attempts'])


class EmailOTP(models.Model):
    """Model for email-based OTP verification."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    code = models.CharField(max_length=6)
    purpose = models.CharField(
        max_length=50,
        choices=[
            ('login', 'Login Verification'),
            ('password_reset', 'Password Reset'),
            ('email_verification', 'Email Verification'),
            ('two_factor', 'Two Factor Authentication'),
        ],
        default='login'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    is_used = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'auth_email_otp'
        indexes = [
            models.Index(fields=['email', 'purpose']),
            models.Index(fields=['code']),
            models.Index(fields=['created_at']),
        ]

    def is_expired(self):
        """Check if OTP is expired (5 minutes)."""
        return timezone.now() > self.created_at + timedelta(minutes=5)

    def is_valid(self):
        """Check if OTP is valid (not used, not expired, attempts < 3)."""
        return not self.is_used and not self.is_expired() and self.attempts < 3

    def use(self):
        """Mark OTP as used."""
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=['is_used', 'used_at'])

    def increment_attempts(self):
        """Increment verification attempts."""
        self.attempts += 1
        self.save(update_fields=['attempts'])


class Invite(models.Model):
    """Model for user invitations."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=30, choices=RoleChoices.CHOICES)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    is_used = models.BooleanField(default=False)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_invites",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    
    # Additional context for invitation
    institution_id = models.UUIDField(null=True, blank=True, help_text="Institution ID from User Service")
    employer_id = models.UUIDField(null=True, blank=True, help_text="Employer ID from User Service")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'auth_invite'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['token']),
            models.Index(fields=['is_used']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.email} - {self.role} ({'Used' if self.is_used else 'Unused'})"

    def is_expired(self):
        """Check if invitation is expired."""
        return timezone.now() > self.expires_at

    def is_valid(self):
        """Check if invitation is valid (not used, not expired)."""
        return not self.is_used and not self.is_expired()

    def use(self):
        """Mark invitation as used."""
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=['is_used', 'used_at'])

    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Default expiration: 7 days from creation
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)


class RefreshToken(models.Model):
    """Model to track JWT refresh tokens for better security."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='refresh_tokens'
    )
    token = models.TextField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_blacklisted = models.BooleanField(default=False)
    
    # Device/session tracking
    device_id = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    class Meta:
        db_table = 'auth_refresh_token'
        indexes = [
            models.Index(fields=['user', 'is_blacklisted']),
            models.Index(fields=['token']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['device_id']),
        ]

    def is_expired(self):
        """Check if token is expired."""
        return timezone.now() > self.expires_at

    def is_valid(self):
        """Check if token is valid (not blacklisted, not expired)."""
        return not self.is_blacklisted and not self.is_expired()

    def blacklist(self):
        """Blacklist the token."""
        self.is_blacklisted = True
        self.save(update_fields=['is_blacklisted'])


class PasswordResetToken(models.Model):
    """Model for password reset tokens."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens'
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    
    class Meta:
        db_table = 'auth_password_reset_token'
        indexes = [
            models.Index(fields=['user', 'is_used']),
            models.Index(fields=['token']),
            models.Index(fields=['expires_at']),
        ]

    def is_expired(self):
        """Check if token is expired (1 hour)."""
        return timezone.now() > self.expires_at

    def is_valid(self):
        """Check if token is valid (not used, not expired)."""
        return not self.is_used and not self.is_expired()

    def use(self):
        """Mark token as used."""
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=['is_used', 'used_at'])

    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Default expiration: 1 hour from creation
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)