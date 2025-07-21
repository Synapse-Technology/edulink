from django.db import models
from users.models.student_profile import StudentProfile
from internship.models.internship import Internship

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
