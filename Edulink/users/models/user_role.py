from django.db import models
from authentication.models import User
from institutions.models import Institution
from .employer_profile import EmployerProfile
from users.roles import RoleChoices

class UserRole(models.Model):
    role = models.CharField(max_length=30, choices=RoleChoices.CHOICES)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='roles')
    institution = models.ForeignKey(Institution, on_delete=models.SET_NULL, null=True, blank=True)
    employer = models.ForeignKey(EmployerProfile, on_delete=models.SET_NULL, null=True, blank=True)
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='granted_roles')
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'role', 'institution', 'employer')

    def __str__(self):
        return f"{self.user.email} - {self.role}"
