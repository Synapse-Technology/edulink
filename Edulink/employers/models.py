from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator
from internship.models.base import BaseModel


class CompanySettings(BaseModel):
    """Model for storing company-wide settings including logo."""
    
    employer_profile = models.OneToOneField(
        'users.EmployerProfile',
        on_delete=models.CASCADE,
        related_name='company_settings'
    )
    
    # Company logo
    company_logo = models.ImageField(
        upload_to='company_logos/',
        null=True,
        blank=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'svg'])
        ],
        help_text="Company logo (JPG, PNG, or SVG format)"
    )
    
    # Logo settings
    logo_alt_text = models.CharField(
        max_length=255,
        blank=True,
        help_text="Alternative text for the logo"
    )
    
    # Default visibility settings
    default_visibility = models.CharField(
        max_length=20,
        choices=[
            ('public', 'Public - Visible to all users'),
            ('restricted', 'Restricted - Visible to selected institutions'),
        ],
        default='public'
    )
    
    # Default application requirements
    default_require_cover_letter = models.BooleanField(
        default=False,
        help_text="Require cover letter by default for new opportunities"
    )
    
    class Meta:
        verbose_name = 'Company Settings'
        verbose_name_plural = 'Company Settings'
    
    def __str__(self):
        return f"Settings for {self.employer_profile.company_name}"


class OpportunityImage(BaseModel):
    """Model for storing opportunity-specific images."""
    
    internship = models.OneToOneField(
        'internship.Internship',
        on_delete=models.CASCADE,
        related_name='opportunity_image'
    )
    
    image = models.ImageField(
        upload_to='opportunity_images/',
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])
        ],
        help_text="Opportunity image (JPG or PNG format)"
    )
    
    alt_text = models.CharField(
        max_length=255,
        blank=True,
        help_text="Alternative text for the image"
    )
    
    class Meta:
        verbose_name = 'Opportunity Image'
        verbose_name_plural = 'Opportunity Images'
    
    def __str__(self):
        return f"Image for {self.internship.title}"


class VisibilityControl(BaseModel):
    """Model for controlling opportunity visibility."""
    
    internship = models.OneToOneField(
        'internship.Internship',
        on_delete=models.CASCADE,
        related_name='visibility_control'
    )
    
    visibility_type = models.CharField(
        max_length=20,
        choices=[
            ('public', 'Public - Visible to all users'),
            ('restricted', 'Restricted - Visible to selected institutions'),
        ],
        default='public',
        db_index=True
    )
    
    # Many-to-many relationship with institutions for restricted visibility
    restricted_institutions = models.ManyToManyField(
        'institutions.Institution',
        blank=True,
        related_name='restricted_opportunities',
        help_text="Institutions that can view this opportunity (only for restricted visibility)"
    )
    
    class Meta:
        verbose_name = 'Visibility Control'
        verbose_name_plural = 'Visibility Controls'
    
    def __str__(self):
        return f"Visibility for {self.internship.title}: {self.visibility_type}"


class ApplicationRequirement(BaseModel):
    """Model for storing application requirements for opportunities."""
    
    internship = models.OneToOneField(
        'internship.Internship',
        on_delete=models.CASCADE,
        related_name='application_requirement'
    )
    
    # Resume is always required, so no field needed
    require_cover_letter = models.BooleanField(
        default=False,
        help_text="Require applicants to submit a cover letter"
    )
    
    enable_custom_questions = models.BooleanField(
        default=False,
        help_text="Enable custom application questions"
    )
    
    class Meta:
        verbose_name = 'Application Requirement'
        verbose_name_plural = 'Application Requirements'
    
    def __str__(self):
        return f"Requirements for {self.internship.title}"


class CustomApplicationQuestion(BaseModel):
    """Model for storing custom application questions."""
    
    QUESTION_TYPES = [
        ('text', 'Short Text Answer'),
        ('textarea', 'Long Text Answer'),
        ('multiple', 'Multiple Choice'),
    ]
    
    application_requirement = models.ForeignKey(
        ApplicationRequirement,
        on_delete=models.CASCADE,
        related_name='custom_questions'
    )
    
    question_text = models.TextField(
        help_text="The question to ask applicants"
    )
    
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPES,
        default='text'
    )
    
    is_required = models.BooleanField(
        default=True,
        help_text="Whether this question is required"
    )
    
    order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which questions appear"
    )
    
    # For multiple choice questions
    choices = models.JSONField(
        default=list,
        blank=True,
        help_text="List of choices for multiple choice questions"
    )
    
    class Meta:
        verbose_name = 'Custom Application Question'
        verbose_name_plural = 'Custom Application Questions'
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return f"Question for {self.application_requirement.internship.title}: {self.question_text[:50]}..."