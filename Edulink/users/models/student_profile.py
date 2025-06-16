from django.db import models
from .profile_base import ProfileBase
from institutions.models import Institution, Course

class StudentProfile(ProfileBase):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)
    national_id = models.CharField(max_length=20, unique=True)
    admission_number = models.CharField(max_length=50)
    academic_year = models.PositiveIntegerField()
    skills = models.JSONField(default=list, blank=True)
    interests = models.JSONField(default=list, blank=True)
    internship_status = models.CharField(max_length=30, default='not_started')

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.institution.name}"
