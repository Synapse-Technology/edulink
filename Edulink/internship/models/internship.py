from django.db import models
from users.models.employer_profile import EmployerProfile
from users.models.institution_profile import InstitutionProfile

# Create your models here.

class Internship(models.Model):
    title = models.CharField(max_length=255)
    employer = models.ForeignKey(EmployerProfile, on_delete=models.CASCADE, related_name='internships')
    description = models.TextField()
    location = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    is_paid = models.BooleanField(default=False)
    stipend = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Institution verification fields
    is_verified_by_institution = models.BooleanField(default=False)
    verified_by = models.ForeignKey(InstitutionProfile, null=True, blank=True, on_delete=models.SET_NULL)
    verification_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} at {self.employer.company_name}"
