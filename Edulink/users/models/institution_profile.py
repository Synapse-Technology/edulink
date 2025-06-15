from django.db import models
from .profile_base import ProfileBase
from institutions.models import Institution

class InstitutionProfile(ProfileBase):
    institution = models.OneToOneField(Institution, on_delete=models.CASCADE)
    position = models.CharField(max_length=100, blank=True, null=True)  # e.g., Registrar, Dean

    def __str__(self):
        return f"{self.first_name} ({self.institution.name})"
