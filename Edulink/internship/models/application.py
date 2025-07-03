from django.db import models
from users.models.student_profile import StudentProfile
from .internship import Internship

class Application(models.Model):
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
        ],
        default='pending'
    )
    cover_letter = models.TextField(blank=True)
    resume = models.FileField(upload_to='resumes/', blank=True)

    class Meta:
        unique_together = ('student', 'internship')

    def __str__(self):
        return f"Application by {self.student} for {self.internship.title}"
