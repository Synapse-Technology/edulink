from django.db import models
from django.conf import settings
from django.core.validators import URLValidator
from .profile_base import ProfileBase


class EmployerProfile(ProfileBase):
    """Model representing an employer profile."""
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='employer_profile'
    )
    
    # Company-specific fields
    company_name = models.CharField(max_length=255, db_index=True)
    company_description = models.TextField(blank=True)
    industry = models.CharField(max_length=100, blank=True, db_index=True)
    website = models.URLField(blank=True, null=True, validators=[URLValidator()])
    location = models.CharField(max_length=255, blank=True, db_index=True)
    company_size = models.CharField(
        max_length=50,
        choices=[
            ('1-10', '1-10 employees'),
            ('11-50', '11-50 employees'),
            ('51-200', '51-200 employees'),
            ('201-500', '201-500 employees'),
            ('501-1000', '501-1000 employees'),
            ('1000+', '1000+ employees'),
        ],
        blank=True,
        db_index=True
    )
    
    # Additional employer-specific fields
    department = models.CharField(max_length=100, blank=True, null=True)
    position = models.CharField(max_length=100, blank=True, null=True)
    is_verified = models.BooleanField(default=False, db_index=True)
    
    class Meta:
        verbose_name = 'Employer Profile'
        verbose_name_plural = 'Employer Profiles'
        indexes = [
            models.Index(fields=['company_name', 'industry']),
            models.Index(fields=['location', 'company_size']),
            models.Index(fields=['is_verified', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.company_name} - {self.user.email}"
