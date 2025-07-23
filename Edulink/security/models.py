import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.timezone import now
from django.contrib.auth.models import AbstractUser
from django.core.validators import validate_ipv4_address, validate_ipv6_address
from django.core.exceptions import ValidationError
from authentication.models import User


def validate_ip_address(value):
    """Validate both IPv4 and IPv6 addresses."""
    try:
        validate_ipv4_address(value)
    except ValidationError:
        try:
            validate_ipv6_address(value)
        except ValidationError:
            raise ValidationError('Enter a valid IPv4 or IPv6 address.')


class SecurityEvent(models.Model):
    """Model to track security-related events."""
    
    EVENT_TYPES = [
        ('login_success', 'Successful Login'),
        ('login_failed', 'Failed Login'),
        ('logout', 'Logout'),
        ('password_change', 'Password Change'),
        ('password_reset', 'Password Reset'),
        ('account_locked', 'Account Locked'),
        ('suspicious_activity', 'Suspicious Activity'),
        ('data_access', 'Data Access'),
        ('permission_denied', 'Permission Denied'),
        ('rate_limit_exceeded', 'Rate Limit Exceeded'),
        ('csrf_attack', 'CSRF Attack Attempt'),
        ('sql_injection', 'SQL Injection Attempt'),
        ('xss_attempt', 'XSS Attack Attempt'),
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='security_events'
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='low')
    ip_address = models.GenericIPAddressField(validators=[validate_ip_address])
    user_agent = models.TextField(blank=True)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_security_events'
    )
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['severity', 'resolved']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.user or 'Anonymous'} - {self.timestamp}"


class UserSession(models.Model):
    """Model to track active user sessions."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='active_sessions'
    )
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField(validators=[validate_ip_address])
    user_agent = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    last_activity = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    logout_reason = models.CharField(
        max_length=50,
        choices=[
            ('manual', 'Manual Logout'),
            ('timeout', 'Session Timeout'),
            ('forced', 'Forced Logout'),
            ('security', 'Security Logout'),
        ],
        null=True,
        blank=True
    )
    
    class Meta:
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
            models.Index(fields=['last_activity']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.ip_address} - {self.created_at}"


class FailedLoginAttempt(models.Model):
    """Model to track failed login attempts for rate limiting."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    ip_address = models.GenericIPAddressField(validators=[validate_ip_address])
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    reason = models.CharField(
        max_length=50,
        choices=[
            ('invalid_credentials', 'Invalid Credentials'),
            ('account_locked', 'Account Locked'),
            ('account_disabled', 'Account Disabled'),
            ('rate_limited', 'Rate Limited'),
        ],
        default='invalid_credentials'
    )
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['email', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.email} - {self.ip_address} - {self.timestamp}"


class SecurityConfiguration(models.Model):
    """Model to store security configuration settings."""
    
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        ordering = ['key']
    
    def __str__(self):
        return f"{self.key}: {self.value[:50]}..."


class AuditLog(models.Model):
    """Model for comprehensive audit logging."""
    
    ACTION_TYPES = [
        ('create', 'Create'),
        ('read', 'Read'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('permission_change', 'Permission Change'),
        ('config_change', 'Configuration Change'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=50, choices=ACTION_TYPES)
    resource_type = models.CharField(max_length=100)  # Model name or resource type
    resource_id = models.CharField(max_length=100, blank=True)  # ID of the affected resource
    description = models.TextField()
    ip_address = models.GenericIPAddressField(validators=[validate_ip_address])
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    changes = models.JSONField(default=dict, blank=True)  # Store before/after values
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['resource_type', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.action} {self.resource_type} by {self.user or 'Anonymous'} at {self.timestamp}"


class LoginHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=now)

    class Meta:
        verbose_name_plural = "Login Histories"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.email} - {self.timestamp}"


class SecurityLog(models.Model):
    ACTION_CHOICES = [
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('REGISTER', 'Register'),
        ('PASSWORD_CHANGE', 'Password Change'),
        ('PASSWORD_RESET', 'Password Reset'),
        ('2FA_VERIFY', '2FA Verification'),
        ('FAILED_LOGIN', 'Failed Login'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.TextField()
    timestamp = models.DateTimeField(default=now)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.email} - {self.action} - {self.timestamp}"
