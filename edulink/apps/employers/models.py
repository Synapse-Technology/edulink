# All models must inherit from BaseModel unless explicitly justified.
from django.db import models
from edulink.shared.db.base_models import BaseModel
import uuid


class EmployerRequest(BaseModel):
    """
    Employer onboarding request.
    Precursor to Employer entity.
    """
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    # Rejection Reasons
    REJECTION_INVALID_DOMAIN = "INVALID_DOMAIN"
    REJECTION_DUPLICATE = "DUPLICATE"
    REJECTION_SUSPICIOUS = "SUSPICIOUS"
    REJECTION_OTHER = "OTHER"

    REJECTION_REASON_CHOICES = [
        (REJECTION_INVALID_DOMAIN, "Invalid Domain"),
        (REJECTION_DUPLICATE, "Duplicate Entry"),
        (REJECTION_SUSPICIOUS, "Suspicious Activity"),
        (REJECTION_OTHER, "Other"),
    ]

    name = models.CharField(max_length=255)
    official_email = models.EmailField()
    domain = models.CharField(max_length=255)
    organization_type = models.CharField(max_length=50)
    contact_person = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True)
    website_url = models.URLField(blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    tracking_code = models.CharField(max_length=50, unique=True, null=True)
    
    reviewed_by = models.UUIDField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason_code = models.CharField(max_length=50, blank=True, choices=REJECTION_REASON_CHOICES)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        app_label = "employers"
        db_table = "employer_requests"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["tracking_code"]),
        ]


class Employer(BaseModel):
    from .constants import (
        EMPLOYER_STATUS_REQUESTED as STATUS_REQUESTED,
        EMPLOYER_STATUS_APPROVED as STATUS_APPROVED,
        EMPLOYER_STATUS_ACTIVE as STATUS_ACTIVE,
        EMPLOYER_STATUS_REJECTED as STATUS_REJECTED,
        EMPLOYER_STATUS_CHOICES as STATUS_CHOICES,
        EMPLOYER_TRUST_UNVERIFIED as TRUST_UNVERIFIED,
        EMPLOYER_TRUST_VERIFIED as TRUST_VERIFIED,
        EMPLOYER_TRUST_ACTIVE_HOST as TRUST_ACTIVE_HOST,
        EMPLOYER_TRUST_PARTNER as TRUST_PARTNER,
        EMPLOYER_TRUST_CHOICES as TRUST_CHOICES,
    )

    name = models.CharField(max_length=255)
    official_email = models.EmailField()
    domain = models.CharField(max_length=255)
    organization_type = models.CharField(max_length=50)
    contact_person = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True)
    website_url = models.URLField(blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    logo = models.ImageField(upload_to="employer_logos/", null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_REQUESTED)
    trust_level = models.IntegerField(choices=TRUST_CHOICES, default=TRUST_UNVERIFIED)
    is_featured = models.BooleanField(default=False, help_text="System derived status for featured employers")

    # Legacy fields (kept for schema consistency, but logic is now dynamic)
    max_active_students = models.PositiveIntegerField(default=0)
    supervisor_ratio = models.PositiveIntegerField(default=0)

    class Meta:
        app_label = "employers"
        db_table = "employers"

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class EmployerInvite(BaseModel):
    """
    Invite for employer admins.
    Follows secure invite-based activation flow.
    """
    STATUS_PENDING = "PENDING"
    STATUS_ACCEPTED = "ACCEPTED"
    STATUS_EXPIRED = "EXPIRED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_EXPIRED, "Expired"),
    ]

    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name="invites")
    email = models.EmailField()
    role = models.CharField(max_length=20, default="ADMIN")
    token_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_by = models.UUIDField(null=True, blank=True)

    class Meta:
        app_label = "employers"
        db_table = "employer_invites"
        indexes = [
            models.Index(fields=["email", "status"]),
            models.Index(fields=["token_hash"]),
        ]


class Supervisor(BaseModel):
    ROLE_ADMIN = "ADMIN"
    ROLE_SUPERVISOR = "SUPERVISOR"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Employer Admin"),
        (ROLE_SUPERVISOR, "Supervisor"),
    ]

    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name="supervisors")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="supervisor_profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_SUPERVISOR)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "employers"
        db_table = "supervisors"
        unique_together = ["employer", "user"]

    def __str__(self):
        return f"{self.user} @ {self.employer.name} ({self.get_role_display()})"


class EmployerStaffProfileRequest(BaseModel):
    """
    Request from an employer staff member to update their profile details.
    Requires approval from an employer admin.
    """
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    staff = models.ForeignKey(
        Supervisor,
        on_delete=models.CASCADE,
        related_name="profile_requests"
    )
    employer = models.ForeignKey(
        Employer,
        on_delete=models.CASCADE,
        related_name="staff_profile_requests"
    )
    requested_changes = models.JSONField(help_text="Dictionary of requested changes (first_name, last_name, email)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    
    # Review details
    reviewed_by = models.UUIDField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_feedback = models.TextField(blank=True)

    class Meta:
        app_label = "employers"
        db_table = "employer_staff_profile_requests"
        indexes = [
            models.Index(fields=["employer", "status"]),
            models.Index(fields=["staff", "status"]),
        ]
