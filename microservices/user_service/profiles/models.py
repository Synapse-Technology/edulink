import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import URLValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta
from user_service.utils import validate_file_size, validate_file_type, calculate_profile_completion
from django.conf import settings
from utils.validators import validate_phone_number, validate_company_size
from companies.models import Company, Department
from shared.models import BaseModel

User = get_user_model()


# Company models have been moved to the companies app


class ProfileBase(BaseModel):
    """Base profile model with common fields."""
    user_id = models.UUIDField(unique=True, db_index=True, help_text="Reference to user in auth service")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    profile_picture = models.ImageField(
        upload_to='profile_pics/', 
        null=True, 
        blank=True, 
        default='profile_pics/default.jpg'
    )
    phone_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    
    # Profile completion tracking
    profile_completion_score = models.PositiveIntegerField(default=0, help_text="Profile completion percentage")
    last_completion_update = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=['user_id']),
            models.Index(fields=['is_active', 'created_at']),
            models.Index(fields=['profile_completion_score']),
        ]
    
    def clean(self):
        """Validate profile picture."""
        if self.profile_picture:
            validate_file_size(self.profile_picture, settings.PROFILE_PICTURE_MAX_SIZE)
            validate_file_type(self.profile_picture, settings.ALLOWED_IMAGE_TYPES)
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.user_id})"


class StudentProfile(ProfileBase):
    """Model representing a student profile."""
    
    # Institution-related fields
    institution_id = models.UUIDField(null=True, blank=True, db_index=True, help_text="Reference to institution")
    institution_name = models.CharField(max_length=255, blank=True, null=True)
    registration_number = models.CharField(
        max_length=50, 
        unique=True,
        validators=[RegexValidator(
            regex=r'^[A-Z0-9-/]+$',
            message='Registration number must contain only uppercase letters, numbers, hyphens, and slashes.'
        )]
    )
    year_of_study = models.PositiveIntegerField(
        choices=[
            (1, 'First Year'),
            (2, 'Second Year'),
            (3, 'Third Year'),
            (4, 'Fourth Year'),
            (5, 'Fifth Year'),
            (6, 'Sixth Year'),
        ],
        null=True,
        blank=True
    )
    course_id = models.UUIDField(null=True, blank=True, help_text="Reference to course")
    course_name = models.CharField(max_length=255, blank=True, null=True)
    
    # University system integration fields
    department_id = models.UUIDField(null=True, blank=True, help_text="Reference to department")
    department_name = models.CharField(max_length=255, blank=True, null=True)
    campus_id = models.UUIDField(null=True, blank=True, help_text="Reference to campus")
    campus_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Verification fields
    is_verified = models.BooleanField(default=False, db_index=True)
    university_verified = models.BooleanField(default=False, db_index=True)
    national_id_verified = models.BooleanField(default=False)
    last_university_sync = models.DateTimeField(null=True, blank=True)
    university_code_used = models.CharField(max_length=20, null=True, blank=True)
    
    # Registration method
    registration_method = models.CharField(
        max_length=20,
        choices=[
            ('university_code', 'University Code'),
            ('university_search', 'University Search')
        ],
        default='university_search'
    )
    academic_year = models.PositiveIntegerField(null=True, blank=True)
    
    # Personal information
    gender = models.CharField(
        max_length=1,
        choices=[
            ('M', 'Male'),
            ('F', 'Female'),
            ('O', 'Other')
        ],
        null=True,
        blank=True
    )
    date_of_birth = models.DateField(null=True, blank=True)
    national_id = models.CharField(
        max_length=20, 
        unique=True,
        null=True,
        blank=True,
        validators=[RegexValidator(
            regex=r'^[0-9A-Z]+$',
            message='National ID must contain only numbers and uppercase letters.'
        )]
    )
    address = models.TextField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True, max_length=500)
    
    # Skills and interests
    skills = models.JSONField(default=list, blank=True)
    interests = models.JSONField(default=list, blank=True)
    
    # Internship status
    internship_status = models.CharField(
        max_length=20,
        choices=[
            ('not_started', 'Not Started'),
            ('searching', 'Actively Searching'),
            ('applied', 'Applications Submitted'),
            ('interviewing', 'In Interview Process'),
            ('offer_received', 'Offer Received'),
            ('internship_active', 'Currently Interning'),
            ('internship_completed', 'Internship Completed'),
            ('on_hold', 'Search On Hold'),
        ],
        default='not_started',
        db_index=True
    )
    
    # Social links
    github_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    linkedin_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    twitter_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    portfolio_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    
    # Documents
    resume = models.FileField(upload_to='resumes/', blank=True, null=True)
    
    class Meta:
        verbose_name = 'Student Profile'
        verbose_name_plural = 'Student Profiles'
        indexes = [
            models.Index(fields=['institution_id', 'course_id']),
            models.Index(fields=['internship_status', 'year_of_study']),
            models.Index(fields=['university_verified', 'created_at']),
            models.Index(fields=['registration_number']),
            models.Index(fields=['is_verified', 'is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['institution_id', 'registration_number'],
                condition=models.Q(registration_number__isnull=False),
                name='unique_registration_per_institution'
            )
        ]
    
    def clean(self):
        """Validate student profile fields."""
        super().clean()
        
        if self.resume:
            validate_file_size(self.resume, settings.RESUME_MAX_SIZE)
            validate_file_type(self.resume, settings.ALLOWED_RESUME_TYPES)
    
    def calculate_completion_score(self):
        """Calculate profile completion percentage."""
        required_fields = [
            'first_name', 'last_name', 'phone_number', 'bio',
            'institution_id', 'registration_number', 'year_of_study',
            'course_id', 'skills', 'interests', 'resume'
        ]
        
        profile_data = {
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone_number': self.phone_number,
            'bio': self.bio,
            'institution_id': self.institution_id,
            'registration_number': self.registration_number,
            'year_of_study': self.year_of_study,
            'course_id': self.course_id,
            'skills': self.skills,
            'interests': self.interests,
            'resume': self.resume,
        }
        
        return calculate_profile_completion(profile_data, required_fields)
    
    def save(self, *args, **kwargs):
        # Update profile completion score
        self.profile_completion_score = self.calculate_completion_score()
        super().save(*args, **kwargs)


class EmployerProfile(ProfileBase):
    """Model representing an employer profile."""
    
    # Company and department references
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='employees',
        db_index=True,
        help_text="Reference to the company this employer belongs to"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
        db_index=True,
        help_text="Reference to the department within the company"
    )
    
    # Employer-specific fields
    position = models.CharField(max_length=100, blank=True, null=True)
    employee_id = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Company-specific employee ID"
    )
    hire_date = models.DateField(null=True, blank=True)
    
    # Permissions and roles within the company
    can_post_internships = models.BooleanField(default=False)
    can_manage_applications = models.BooleanField(default=False)
    can_manage_company_settings = models.BooleanField(default=False)
    can_manage_departments = models.BooleanField(default=False)
    can_view_analytics = models.BooleanField(default=False)
    
    # Employment status
    employment_status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('terminated', 'Terminated'),
            ('on_leave', 'On Leave'),
        ],
        default='active',
        db_index=True
    )
    
    # Verification
    is_verified = models.BooleanField(default=False, db_index=True)
    verified_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_employees',
        help_text="The employer who verified this profile"
    )
    verification_date = models.DateTimeField(null=True, blank=True)
    
    # Manager relationship
    manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='direct_reports',
        help_text="Direct manager of this employee"
    )
    
    class Meta:
        verbose_name = 'Employer Profile'
        verbose_name_plural = 'Employer Profiles'
        indexes = [
            models.Index(fields=['company', 'department']),
            models.Index(fields=['company', 'employment_status']),
            models.Index(fields=['is_verified', 'created_at']),
            models.Index(fields=['manager', 'department']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'employee_id'],
                condition=models.Q(employee_id__isnull=False),
                name='unique_employee_id_per_company'
            )
        ]
    
    def clean(self):
        """Validate employer profile data."""
        super().clean()
        
        # Ensure department belongs to the same company
        if self.department and self.company and self.department.company != self.company:
            raise ValidationError({
                'department': 'Department must belong to the same company.'
            })
        
        # Prevent self-management
        if self.manager == self:
            raise ValidationError({
                'manager': 'An employee cannot be their own manager.'
            })
        
        # Ensure manager is from the same company
        if self.manager and self.company and self.manager.company != self.company:
            raise ValidationError({
                'manager': 'Manager must be from the same company.'
            })
    
    def calculate_completion_score(self):
        """Calculate profile completion percentage."""
        required_fields = [
            'first_name', 'last_name', 'phone_number', 'company',
            'department', 'position', 'employee_id'
        ]
        
        profile_data = {
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone_number': self.phone_number,
            'company': self.company,
            'department': self.department,
            'position': self.position,
            'employee_id': self.employee_id,
        }
        
        return calculate_profile_completion(profile_data, required_fields)
    
    def save(self, *args, **kwargs):
        self.full_clean()
        # Update profile completion score
        self.profile_completion_score = self.calculate_completion_score()
        super().save(*args, **kwargs)
    
    def __str__(self):
        company_name = self.company.company_name if self.company else 'No Company'
        return f"{company_name} - {self.first_name} {self.last_name}"
    
    @property
    def company_name(self):
        """Get company name for backward compatibility."""
        return self.company.company_name if self.company else None
    
    @property
    def department_name(self):
        """Get department name."""
        return self.department.name if self.department else None
    
    @property
    def is_manager(self):
        """Check if this employer manages other employees."""
        return self.direct_reports.filter(employment_status='active').exists()
    
    @property
    def is_department_head(self):
        """Check if this employer is a department head."""
        return self.managed_departments.filter(is_active=True).exists()


class InstitutionProfile(ProfileBase):
    """Model representing an institution profile."""
    
    institution_id = models.UUIDField(unique=True, db_index=True, help_text="Reference to institution")
    position = models.CharField(max_length=100, blank=True, null=True)  # e.g., Registrar, Dean
    department = models.CharField(max_length=100, blank=True, null=True)
    
    # Permissions and access levels
    can_verify_students = models.BooleanField(default=False)
    can_manage_courses = models.BooleanField(default=False)
    can_manage_departments = models.BooleanField(default=False)
    can_view_analytics = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = 'Institution Profile'
        verbose_name_plural = 'Institution Profiles'
        indexes = [
            models.Index(fields=['institution_id', 'position']),
            models.Index(fields=['can_verify_students']),
        ]
    
    def calculate_completion_score(self):
        """Calculate profile completion percentage."""
        required_fields = [
            'first_name', 'last_name', 'phone_number', 'position', 'department'
        ]
        
        profile_data = {
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone_number': self.phone_number,
            'position': self.position,
            'department': self.department,
        }
        
        return calculate_profile_completion(profile_data, required_fields)
    
    def save(self, *args, **kwargs):
        # Update profile completion score
        self.profile_completion_score = self.calculate_completion_score()
        super().save(*args, **kwargs)


class ProfileInvitation(BaseModel):
    """Model for profile invitations."""
    
    email = models.EmailField()
    profile_type = models.CharField(
        max_length=20,
        choices=[
            ('student', 'Student'),
            ('employer', 'Employer'),
            ('institution', 'Institution'),
        ]
    )
    invited_by_user_id = models.UUIDField(help_text="User ID who sent the invitation")
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    
    # Context data for invitation
    institution_id = models.UUIDField(null=True, blank=True)
    employer_id = models.UUIDField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = 'Profile Invitation'
        verbose_name_plural = 'Profile Invitations'
        indexes = [
            models.Index(fields=['email', 'profile_type']),
            models.Index(fields=['token']),
            models.Index(fields=['expires_at', 'is_used']),
        ]
    
    def is_expired(self):
        """Check if invitation is expired."""
        return timezone.now() > self.expires_at
    
    def mark_as_used(self):
        """Mark invitation as used."""
        self.is_used = True
        self.used_at = timezone.now()
        self.save()
    
    def __str__(self):
        return f"Invitation for {self.email} ({self.profile_type})"