from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
import sys
import os

# Add shared modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))


class BaseModel(models.Model):
    """Abstract base model with common timestamp fields"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SkillTag(BaseModel):
    """Model for skill tags that can be associated with internships"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Skill Tag'
        verbose_name_plural = 'Skill Tags'

    def __str__(self):
        return self.name

    @property
    def internship_count(self):
        """Return the number of active internships using this skill tag"""
        return self.internships.filter(is_active=True, is_verified=True).count()


class Internship(BaseModel):
    """Model representing an internship opportunity"""
    
    # Choice fields
    CATEGORY_CHOICES = [
        ('technology', 'Technology'),
        ('business', 'Business'),
        ('marketing', 'Marketing'),
        ('design', 'Design'),
        ('finance', 'Finance'),
        ('healthcare', 'Healthcare'),
        ('education', 'Education'),
        ('engineering', 'Engineering'),
        ('research', 'Research'),
        ('other', 'Other'),
    ]
    
    EXPERIENCE_LEVEL_CHOICES = [
        ('entry', 'Entry Level'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    LOCATION_TYPE_CHOICES = [
        ('remote', 'Remote'),
        ('on-site', 'On-site'),
        ('hybrid', 'Hybrid'),
    ]
    
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
        ('CAD', 'Canadian Dollar'),
        ('AUD', 'Australian Dollar'),
    ]
    
    VISIBILITY_CHOICES = [
        ('public', 'Public'),
        ('institution-only', 'Institution Only'),
    ]
    
    YEAR_OF_STUDY_CHOICES = [
        (1, 'First Year'),
        (2, 'Second Year'),
        (3, 'Third Year'),
        (4, 'Fourth Year'),
        (5, 'Fifth Year'),
        (6, 'Graduate'),
    ]
    
    # Basic information
    title = models.CharField(max_length=200, db_index=True)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, db_index=True)
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_LEVEL_CHOICES)
    
    # Location
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPE_CHOICES, db_index=True)
    location = models.CharField(max_length=200, blank=True, help_text="City, State/Province, Country")
    
    # Dates and duration
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    duration_weeks = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(52)],
        help_text="Duration in weeks (1-52)"
    )
    
    # Compensation
    stipend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Monthly stipend amount"
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    
    # Requirements and skills
    required_skills = models.JSONField(
        default=list,
        blank=True,
        help_text="List of required skills"
    )
    preferred_skills = models.JSONField(
        default=list,
        blank=True,
        help_text="List of preferred skills"
    )
    eligibility_criteria = models.TextField(
        blank=True,
        help_text="General eligibility requirements"
    )
    
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
    
    is_verified = models.BooleanField(default=False)
    visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default='public'
    )
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    
    # External references (stored as IDs since we're in a microservice)
    employer_id = models.PositiveIntegerField(db_index=True, help_text="Reference to employer in user service")
    institution_id = models.PositiveIntegerField(null=True, blank=True, help_text="Reference to institution in user service")
    verified_by_id = models.PositiveIntegerField(null=True, blank=True, help_text="Reference to institution profile that verified this")
    verification_date = models.DateTimeField(null=True, blank=True)
    
    # Partner institution (optional)
    partner_institution_id = models.PositiveIntegerField(
        null=True,
        blank=True,
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
            models.Index(fields=['employer_id', 'is_active']),
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
        
        # Business logic validations
        if self.max_applications and self.max_applications < 1:
            raise ValidationError("Maximum applications must be at least 1")
            
        if self.stipend and self.stipend < 0:
            raise ValidationError("Stipend cannot be negative")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.title} (ID: {self.employer_id})"
    
    @property
    def is_expired(self):
        """Check if the internship application deadline has passed"""
        return timezone.now() > self.deadline
    
    @property
    def can_apply(self):
        """Check if students can still apply to this internship"""
        if not self.is_active or self.is_expired or not self.is_verified:
            return False
        
        # Note: In microservice architecture, we'll need to call the application service
        # to get the current application count
        return True  # Simplified for now
    
    @property
    def application_count(self):
        """Get current number of applications - will be implemented via service call"""
        # This will be implemented by calling the application service
        return 0
    
    @property
    def spots_remaining(self):
        """Get number of application spots remaining."""
        return max(0, self.max_applications - self.application_count)