from django.db import models
from django.conf import settings
from users.models.profile_base import ProfileBase


class Employer(ProfileBase):
    """Model representing an employer/company profile."""
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='employer_company_profile'
    )
    
    # Company-specific fields
    company_name = models.CharField(max_length=255)
    company_description = models.TextField(blank=True)
    website = models.URLField(blank=True, null=True)
    industry = models.CharField(max_length=100, blank=True)
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
        blank=True
    )
    location = models.CharField(max_length=255, blank=True)
    
    # Additional employer-specific fields
    department = models.CharField(max_length=100, blank=True, null=True)
    position = models.CharField(max_length=100, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'employers_employer'
        verbose_name = 'Employer'
        verbose_name_plural = 'Employers'
    
    def __str__(self):
        return f"{self.company_name} ({self.user.email})"