from django.db import models
from django.conf import settings
from .profile_base import ProfileBase
from institutions.models import Institution, Course


class StudentProfile(ProfileBase):
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

    # Additional fields
    national_id = models.CharField(max_length=20, unique=True)
    academic_year = models.PositiveIntegerField()
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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.registration_number}"

    def save(self, *args, **kwargs):
        if self.institution and not self.institution_name:
            self.institution_name = self.institution.name
        if self.academic_year and not self.year_of_study:
            self.year_of_study = self.academic_year

        super().save(*args, **kwargs)
