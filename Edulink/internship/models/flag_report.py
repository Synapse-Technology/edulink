from django.db import models
from users.models.student_profile import StudentProfile
from .internship import Internship
from .base import BaseModel

class FlagReport(BaseModel):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='flag_reports')
    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='flag_reports')
    reason = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Flag by {self.student} on {self.internship.title}: {self.reason}" 