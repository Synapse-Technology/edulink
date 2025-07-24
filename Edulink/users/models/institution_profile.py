from django.db import models
from .profile_base import ProfileBase
from institutions.models import Institution
from django.conf import settings


class InstitutionProfile(ProfileBase):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='institution_profile'
    )
    institution = models.OneToOneField(Institution, on_delete=models.CASCADE)
    position = models.CharField(max_length=100, blank=True, null=True)  # e.g., Registrar, Dean

    def __str__(self):
        return f"{self.first_name} ({self.institution.name})"
