import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.timezone import now
from django.contrib.auth.models import AbstractUser
from django.core.validators import validate_ipv4_address, validate_ipv6_address
from django.core.exceptions import ValidationError
# Removed ContentType and GenericForeignKey imports as they are no longer used
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
    """Model to track security-related events with enhanced audit capabilities."""
    
    EVENT_TYPES = [
        ('login_success', 'Successful Login'),
        ('login_failed', 'Failed Login'),
        ('logout', 'Logout'),
        ('password_change', 'Password Change'),
        ('password_reset', 'Password Reset'),
        ('password_reset_request', 'Password Reset Request'),
        ('password_reset_confirm', 'Password Reset Confirmation'),
        ('account_locked', 'Account Locked'),
        ('account_unlocked', 'Account Unlocked'),
        ('account_created', 'Account Created'),
        ('account_deleted', 'Account Deleted'),
        ('suspicious_activity', 'Suspicious Activity'),
        ('data_access', 'Data Access'),
        ('data_export', 'Data Export'),
        ('permission_denied', 'Permission Denied'),
        ('permission_change', 'Permission Change'),
        ('role_change', 'Role Change'),
        ('rate_limit_exceeded', 'Rate Limit Exceeded'),
        ('csrf_attack', 'CSRF Attack Attempt'),
        ('sql_injection', 'SQL Injection Attempt'),
        ('xss_attempt', 'XSS Attack Attempt'),
        ('user_registration', 'User Registration'),
        ('user_login', 'User Login'),
        ('user_logout', 'User Logout'),
        ('failed_login', 'Failed Login Attempt'),
        ('brute_force_attempt', 'Brute Force Attempt'),
        ('user_profile_change', 'User Profile Change'),
        ('email_verification_success', 'Email Verification Success'),
        ('email_verification_failed', 'Email Verification Failed'),
        ('failed_password_change', 'Failed Password Change'),
        ('invite_created', 'Invite Created'),
        ('invite_used', 'Invite Used'),
        ('invite_registration', 'Invite Registration'),
        ('2fa_login_failed', '2FA Login Failed'),
        ('2fa_otp_generated', '2FA OTP Generated'),
        ('2fa_verify_failed', '2FA Verification Failed'),
        ('2fa_verify_success', '2FA Verification Success'),
        ('profile_created', 'Profile Created'),
        ('config_change', 'Configuration Change'),
        ('ip_blocked', 'IP Address Blocked'),
        ('api_access', 'API Access'),
        ('file_upload', 'File Upload'),
        ('file_download', 'File Download'),
        ('admin_action', 'Admin Action'),
        ('bulk_operation', 'Bulk Operation'),
        ('security_scan', 'Security Scan'),
        ('vulnerability_detected', 'Vulnerability Detected'),
    ]
    
    SEVERITY_LEVELS = [
        ('info', 'Info'),
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('false_positive', 'False Positive'),
        ('ignored', 'Ignored'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='security_events'
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, db_index=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='info', db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', db_index=True)
    
    # Network and session info
    ip_address = models.GenericIPAddressField(validators=[validate_ip_address], db_index=True, null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=40, blank=True, db_index=True)
    referer = models.URLField(blank=True, max_length=500)
    
    # Geographic info (optional)
    country = models.CharField(max_length=2, blank=True, help_text="ISO country code")
    city = models.CharField(max_length=100, blank=True)
    
    # Event details
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    
    # Note: Removed ContentType foreign key and GenericForeignKey as they were unused
    # throughout the codebase and were causing migration issues
    
    # Timestamps
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    # Resolution tracking
    resolved = models.BooleanField(default=False, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_security_events'
    )
    resolution_notes = models.TextField(blank=True)
    
    # Risk assessment
    risk_score = models.PositiveIntegerField(
        default=0,
        help_text="Risk score from 0-100"
    )
    
    # Notification tracking
    notification_sent = models.BooleanField(default=False)
    notification_sent_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Security Event'
        verbose_name_plural = 'Security Events'
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['severity', 'resolved']),
            models.Index(fields=['status', 'severity']),
            models.Index(fields=['risk_score', 'timestamp']),
        ]
    
    def __str__(self):
        user_info = f" for {self.user.email}" if self.user else ""
        return f"{self.get_event_type_display()}{user_info} at {self.timestamp}"
    
    def clean(self):
        """Enhanced validation for security events."""
        super().clean()
        
        if self.risk_score < 0 or self.risk_score > 100:
            raise ValidationError({'risk_score': 'Risk score must be between 0 and 100.'})
            
        # Validate resolved event consistency
        if self.resolved and not self.resolved_at:
            raise ValidationError({'resolved_at': 'Resolved timestamp is required when event is marked as resolved.'})
            
        if self.resolved_at and not self.resolved:
            raise ValidationError({'resolved': 'Event must be marked as resolved when resolved timestamp is set.'})
            
        if self.status == 'resolved' and not self.resolved:
            raise ValidationError({'resolved': 'Event must be marked as resolved when status is resolved.'})
            
        # Validate notification consistency
        if self.notification_sent and not self.notification_sent_at:
            raise ValidationError({'notification_sent_at': 'Notification timestamp is required when notification is marked as sent.'})
            
        # Validate severity and risk score alignment
        if self.severity == 'critical' and self.risk_score < 70:
            raise ValidationError({'risk_score': 'Critical events should have a risk score of at least 70.'})
            
        if self.severity == 'info' and self.risk_score > 30:
            raise ValidationError({'risk_score': 'Info level events should have a risk score of 30 or less.'})
    
    def mark_as_resolved(self, resolved_by_user, notes=""):
        """Mark the security event as resolved."""
        self.status = 'resolved'
        self.resolved = True
        self.resolved_by = resolved_by_user
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save()
    
    def calculate_risk_score(self):
        """Calculate risk score based on event type and other factors."""
        base_scores = {
            'login_failed': 10,
            'suspicious_activity': 50,
            'account_locked': 30,
            'vulnerability_detected': 80,
            'data_export': 40,
            'permission_change': 25,
            'role_change': 35,
            'brute_force_attempt': 60,
            'csrf_attack': 70,
            'sql_injection': 90,
            'xss_attempt': 75,
        }
        
        score = base_scores.get(self.event_type, 5)
        
        # Increase score for high severity
        if self.severity == 'critical':
            score += 30
        elif self.severity == 'high':
            score += 20
        elif self.severity == 'medium':
            score += 10
        
        # Cap at 100
        self.risk_score = min(score, 100)
        return self.risk_score


class SecurityAuditTrail(models.Model):
    """Enhanced audit trail for tracking all security-related changes."""
    
    ACTION_TYPES = [
        ('create', 'Create'),
        ('read', 'Read'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('permission_change', 'Permission Change'),
        ('role_assignment', 'Role Assignment'),
        ('role_removal', 'Role Removal'),
        ('config_change', 'Configuration Change'),
        ('user_registration', 'User Registration'),
        ('password_reset_request', 'Password Reset Request'),
        ('password_reset_confirm', 'Password Reset Confirmation'),
        ('password_change', 'Password Change'),
        ('email_verification', 'Email Verification'),
        ('email_verification_success', 'Email Verification Success'),
        ('invite_created', 'Invite Created'),
        ('invite_used', 'Invite Used'),
        ('invite_registration', 'Invite Registration'),
        ('security_setting_changed', 'Security Setting Changed'),
        ('backup_created', 'Backup Created'),
        ('backup_restored', 'Backup Restored'),
        ('system_maintenance', 'System Maintenance'),
        ('security_scan_initiated', 'Security Scan Initiated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Actor (who performed the action)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_trails_performed'
    )
    
    # Action details
    action = models.CharField(max_length=50, choices=ACTION_TYPES, db_index=True)
    resource_type = models.CharField(max_length=100, db_index=True)  # Model name or resource type
    resource_id = models.CharField(max_length=100, blank=True, db_index=True)  # ID of the affected resource
    description = models.TextField()
    
    # Target (who/what was affected)
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_trails_received'
    )
    
    # Context
    ip_address = models.GenericIPAddressField(validators=[validate_ip_address], db_index=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=40, blank=True)
    
    # Changes made
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    changes = models.JSONField(default=dict, blank=True)  # Store before/after values
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamp
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    # Success/failure tracking
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Security Audit Trail'
        verbose_name_plural = 'Security Audit Trails'
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['resource_type', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['target_user', 'timestamp']),
            models.Index(fields=['success', 'timestamp']),
        ]
    
    def __str__(self):
        target_info = f" on {self.target_user.email}" if self.target_user else ""
        user_info = self.user.email if self.user else 'System'
        return f"{self.get_action_display()}{target_info} by {user_info} at {self.timestamp}"


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
    """Enhanced model for comprehensive audit logging with better validation."""
    
    ACTION_TYPES = [
        ('create', 'Create'),
        ('read', 'Read'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('permission_change', 'Permission Change'),
        ('role_assignment', 'Role Assignment'),
        ('role_removal', 'Role Removal'),
        ('config_change', 'Configuration Change'),
        ('user_registration', 'User Registration'),
        ('password_reset_request', 'Password Reset Request'),
        ('password_reset_confirm', 'Password Reset Confirmation'),
        ('password_change', 'Password Change'),
        ('email_verification', 'Email Verification'),
        ('email_verification_success', 'Email Verification Success'),
        ('invite_created', 'Invite Created'),
        ('invite_used', 'Invite Used'),
        ('invite_registration', 'Invite Registration'),
        ('data_export', 'Data Export'),
        ('data_import', 'Data Import'),
        ('file_upload', 'File Upload'),
        ('file_download', 'File Download'),
        ('api_access', 'API Access'),
        ('admin_action', 'Admin Action'),
        ('bulk_operation', 'Bulk Operation'),
        ('security_scan', 'Security Scan'),
        ('backup_created', 'Backup Created'),
        ('backup_restored', 'Backup Restored'),
    ]
    
    RESULT_TYPES = [
        ('success', 'Success'),
        ('failure', 'Failure'),
        ('partial', 'Partial Success'),
        ('error', 'Error'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=50, choices=ACTION_TYPES, db_index=True)
    result = models.CharField(max_length=20, choices=RESULT_TYPES, default='success', db_index=True)
    resource_type = models.CharField(max_length=100, db_index=True)  # Model name or resource type
    resource_id = models.CharField(max_length=100, blank=True, db_index=True)  # ID of the affected resource
    description = models.TextField()
    
    # Context information
    ip_address = models.GenericIPAddressField(validators=[validate_ip_address], db_index=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=40, blank=True)
    request_id = models.CharField(max_length=100, blank=True, help_text="Unique request identifier")
    
    # Timing
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True, help_text="Operation duration in milliseconds")
    
    # Data changes
    changes = models.JSONField(default=dict, blank=True)  # Store before/after values
    metadata = models.JSONField(default=dict, blank=True)
    
    # Error tracking
    error_message = models.TextField(blank=True)
    error_code = models.CharField(max_length=50, blank=True)
    
    # Risk and compliance
    risk_level = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('critical', 'Critical'),
        ],
        default='low',
        db_index=True
    )
    compliance_relevant = models.BooleanField(default=False, db_index=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['resource_type', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['result', 'timestamp']),
            models.Index(fields=['risk_level', 'compliance_relevant']),
            models.Index(fields=['request_id']),
        ]
    
    def __str__(self):
        user_info = self.user.email if self.user else 'Anonymous'
        return f"{self.get_action_display()} {self.resource_type} by {user_info} at {self.timestamp}"
    
    def clean(self):
        """Enhanced validation for audit logs."""
        super().clean()
        
        if self.duration_ms is not None and self.duration_ms < 0:
            raise ValidationError({'duration_ms': 'Duration cannot be negative.'})
        
        if self.result == 'error' and not self.error_message:
            raise ValidationError({'error_message': 'Error message is required when result is error.'})


class LoginHistory(models.Model):
    """Enhanced login history with better tracking and validation."""
    
    LOGIN_TYPES = [
        ('web', 'Web Login'),
        ('api', 'API Login'),
        ('mobile', 'Mobile App'),
        ('desktop', 'Desktop App'),
        ('sso', 'Single Sign-On'),
        ('2fa', 'Two-Factor Authentication'),
    ]
    
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('blocked', 'Blocked'),
        ('suspicious', 'Suspicious'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='login_history'
    )
    ip_address = models.GenericIPAddressField(
        validators=[validate_ip_address],
        db_index=True
    )
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=now, db_index=True)
    
    # Enhanced tracking
    login_type = models.CharField(max_length=20, choices=LOGIN_TYPES, default='web', db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success', db_index=True)
    session_key = models.CharField(max_length=40, blank=True)
    
    # Geographic and device info
    country = models.CharField(max_length=2, blank=True, help_text="ISO country code")
    city = models.CharField(max_length=100, blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    
    # Security context
    is_suspicious = models.BooleanField(default=False, db_index=True)
    risk_score = models.PositiveIntegerField(default=0, help_text="Risk score from 0-100")
    failure_reason = models.CharField(max_length=100, blank=True)
    
    # Session tracking
    logout_timestamp = models.DateTimeField(null=True, blank=True)
    session_duration = models.DurationField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name_plural = "Login Histories"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['status', 'timestamp']),
            models.Index(fields=['is_suspicious', 'risk_score']),
            models.Index(fields=['login_type', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.get_status_display()} - {self.timestamp}"
    
    def clean(self):
        """Enhanced validation for login history."""
        super().clean()
        
        if self.risk_score < 0 or self.risk_score > 100:
            raise ValidationError({'risk_score': 'Risk score must be between 0 and 100.'})
        
        if self.logout_timestamp and self.logout_timestamp < self.timestamp:
            raise ValidationError({'logout_timestamp': 'Logout timestamp cannot be before login timestamp.'})
    
    def calculate_session_duration(self):
        """Calculate and update session duration if logout timestamp is available."""
        if self.logout_timestamp:
            self.session_duration = self.logout_timestamp - self.timestamp
            return self.session_duration
        return None
    
    def mark_as_suspicious(self, reason=""):
        """Mark this login as suspicious and increase risk score."""
        self.is_suspicious = True
        self.status = 'suspicious'
        self.risk_score = min(self.risk_score + 25, 100)
        if reason:
            self.failure_reason = reason
        self.save()


class SecurityLog(models.Model):
    """Enhanced security log with better validation and audit capabilities."""
    
    ACTION_CHOICES = [
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('REGISTER', 'Register'),
        ('PASSWORD_CHANGE', 'Password Change'),
        ('PASSWORD_RESET', 'Password Reset'),
        ('PASSWORD_RESET_REQUEST', 'Password Reset Request'),
        ('2FA_VERIFY', '2FA Verification'),
        ('2FA_ENABLE', '2FA Enable'),
        ('2FA_DISABLE', '2FA Disable'),
        ('FAILED_LOGIN', 'Failed Login'),
        ('ACCOUNT_LOCKED', 'Account Locked'),
        ('ACCOUNT_UNLOCKED', 'Account Unlocked'),
        ('PERMISSION_DENIED', 'Permission Denied'),
        ('SUSPICIOUS_ACTIVITY', 'Suspicious Activity'),
        ('EMAIL_VERIFICATION', 'Email Verification'),
        ('PROFILE_UPDATE', 'Profile Update'),
        ('API_ACCESS', 'API Access'),
        ('DATA_EXPORT', 'Data Export'),
        ('ADMIN_ACTION', 'Admin Action'),
    ]
    
    SEVERITY_CHOICES = [
        ('INFO', 'Info'),
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='security_logs'
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES, db_index=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='INFO', db_index=True)
    description = models.TextField()
    timestamp = models.DateTimeField(default=now, db_index=True)
    ip_address = models.GenericIPAddressField(
        null=True, 
        blank=True,
        validators=[validate_ip_address],
        db_index=True
    )
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=40, blank=True)
    
    # Additional context
    request_path = models.CharField(max_length=500, blank=True)
    request_method = models.CharField(max_length=10, blank=True)
    response_status = models.PositiveIntegerField(null=True, blank=True)
    
    # Metadata and tracking
    metadata = models.JSONField(default=dict, blank=True)
    correlation_id = models.CharField(max_length=100, blank=True, help_text="For tracking related events")
    
    # Resolution tracking
    is_resolved = models.BooleanField(default=False, db_index=True)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_security_logs'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Security Log'
        verbose_name_plural = 'Security Logs'
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['severity', 'is_resolved']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['correlation_id']),
        ]

    def __str__(self):
        user_info = self.user.email if self.user else 'Anonymous'
        return f"{user_info} - {self.get_action_display()} - {self.timestamp}"
    
    def clean(self):
        """Enhanced validation for security logs."""
        super().clean()
        
        if self.response_status is not None and (self.response_status < 100 or self.response_status > 599):
            raise ValidationError({'response_status': 'Response status must be a valid HTTP status code.'})
    
    def mark_as_resolved(self, resolved_by_user, notes=""):
        """Mark the security log entry as resolved."""
        self.is_resolved = True
        self.resolved_by = resolved_by_user
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save()
