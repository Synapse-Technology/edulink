from django.db import models
from .profile_base import ProfileBase
from institutions.models import Institution, Course

class StudentProfile(ProfileBase):
    institution = models.ForeignKey(Institution, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    is_verified = models.BooleanField(default=False)
    institution_name = models.CharField(max_length=255, null=True, blank=True)
    registration_number = models.CharField(max_length=50, unique=True)
    year_of_study = models.PositiveIntegerField()
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, related_name='students')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    national_id = models.CharField(max_length=20, unique=True)
    admission_number = models.CharField(max_length=50)
    academic_year = models.PositiveIntegerField()
    skills = models.JSONField(default=list, blank=True)
    interests = models.JSONField(default=list, blank=True)
    internship_status = models.CharField(max_length=30, default='not_started')

    def __str__(self):
        return f"{self.user.email} - {self.institution_name or 'Unverified Institution'}"

    def save(self, *args, **kwargs):
        if self.institution and not self.institution_name:
            self.institution_name = self.institution.name
        super().save(*args, **kwargs)
