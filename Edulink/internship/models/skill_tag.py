from django.db import models
from .base import BaseModel


class SkillTag(BaseModel):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def internship_count(self):
        """Return the number of active internships using this skill tag"""
        return self.internships.filter(is_active=True, is_verified=True).count()
