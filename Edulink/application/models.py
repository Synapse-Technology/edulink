from django.db import models
from django.conf import settings
from internship.models import Internship  # Use the Internship model from the internship app

class Application(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    internship = models.ForeignKey(Internship, on_delete=models.CASCADE)
    status_choices = [
        ('applied', 'Applied'),
        ('reviewing', 'Reviewing'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]
    status = models.CharField(max_length=20, choices=status_choices, default='applied')
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} -> {self.internship} ({self.status})"

class SupervisorFeedback(models.Model):
    application = models.OneToOneField(Application, on_delete=models.CASCADE)
    feedback = models.TextField()
    rating = models.PositiveSmallIntegerField()

    def __str__(self):
        return f"Feedback for {self.application}"


# Create your models here.
