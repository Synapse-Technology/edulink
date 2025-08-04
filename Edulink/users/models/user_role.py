from django.db import models
from django.core.exceptions import ValidationError
from users.roles import RoleChoices


class UserRole(models.Model):
    role = models.CharField(max_length=30, choices=RoleChoices.CHOICES)
    user = models.ForeignKey('authentication.User', on_delete=models.CASCADE, related_name='roles')
    institution = models.ForeignKey('institutions.Institution', on_delete=models.SET_NULL, null=True, blank=True)
    employer = models.ForeignKey('users.EmployerProfile', on_delete=models.SET_NULL, null=True, blank=True)
    granted_by = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='granted_roles')
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'role', 'institution', 'employer')

    def clean(self):
        """Validate role assignments and relationships."""
        # Validate role-specific requirements
        if self.role == RoleChoices.STUDENT:
            if self.employer:
                raise ValidationError("Student role cannot have employer assignment")
            if not self.institution:
                raise ValidationError("Student role requires institution assignment")
                
        elif self.role == RoleChoices.EMPLOYER:
            if self.institution:
                raise ValidationError("Employer role cannot have institution assignment")
            if not self.employer:
                raise ValidationError("Employer role requires employer profile assignment")
                
        elif self.role == RoleChoices.INSTITUTION_ADMIN:
            if self.employer:
                raise ValidationError("Institution admin role cannot have employer assignment")
            if not self.institution:
                raise ValidationError("Institution admin role requires institution assignment")
                
        # Validate that user is active
        if self.user and not self.user.is_active:
            raise ValidationError("Cannot assign role to inactive user")
            
        # Validate that institution is active (if assigned)
        if self.institution and self.institution.master_institution and not self.institution.master_institution.is_active:
            raise ValidationError("Cannot assign role with inactive institution")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} - {self.role}"
