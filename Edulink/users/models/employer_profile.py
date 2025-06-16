from django.db import models
from .profile_base import ProfileBase
from employers.models import Employer

class EmployerProfile(ProfileBase):
    employer = models.OneToOneField(Employer, on_delete=models.CASCADE, related_name='profile')
    department = models.CharField(max_length=100, blank=True, null=True)  # e.g., HR, Tech
    position = models.CharField(max_length=100, blank=True, null=True)  # e.g., HR Manager, Tech Lead

    def __str__(self):
        return f"{self.first_name} ({self.employer.company_name})"
