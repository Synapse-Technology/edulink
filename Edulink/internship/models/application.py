from django.db import models
from .base import BaseModel # Inherit from your base model

# Assume your User model is in an 'authentication' or 'users' app as per best practices 
# Replace 'authentication_app' with the actual name of your authentication/users app
from users.models import User 

# Assume your Internship model is defined in core/models/internship.py
from .internship import Internship 

class Application(BaseModel):
    """
    Model to track student applications for internships.
    """
    APPLICATION_STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('reviewed', 'Reviewed'),
        ('shortlisted', 'Shortlisted'),
        ('interview_scheduled', 'Interview Scheduled'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
        ('completed', 'Completed'), # For after the internship starts/ends
    ]

    student_user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        limit_choices_to={'role': 'student'}, # Ensures only students can apply
        related_name='applications',
        help_text="The student who submitted this application."
    )
    internship = models.ForeignKey(
        Internship, 
        on_delete=models.CASCADE, 
        related_name='applications',
        help_text="The internship this application is for."
    )
    application_date = models.DateTimeField(auto_now_add=True, help_text="When the application was submitted.")
    status = models.CharField(max_length=20, choices=APPLICATION_STATUS_CHOICES, default='pending', help_text="Current status of the application.")

    # Additional fields related to tracking/evaluation as per project needs
    institution_approved = models.BooleanField(default=False, help_text="Has the institution approved this placement?")
    employer_feedback = models.TextField(blank=True, null=True, help_text="Feedback from the employer.")
    # Add fields for resume uploads, cover letters, etc. if not handled by a separate FileStorage service

    class Meta(BaseModel.Meta): # Inherit Meta options from BaseModel
        unique_together = ('student_user', 'internship') # A student can only apply to an internship once
        verbose_name = "Application"
        verbose_name_plural = "Applications"

    def __str__(self):
        return f"Application by {self.student_user.get_full_name()} for {self.internship.title} - {self.status}"