from django.db import models
from django.conf import settings
from users.models.student_profile import StudentProfile
from internship.models.internship import Internship

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

class SupervisorFeedback(models.Model):
    application = models.OneToOneField(Application, on_delete=models.CASCADE)
    feedback = models.TextField()
    rating = models.PositiveSmallIntegerField()

    def __str__(self):
        return f"Feedback for {self.application}"


# Create your models here.
