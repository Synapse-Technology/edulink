from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from internship.models import (
    Internship,
)  # Use the Internship model from the internship app
from authentication.models import User
from internship.models.base import BaseModel


class Application(BaseModel):
    """Model representing an internship application."""
    
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("reviewed", "Reviewed"),
        ("interview_scheduled", "Interview Scheduled"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
    ]
    
    # Valid status transitions
    VALID_TRANSITIONS = {
        'pending': ['reviewed', 'withdrawn', 'rejected'],
        'reviewed': ['interview_scheduled', 'accepted', 'rejected', 'withdrawn'],
        'interview_scheduled': ['accepted', 'rejected', 'withdrawn'],
        'accepted': ['withdrawn'],  # Only withdrawal allowed after acceptance
        'rejected': [],  # Final state
        'withdrawn': [],  # Final state
    }
    
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="applications", db_index=True, null=True, blank=True
    )
    internship = models.ForeignKey(
        Internship, on_delete=models.CASCADE, related_name="applications", db_index=True, null=True, blank=True
    )
    application_date = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        db_index=True
    )
    previous_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        blank=True,
        null=True,
        help_text="Previous status for audit trail"
    )
    status_changed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the status was last changed"
    )
    status_changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="status_changes",
        help_text="Who changed the status"
    )
    cover_letter = models.TextField(blank=True)
    resume = models.FileField(upload_to="resumes/", blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_applications",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    # Interview details
    interview_date = models.DateTimeField(null=True, blank=True)
    interview_notes = models.TextField(blank=True)

    class Meta:
        unique_together = ("student", "internship")
        ordering = ["-application_date"]
        indexes = [
            models.Index(fields=['status', 'application_date']),
            models.Index(fields=['student', 'status']),
            models.Index(fields=['internship', 'status']),
            models.Index(fields=['status_changed_at']),
        ]
    
    def clean(self):
        """Validate status transitions and relationships."""
        # Validate status transitions
        if self.pk:  # Only validate for existing instances
            old_instance = Application.objects.get(pk=self.pk)
            if old_instance.status != self.status:
                if self.status not in self.VALID_TRANSITIONS.get(old_instance.status, []):
                    raise ValidationError(
                        f"Invalid status transition from '{old_instance.status}' to '{self.status}'"
                    )
        
        # Validate that student exists and is active
        if self.student and not self.student.is_active:
            raise ValidationError("Cannot create application for inactive student")
            
        # Validate that internship exists and is active
        if self.internship and not self.internship.is_active:
            raise ValidationError("Cannot apply to inactive internship")
            
        # Validate application deadline
        if self.internship and self.internship.deadline:
            if timezone.now() > self.internship.deadline:
                raise ValidationError("Application deadline has passed")
    
    def save(self, *args, **kwargs):
        # Track status changes
        if self.pk:
            old_instance = Application.objects.get(pk=self.pk)
            if old_instance.status != self.status:
                self.previous_status = old_instance.status
                self.status_changed_at = timezone.now()
        
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Application by {self.student} for {self.internship.title} ({self.status})"  # type: ignore[attr-defined]

    @property
    def is_active(self):
        """Check if the application is still active (not withdrawn or rejected)"""
        return self.status in ["pending", "reviewed", "interview_scheduled", "accepted"]  # type: ignore[attr-defined]


class SupervisorFeedback(models.Model):
    application = models.OneToOneField(Application, on_delete=models.CASCADE)
    feedback = models.TextField()
    rating = models.PositiveSmallIntegerField()

    def clean(self):
        """Validate supervisor feedback data."""
        # Validate rating range (1-5)
        if self.rating and (self.rating < 1 or self.rating > 5):
            raise ValidationError("Rating must be between 1 and 5")
            
        # Validate feedback content
        if self.feedback and len(self.feedback.strip()) < 10:
            raise ValidationError("Feedback must be at least 10 characters long")
            
        # Validate application status
        if self.application and self.application.status not in ['accepted', 'completed']:
            raise ValidationError("Feedback can only be provided for accepted or completed applications")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Feedback for {self.application}"


# Create your models here.
