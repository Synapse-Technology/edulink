from django.db import models
from edulink.shared.db.base_models import BaseModel

class ContactSubmission(BaseModel):
    """
    Stores contact form submissions from the public website.
    This is separated from Support Tickets for general inquiries.
    """
    name = models.CharField(max_length=255)
    email = models.EmailField()
    subject = models.CharField(max_length=255)
    message = models.TextField()
    
    is_processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by_id = models.UUIDField(null=True, blank=True)
    internal_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'contact_submissions'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['is_processed']),
        ]

    def __str__(self):
        return f"Contact from {self.name} - {self.subject}"
