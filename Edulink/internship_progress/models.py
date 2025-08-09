from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from users.models.student_profile import StudentProfile
from internship.models.internship import Internship
from application.models import Application

# Create your models here.

class LogbookEntry(models.Model):
    """A student's weekly logbook entry for an internship."""
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='logbook_entries')
    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='logbook_entries')
    week_number = models.PositiveIntegerField()
    activities = models.TextField(help_text="JSON or plain text of activities")
    date_submitted = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending Review'),
        ('reviewed', 'Reviewed'),
        ('revision', 'Needs Revision')
    ], default='pending')
    supervisor_comment = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('student', 'internship', 'week_number')
        ordering = ['-date_submitted']

    def __str__(self):
        return f"LogbookEntry: {self.student} - Week {self.week_number}"
    
    def clean(self):
        """Validate logbook entry business rules."""
        super().clean()
        
        # Check if student has accepted application for this internship
        try:
            application = Application.objects.get(
                student=self.student,
                internship=self.internship,
                status='accepted'
            )
        except Application.DoesNotExist:
            raise ValidationError(
                "Student must have an accepted application for this internship to submit logbook entries."
            )
        
        # Check if internship is currently active
        current_date = timezone.now().date()
        if not (self.internship.start_date <= current_date <= self.internship.end_date):
            raise ValidationError(
                "Logbook entries can only be submitted during the internship period."
            )
        
        # Validate week number is within internship duration
        total_days = (self.internship.end_date - self.internship.start_date).days
        max_weeks = max(1, total_days // 7)
        
        if self.week_number < 1 or self.week_number > max_weeks:
            raise ValidationError(
                f"Week number must be between 1 and {max_weeks} for this internship."
            )
        
        # Check if week has actually elapsed
        elapsed_days = (current_date - self.internship.start_date).days
        elapsed_weeks = max(0, elapsed_days // 7)
        
        if self.week_number > elapsed_weeks + 1:  # Allow current week + 1
            raise ValidationError(
                f"Cannot submit entry for week {self.week_number}. Only {elapsed_weeks + 1} weeks have elapsed."
            )
    
    def save(self, *args, **kwargs):
        """Override save to run validation."""
        self.clean()
        super().save(*args, **kwargs)
    
    @property
    def is_overdue(self):
        """Check if this logbook entry is overdue for submission."""
        if self.status != 'pending':
            return False
        
        # Calculate the deadline for this week (end of week + 3 days grace period)
        week_start = self.internship.start_date + timezone.timedelta(weeks=self.week_number - 1)
        week_end = week_start + timezone.timedelta(days=6)
        deadline = week_end + timezone.timedelta(days=3)
        
        return timezone.now().date() > deadline
    
    @property
    def expected_submission_date(self):
        """Calculate the expected submission date for this week."""
        week_start = self.internship.start_date + timezone.timedelta(weeks=self.week_number - 1)
        return week_start + timezone.timedelta(days=6)  # End of the week

class SupervisorFeedback(models.Model):
    """Feedback and private notes from company/institution supervisors on a logbook entry."""
    log_entry = models.ForeignKey(LogbookEntry, on_delete=models.CASCADE, related_name='feedbacks')
    company_supervisor = models.ForeignKey('users.EmployerProfile', on_delete=models.SET_NULL, null=True, blank=True)
    institution_supervisor = models.ForeignKey('users.InstitutionProfile', on_delete=models.SET_NULL, null=True, blank=True)
    public_comment = models.TextField(blank=True, null=True)
    private_note = models.TextField(blank=True, null=True, help_text="Visible only to the supervisor and admins")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        who = self.company_supervisor or self.institution_supervisor
        return f"Feedback by {who} on {self.log_entry}"
