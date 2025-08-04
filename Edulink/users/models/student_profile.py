from django.db import models
from django.conf import settings
from django.core.validators import URLValidator, RegexValidator
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
    institution = models.ForeignKey(Institution, on_delete=models.PROTECT,
                                    null=True, blank=True, related_name='students', db_index=True)
    is_verified = models.BooleanField(default=False)
    institution_name = models.CharField(max_length=255, null=True, blank=True)
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
        ]
    )
    course = models.ForeignKey(Course, on_delete=models.PROTECT, null=True, related_name='students', db_index=True)
    
    # University system integration fields
    department = models.ForeignKey('institutions.Department', on_delete=models.PROTECT, 
                                   null=True, blank=True, related_name='students', db_index=True)
    campus = models.ForeignKey('institutions.Campus', on_delete=models.SET_NULL,
                               null=True, blank=True, related_name='students')
    university_verified = models.BooleanField(default=False, db_index=True,
                                              help_text='Verified through university system integration')
    national_id_verified = models.BooleanField(default=False,
                                               help_text='National ID verified against university records')
    last_university_sync = models.DateTimeField(null=True, blank=True,
                                                 help_text='Last time data was synced with university system')
    university_code_used = models.CharField(max_length=20, null=True, blank=True,
                                            help_text='University registration code used during registration')
    registration_method = models.CharField(
        max_length=20,
        choices=[
            ('university_code', 'University Code'),
            ('university_search', 'University Search')
        ],
        default='university_search',
        help_text='Method used for registration'
    )
    academic_year = models.PositiveIntegerField(null=True, blank=True, help_text='Academic year for university search method')
    gender = models.CharField(
        max_length=1,
        choices=[
            ('M', 'Male'),
            ('F', 'Female'),
            ('O', 'Other')
        ],
        null=True,
        blank=True,
        help_text='Student gender'
    )

    # Additional fields
    national_id = models.CharField(
        max_length=20, 
        unique=True,
        validators=[RegexValidator(
            regex=r'^[0-9A-Z]+$',
            message='National ID must contain only numbers and uppercase letters.'
        )]
    )
    skills = models.JSONField(default=list, blank=True)
    interests = models.JSONField(default=list, blank=True)
    internship_status = models.CharField(
        max_length=20,
        choices=[
            ('not_started', 'Not Started'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed')
        ],
        default='not_started',
        db_index=True
    )

    github_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    linkedin_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    twitter_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    resume = models.FileField(upload_to='resumes/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['institution', 'course']),
            models.Index(fields=['internship_status', 'year_of_study']),
            models.Index(fields=['university_verified', 'created_at']),
            models.Index(fields=['registration_number']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['institution', 'registration_number'],
                condition=models.Q(registration_number__isnull=False),
                name='unique_registration_per_institution'
            )
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.registration_number}"
    
    def clean(self):
        """Ensure that `user` field is a proper User instance."""
        super().clean()
        if not isinstance(self.user, User):
            raise ValidationError("StudentProfile.user must be a valid User instance.")

    @property
    def user_instance(self):
        """Safe accessor for the associated User instance."""
        if not isinstance(self.user, User):
            raise TypeError(f"Expected User instance for student.user, got {type(self.user).__name__}")
        return self.user

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
