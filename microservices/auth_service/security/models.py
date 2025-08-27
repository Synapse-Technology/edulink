import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import validate_ipv4_address, validate_ipv6_address
from django.core.exceptions import ValidationError
from datetime import timedelta
import json


class SecurityEventType:
    """Security event type choices."""
    
    # Authentication events
    LOGIN_SUCCESS = 'login_success'
    LOGIN_FAILED = 'login_failed'
    LOGIN_FAILED_UNKNOWN_USER = 'login_failed_unknown_user'
    LOGOUT = 'logout'
    
    # Account events
    USER_CREATED = 'user_created'
    USER_DELETED = 'user_deleted'
    ACCOUNT_LOCKED = 'account_locked'
    ACCOUNT_UNLOCKED = 'account_unlocked'
    ACCOUNT_ACTIVATED = 'account_activated'
    ACCOUNT_DEACTIVATED = 'account_deactivated'
    
    # Password events
    PASSWORD_CHANGED = 'password_changed'
    PASSWORD_RESET_REQUESTED = 'password_reset_requested'
    PASSWORD_RESET_COMPLETED = 'password_reset_completed'
    
    # Email events
    EMAIL_VERIFIED = 'email_verified'
    EMAIL_VERIFICATION_SENT = 'email_verification_sent'
    
    # Role and permission events
    ROLE_CHANGED = 'role_changed'
    PERMISSION_GRANTED = 'permission_granted'
    PERMISSION_REVOKED = 'permission_revoked'
    
    # Two-factor authentication
    TWO_FACTOR_ENABLED = 'two_factor_enabled'
    TWO_FACTOR_DISABLED = 'two_factor_disabled'
    TWO_FACTOR_VERIFIED = 'two_factor_verified'
    
    # Token events
    REFRESH_TOKEN_CREATED = 'refresh_token_created'
    REFRESH_TOKEN_BLACKLISTED = 'refresh_token_blacklisted'
    TOKEN_VALIDATION_FAILED = 'token_validation_failed'
    
    # Suspicious activities
    MULTIPLE_FAILED_LOGINS = 'multiple_failed_logins'
    UNUSUAL_LOGIN_LOCATION = 'unusual_login_location'
    CONCURRENT_SESSIONS = 'concurrent_sessions'
    BRUTE_FORCE_ATTEMPT = 'brute_force_attempt'
    
    # System events
    SERVICE_ACCESS = 'service_access'
    API_RATE_LIMIT_EXCEEDED = 'api_rate_limit_exceeded'
    UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt'
    
    CHOICES = [
        # Authentication
        (LOGIN_SUCCESS, 'Login Success'),
        (LOGIN_FAILED, 'Login Failed'),
        (LOGIN_FAILED_UNKNOWN_USER, 'Login Failed - Unknown User'),
        (LOGOUT, 'Logout'),
        
        # Account
        (USER_CREATED, 'User Created'),
        (USER_DELETED, 'User Deleted'),
        (ACCOUNT_LOCKED, 'Account Locked'),
        (ACCOUNT_UNLOCKED, 'Account Unlocked'),
        (ACCOUNT_ACTIVATED, 'Account Activated'),
        (ACCOUNT_DEACTIVATED, 'Account Deactivated'),
        
        # Password
        (PASSWORD_CHANGED, 'Password Changed'),
        (PASSWORD_RESET_REQUESTED, 'Password Reset Requested'),
        (PASSWORD_RESET_COMPLETED, 'Password Reset Completed'),
        
        # Email
        (EMAIL_VERIFIED, 'Email Verified'),
        (EMAIL_VERIFICATION_SENT, 'Email Verification Sent'),
        
        # Role
        (ROLE_CHANGED, 'Role Changed'),
        (PERMISSION_GRANTED, 'Permission Granted'),
        (PERMISSION_REVOKED, 'Permission Revoked'),
        
        # Two-factor
        (TWO_FACTOR_ENABLED, 'Two-Factor Enabled'),
        (TWO_FACTOR_DISABLED, 'Two-Factor Disabled'),
        (TWO_FACTOR_VERIFIED, 'Two-Factor Verified'),
        
        # Tokens
        (REFRESH_TOKEN_CREATED, 'Refresh Token Created'),
        (REFRESH_TOKEN_BLACKLISTED, 'Refresh Token Blacklisted'),
        (TOKEN_VALIDATION_FAILED, 'Token Validation Failed'),
        
        # Suspicious
        (MULTIPLE_FAILED_LOGINS, 'Multiple Failed Logins'),
        (UNUSUAL_LOGIN_LOCATION, 'Unusual Login Location'),
        (CONCURRENT_SESSIONS, 'Concurrent Sessions'),
        (BRUTE_FORCE_ATTEMPT, 'Brute Force Attempt'),
        
        # System
        (SERVICE_ACCESS, 'Service Access'),
        (API_RATE_LIMIT_EXCEEDED, 'API Rate Limit Exceeded'),
        (UNAUTHORIZED_ACCESS_ATTEMPT, 'Unauthorized Access Attempt'),
    ]


class SeverityLevel:
    """Security event severity levels."""
    
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'
    
    CHOICES = [
        (LOW, 'Low'),
        (MEDIUM, 'Medium'),
        (HIGH, 'High'),
        (CRITICAL, 'Critical'),
    ]


class SecurityEvent(models.Model):
    """Model for tracking security events."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Event details
    event_type = models.CharField(max_length=50, choices=SecurityEventType.CHOICES)
    severity = models.CharField(max_length=20, choices=SeverityLevel.CHOICES, default=SeverityLevel.MEDIUM)
    description = models.TextField(blank=True)
    
    # User information
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='security_events'
    )
    user_email = models.EmailField(blank=True, help_text="Email for events without user object")
    
    # Network information
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=40, blank=True)
    
    # Geographic information
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('open', 'Open'),
            ('investigating', 'Investigating'),
            ('resolved', 'Resolved'),
            ('false_positive', 'False Positive'),
        ],
        default='open'
    )
    
    # Additional data
    metadata = models.JSONField(default=dict, blank=True)
    
    # Risk assessment
    risk_score = models.IntegerField(default=0, help_text="Risk score from 0-100")
    
    # Resolution
    resolution_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_security_events'
    )
    
    # Notification tracking
    notification_sent = models.BooleanField(default=False)
    notification_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Service information
    service_name = models.CharField(max_length=100, default='auth_service')
    
    class Meta:
        db_table = 'security_event'
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['severity', 'status']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['risk_score']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        user_info = self.user.email if self.user else self.user_email or 'Unknown'
        return f"{self.event_type} - {user_info} - {self.timestamp}"
    
    def clean(self):
        """Validate the security event."""
        if not self.user and not self.user_email:
            raise ValidationError("Either user or user_email must be provided.")
    
    def mark_as_resolved(self, resolved_by=None, notes=""):
        """Mark the event as resolved."""
        self.status = 'resolved'
        self.resolved_at = timezone.now()
        self.resolved_by = resolved_by
        if notes:
            self.resolution_notes = notes
        self.save(update_fields=['status', 'resolved_at', 'resolved_by', 'resolution_notes'])
    
    def calculate_risk_score(self):
        """Calculate risk score based on event type and context."""
        base_scores = {
            SecurityEventType.LOGIN_SUCCESS: 0,
            SecurityEventType.LOGIN_FAILED: 20,
            SecurityEventType.LOGIN_FAILED_UNKNOWN_USER: 40,
            SecurityEventType.MULTIPLE_FAILED_LOGINS: 60,
            SecurityEventType.BRUTE_FORCE_ATTEMPT: 80,
            SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT: 90,
            SecurityEventType.ACCOUNT_LOCKED: 30,
            SecurityEventType.PASSWORD_CHANGED: 10,
            SecurityEventType.UNUSUAL_LOGIN_LOCATION: 50,
            SecurityEventType.CONCURRENT_SESSIONS: 40,
            SecurityEventType.TOKEN_VALIDATION_FAILED: 30,
        }
        
        score = base_scores.get(self.event_type, 20)
        
        # Adjust based on severity
        severity_multipliers = {
            SeverityLevel.LOW: 0.5,
            SeverityLevel.MEDIUM: 1.0,
            SeverityLevel.HIGH: 1.5,
            SeverityLevel.CRITICAL: 2.0,
        }
        
        score *= severity_multipliers.get(self.severity, 1.0)
        
        # Adjust based on metadata
        if self.metadata:
            # Multiple failed attempts increase score
            failed_attempts = self.metadata.get('failed_attempts', 0)
            if failed_attempts > 3:
                score += (failed_attempts - 3) * 10
            
            # Account locked increases score
            if self.metadata.get('account_locked'):
                score += 20
        
        return min(int(score), 100)  # Cap at 100
    
    def save(self, *args, **kwargs):
        if not self.risk_score:
            self.risk_score = self.calculate_risk_score()
        
        # Set user_email if user is provided
        if self.user and not self.user_email:
            self.user_email = self.user.email
        
        super().save(*args, **kwargs)


class AuditLog(models.Model):
    """Model for audit logging."""
    
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('read', 'Read'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('password_change', 'Password Change'),
        ('permission_change', 'Permission Change'),
        ('role_change', 'Role Change'),
        ('email_verification', 'Email Verification'),
        ('two_factor_setup', 'Two Factor Setup'),
        ('invite_sent', 'Invite Sent'),
        ('account_lock', 'Account Lock'),
        ('account_unlock', 'Account Unlock'),
        ('token_refresh', 'Token Refresh'),
        ('token_blacklist', 'Token Blacklist'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Action details
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=100)  # e.g., 'User', 'SecurityEvent'
    resource_id = models.CharField(max_length=100, blank=True)  # ID of the affected resource
    
    # User information
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    user_email = models.EmailField(blank=True)
    
    # Request context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=40, blank=True)
    
    # Change details
    changes = models.JSONField(default=dict, blank=True, help_text="Details of what changed")
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Additional context
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Service information
    service_name = models.CharField(max_length=100, default='auth_service')
    
    class Meta:
        db_table = 'audit_log'
        indexes = [
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['ip_address']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        user_info = self.user.email if self.user else self.user_email or 'System'
        return f"{self.action} on {self.resource_type} by {user_info} at {self.timestamp}"


class UserSession(models.Model):
    """Model for tracking user sessions."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User and session info
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    session_key = models.CharField(max_length=40, unique=True)
    
    # Device and network info
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    device_id = models.CharField(max_length=255, blank=True)
    
    # Geographic info
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    
    # Status
    is_active = models.BooleanField(default=True)
    logout_reason = models.CharField(
        max_length=50,
        choices=[
            ('user_logout', 'User Logout'),
            ('timeout', 'Session Timeout'),
            ('forced', 'Forced Logout'),
            ('security', 'Security Logout'),
            ('expired', 'Token Expired'),
        ],
        blank=True
    )
    
    class Meta:
        db_table = 'user_session'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['created_at']),
            models.Index(fields=['expires_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.ip_address} - {self.created_at}"
    
    def is_expired(self):
        """Check if session is expired."""
        return timezone.now() > self.expires_at
    
    def terminate(self, reason='user_logout'):
        """Terminate the session."""
        self.is_active = False
        self.logout_reason = reason
        self.save(update_fields=['is_active', 'logout_reason'])
    
    def extend_session(self, duration_hours=24):
        """Extend session expiration."""
        self.expires_at = timezone.now() + timedelta(hours=duration_hours)
        self.save(update_fields=['expires_at'])


class FailedLoginAttempt(models.Model):
    """Model for tracking failed login attempts."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Attempt details
    email = models.EmailField()
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Failure reason
    reason = models.CharField(
        max_length=50,
        choices=[
            ('invalid_credentials', 'Invalid Credentials'),
            ('account_locked', 'Account Locked'),
            ('account_inactive', 'Account Inactive'),
            ('email_not_verified', 'Email Not Verified'),
            ('user_not_found', 'User Not Found'),
        ],
        default='invalid_credentials'
    )
    
    # Geographic info
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'failed_login_attempt'
        indexes = [
            models.Index(fields=['email', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.email} from {self.ip_address} at {self.timestamp}"


class SecurityConfiguration(models.Model):
    """Model for security configuration settings."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Configuration key and value
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True)
    
    # Data type for proper parsing
    data_type = models.CharField(
        max_length=20,
        choices=[
            ('string', 'String'),
            ('integer', 'Integer'),
            ('float', 'Float'),
            ('boolean', 'Boolean'),
            ('json', 'JSON'),
        ],
        default='string'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'security_configuration'
        ordering = ['key']
    
    def __str__(self):
        return f"{self.key}: {self.value}"
    
    def get_value(self):
        """Get the parsed value based on data type."""
        if self.data_type == 'integer':
            return int(self.value)
        elif self.data_type == 'float':
            return float(self.value)
        elif self.data_type == 'boolean':
            return self.value.lower() in ('true', '1', 'yes', 'on')
        elif self.data_type == 'json':
            return json.loads(self.value)
        else:
            return self.value
    
    def set_value(self, value):
        """Set the value with proper serialization."""
        if self.data_type == 'json':
            self.value = json.dumps(value)
        else:
            self.value = str(value)