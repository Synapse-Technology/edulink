from django.db import models
from django.conf import settings
from users.models.student_profile import StudentProfile
from .internship import Internship
from .base import BaseModel

class Application(BaseModel):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='applications')
    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='applications')
    application_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('reviewed', 'Reviewed'),
            ('accepted', 'Accepted'),
            ('rejected', 'Rejected'),
            ('withdrawn', 'Withdrawn'),
        ],
        default='pending'
    )
    cover_letter = models.TextField(blank=True)
    resume = models.FileField(upload_to='resumes/', blank=True)
    
    # Additional tracking fields
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='reviewed_applications'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('student', 'internship')
        ordering = ['-application_date']

    def __str__(self):
        return f"Application by {self.student} for {self.internship.title}"

    @property
    def is_active(self):
        """Check if the application is still active (not withdrawn or rejected)"""
        return self.status in ['pending', 'reviewed', 'accepted']
