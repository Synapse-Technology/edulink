from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import EmailValidator, URLValidator
from django.utils import timezone
from enum import Enum
import uuid


class RegistrationStatus(models.TextChoices):
    """Status choices for registration requests."""
    PENDING = 'pending', 'Pending'
    EMAIL_VERIFICATION_SENT = 'email_verification_sent', 'Email Verification Sent'
    EMAIL_VERIFIED = 'email_verified', 'Email Verified'
    DOMAIN_VERIFICATION_PENDING = 'domain_verification_pending', 'Domain Verification Pending'
    DOMAIN_VERIFIED = 'domain_verified', 'Domain Verified'
    INSTITUTIONAL_VERIFICATION_PENDING = 'institutional_verification_pending', 'Institutional Verification Pending'
    INSTITUTIONAL_VERIFIED = 'institutional_verified', 'Institutional Verified'
    UNDER_REVIEW = 'under_review', 'Under Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    EXPIRED = 'expired', 'Expired'


class UserRole(models.TextChoices):
    """User role choices for registration."""
    INSTITUTION_ADMIN = 'institution_admin', 'Institution Admin'
    EMPLOYER = 'employer', 'Employer'
    STUDENT = 'student', 'Student'


class InstitutionType(models.TextChoices):
    """Institution type choices specific to Kenya."""
    PUBLIC_UNIVERSITY = 'public_university', 'Public University'
    PRIVATE_UNIVERSITY = 'private_university', 'Private University'
    UNIVERSITY_COLLEGE = 'university_college', 'University College'
    NATIONAL_POLYTECHNIC = 'national_polytechnic', 'National Polytechnic'
    TECHNICAL_TRAINING_INSTITUTE = 'technical_training_institute', 'Technical Training Institute (TTI)'
    VOCATIONAL_TRAINING_CENTER = 'vocational_training_center', 'Vocational Training Center (VTC)'
    TECHNICAL_TRAINER_COLLEGE = 'technical_trainer_college', 'Technical Trainer College'
    PRIVATE_COLLEGE = 'private_college', 'Private College'
    INTERNATIONAL_UNIVERSITY = 'international_university', 'International University (Kenya Branch)'


class VerificationSource(models.TextChoices):
    """Sources for institutional verification in Kenya."""
    CUE = 'cue', 'Commission for University Education (CUE)'
    TVETA = 'tveta', 'Technical and Vocational Education and Training Authority (TVETA)'
    MANUAL = 'manual', 'Manual Verification'
    DOMAIN = 'domain', 'Domain Verification'
    DOCUMENT = 'document', 'Document Verification'


class RiskLevel(models.TextChoices):
    """Risk assessment levels for registration requests."""
    LOW = 'low', 'Low Risk'
    MEDIUM = 'medium', 'Medium Risk'
    HIGH = 'high', 'High Risk'
    CRITICAL = 'critical', 'Critical Risk'


class RegistrationRequest(models.Model):
    """Model for handling self-service registration requests."""
    
    # Primary identifiers
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_number = models.CharField(max_length=20, unique=True, editable=False)
    
    # User information
    email = models.EmailField(validators=[EmailValidator()])
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=UserRole.choices)
    
    # Organization information (conditional based on role)
    organization_name = models.CharField(max_length=255, blank=True)
    organization_type = models.CharField(
        max_length=50, 
        choices=InstitutionType.choices, 
        blank=True,
        help_text="Required for institution admins"
    )
    organization_website = models.URLField(validators=[URLValidator()], blank=True)
    organization_address = models.TextField(blank=True)
    organization_phone = models.CharField(max_length=20, blank=True)
    
    # Institution-specific fields (for Kenya)
    institution_registration_number = models.CharField(
        max_length=100, 
        blank=True,
        help_text="CUE or TVETA registration number"
    )
    cue_accreditation_status = models.CharField(
        max_length=50, 
        blank=True,
        help_text="CUE accreditation status if applicable"
    )
    tveta_registration_status = models.CharField(
        max_length=50, 
        blank=True,
        help_text="TVETA registration status if applicable"
    )
    
    # Employer-specific fields
    company_industry = models.CharField(max_length=100, blank=True)
    company_size = models.CharField(
        max_length=20, 
        choices=[
            ('startup', '1-10 employees'),
            ('small', '11-50 employees'),
            ('medium', '51-200 employees'),
            ('large', '201-1000 employees'),
            ('enterprise', '1000+ employees'),
        ],
        blank=True
    )
    department = models.CharField(max_length=100, blank=True)
    position = models.CharField(max_length=100, blank=True)
    
    # Status and workflow
    status = models.CharField(
        max_length=50, 
        choices=RegistrationStatus.choices, 
        default=RegistrationStatus.PENDING
    )
    risk_level = models.CharField(
        max_length=20, 
        choices=RiskLevel.choices, 
        default=RiskLevel.MEDIUM
    )
    risk_score = models.FloatField(default=0.5, help_text="Risk score from 0.0 to 1.0")
    
    # Verification tracking
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=255, blank=True)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)
    
    domain_verified = models.BooleanField(default=False)
    domain_verification_method = models.CharField(
        max_length=50, 
        choices=VerificationSource.choices, 
        blank=True
    )
    domain_verification_details = models.JSONField(default=dict, blank=True)
    
    institutional_verified = models.BooleanField(default=False)
    institutional_verification_source = models.CharField(
        max_length=50, 
        choices=VerificationSource.choices, 
        blank=True
    )
    institutional_verification_details = models.JSONField(default=dict, blank=True)
    
    # Admin review
    assigned_reviewer = models.CharField(max_length=255, blank=True)
    review_notes = models.TextField(blank=True)
    review_started_at = models.DateTimeField(null=True, blank=True)
    review_completed_at = models.DateTimeField(null=True, blank=True)
    
    # Approval/Rejection
    approved_by = models.CharField(max_length=255, blank=True)
    rejected_by = models.CharField(max_length=255, blank=True)
    rejection_reason = models.TextField(blank=True)
    approval_notes = models.TextField(blank=True)
    
    # User account creation
    user_account_created = models.BooleanField(default=False)
    user_account_id = models.CharField(max_length=255, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(blank=True)
    utm_source = models.CharField(max_length=100, blank=True)
    utm_medium = models.CharField(max_length=100, blank=True)
    utm_campaign = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'registration_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['status']),
            models.Index(fields=['role']),
            models.Index(fields=['organization_name']),
            models.Index(fields=['created_at']),
            models.Index(fields=['risk_level']),
        ]
    
    def __str__(self):
        return f"{self.request_number} - {self.email} ({self.role})"
    
    def save(self, *args, **kwargs):
        if not self.request_number:
            self.request_number = self.generate_request_number()
        
        # Set expiration date if not set
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=30)
        
        super().save(*args, **kwargs)
    
    def generate_request_number(self):
        """Generate a unique request number."""
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d')
        count = RegistrationRequest.objects.filter(
            created_at__date=timezone.now().date()
        ).count() + 1
        return f"REG-{timestamp}-{count:04d}"
    
    @property
    def is_expired(self):
        """Check if the registration request has expired."""
        return self.expires_at and timezone.now() > self.expires_at
    
    @property
    def is_institution_role(self):
        """Check if this is an institution admin registration."""
        return self.role == UserRole.INSTITUTION_ADMIN
    
    @property
    def is_employer_role(self):
        """Check if this is an employer registration."""
        return self.role == UserRole.EMPLOYER
    
    @property
    def requires_institutional_verification(self):
        """Check if institutional verification is required."""
        return self.is_institution_role and self.organization_type in [
            InstitutionType.PUBLIC_UNIVERSITY,
            InstitutionType.PRIVATE_UNIVERSITY,
            InstitutionType.UNIVERSITY_COLLEGE,
            InstitutionType.NATIONAL_POLYTECHNIC,
            InstitutionType.TECHNICAL_TRAINING_INSTITUTE,
            InstitutionType.VOCATIONAL_TRAINING_CENTER,
            InstitutionType.TECHNICAL_TRAINER_COLLEGE,
        ]
    
    def get_verification_authority(self):
        """Get the appropriate verification authority for the institution type."""
        if not self.is_institution_role:
            return None
        
        university_types = [
            InstitutionType.PUBLIC_UNIVERSITY,
            InstitutionType.PRIVATE_UNIVERSITY,
            InstitutionType.UNIVERSITY_COLLEGE,
            InstitutionType.INTERNATIONAL_UNIVERSITY,
        ]
        
        tvet_types = [
            InstitutionType.NATIONAL_POLYTECHNIC,
            InstitutionType.TECHNICAL_TRAINING_INSTITUTE,
            InstitutionType.VOCATIONAL_TRAINING_CENTER,
            InstitutionType.TECHNICAL_TRAINER_COLLEGE,
        ]
        
        if self.organization_type in university_types:
            return VerificationSource.CUE
        elif self.organization_type in tvet_types:
            return VerificationSource.TVETA
        else:
            return VerificationSource.MANUAL


class RegistrationRequestLog(models.Model):
    """Audit log for registration request changes."""
    
    registration_request = models.ForeignKey(
        RegistrationRequest, 
        on_delete=models.CASCADE, 
        related_name='logs'
    )
    action = models.CharField(max_length=100)
    old_status = models.CharField(max_length=50, blank=True)
    new_status = models.CharField(max_length=50, blank=True)
    performed_by = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'registration_request_logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.registration_request.request_number} - {self.action}"


class RegistrationRequestAttachment(models.Model):
    """File attachments for registration requests."""
    
    registration_request = models.ForeignKey(
        RegistrationRequest, 
        on_delete=models.CASCADE, 
        related_name='attachments'
    )
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_size = models.PositiveIntegerField()
    file_url = models.URLField()
    uploaded_by = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_verified = models.BooleanField(default=False)
    verified_by = models.CharField(max_length=255, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'registration_request_attachments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.registration_request.request_number} - {self.file_name}"