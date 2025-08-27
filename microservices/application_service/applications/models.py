from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import sys
import os

# Add shared modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))


class BaseModel(models.Model):
    """Abstract base model with common fields."""
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


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
    
    # Foreign key references to other services (stored as IDs)
    student_id = models.PositiveIntegerField(
        db_index=True,
        help_text="Reference to student in user service"
    )
    internship_id = models.PositiveIntegerField(
        db_index=True,
        help_text="Reference to internship in internship service"
    )
    
    # Application details
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
    status_changed_by_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID of user who changed the status"
    )
    
    # Application content
    cover_letter = models.TextField(blank=True)
    resume = models.FileField(upload_to="resumes/", blank=True)
    
    # Review details
    reviewed_by_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID of user who reviewed the application"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    # Interview details
    interview_date = models.DateTimeField(null=True, blank=True)
    interview_notes = models.TextField(blank=True)
    interview_location = models.CharField(max_length=255, blank=True)
    interview_type = models.CharField(
        max_length=20,
        choices=[
            ('in_person', 'In Person'),
            ('video_call', 'Video Call'),
            ('phone_call', 'Phone Call'),
        ],
        blank=True
    )
    
    # Additional metadata
    employer_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Reference to employer in user service"
    )
    
    # Custom application answers (JSON field for flexibility)
    custom_answers = models.JSONField(
        default=dict,
        blank=True,
        help_text="Answers to custom application questions"
    )
    
    # Application source tracking
    source = models.CharField(
        max_length=50,
        choices=[
            ('web', 'Web Application'),
            ('mobile', 'Mobile Application'),
            ('api', 'API'),
            ('import', 'Data Import'),
        ],
        default='web'
    )
    
    # Priority and scoring
    priority_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text="Calculated priority score for ranking applications"
    )
    
    class Meta:
        unique_together = ("student_id", "internship_id")
        ordering = ["-application_date"]
        indexes = [
            models.Index(fields=['status', 'application_date']),
            models.Index(fields=['student_id', 'status']),
            models.Index(fields=['internship_id', 'status']),
            models.Index(fields=['status_changed_at']),
            models.Index(fields=['employer_id', 'status']),
            models.Index(fields=['priority_score']),
        ]
        db_table = 'applications'
    
    def clean(self):
        """Validate status transitions and business rules."""
        # Validate status transitions
        if self.pk:  # Only validate for existing instances
            try:
                old_instance = Application.objects.get(pk=self.pk)
                if old_instance.status != self.status:
                    if self.status not in self.VALID_TRANSITIONS.get(old_instance.status, []):
                        raise ValidationError(
                            f"Invalid status transition from '{old_instance.status}' to '{self.status}'"
                        )
            except Application.DoesNotExist:
                pass
        
        # Validate interview details
        if self.status == 'interview_scheduled':
            if not self.interview_date:
                raise ValidationError("Interview date is required when status is 'interview_scheduled'")
        
        # Validate review details
        if self.status in ['reviewed', 'accepted', 'rejected'] and self.previous_status == 'pending':
            if not self.reviewed_by_id:
                raise ValidationError("Reviewer is required when changing from pending status")
    
    def save(self, *args, **kwargs):
        """Override save to track status changes."""
        # Track status changes
        if self.pk:
            try:
                old_instance = Application.objects.get(pk=self.pk)
                if old_instance.status != self.status:
                    self.previous_status = old_instance.status
                    self.status_changed_at = timezone.now()
            except Application.DoesNotExist:
                pass
        
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Application by Student {self.student_id} for Internship {self.internship_id} ({self.status})"
    
    @property
    def is_active(self):
        """Check if the application is still active (not withdrawn or rejected)"""
        return self.status in ["pending", "reviewed", "interview_scheduled", "accepted"]
    
    @property
    def is_final_status(self):
        """Check if the application is in a final status"""
        return self.status in ['accepted', 'rejected', 'withdrawn']
    
    @property
    def days_since_application(self):
        """Calculate days since application was submitted"""
        return (timezone.now().date() - self.application_date.date()).days
    
    @property
    def time_in_current_status(self):
        """Calculate time spent in current status"""
        if self.status_changed_at:
            return timezone.now() - self.status_changed_at
        return timezone.now() - self.created_at
    
    def can_transition_to(self, new_status):
        """Check if application can transition to a new status"""
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])
    
    def transition_to(self, new_status, changed_by_id=None, notes=None):
        """Safely transition application to a new status"""
        if not self.can_transition_to(new_status):
            raise ValidationError(
                f"Cannot transition from '{self.status}' to '{new_status}'"
            )
        
        self.status = new_status
        self.status_changed_by_id = changed_by_id
        if notes:
            self.review_notes = notes
        
        self.save()


class ApplicationDocument(BaseModel):
    """Model for additional documents attached to applications."""
    
    DOCUMENT_TYPES = [
        ('resume', 'Resume/CV'),
        ('cover_letter', 'Cover Letter'),
        ('transcript', 'Academic Transcript'),
        ('portfolio', 'Portfolio'),
        ('recommendation', 'Letter of Recommendation'),
        ('certificate', 'Certificate'),
        ('other', 'Other Document'),
    ]
    
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPES,
        default='other'
    )
    file = models.FileField(upload_to='application_documents/')
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    uploaded_by_id = models.PositiveIntegerField(
        help_text="ID of user who uploaded the document"
    )
    description = models.TextField(blank=True)
    is_verified = models.BooleanField(default=False)
    verified_by_id = models.PositiveIntegerField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['application', 'document_type']),
            models.Index(fields=['is_verified']),
        ]
    
    def __str__(self):
        return f"{self.get_document_type_display()} for {self.application}"


class SupervisorFeedback(BaseModel):
    """Model for supervisor feedback on applications."""
    
    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name='supervisor_feedback'
    )
    supervisor_id = models.PositiveIntegerField(
        help_text="ID of supervisor providing feedback"
    )
    feedback = models.TextField()
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5"
    )
    
    # Detailed feedback categories
    technical_skills_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True
    )
    communication_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True
    )
    professionalism_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True
    )
    
    # Recommendations
    would_recommend = models.BooleanField(
        null=True,
        blank=True,
        help_text="Would recommend this student for future opportunities"
    )
    improvement_areas = models.TextField(
        blank=True,
        help_text="Areas where student can improve"
    )
    strengths = models.TextField(
        blank=True,
        help_text="Student's key strengths"
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['supervisor_id']),
            models.Index(fields=['rating']),
        ]
    
    def clean(self):
        """Validate supervisor feedback data."""
        # Validate feedback content
        if self.feedback and len(self.feedback.strip()) < 10:
            raise ValidationError("Feedback must be at least 10 characters long")
        
        # Validate application status
        if self.application and self.application.status not in ['accepted']:
            raise ValidationError("Feedback can only be provided for accepted applications")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Feedback for {self.application} (Rating: {self.rating}/5)"
    
    @property
    def average_detailed_rating(self):
        """Calculate average of detailed ratings"""
        ratings = [
            self.technical_skills_rating,
            self.communication_rating,
            self.professionalism_rating
        ]
        valid_ratings = [r for r in ratings if r is not None]
        if valid_ratings:
            return sum(valid_ratings) / len(valid_ratings)
        return None


class ApplicationNote(BaseModel):
    """Model for internal notes on applications."""
    
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    author_id = models.PositiveIntegerField(
        help_text="ID of user who created the note"
    )
    content = models.TextField()
    is_internal = models.BooleanField(
        default=True,
        help_text="Whether this note is internal only or visible to student"
    )
    note_type = models.CharField(
        max_length=20,
        choices=[
            ('general', 'General Note'),
            ('review', 'Review Note'),
            ('interview', 'Interview Note'),
            ('decision', 'Decision Note'),
            ('follow_up', 'Follow-up Note'),
        ],
        default='general'
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['application', 'note_type']),
            models.Index(fields=['author_id']),
            models.Index(fields=['is_internal']),
        ]
    
    def __str__(self):
        return f"{self.get_note_type_display()} for {self.application}"


class ApplicationStatusHistory(BaseModel):
    """Model to track application status change history."""
    
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='status_history'
    )
    from_status = models.CharField(
        max_length=20,
        choices=Application.STATUS_CHOICES,
        null=True,
        blank=True
    )
    to_status = models.CharField(
        max_length=20,
        choices=Application.STATUS_CHOICES
    )
    changed_by_id = models.PositiveIntegerField(
        help_text="ID of user who made the change"
    )
    reason = models.TextField(
        blank=True,
        help_text="Reason for status change"
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['application', 'created_at']),
            models.Index(fields=['to_status']),
        ]
        verbose_name_plural = 'Application Status Histories'
    
    def __str__(self):
        from_status = self.from_status or 'None'
        return f"{self.application} status changed from {from_status} to {self.to_status}"