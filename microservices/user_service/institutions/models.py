from django.db import models
from django.core.validators import RegexValidator, EmailValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
import uuid
import sys
import os

# Add shared modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))
from models.base import BaseModel


class InstitutionType(models.TextChoices):
    """Institution type choices."""
    UNIVERSITY = 'university', 'University'
    COLLEGE = 'college', 'College'
    TECHNICAL_INSTITUTE = 'technical_institute', 'Technical Institute'
    VOCATIONAL_SCHOOL = 'vocational_school', 'Vocational School'
    COMMUNITY_COLLEGE = 'community_college', 'Community College'
    RESEARCH_INSTITUTE = 'research_institute', 'Research Institute'
    OTHER = 'other', 'Other'


class InstitutionStatus(models.TextChoices):
    """Institution status choices."""
    ACTIVE = 'active', 'Active'
    INACTIVE = 'inactive', 'Inactive'
    PENDING = 'pending', 'Pending Approval'
    SUSPENDED = 'suspended', 'Suspended'
    ARCHIVED = 'archived', 'Archived'


class AccreditationBody(models.TextChoices):
    """Accreditation body choices for Kenyan institutions."""
    CUE = 'cue', 'Commission for University Education'
    TVETA = 'tveta', 'Technical and Vocational Education and Training Authority'
    KUCCPS = 'kuccps', 'Kenya Universities and Colleges Central Placement Service'
    OTHER = 'other', 'Other'


class DataSource(models.TextChoices):
    """Data source choices for master institution records."""
    WEBSCRAPE = 'webscrape', 'Web Scraping'
    MANUAL = 'manual', 'Manual Entry'
    API = 'api', 'API Import'
    BULK_UPLOAD = 'bulk_upload', 'Bulk Upload'


class MasterInstitution(BaseModel):
    """Master database of Kenyan higher learning institutions."""
    
    # Basic Information
    name = models.CharField(max_length=500, unique=True)
    short_name = models.CharField(max_length=100, blank=True)
    institution_type = models.CharField(
        max_length=50,
        choices=InstitutionType.choices,
        default=InstitutionType.UNIVERSITY
    )
    
    # Accreditation Information
    accreditation_body = models.CharField(
        max_length=20,
        choices=AccreditationBody.choices,
        default=AccreditationBody.CUE
    )
    accreditation_number = models.CharField(max_length=200, blank=True)
    accreditation_status = models.CharField(max_length=100, blank=True)
    
    # Location Information
    location = models.CharField(max_length=300, blank=True)
    county = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)
    
    # Contact Information
    website = models.URLField(blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    
    # Data Management
    data_source = models.CharField(
        max_length=20,
        choices=DataSource.choices,
        default=DataSource.WEBSCRAPE
    )
    source_url = models.URLField(blank=True, help_text="URL where this data was scraped from")
    last_verified = models.DateTimeField(auto_now=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    
    # Additional metadata from scraping
    raw_data = models.JSONField(default=dict, blank=True, help_text="Raw scraped data")
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'master_institutions'
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['institution_type']),
            models.Index(fields=['accreditation_body']),
            models.Index(fields=['data_source']),
            models.Index(fields=['is_active']),
            models.Index(fields=['last_verified']),
        ]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_accreditation_body_display()})"
    
    def clean(self):
        """Validate master institution data."""
        super().clean()
        
        # Clean and normalize name
        if self.name:
            self.name = self.name.strip()
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def display_name(self):
        """Get display name with short name if available."""
        if self.short_name:
            return f"{self.name} ({self.short_name})"
        return self.name


class Institution(BaseModel):
    """Institution model for managing educational institutions."""
    
    # Master Institution Reference
    master_institution = models.ForeignKey(
        MasterInstitution,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registered_institutions',
        help_text="Reference to master institution database"
    )
    
    # Basic Information
    name = models.CharField(max_length=255, unique=True)
    short_name = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    institution_type = models.CharField(
        max_length=50,
        choices=InstitutionType.choices,
        default=InstitutionType.UNIVERSITY
    )
    
    # Contact Information
    email = models.EmailField(unique=True)
    phone_number = models.CharField(
        max_length=20,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
        )],
        blank=True
    )
    website = models.URLField(blank=True)
    
    # Address Information
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    
    # Registration & Legal
    registration_number = models.CharField(max_length=100, unique=True)
    tax_id = models.CharField(max_length=50, blank=True)
    accreditation_number = models.CharField(max_length=100, blank=True)
    
    # Status & Settings
    status = models.CharField(
        max_length=20,
        choices=InstitutionStatus.choices,
        default=InstitutionStatus.PENDING
    )
    is_verified = models.BooleanField(default=False)
    is_public = models.BooleanField(default=True)
    
    # Media
    logo = models.ImageField(upload_to='institutions/logos/', blank=True, null=True)
    banner_image = models.ImageField(upload_to='institutions/banners/', blank=True, null=True)
    
    # Metadata
    established_year = models.PositiveIntegerField(blank=True, null=True)
    student_count = models.PositiveIntegerField(default=0)
    faculty_count = models.PositiveIntegerField(default=0)
    
    # Settings
    settings = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'institutions'
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['status']),
            models.Index(fields=['institution_type']),
            models.Index(fields=['is_verified']),
            models.Index(fields=['country', 'state_province']),
        ]
        unique_together = [['name', 'country']]
    
    def __str__(self):
        return self.name
    
    def clean(self):
        """Validate institution data."""
        super().clean()
        
        # Validate established year
        if self.established_year:
            current_year = timezone.now().year
            if self.established_year > current_year:
                raise ValidationError({
                    'established_year': 'Established year cannot be in the future.'
                })
            if self.established_year < 1000:
                raise ValidationError({
                    'established_year': 'Established year must be a valid year.'
                })
        
        # Validate student and faculty counts
        if self.student_count < 0:
            raise ValidationError({
                'student_count': 'Student count cannot be negative.'
            })
        
        if self.faculty_count < 0:
            raise ValidationError({
                'faculty_count': 'Faculty count cannot be negative.'
            })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def full_address(self):
        """Get formatted full address."""
        address_parts = [self.address_line_1]
        if self.address_line_2:
            address_parts.append(self.address_line_2)
        address_parts.extend([self.city, self.state_province, self.postal_code, self.country])
        return ', '.join(address_parts)
    
    @property
    def is_active(self):
        """Check if institution is active."""
        return self.status == InstitutionStatus.ACTIVE
    
    def get_student_count(self):
        """Get current student count from profiles."""
        from profiles.models import StudentProfile
        return StudentProfile.objects.filter(
            institution_id=self.id,
            is_active=True
        ).count()
    
    def get_admin_count(self):
        """Get current admin count from roles."""
        from roles.models import UserRole, RoleChoices
        return UserRole.objects.filter(
            institution_id=self.id,
            role=RoleChoices.INSTITUTION_ADMIN,
            is_active=True
        ).count()
    
    def update_counts(self):
        """Update student and faculty counts."""
        self.student_count = self.get_student_count()
        self.faculty_count = self.get_admin_count()
        self.save(update_fields=['student_count', 'faculty_count', 'updated_at'])


class InstitutionDepartment(BaseModel):
    """Department within an institution."""
    
    institution = models.ForeignKey(
        Institution,
        on_delete=models.CASCADE,
        related_name='departments'
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    
    # Contact Information
    head_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'institution_departments'
        unique_together = [['institution', 'name'], ['institution', 'code']]
        indexes = [
            models.Index(fields=['institution', 'is_active']),
            models.Index(fields=['name']),
            models.Index(fields=['code']),
        ]
    
    def __str__(self):
        return f"{self.institution.name} - {self.name}"
    
    def clean(self):
        """Validate department data."""
        super().clean()
        
        # Ensure code is uppercase
        if self.code:
            self.code = self.code.upper()


class InstitutionProgram(BaseModel):
    """Academic program within an institution."""
    
    institution = models.ForeignKey(
        Institution,
        on_delete=models.CASCADE,
        related_name='programs'
    )
    department = models.ForeignKey(
        InstitutionDepartment,
        on_delete=models.CASCADE,
        related_name='programs',
        blank=True,
        null=True
    )
    
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    
    # Program Details
    degree_type = models.CharField(
        max_length=50,
        choices=[
            ('certificate', 'Certificate'),
            ('diploma', 'Diploma'),
            ('associate', 'Associate Degree'),
            ('bachelor', 'Bachelor Degree'),
            ('master', 'Master Degree'),
            ('doctorate', 'Doctorate'),
            ('other', 'Other'),
        ]
    )
    duration_months = models.PositiveIntegerField(help_text="Program duration in months")
    credits_required = models.PositiveIntegerField(blank=True, null=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'institution_programs'
        unique_together = [['institution', 'name'], ['institution', 'code']]
        indexes = [
            models.Index(fields=['institution', 'is_active']),
            models.Index(fields=['department', 'is_active']),
            models.Index(fields=['degree_type']),
        ]
    
    def __str__(self):
        return f"{self.institution.name} - {self.name}"
    
    def clean(self):
        """Validate program data."""
        super().clean()
        
        # Ensure code is uppercase
        if self.code:
            self.code = self.code.upper()
        
        # Validate department belongs to same institution
        if self.department and self.department.institution != self.institution:
            raise ValidationError({
                'department': 'Department must belong to the same institution.'
            })
        
        # Validate duration
        if self.duration_months <= 0:
            raise ValidationError({
                'duration_months': 'Duration must be positive.'
            })


class InstitutionSettings(BaseModel):
    """Institution-specific settings and configurations."""
    
    institution = models.OneToOneField(
        Institution,
        on_delete=models.CASCADE,
        related_name='institution_settings'
    )
    
    # Academic Settings
    academic_year_start_month = models.PositiveIntegerField(
        default=9,
        help_text="Month when academic year starts (1-12)"
    )
    grading_system = models.CharField(
        max_length=50,
        choices=[
            ('gpa_4', 'GPA 4.0 Scale'),
            ('gpa_5', 'GPA 5.0 Scale'),
            ('percentage', 'Percentage'),
            ('letter', 'Letter Grades'),
            ('other', 'Other'),
        ],
        default='gpa_4'
    )
    
    # Internship Settings
    allow_internships = models.BooleanField(default=True)
    require_internship_approval = models.BooleanField(default=True)
    min_internship_duration_weeks = models.PositiveIntegerField(default=8)
    max_internship_duration_weeks = models.PositiveIntegerField(default=52)
    
    # Profile Settings
    require_profile_verification = models.BooleanField(default=True)
    allow_public_profiles = models.BooleanField(default=True)
    
    # Notification Settings
    notification_settings = models.JSONField(default=dict, blank=True)
    
    # Integration Settings
    integration_settings = models.JSONField(default=dict, blank=True)
    
    # Custom Settings
    custom_settings = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'institution_settings'
    
    def __str__(self):
        return f"Settings for {self.institution.name}"
    
    def clean(self):
        """Validate settings."""
        super().clean()
        
        # Validate academic year start month
        if not 1 <= self.academic_year_start_month <= 12:
            raise ValidationError({
                'academic_year_start_month': 'Month must be between 1 and 12.'
            })
        
        # Validate internship duration
        if self.min_internship_duration_weeks <= 0:
            raise ValidationError({
                'min_internship_duration_weeks': 'Minimum duration must be positive.'
            })
        
        if self.max_internship_duration_weeks <= self.min_internship_duration_weeks:
            raise ValidationError({
                'max_internship_duration_weeks': 'Maximum duration must be greater than minimum.'
            })


class InstitutionInvitation(BaseModel):
    """Invitation for institutions to join the platform."""
    
    # Institution Information
    institution_name = models.CharField(max_length=255)
    institution_email = models.EmailField()
    contact_person_name = models.CharField(max_length=255)
    contact_person_email = models.EmailField()
    
    # Invitation Details
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(blank=True, null=True)
    
    # Invitation Metadata
    invited_by_user_id = models.PositiveIntegerField(blank=True, null=True)
    invitation_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Created Institution (after invitation is used)
    created_institution = models.ForeignKey(
        Institution,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='invitations'
    )
    
    class Meta:
        db_table = 'institution_invitations'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['institution_email']),
            models.Index(fields=['is_used']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"Invitation for {self.institution_name}"
    
    def clean(self):
        """Validate invitation data."""
        super().clean()
        
        # Validate expiration date
        if self.expires_at <= timezone.now():
            raise ValidationError({
                'expires_at': 'Expiration date must be in the future.'
            })
    
    @property
    def is_expired(self):
        """Check if invitation is expired."""
        return timezone.now() > self.expires_at
    
    @property
    def is_valid(self):
        """Check if invitation is valid (not used and not expired)."""
        return not self.is_used and not self.is_expired
    
    def use_invitation(self, institution_data):
        """Use the invitation to create an institution."""
        if not self.is_valid:
            raise ValidationError("Invitation is not valid.")
        
        # Create institution
        institution = Institution.objects.create(
            name=institution_data.get('name', self.institution_name),
            email=institution_data.get('email', self.institution_email),
            **institution_data
        )
        
        # Mark invitation as used
        self.is_used = True
        self.used_at = timezone.now()
        self.created_institution = institution
        self.save()
        
        return institution


class UniversityRegistrationCode(BaseModel):
    """University registration codes for student validation."""
    
    institution = models.ForeignKey(
        Institution,
        on_delete=models.CASCADE,
        related_name='registration_codes'
    )
    code = models.CharField(max_length=20, unique=True, db_index=True)
    description = models.CharField(max_length=255, blank=True)
    
    # Validity settings
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum number of times this code can be used")
    current_uses = models.PositiveIntegerField(default=0)
    
    # Academic constraints
    allowed_years = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of allowed years of study (e.g., [1, 2, 3, 4])"
    )
    allowed_courses = models.JSONField(
        default=list,
        blank=True, 
        help_text="List of allowed course codes"
    )
    
    # Metadata
    created_by = models.UUIDField(null=True, blank=True, help_text="User ID who created this code")
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'university_registration_codes'
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['institution', 'is_active']),
            models.Index(fields=['valid_from', 'valid_until']),
        ]
        unique_together = [['institution', 'code']]
    
    def __str__(self):
        return f"{self.institution.name} - {self.code}"
    
    def clean(self):
        """Validate registration code data."""
        super().clean()
        
        # Validate validity period
        if self.valid_until and self.valid_until <= self.valid_from:
            raise ValidationError({
                'valid_until': 'Valid until date must be after valid from date.'
            })
        
        # Validate max uses
        if self.max_uses is not None and self.max_uses <= 0:
            raise ValidationError({
                'max_uses': 'Maximum uses must be greater than 0.'
            })
        
        # Validate current uses doesn't exceed max uses
        if self.max_uses is not None and self.current_uses > self.max_uses:
            raise ValidationError({
                'current_uses': 'Current uses cannot exceed maximum uses.'
            })
    
    @property
    def is_valid(self):
        """Check if the registration code is currently valid."""
        now = timezone.now()
        
        # Check if active
        if not self.is_active:
            return False
        
        # Check validity period
        if now < self.valid_from:
            return False
        
        if self.valid_until and now > self.valid_until:
            return False
        
        # Check usage limits
        if self.max_uses is not None and self.current_uses >= self.max_uses:
            return False
        
        return True
    
    @property
    def remaining_uses(self):
        """Get remaining uses for this code."""
        if self.max_uses is None:
            return None
        return max(0, self.max_uses - self.current_uses)
    
    def can_be_used_by(self, year_of_study=None, course_code=None):
        """Check if code can be used by student with given criteria."""
        if not self.is_valid:
            return False, "Registration code is not valid"
        
        # Check year of study constraint
        if self.allowed_years and year_of_study:
            if year_of_study not in self.allowed_years:
                return False, f"Year {year_of_study} is not allowed for this code"
        
        # Check course constraint
        if self.allowed_courses and course_code:
            if course_code not in self.allowed_courses:
                return False, f"Course {course_code} is not allowed for this code"
        
        return True, "Code can be used"
    
    def use_code(self):
        """Increment usage count when code is used."""
        if not self.is_valid:
            raise ValidationError("Cannot use invalid registration code")
        
        self.current_uses += 1
        self.save(update_fields=['current_uses', 'updated_at'])
        
        return self
    
    @classmethod
    def validate_code(cls, code, institution_id=None, year_of_study=None, course_code=None):
        """Validate a registration code and return the code object if valid."""
        try:
            query = cls.objects.select_related('institution')
            
            if institution_id:
                reg_code = query.get(code=code, institution_id=institution_id)
            else:
                reg_code = query.get(code=code)
            
            # Check if code can be used
            can_use, message = reg_code.can_be_used_by(year_of_study, course_code)
            if not can_use:
                return None, message
            
            return reg_code, "Code is valid"
            
        except cls.DoesNotExist:
            return None, "Registration code not found"
        except cls.MultipleObjectsReturned:
            return None, "Multiple codes found - please specify institution"


class InstitutionMembership(BaseModel):
    """Relationship between users and institutions."""
    
    user_profile_id = models.UUIDField(
        db_index=True,
        help_text="Reference to UserProfile in user service"
    )
    institution = models.ForeignKey(
        Institution,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    
    role = models.CharField(
        max_length=30,
        choices=[
            ('student', 'Student'),
            ('faculty', 'Faculty'),
            ('admin', 'Administrator'),
            ('staff', 'Staff'),
        ],
        help_text="User's role within the institution"
    )
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('pending', 'Pending'),
            ('suspended', 'Suspended'),
        ],
        default='pending',
        help_text="Membership status"
    )
    
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    # Additional membership details
    student_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="Institution-specific student/employee ID"
    )
    department = models.CharField(
        max_length=100,
        blank=True,
        help_text="Department or faculty"
    )
    year_of_study = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Year of study (for students)"
    )
    
    class Meta:
        db_table = 'institution_memberships'
        unique_together = ['user_profile_id', 'institution']
        indexes = [
            models.Index(fields=['user_profile_id']),
            models.Index(fields=['institution']),
            models.Index(fields=['role']),
            models.Index(fields=['status']),
            models.Index(fields=['joined_at']),
        ]
        verbose_name = 'Institution Membership'
        verbose_name_plural = 'Institution Memberships'
    
    def __str__(self):
        return f"{self.user_profile_id} - {self.institution.name} ({self.role})"
    
    def is_active(self):
        """Check if membership is currently active."""
        return self.status == 'active' and (self.left_at is None or self.left_at > timezone.now())
    
    def deactivate(self):
        """Deactivate the membership."""
        self.status = 'inactive'
        self.left_at = timezone.now()
        self.save(update_fields=['status', 'left_at'])