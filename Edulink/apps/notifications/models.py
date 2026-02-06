# All models must inherit from BaseModel unless explicitly justified.

from django.db import models
from django.contrib.auth import get_user_model
from shared.db.base_models import BaseModel
import uuid

User = get_user_model()


class Notification(BaseModel):
    """
    Core notification model for Edulink platform.
    Stores notification data without business logic (dumb by design).
    """
    
    # Notification types following domain events
    TYPE_EMAIL_VERIFICATION = "email_verification"
    TYPE_PASSWORD_RESET = "password_reset"
    TYPE_WELCOME = "welcome"
    TYPE_PASSWORD_CHANGED = "password_changed"
    TYPE_INTERNSHIP_APPLICATION_SUBMITTED = "internship_application_submitted"
    TYPE_INTERNSHIP_APPLICATION_REVIEWED = "internship_application_reviewed"
    TYPE_INTERNSHIP_ACCEPTED = "internship_accepted"
    TYPE_INTERNSHIP_REJECTED = "internship_rejected"
    TYPE_LOGBOOK_SUBMITTED = "logbook_submitted"
    TYPE_LOGBOOK_REVIEWED = "logbook_reviewed"
    TYPE_TRUST_TIER_CHANGED = "trust_tier_changed"
    TYPE_DOCUMENT_UPLOADED = "document_uploaded"
    TYPE_DOCUMENT_VERIFIED = "document_verified"
    TYPE_INSTITUTION_ONBOARDED = "institution_onboarded"
    TYPE_EMPLOYER_REQUEST_RECEIVED = "employer_request_received"
    TYPE_EMPLOYER_REQUEST_APPROVED = "employer_request_approved"
    TYPE_EMPLOYER_REQUEST_REJECTED = "employer_request_rejected"
    TYPE_EMPLOYER_ONBOARDED = "employer_onboarded"
    TYPE_ADMIN_NEW_ONBOARDING_REQUEST = "admin_new_onboarding_request"
    TYPE_INSTITUTION_INTEREST_OUTREACH = "institution_interest_outreach"
    TYPE_CERTIFICATE_GENERATED = "certificate_generated"
    TYPE_PERFORMANCE_SUMMARY_GENERATED = "performance_summary_generated"
    TYPE_LOGBOOK_REPORT_GENERATED = "logbook_report_generated"
    TYPE_INTERNSHIP_FINAL_FEEDBACK_SUBMITTED = "internship_final_feedback_submitted"
    TYPE_SUPERVISOR_ASSIGNED = "supervisor_assigned"
    TYPE_INCIDENT_RESOLVED = "incident_resolved"
    TYPE_INCIDENT_REPORTED = "incident_reported"
    
    TYPE_CHOICES = [
        (TYPE_EMAIL_VERIFICATION, "Email Verification"),
        (TYPE_PASSWORD_RESET, "Password Reset"),
        (TYPE_WELCOME, "Welcome"),
        (TYPE_PASSWORD_CHANGED, "Password Changed"),
        (TYPE_INTERNSHIP_APPLICATION_SUBMITTED, "Internship Application Submitted"),
        (TYPE_INTERNSHIP_APPLICATION_REVIEWED, "Internship Application Reviewed"),
        (TYPE_INTERNSHIP_ACCEPTED, "Internship Accepted"),
        (TYPE_INTERNSHIP_REJECTED, "Internship Rejected"),
        (TYPE_LOGBOOK_SUBMITTED, "Logbook Submitted"),
        (TYPE_LOGBOOK_REVIEWED, "Logbook Reviewed"),
        (TYPE_TRUST_TIER_CHANGED, "Trust Tier Changed"),
        (TYPE_DOCUMENT_UPLOADED, "Document Uploaded"),
        (TYPE_DOCUMENT_VERIFIED, "Document Verified"),
        (TYPE_INSTITUTION_ONBOARDED, "Institution Onboarded"),
        (TYPE_EMPLOYER_REQUEST_RECEIVED, "Employer Request Received"),
        (TYPE_EMPLOYER_REQUEST_APPROVED, "Employer Request Approved"),
        (TYPE_EMPLOYER_REQUEST_REJECTED, "Employer Request Rejected"),
        (TYPE_EMPLOYER_ONBOARDED, "Employer Onboarded"),
        (TYPE_ADMIN_NEW_ONBOARDING_REQUEST, "Admin New Onboarding Request"),
        (TYPE_INSTITUTION_INTEREST_OUTREACH, "Institution Interest Outreach"),
        (TYPE_CERTIFICATE_GENERATED, "Certificate Generated"),
        (TYPE_PERFORMANCE_SUMMARY_GENERATED, "Performance Summary Generated"),
        (TYPE_LOGBOOK_REPORT_GENERATED, "Logbook Report Generated"),
        (TYPE_INTERNSHIP_FINAL_FEEDBACK_SUBMITTED, "Internship Final Feedback Submitted"),
        (TYPE_SUPERVISOR_ASSIGNED, "Supervisor Assigned"),
        (TYPE_INCIDENT_RESOLVED, "Incident Resolved"),
        (TYPE_INCIDENT_REPORTED, "Incident Reported"),
    ]
    
    # Delivery channels
    CHANNEL_EMAIL = "email"
    CHANNEL_SMS = "sms"
    CHANNEL_PUSH = "push"
    CHANNEL_IN_APP = "in_app"
    
    CHANNEL_CHOICES = [
        (CHANNEL_EMAIL, "Email"),
        (CHANNEL_SMS, "SMS"),
        (CHANNEL_PUSH, "Push Notification"),
        (CHANNEL_IN_APP, "In-App"),
    ]
    
    # Status tracking
    STATUS_PENDING = "pending"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_DELIVERED = "delivered"
    STATUS_READ = "read"
    
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_READ, "Read"),
    ]
    
    # Core fields (no business logic, just data storage)
    recipient_id = models.UUIDField()  # User ID from accounts app
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default=CHANNEL_EMAIL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    
    # Content fields
    title = models.CharField(max_length=255)
    body = models.TextField()
    template_name = models.CharField(max_length=100, blank=True)
    
    # Delivery tracking
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Failure tracking
    failure_reason = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    
    # Related entity tracking (using UUIDs, no foreign keys to other apps)
    related_entity_type = models.CharField(max_length=50, blank=True)
    related_entity_id = models.UUIDField(null=True, blank=True)
    
    class Meta:
        app_label = "notifications"
        db_table = "notifications_notification"
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        indexes = [
            models.Index(fields=["recipient_id", "status"]),
            models.Index(fields=["type", "status"]),
            models.Index(fields=["sent_at"]),
        ]
    
    def __str__(self):
        return f"{self.get_type_display()} notification for {self.recipient_id}"


class EmailVerificationToken(BaseModel):
    """
    Token for email verification.
    Stores verification tokens and their expiration status.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_verification_token')
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    
    class Meta:
        app_label = "notifications"
        db_table = "notifications_email_verification_token"
        verbose_name = "Email Verification Token"
        verbose_name_plural = "Email Verification Tokens"
    
    def __str__(self):
        return f"Email verification token for {self.user.email}"
    
    @property
    def is_expired(self):
        """Check if token has expired."""
        from django.utils import timezone
        return timezone.now() > self.expires_at


class PasswordResetToken(BaseModel):
    """
    Token for password reset.
    Stores reset tokens and their expiration status.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    
    class Meta:
        app_label = "notifications"
        db_table = "notifications_password_reset_token"
        verbose_name = "Password Reset Token"
        verbose_name_plural = "Password Reset Tokens"
    
    def __str__(self):
        return f"Password reset token for {self.user.email}"
    
    @property
    def is_expired(self):
        """Check if token has expired."""
        from django.utils import timezone
        return timezone.now() > self.expires_at