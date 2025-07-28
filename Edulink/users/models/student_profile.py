from django.db import models
from django.conf import settings
from institutions.models import Institution, Course


class StudentProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    profile_picture = models.ImageField(upload_to='profile_pics/', default='profile_pics/default.jpg')
    phone_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Institution-related fields
    institution = models.ForeignKey(Institution, on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name='students')
    is_verified = models.BooleanField(default=False)
    institution_name = models.CharField(max_length=255, null=True, blank=True)
    registration_number = models.CharField(max_length=50, unique=True)
    year_of_study = models.PositiveIntegerField()
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, related_name='students')
    
    # University system integration fields
    department = models.ForeignKey('institutions.Department', on_delete=models.SET_NULL, 
                                   null=True, blank=True, related_name='students')
    campus = models.ForeignKey('institutions.Campus', on_delete=models.SET_NULL,
                               null=True, blank=True, related_name='students')
    university_verified = models.BooleanField(default=False, 
                                              help_text='Verified through university system integration')
    national_id_verified = models.BooleanField(default=False,
                                               help_text='National ID verified against university records')
    last_university_sync = models.DateTimeField(null=True, blank=True,
                                                 help_text='Last time data was synced with university system')
    university_code_used = models.CharField(max_length=20, null=True, blank=True,
                                            help_text='University registration code used during registration')

    # Additional fields
    national_id = models.CharField(max_length=20, unique=True)
    skills = models.JSONField(default=list, blank=True)
    interests = models.JSONField(default=list, blank=True)
    internship_status = models.CharField(
        max_length=20,
        choices=[
            ('not_started', 'Not Started'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed')
        ],
        default='not_started'
    )

    github_url = models.URLField(blank=True, null=True)
    linkedin_url = models.URLField(blank=True, null=True)
    twitter_url = models.URLField(blank=True, null=True)
    resume = models.FileField(upload_to='resumes/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.registration_number}"

    @property
    def profile_completion(self):
        """Calculate profile completion percentage safely"""
        total_fields = 0
        filled_fields = 0
        
        # Basic info fields
        basic_fields = ['first_name', 'last_name', 'phone_number', 'national_id']
        for field in basic_fields:
            total_fields += 1
            if hasattr(self, field) and getattr(self, field):
                filled_fields += 1
        
        # Institution fields
        if hasattr(self, 'institution') and self.institution:
            filled_fields += 1
        total_fields += 1
        
        if hasattr(self, 'registration_number') and self.registration_number:
            filled_fields += 1
        total_fields += 1
        
        if hasattr(self, 'year_of_study') and self.year_of_study:
            filled_fields += 1
        total_fields += 1
        
        if hasattr(self, 'course') and self.course:
            filled_fields += 1
        total_fields += 1
        
        # Skills and interests
        if hasattr(self, 'skills') and self.skills and len(self.skills) > 0:
            filled_fields += 1
        total_fields += 1
        
        if hasattr(self, 'interests') and self.interests and len(self.interests) > 0:
            filled_fields += 1
        total_fields += 1
        
        # Profile picture and resume
        if hasattr(self, 'profile_picture') and self.profile_picture and self.profile_picture.name != 'profile_pics/default.jpg':
            filled_fields += 1
        total_fields += 1
        
        if hasattr(self, 'resume') and self.resume:
            filled_fields += 1
        total_fields += 1
        
        # Social links (optional)
        social_fields = ['github_url', 'linkedin_url', 'twitter_url']
        social_filled = 0
        for field in social_fields:
            if hasattr(self, field) and getattr(self, field):
                social_filled += 1
        
        # Count social links as one field if any are filled
        if social_filled > 0:
            filled_fields += 1
        total_fields += 1
        
        return int((filled_fields / total_fields) * 100) if total_fields > 0 else 0

    def save(self, *args, **kwargs):
        if self.institution and not self.institution_name:
            self.institution_name = self.institution.name
        super().save(*args, **kwargs)
