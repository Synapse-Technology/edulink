from django.db import models
from users.models.employer_profile import EmployerProfile
from users.models.institution_profile import InstitutionProfile
from institutions.models import Institution
from .base import BaseModel

# Create your models here.


class Internship(BaseModel):
    # Core relationships
    employer = models.ForeignKey(EmployerProfile, on_delete=models.CASCADE, related_name='internships')
    institution = models.ForeignKey(InstitutionProfile, on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name='internships')

    # Basic information
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=100)
    location = models.CharField(max_length=100)

    # Duration and compensation
    start_date = models.DateField()
    end_date = models.DateField()
    stipend = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Requirements and criteria
    skills_required = models.TextField()
    eligibility_criteria = models.TextField(blank=True)

    # Skills and tags
    skill_tags = models.ManyToManyField('SkillTag', related_name='internships', blank=True)

    # Application and visibility
    deadline = models.DateTimeField()
    is_verified = models.BooleanField(default=False)  # type: ignore[attr-defined]
    visibility = models.CharField(
        max_length=20,
        choices=[
            ('public', 'Public'),
            ('institution-only', 'Institution Only')
        ],
        default='public'
    )

    # Status
    is_active = models.BooleanField(default=True)  # type: ignore[attr-defined]
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    verified_by = models.ForeignKey(InstitutionProfile, null=True, blank=True, on_delete=models.SET_NULL)
    verification_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} at {self.employer.company_name}"  # type: ignore[attr-defined]

    @property
    def is_expired(self):
        """Check if the internship application deadline has passed"""
        from django.utils import timezone
        return timezone.now() > self.deadline

    @property
    def can_apply(self):
        """Check if students can still apply to this internship"""
        return self.is_active and not self.is_expired and self.is_verified

    @property
    def trust_score(self):
        """Return a placeholder trust score. Replace with real logic as needed."""
        return 100

    @property
    def verification_status(self):
        """Return a human-readable verification status."""
        return "Verified" if self.is_verified else "Pending"

    @property
    def flag_count(self):
        """Return the number of flag reports related to this internship."""
        return self.flagreport_set.count() if hasattr(self, 'flagreport_set') else 0
