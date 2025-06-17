from django.db import models
from .base import BaseModel # Inherit from your base model

# Assume your User model is in an 'authentication' or 'users' app
from users.models import User 

# Assume your Institution model is in an 'institutions' app as per best practices 
# Replace 'institutions_app' with the actual name of your institutions app
from institutions.models import Institution 

class Internship(BaseModel):
    """
    Model to store internship/job listings.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('pending_approval', 'Pending Approval'),
        ('closed', 'Closed'),
    ]

    employer = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        limit_choices_to={'role': 'employer'}, # Ensures only employers can post
        related_name='posted_internships',
        help_text="The employer who posted this internship."
    )
    institution = models.ForeignKey(
        Institution,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='internship_listings',
        help_text="The institution associated with this internship (e.g., for verification)."
    )
    title = models.CharField(max_length=255, help_text="Title of the internship/job.")
    description = models.TextField(help_text="Detailed description of the internship.")
    requirements = models.TextField(blank=True, null=True, help_text="Required skills or qualifications.")
    location = models.CharField(max_length=255, help_text="Location of the internship.")
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    application_deadline = models.DateField(help_text="Last date to apply for this internship.")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_approval', help_text="Status of the internship listing.")
    # Add fields for skill tags, categories, etc., as needed for the Matching Engine 

    class Meta(BaseModel.Meta): # Inherit Meta options from BaseModel
        verbose_name = "Internship"
        verbose_name_plural = "Internships"

    def __str__(self):
        return f"{self.title} at {self.employer.get_full_name() or self.employer.username}"