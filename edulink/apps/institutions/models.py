# All models must inherit from BaseModel unless explicitly justified.
from django.db import models
from edulink.shared.db.base_models import BaseModel


class Institution(BaseModel):
    # Status and Trust constants moved to constants.py
    from .constants import (
        STATUS_REQUESTED, STATUS_UNVERIFIED, STATUS_VERIFIED, STATUS_ACTIVE, STATUS_SUSPENDED, STATUS_CHOICES,
        TRUST_REGISTERED, TRUST_ACTIVE, TRUST_HIGH, TRUST_PARTNER, TRUST_CHOICES
    )

    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_UNVERIFIED)
    trust_level = models.IntegerField(default=TRUST_REGISTERED, choices=TRUST_CHOICES)
    verification_method = models.CharField(max_length=50, blank=True)
    logo = models.ImageField(upload_to="institution_logos/", null=True, blank=True)
    
    # Profile Fields
    website_url = models.URLField(max_length=500, blank=True)
    contact_email = models.EmailField(max_length=254, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    description = models.TextField(blank=True)

    class Meta:
        app_label = "institutions"
        db_table = "institutions"


class InstitutionSuggestion(BaseModel):
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255)
    student_id = models.UUIDField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("open", "Open"),
            ("reviewed", "Reviewed"),
            ("accepted", "Accepted"),
            ("rejected", "Rejected"),
        ],
        default="open",
    )

    class Meta:
        app_label = "institutions"
        db_table = "institution_suggestions"


class InstitutionRequest(BaseModel):
    """
    Institution onboarding request from representatives.
    This is NOT an institution account - it's a request for review.
    """
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    # Structured rejection reason codes
    REJECTION_INVALID_DOMAIN = "invalid_domain"
    REJECTION_INSUFFICIENT_DOCUMENTATION = "insufficient_documentation"
    REJECTION_UNVERIFIABLE_INSTITUTION = "unverifiable_institution"
    REJECTION_DUPLICATE_REQUEST = "duplicate_request"
    REJECTION_SPAM_SUSPICIOUS = "spam_suspicious"
    REJECTION_OTHER = "other"

    REJECTION_REASON_CHOICES = [
        (REJECTION_INVALID_DOMAIN, "Invalid or unverifiable email domain"),
        (REJECTION_INSUFFICIENT_DOCUMENTATION, "Insufficient supporting documentation"),
        (REJECTION_UNVERIFIABLE_INSTITUTION, "Cannot verify institution legitimacy"),
        (REJECTION_DUPLICATE_REQUEST, "Duplicate of existing request or institution"),
        (REJECTION_SPAM_SUSPICIOUS, "Suspicious activity or spam indicators"),
        (REJECTION_OTHER, "Other reason (see detailed explanation)"),
    ]

    institution_name = models.CharField(max_length=255)
    website_url = models.URLField(max_length=500)
    requested_domains = models.JSONField(default=list, help_text="Array of official email domains")
    
    # Representative information
    representative_name = models.CharField(max_length=255)
    representative_email = models.EmailField(max_length=254)
    representative_role = models.CharField(max_length=255)
    representative_phone = models.CharField(max_length=20, blank=True)
    
    # Optional fields
    supporting_document = models.FileField(upload_to="institution_requests/", null=True, blank=True)
    department = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    
    # Review status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    reviewed_by = models.UUIDField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason_code = models.CharField(max_length=30, choices=REJECTION_REASON_CHOICES, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Tracking code for support reference
    tracking_code = models.CharField(max_length=20, unique=True, null=True, blank=True, help_text="Human-readable tracking code for support reference")

    class Meta:
        app_label = "institutions"
        db_table = "institution_requests"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["representative_email"]),
            models.Index(fields=["institution_name"]),
            models.Index(fields=["tracking_code"]),
        ]


class InstitutionInterest(BaseModel):
    """
    Tracks student interest in institutions for analytics purposes.
    Used when students skip institution selection but provide intent.
    Does not affect trust levels or create actual associations.
    """
    student_id = models.UUIDField(null=True, blank=True)
    raw_name = models.CharField(max_length=255)
    email_domain = models.CharField(max_length=255, blank=True)
    user_email = models.EmailField(max_length=254, blank=True, help_text="User's email for communication when institution is onboarded")
    
    class Meta:
        app_label = "institutions"
        db_table = "institution_interests"
        indexes = [
            models.Index(fields=["student_id"]),
            models.Index(fields=["email_domain"]),
        ]


class InstitutionInvite(BaseModel):
    """
    Invite for institution staff (admins).
    Follows secure invite-based activation flow.
    Token is stored hashed.
    """
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_EXPIRED = "expired"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_EXPIRED, "Expired"),
    ]

    institution = models.ForeignKey(
        Institution, 
        on_delete=models.CASCADE, 
        related_name="invites"
    )
    email = models.EmailField()
    role = models.CharField(max_length=50, default="INSTITUTION_ADMIN")
    department = models.CharField(max_length=255, blank=True, help_text="Department assignment for supervisors")
    cohort = models.CharField(max_length=255, blank=True, help_text="Cohort assignment for supervisors")
    token_hash = models.CharField(max_length=128, help_text="Hashed token for security")
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_by = models.UUIDField(null=True, blank=True)
    
    class Meta:
        app_label = "institutions"
        db_table = "institution_invites"
        indexes = [
            models.Index(fields=["email", "status"]),
            models.Index(fields=["token_hash"]),
        ]


class InstitutionStaff(BaseModel):
    """
    Links a User (staff) to an Institution with a specific role.
    """
    ROLE_ADMIN = "admin"
    ROLE_MEMBER = "member"
    ROLE_SUPERVISOR = "supervisor"
    
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Admin"),
        (ROLE_MEMBER, "Member"),
        (ROLE_SUPERVISOR, "Supervisor"),
    ]
    
    institution = models.ForeignKey(
        Institution, 
        on_delete=models.CASCADE, 
        related_name="staff"
    )
    user = models.ForeignKey(
        "accounts.User", 
        on_delete=models.CASCADE, 
        related_name="institution_staff_profile"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_ADMIN)
    department = models.CharField(max_length=255, blank=True, help_text="Department assignment for supervisors")
    cohort = models.CharField(max_length=255, blank=True, help_text="Cohort assignment for supervisors")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        app_label = "institutions"
        db_table = "institution_staff"
        unique_together = ["institution", "user"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["institution", "role"]),
        ]


class Department(BaseModel):
    """
    Departments are controlled vocabularies owned by the institution.
    """
    institution = models.ForeignKey(
        Institution, 
        on_delete=models.CASCADE, 
        related_name="departments"
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    aliases = models.JSONField(default=list, blank=True, help_text="List of alternative names for matching")
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "institutions"
        db_table = "institution_departments"
        unique_together = ["institution", "name"]
        indexes = [
            models.Index(fields=["institution", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.institution.name})"


class Cohort(BaseModel):
    """
    Cohorts belong to a department and represent a specific intake/year.
    """
    department = models.ForeignKey(
        Department, 
        on_delete=models.CASCADE, 
        related_name="cohorts"
    )
    name = models.CharField(max_length=255) # e.g. "2023"
    start_year = models.IntegerField()
    end_year = models.IntegerField(null=True, blank=True)
    intake_label = models.CharField(max_length=100, blank=True) # e.g. "September Intake"
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "institutions"
        db_table = "institution_cohorts"
        unique_together = ["department", "name"]
        indexes = [
            models.Index(fields=["department", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.department.name}"


class InstitutionStaffProfileRequest(BaseModel):
    """
    Request from a staff member to update their profile details.
    Requires approval from an institution admin.
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
        InstitutionStaff,
        on_delete=models.CASCADE,
        related_name="profile_requests"
    )
    institution = models.ForeignKey(
        Institution,
        on_delete=models.CASCADE,
        related_name="staff_profile_requests"
    )
    requested_changes = models.JSONField(help_text="Dictionary of requested changes (first_name, last_name, email)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    
    # Review details
    reviewed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_staff_requests"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_feedback = models.TextField(blank=True)

    class Meta:
        app_label = "institutions"
        db_table = "institution_staff_profile_requests"
        indexes = [
            models.Index(fields=["institution", "status"]),
            models.Index(fields=["staff", "status"]),
        ]
