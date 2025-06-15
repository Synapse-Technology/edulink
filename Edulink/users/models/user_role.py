from django.db import models
from authentication.models import User
from institutions.models import Institution
from employers.models import Employer

class UserRole(models.Model):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('institution_admin', 'Institution Admin'),
        ('employer', 'Employer'),
        ('super_admin', 'Super Admin'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='roles')
    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    institution = models.ForeignKey(Institution, on_delete=models.SET_NULL, null=True, blank=True)
    employer = models.ForeignKey(Employer, on_delete=models.SET_NULL, null=True, blank=True)
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='granted_roles')
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'role', 'institution', 'employer')

    def __str__(self):
        return f"{self.user.email} - {self.role}"
