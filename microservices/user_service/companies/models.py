from django.db import models
from django.core.validators import RegexValidator, EmailValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.db.models import Q
import uuid
from datetime import datetime, timedelta
from shared.models import BaseModel


def validate_phone_number(value):
    """Validate phone number format."""
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    phone_regex(value)


def validate_company_size(value):
    """Validate company size format."""
    valid_sizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    if value not in valid_sizes:
        raise ValidationError(f'Invalid company size. Must be one of: {", ".join(valid_sizes)}')


class CompanySize(models.TextChoices):
    """Company size choices."""
    SMALL = '1-10', '1-10 employees'
    MEDIUM_SMALL = '11-50', '11-50 employees'
    MEDIUM = '51-200', '51-200 employees'
    MEDIUM_LARGE = '201-500', '201-500 employees'
    LARGE = '501-1000', '501-1000 employees'
    ENTERPRISE = '1000+', '1000+ employees'


class CompanyStatus(models.TextChoices):
    """Company status choices."""
    ACTIVE = 'active', 'Active'
    INACTIVE = 'inactive', 'Inactive'
    PENDING = 'pending', 'Pending Verification'
    SUSPENDED = 'suspended', 'Suspended'
    ARCHIVED = 'archived', 'Archived'


class VisibilityChoices(models.TextChoices):
    """Visibility choices for company postings."""
    PUBLIC = 'public', 'Public'
    PRIVATE = 'private', 'Private'
    UNLISTED = 'unlisted', 'Unlisted'


class EmploymentStatus(models.TextChoices):
    """Employment status choices."""
    ACTIVE = 'active', 'Active'
    INACTIVE = 'inactive', 'Inactive'
    TERMINATED = 'terminated', 'Terminated'
    ON_LEAVE = 'on_leave', 'On Leave'


class SupervisionType(models.TextChoices):
    """Supervision type choices."""
    DIRECT = 'direct', 'Direct Supervisor'
    FUNCTIONAL = 'functional', 'Functional Supervisor'
    PROJECT = 'project', 'Project Supervisor'
    MENTOR = 'mentor', 'Mentor'


class Company(BaseModel):
    """Company model for managing employer organizations."""
    
    # Basic Information
    name = models.CharField(
        max_length=255,
        help_text="Official company name"
    )
    description = models.TextField(
        blank=True,
        help_text="Company description and overview"
    )
    industry = models.CharField(
        max_length=100,
        blank=True,
        help_text="Industry sector"
    )
    
    # Contact Information
    website = models.URLField(
        blank=True,
        help_text="Company website URL"
    )
    email = models.EmailField(
        blank=True,
        validators=[EmailValidator()],
        help_text="Primary company email"
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        validators=[validate_phone_number],
        help_text="Primary company phone number"
    )
    
    # Location Information
    location = models.CharField(
        max_length=255,
        blank=True,
        help_text="Company headquarters location"
    )
    address = models.TextField(
        blank=True,
        help_text="Full company address"
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        help_text="City"
    )
    state = models.CharField(
        max_length=100,
        blank=True,
        help_text="State/Province"
    )
    country = models.CharField(
        max_length=100,
        blank=True,
        help_text="Country"
    )
    postal_code = models.CharField(
        max_length=20,
        blank=True,
        help_text="Postal/ZIP code"
    )
    
    # Company Details
    company_size = models.CharField(
        max_length=20,
        choices=CompanySize.choices,
        blank=True,
        validators=[validate_company_size],
        help_text="Number of employees"
    )
    founded_year = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Year the company was founded"
    )
    
    # Legal Information
    registration_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Official company registration number"
    )
    tax_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Tax identification number"
    )
    
    # Verification
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether the company has been verified"
    )
    verification_documents = models.JSONField(
        default=list,
        blank=True,
        help_text="List of verification document URLs"
    )
    verification_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the company was verified"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=CompanyStatus.choices,
        default=CompanyStatus.PENDING,
        help_text="Current company status"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether the company is active"
    )
    
    class Meta:
        verbose_name = 'Company'
        verbose_name_plural = 'Companies'
        db_table = 'companies'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name'], name='companies_name_idx'),
            models.Index(fields=['industry'], name='companies_industry_idx'),
            models.Index(fields=['is_verified'], name='companies_verified_idx'),
            models.Index(fields=['status'], name='companies_status_idx'),
            models.Index(fields=['is_active'], name='companies_active_idx'),
        ]
    
    def __str__(self):
        return self.name
    
    def clean(self):
        """Validate company data."""
        super().clean()
        
        # Validate founded year
        if self.founded_year:
            current_year = timezone.now().year
            if self.founded_year > current_year:
                raise ValidationError({
                    'founded_year': 'Founded year cannot be in the future.'
                })
            if self.founded_year < 1800:
                raise ValidationError({
                    'founded_year': 'Founded year seems too old.'
                })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def employee_count(self):
        """Get the number of active employees."""
        return self.employees.filter(employment_status=EmploymentStatus.ACTIVE).count()
    
    @property
    def department_count(self):
        """Get the number of active departments."""
        return self.departments.filter(is_active=True).count()
    
    def get_verification_status(self):
        """Get human-readable verification status."""
        if self.is_verified:
            return f"Verified on {self.verification_date.strftime('%Y-%m-%d') if self.verification_date else 'Unknown date'}"
        return "Not verified"


class Department(BaseModel):
    """Department model for company organizational structure."""
    
    # Primary key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic Information
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='departments'
    )
    name = models.CharField(
        max_length=255,
        help_text="Department name"
    )
    description = models.TextField(
        blank=True,
        help_text="Department description"
    )
    
    # Hierarchy
    parent_department = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sub_departments'
    )
    
    # Department Details
    budget = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Department budget"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the department is currently active"
    )
    
    class Meta:
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
        db_table = 'departments'
        ordering = ['company__name', 'name']
        indexes = [
            models.Index(fields=['company', 'name'], name='departments_company_name_idx'),
            models.Index(fields=['is_active'], name='departments_active_idx'),
            models.Index(fields=['parent_department'], name='departments_parent_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'name'],
                name='unique_department_per_company'
            ),
        ]
    
    def __str__(self):
        if self.parent_department:
            return f"{self.company.name} - {self.parent_department.name} > {self.name}"
        return f"{self.company.name} - {self.name}"
    
    def clean(self):
        """Validate department data."""
        super().clean()
        
        # Prevent circular references
        if self.parent_department:
            if self.parent_department == self:
                raise ValidationError({
                    'parent_department': 'A department cannot be its own parent.'
                })
            
            # Check if parent belongs to same company
            if self.parent_department.company != self.company:
                raise ValidationError({
                    'parent_department': 'Parent department must belong to the same company.'
                })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def employee_count(self):
        """Get the number of active employees in this department."""
        return self.employees.filter(employment_status=EmploymentStatus.ACTIVE).count()
    
    @property
    def sub_department_count(self):
        """Get the number of active sub-departments."""
        return self.sub_departments.filter(is_active=True).count()
    
    def get_all_employees(self):
        """Get all employees including those in sub-departments."""
        # Temporarily commented out for initial migration
        # from profiles.models import EmployerProfile
        
        # Get direct employees
        # employees = list(self.employees.filter(employment_status=EmploymentStatus.ACTIVE))
        
        # Get employees from sub-departments recursively
        # for sub_dept in self.sub_departments.filter(is_active=True):
        #     employees.extend(sub_dept.get_all_employees())
        
        return []  # Temporary return for migration


class CompanySettings(BaseModel):
    """Company-wide settings and preferences."""
    
    # Link to company
    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name='settings'
    )
    
    # Visual Settings
    company_logo = models.ImageField(
        upload_to='company_logos/',
        null=True,
        blank=True,
        help_text="Company logo image"
    )
    logo_alt_text = models.CharField(
        max_length=255,
        blank=True,
        help_text="Alt text for company logo"
    )
    
    # Default Settings
    default_visibility = models.CharField(
        max_length=20,
        choices=VisibilityChoices.choices,
        default=VisibilityChoices.PUBLIC,
        help_text="Default visibility for company postings"
    )
    default_require_cover_letter = models.BooleanField(
        default=False,
        help_text="Default setting for requiring cover letters"
    )
    
    # Work Preferences
    allow_remote_work = models.BooleanField(
        default=True,
        help_text="Whether the company allows remote work"
    )
    timezone = models.CharField(
        max_length=50,
        default='UTC',
        help_text="Company default timezone"
    )
    business_hours_start = models.TimeField(
        null=True,
        blank=True,
        help_text="Standard business hours start time"
    )
    business_hours_end = models.TimeField(
        null=True,
        blank=True,
        help_text="Standard business hours end time"
    )
    
    # Notification Settings
    notification_preferences = models.JSONField(
        default=dict,
        help_text="Company-wide notification preferences"
    )
    
    class Meta:
        verbose_name = 'Company Settings'
        verbose_name_plural = 'Company Settings'
        db_table = 'company_settings'
    
    def __str__(self):
        return f"{self.company.name} Settings"
    
    def get_business_hours_display(self):
        """Get formatted business hours."""
        if self.business_hours_start and self.business_hours_end:
            return f"{self.business_hours_start.strftime('%H:%M')} - {self.business_hours_end.strftime('%H:%M')}"
        return "Not set"


class Supervisor(BaseModel):
    """Supervisor relationships within departments."""
    
    # Primary key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationship - temporarily commented out for initial migration
    # supervisor = models.ForeignKey(
    #     'profiles.EmployerProfile',
    #     on_delete=models.CASCADE,
    #     related_name='supervisees'
    # )
    # supervisee = models.ForeignKey(
    #     'profiles.EmployerProfile',
    #     on_delete=models.CASCADE,
    #     related_name='supervisors'
    # )
    
    # Supervision Details
    supervision_type = models.CharField(
        max_length=20,
        choices=SupervisionType.choices,
        default=SupervisionType.DIRECT,
        help_text="Type of supervision relationship"
    )
    start_date = models.DateField(
        help_text="When the supervision relationship started"
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="When the supervision relationship ended"
    )
    
    # Permissions
    can_approve_leave = models.BooleanField(
        default=True,
        help_text="Can approve leave requests"
    )
    can_conduct_reviews = models.BooleanField(
        default=True,
        help_text="Can conduct performance reviews"
    )
    can_approve_expenses = models.BooleanField(
        default=False,
        help_text="Can approve expense reports"
    )
    
    # Additional Information
    notes = models.TextField(
        blank=True,
        help_text="Additional notes about the supervision relationship"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this supervision relationship is currently active"
    )
    
    class Meta:
        verbose_name = 'Supervisor'
        verbose_name_plural = 'Supervisors'
        db_table = 'supervisors'
        # Temporarily commented out for initial migration
        # ordering = ['supervisor__first_name', 'supervisor__last_name']
        # indexes = [
        #     models.Index(fields=['supervisor'], name='supervisors_supervisor_idx'),
        #     models.Index(fields=['supervisee'], name='supervisors_supervisee_idx'),
        #     models.Index(fields=['is_active'], name='supervisors_active_idx'),
        #     models.Index(fields=['supervision_type'], name='supervisors_type_idx'),
        # ]
        # constraints = [
        #     models.UniqueConstraint(
        #         fields=['supervisor', 'supervisee', 'supervision_type'],
        #         name='unique_supervision_relationship'
        #     ),
        #     models.CheckConstraint(
        #         check=~Q(supervisor=models.F('supervisee')),
        #         name='no_self_supervision'
        #     ),
        # ]
    
    def __str__(self):
        # Temporarily commented out for initial migration
        # return f"{self.supervisor} supervises {self.supervisee} ({self.get_supervision_type_display()})"
        return f"Supervisor relationship {self.id}"
    
    def clean(self):
        """Validate supervision relationship."""
        super().clean()
        
        # Temporarily commented out for initial migration
        # # Prevent self-supervision
        # if self.supervisor == self.supervisee:
        #     raise ValidationError({
        #         'supervisee': 'An employee cannot supervise themselves.'
        #     })
        # 
        # # Ensure both employees belong to the same company
        # if self.supervisor.company != self.supervisee.company:
        #     raise ValidationError({
        #         'supervisee': 'Supervisor and supervisee must belong to the same company.'
        #     })
        
        # Validate date range
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({
                'end_date': 'End date cannot be before start date.'
            })
        
        # Check for circular supervision (prevent A supervises B, B supervises A)
        # if hasattr(self, 'pk') and self.pk:
        #     # Check if supervisee supervises supervisor
        #     circular_supervision = Supervisor.objects.filter(
        #         supervisor=self.supervisee,
        #         supervisee=self.supervisor,
        #         is_active=True
        #     ).exclude(pk=self.pk).exists()
        #     
        #     if circular_supervision:
        #         raise ValidationError({
        #             'supervisee': 'Circular supervision relationships are not allowed.'
        #         })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def is_current(self):
        """Check if supervision relationship is currently active."""
        if not self.is_active:
            return False
        
        today = timezone.now().date()
        if self.end_date and self.end_date < today:
            return False
        
        return self.start_date <= today
    
    def get_duration(self):
        """Get the duration of supervision relationship."""
        end_date = self.end_date or timezone.now().date()
        duration = end_date - self.start_date
        return duration.days
