from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from .base import BaseModel

# Create your models here.


class Internship(BaseModel):
    """Model representing an internship opportunity."""
    
    CATEGORY_CHOICES = [
        ('technology', 'Technology'),
        ('finance', 'Finance'),
        ('marketing', 'Marketing'),
        ('healthcare', 'Healthcare'),
        ('education', 'Education'),
        ('engineering', 'Engineering'),
        ('design', 'Design'),
        ('research', 'Research'),
        ('business', 'Business'),
        ('legal', 'Legal'),
        ('media', 'Media & Communications'),
        ('other', 'Other'),
    ]
    
    LOCATION_TYPE_CHOICES = [
        ('remote', 'Remote'),
        ('on_site', 'On-site'),
        ('hybrid', 'Hybrid'),
    ]
    
    EXPERIENCE_LEVEL_CHOICES = [
        ('entry', 'Entry Level'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    # Core relationships
    employer = models.ForeignKey('users.EmployerProfile', on_delete=models.CASCADE, related_name='internships', db_index=True)
    institution = models.ForeignKey('users.InstitutionProfile', on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name='internships')

    # Basic information
    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField()
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='other',
        db_index=True
    )
    
    # Experience requirements
    experience_level = models.CharField(
        max_length=15,
        choices=EXPERIENCE_LEVEL_CHOICES,
        default='entry',
        db_index=True
    )
    
    # Location
    location_type = models.CharField(
        max_length=10,
        choices=LOCATION_TYPE_CHOICES,
        default='on_site',
        db_index=True
    )
    location = models.CharField(max_length=255, blank=True, db_index=True)

    # Duration and compensation
    start_date = models.DateField(db_index=True)
    end_date = models.DateField()
    
    # Duration in weeks
    duration_weeks = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(52)],
        help_text="Duration of internship in weeks"
    )
    
    stipend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Monthly stipend amount",
        validators=[MinValueValidator(0)]
    )
    currency = models.CharField(
        max_length=3,
        default='USD',
        help_text="Currency code (e.g., USD, EUR, GBP)"
    )

    # Requirements and criteria
    required_skills = models.JSONField(default=list, blank=True)
    preferred_skills = models.JSONField(default=list, blank=True)
    eligibility_criteria = models.TextField(blank=True)
    
    # Academic requirements
    min_gpa = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(4.0)],
        help_text="Minimum GPA requirement (0.0-4.0 scale)"
    )
    required_year_of_study = models.JSONField(
        default=list,
        blank=True,
        help_text="List of acceptable years of study (e.g., [2, 3, 4])"
    )
    required_majors = models.JSONField(
        default=list,
        blank=True,
        help_text="List of acceptable majors/courses"
    )

    # Skills and tags
    skill_tags = models.ManyToManyField('SkillTag', related_name='internships', blank=True)

    # Application and visibility
    deadline = models.DateTimeField(db_index=True)
    
    # Application settings
    max_applications = models.PositiveIntegerField(
        default=100,
        help_text="Maximum number of applications allowed",
        validators=[MinValueValidator(1)]
    )
    
    is_verified = models.BooleanField(default=False)  # type: ignore[attr-defined]
    visibility = models.CharField(
        max_length=20,
        choices=[
            ('public', 'Public'),
            ('institution-only', 'Institution Only')
        ],
        default='public'
    )

    # Status
    is_active = models.BooleanField(default=True, db_index=True)  # type: ignore[attr-defined]
    is_featured = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    verified_by = models.ForeignKey('users.InstitutionProfile', null=True, blank=True, on_delete=models.SET_NULL)
    verification_date = models.DateTimeField(null=True, blank=True)
    
    # Partner institution (optional)
    partner_institution = models.ForeignKey(
        'users.InstitutionProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='partner_internships',
        help_text="Institution this internship is specifically for"
    )
    
    # Additional fields
    benefits = models.JSONField(
        default=list,
        blank=True,
        help_text="List of benefits (e.g., ['Health Insurance', 'Flexible Hours'])"
    )
    application_instructions = models.TextField(
        blank=True,
        help_text="Special instructions for applicants"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Internship'
        verbose_name_plural = 'Internships'
        indexes = [
            models.Index(fields=['category', 'location_type']),
            models.Index(fields=['deadline', 'is_active']),
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['employer', 'is_active']),
            models.Index(fields=['is_featured', 'created_at']),
        ]
    
    def clean(self):
        """Validate model data and relationships."""
        # Date validations
        if self.start_date and self.end_date:
            if self.start_date >= self.end_date:
                raise ValidationError("Start date must be before end date.")
        
        if self.deadline and self.start_date:
            deadline_date = self.deadline.date() if hasattr(self.deadline, 'date') else self.deadline
            if deadline_date >= self.start_date:
                raise ValidationError("Application deadline must be before start date.")
        
        if self.duration_weeks:
            if self.start_date and self.end_date:
                calculated_weeks = (self.end_date - self.start_date).days // 7
                if abs(calculated_weeks - self.duration_weeks) > 1:  # Allow 1 week tolerance
                    raise ValidationError(
                        f"Duration weeks ({self.duration_weeks}) doesn't match "
                        f"calculated duration ({calculated_weeks} weeks)."
                    )
        
        # Relationship validations
        if self.employer and not self.employer.user.is_active:
            raise ValidationError("Cannot create internship for inactive employer")
            
        if self.institution and not self.institution.user.is_active:
            raise ValidationError("Cannot assign internship to inactive institution")
            
        # Business logic validations
        if self.max_applications and self.max_applications < 1:
            raise ValidationError("Maximum applications must be at least 1")
            
        if self.stipend and self.stipend < 0:
            raise ValidationError("Stipend cannot be negative")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} at {self.employer.company_name}"  # type: ignore[attr-defined]

    @property
    def is_expired(self):
        """Check if the internship application deadline has passed"""
        return timezone.now() > self.deadline

    @property
    def can_apply(self):
        """Check if students can still apply to this internship"""
        if not self.is_active or self.is_expired or not self.is_verified:
            return False
        
        current_applications = self.applications.count()
        return current_applications < self.max_applications
    
    @property
    def application_count(self):
        """Get current number of applications."""
        return self.applications.count()
    
    @property
    def spots_remaining(self):
        """Get number of application spots remaining."""
        return max(0, self.max_applications - self.application_count)
    
    def is_eligible_student(self, student_profile):
        """Check if a student meets the eligibility criteria."""
        # Check GPA requirement
        if self.min_gpa and hasattr(student_profile, 'gpa'):
            if student_profile.gpa < self.min_gpa:
                return False, f"Minimum GPA requirement: {self.min_gpa}"
        
        # Check year of study
        if self.required_year_of_study and student_profile.year_of_study:
            if student_profile.year_of_study not in self.required_year_of_study:
                return False, f"Required year of study: {', '.join(map(str, self.required_year_of_study))}"
        
        # Check major/course
        if self.required_majors and student_profile.course:
            course_name = student_profile.course.name.lower()
            if not any(major.lower() in course_name for major in self.required_majors):
                return False, f"Required majors: {', '.join(self.required_majors)}"
        
        # Check partner institution
        if self.partner_institution and student_profile.institution:
            if student_profile.institution != self.partner_institution.institution:
                return False, f"This internship is only for {self.partner_institution.institution.name} students"
        
        return True, "Eligible"
