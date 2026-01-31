"""
Admin app models - Platform staff data models.
Following the platform admin blueprint for explicit authority management.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()


class PlatformStaffProfile(models.Model):
    """
    Platform staff profile - separate from normal users.
    Authority is explicit, not implied.
    """
    
    ROLE_SUPER_ADMIN = 'SUPER_ADMIN'
    ROLE_PLATFORM_ADMIN = 'PLATFORM_ADMIN'
    ROLE_MODERATOR = 'MODERATOR'
    ROLE_AUDITOR = 'AUDITOR'
    
    ROLE_CHOICES = [
        (ROLE_SUPER_ADMIN, 'Super Admin (Root Authority)'),
        (ROLE_PLATFORM_ADMIN, 'Platform Admin (Operations)'),
        (ROLE_MODERATOR, 'Platform Moderator / Support'),
        (ROLE_AUDITOR, 'System Auditor'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='platform_staff_profile'
    )
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        help_text="Platform staff role - authority is explicit and revocable"
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_platform_staff',
        help_text="Who created this staff member (None for genesis creation)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this staff member's authority was revoked"
    )
    
    invite_token = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        help_text="One-time token for invite-based onboarding"
    )
    
    invite_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the invite token expires"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this staff member currently has platform authority"
    )
    
    class Meta:
        db_table = 'admin_platform_staff_profile'
        verbose_name = 'Platform Staff Profile'
        verbose_name_plural = 'Platform Staff Profiles'
        indexes = [
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} ({self.get_role_display()})"
    
    def clean(self):
        """Validate that super admins are created properly."""
        if self.role == self.ROLE_SUPER_ADMIN and self.created_by is not None:
            raise ValidationError("Super admins must be created manually (genesis creation)")
        
        if self.revoked_at and self.is_active:
            raise ValidationError("Cannot be active if authority is revoked")
    
    @property
    def has_authority(self):
        """Check if this staff member currently has platform authority."""
        return self.is_active and not self.revoked_at


class AdminActionLog(models.Model):
    """
    Log of admin actions for auditability.
    Every platform admin action must be logged.
    """
    
    ACTION_INSTITUTION_VERIFIED = 'INSTITUTION_VERIFIED'
    ACTION_INSTITUTION_REJECTED = 'INSTITUTION_REJECTED'
    ACTION_USER_SUSPENDED = 'USER_SUSPENDED'
    ACTION_USER_REACTIVATED = 'USER_REACTIVATED'
    ACTION_USER_ROLE_CHANGED = 'USER_ROLE_CHANGED'
    ACTION_STAFF_CREATED = 'STAFF_CREATED'
    ACTION_STAFF_REVOKED = 'STAFF_REVOKED'
    ACTION_OUTREACH_SENT = 'OUTREACH_SENT'
    
    ACTION_CHOICES = [
        (ACTION_INSTITUTION_VERIFIED, 'Institution Verified'),
        (ACTION_INSTITUTION_REJECTED, 'Institution Rejected'),
        (ACTION_USER_SUSPENDED, 'User Suspended'),
        (ACTION_USER_REACTIVATED, 'User Reactivated'),
        (ACTION_USER_ROLE_CHANGED, 'User Role Changed'),
        (ACTION_STAFF_CREATED, 'Staff Member Created'),
        (ACTION_STAFF_REVOKED, 'Staff Member Revoked'),
        (ACTION_OUTREACH_SENT, 'Outreach Email Sent'),
    ]
    
    actor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='admin_actions'
    )
    
    action = models.CharField(
        max_length=30,
        choices=ACTION_CHOICES
    )
    
    target_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='targeted_by_admin_actions'
    )
    
    target_institution = models.ForeignKey(
        'institutions.Institution',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    details = models.JSONField(
        default=dict,
        help_text="Additional details about the action"
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True
    )
    
    user_agent = models.TextField(
        blank=True,
        help_text="User agent string for forensic analysis"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'admin_action_log'
        verbose_name = 'Admin Action Log'
        verbose_name_plural = 'Admin Action Logs'
        indexes = [
            models.Index(fields=['actor', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['target_user', 'created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.actor.email} {self.action} at {self.created_at}"


class StaffInvite(models.Model):
    """
    Invite for platform staff onboarding.
    Controlled creation path for all future staff members.
    """
    
    email = models.EmailField(unique=True)
    
    role = models.CharField(
        max_length=20,
        choices=PlatformStaffProfile.ROLE_CHOICES
    )
    
    token = models.CharField(
        max_length=64,
        unique=True
    )
    
    expires_at = models.DateTimeField()
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_staff_invites'
    )
    
    accepted_at = models.DateTimeField(
        null=True,
        blank=True
    )
    
    accepted_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='accepted_staff_invites'
    )
    
    note = models.TextField(
        blank=True,
        help_text="Optional note about the invite"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'admin_staff_invite'
        verbose_name = 'Staff Invite'
        verbose_name_plural = 'Staff Invites'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email', 'expires_at']),
        ]
    
    def __str__(self):
        return f"Invite for {self.email} ({self.role})"
    
    @property
    def is_expired(self):
        """Check if this invite has expired."""
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    @property
    def is_accepted(self):
        """Check if this invite has been accepted."""
        return self.accepted_at is not None