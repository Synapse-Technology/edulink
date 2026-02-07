from django.db import models
from shared.db.base_models import BaseModel
from django.conf import settings

class SupportTicket(BaseModel):
    STATUS_OPEN = 'OPEN'
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_RESOLVED = 'RESOLVED'
    STATUS_CLOSED = 'CLOSED'
    
    STATUS_CHOICES = [
        (STATUS_OPEN, 'Open'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_RESOLVED, 'Resolved'),
        (STATUS_CLOSED, 'Closed'),
    ]

    CATEGORY_TECHNICAL = 'TECHNICAL'
    CATEGORY_AFFILIATION = 'AFFILIATION'
    CATEGORY_INTERNSHIP = 'INTERNSHIP'
    CATEGORY_ACCOUNT = 'ACCOUNT'
    CATEGORY_OTHER = 'OTHER'

    CATEGORY_CHOICES = [
        (CATEGORY_TECHNICAL, 'Technical Issue'),
        (CATEGORY_AFFILIATION, 'Affiliation Query'),
        (CATEGORY_INTERNSHIP, 'Internship Assistance'),
        (CATEGORY_ACCOUNT, 'Account Management'),
        (CATEGORY_OTHER, 'General Inquiry'),
    ]

    PRIORITY_LOW = 'LOW'
    PRIORITY_MEDIUM = 'MEDIUM'
    PRIORITY_HIGH = 'HIGH'
    PRIORITY_URGENT = 'URGENT'

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_MEDIUM, 'Medium'),
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_URGENT, 'Urgent'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='support_tickets')
    tracking_code = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    email = models.EmailField()
    subject = models.CharField(max_length=255)
    message = models.TextField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default=CATEGORY_OTHER)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_LOW)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    
    related_entity_type = models.CharField(max_length=50, blank=True, help_text="e.g., InternshipApplication")
    related_entity_id = models.UUIDField(null=True, blank=True)
    
    assigned_to_id = models.UUIDField(null=True, blank=True, db_index=True)
    
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'support_tickets'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['category']),
            models.Index(fields=['priority']),
            models.Index(fields=['email']),
            models.Index(fields=['assigned_to_id']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f"[{self.tracking_code}] {self.subject}"

class TicketCommunication(BaseModel):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='communications')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    message = models.TextField()
    is_internal = models.BooleanField(default=False, help_text="Visible only to staff")
    
    class Meta:
        ordering = ['created_at']
        db_table = 'support_ticket_communications'

class TicketAttachment(BaseModel):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='support/attachments/')
    file_name = models.CharField(max_length=255)
    
    class Meta:
        db_table = 'support_ticket_attachments'

class Feedback(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='feedbacks')
    message = models.TextField()
    is_anonymous = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
