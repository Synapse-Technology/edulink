from django.db import models
from django.utils.translation import gettext_lazy as _
from shared.db.base_models import BaseModel

class OpportunityStatus(models.TextChoices):
    DRAFT = "DRAFT", _("Draft")
    OPEN = "OPEN", _("Open")
    CLOSED = "CLOSED", _("Closed")

class ApplicationStatus(models.TextChoices):
    APPLIED = "APPLIED", _("Applied")
    SHORTLISTED = "SHORTLISTED", _("Shortlisted")
    ACCEPTED = "ACCEPTED", _("Accepted")
    REJECTED = "REJECTED", _("Rejected")
    ACTIVE = "ACTIVE", _("Active")
    COMPLETED = "COMPLETED", _("Completed")
    TERMINATED = "TERMINATED", _("Terminated")
    CERTIFIED = "CERTIFIED", _("Certified")

class InternshipOpportunity(BaseModel):
    """
    Represents an Internship Opportunity posted by an Institution or Employer.
    """
    # Core Details
    title = models.CharField(max_length=255)
    description = models.TextField()
    department = models.CharField(max_length=255, blank=True)
    cohort = models.CharField(max_length=255, blank=True, help_text="Cohort associated with this internship (e.g., Class of 2025)")
    
    # Requirements
    skills = models.JSONField(default=list, blank=True) # List of strings
    capacity = models.PositiveIntegerField(default=1, help_text="Number of positions available")
    
    # Location
    LOCATION_ONSITE = "ONSITE"
    LOCATION_REMOTE = "REMOTE"
    LOCATION_HYBRID = "HYBRID"
    
    LOCATION_CHOICES = [
        (LOCATION_ONSITE, "On-site"),
        (LOCATION_REMOTE, "Remote"),
        (LOCATION_HYBRID, "Hybrid"),
    ]
    
    location = models.CharField(max_length=255, blank=True)
    location_type = models.CharField(max_length=20, choices=LOCATION_CHOICES, default=LOCATION_ONSITE)
    
    # Actors (The Provider)
    institution_id = models.UUIDField(null=True, blank=True, help_text="The institution owning this internship process")
    employer_id = models.UUIDField(null=True, blank=True, help_text="The employer providing the internship")
    
    # State
    status = models.CharField(
        max_length=20, 
        choices=OpportunityStatus.choices, 
        default=OpportunityStatus.DRAFT
    )
    
    # Metadata
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    duration = models.CharField(max_length=50, blank=True, help_text="Duration description (e.g. '3 months')")
    application_deadline = models.DateTimeField(null=True, blank=True)
    is_institution_restricted = models.BooleanField(default=False, help_text="If true, only students from the owning institution can apply")
    
    class Meta:
        app_label = "internships"
        db_table = "internship_opportunities"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["institution_id"]),
            models.Index(fields=["employer_id"]),
        ]

class InternshipApplication(BaseModel):
    """
    Represents a Student's application to an Opportunity, and the subsequent engagement.
    """
    opportunity = models.ForeignKey(InternshipOpportunity, on_delete=models.CASCADE, related_name="applications")
    student_id = models.UUIDField(help_text="The student applying")
    
    # Supervisors (Assigned for this specific engagement)
    institution_supervisor_id = models.UUIDField(null=True, blank=True)
    employer_supervisor_id = models.UUIDField(null=True, blank=True)
    
    # State
    status = models.CharField(
        max_length=20, 
        choices=ApplicationStatus.choices, 
        default=ApplicationStatus.APPLIED
    )
    
    # Snapshot of student profile at time of application
    application_snapshot = models.JSONField(default=dict, blank=True, help_text="Snapshot of student profile at time of application")
    
    # User Input
    cover_letter = models.TextField(blank=True, help_text="Why the student is a good fit")

    # Final Feedback (Authored by supervisors upon completion)
    final_feedback = models.TextField(blank=True, help_text="Authoritative feedback from supervisor(s)")
    final_rating = models.PositiveIntegerField(null=True, blank=True, help_text="Numeric rating (1-5)")

    class Meta:
        app_label = "internships"
        db_table = "internship_applications"
        unique_together = ["opportunity", "student_id"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["student_id"]),
        ]

class InternshipEvidence(BaseModel):
    """
    Evidence submitted for an internship.
    """
    STATUS_DRAFT = "DRAFT"
    STATUS_SUBMITTED = "SUBMITTED"
    STATUS_REVIEWED = "REVIEWED"
    STATUS_ACCEPTED = "ACCEPTED"
    STATUS_REJECTED = "REJECTED"
    STATUS_REVISION_REQUIRED = "REVISION_REQUIRED"
    
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_REVIEWED, "Reviewed"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_REVISION_REQUIRED, "Revision Required"),
    ]
    
    # Changed from 'internship' to 'application'
    application = models.ForeignKey(InternshipApplication, on_delete=models.CASCADE, related_name="evidence", null=True)
    submitted_by = models.UUIDField()
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='internships/evidence/', blank=True)
    metadata = models.JSONField(default=dict, blank=True) # For structured data (e.g., daily logbook entries)
    
    # Dual Review Fields
    employer_review_status = models.CharField(max_length=20, choices=STATUS_CHOICES, null=True, blank=True)
    employer_reviewed_by = models.UUIDField(null=True, blank=True)
    employer_reviewed_at = models.DateTimeField(null=True, blank=True)
    employer_review_notes = models.TextField(blank=True, help_text="Public comments visible to the student")
    employer_private_notes = models.TextField(blank=True, help_text="Private comments visible only to the supervisor")

    institution_review_status = models.CharField(max_length=20, choices=STATUS_CHOICES, null=True, blank=True)
    institution_reviewed_by = models.UUIDField(null=True, blank=True)
    institution_reviewed_at = models.DateTimeField(null=True, blank=True)
    institution_review_notes = models.TextField(blank=True, help_text="Public comments visible to the student")
    institution_private_notes = models.TextField(blank=True, help_text="Private comments visible only to the supervisor")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SUBMITTED)
    
    TYPE_LOGBOOK = "LOGBOOK"
    TYPE_MILESTONE = "MILESTONE"
    TYPE_REPORT = "REPORT"
    TYPE_OTHER = "OTHER"
    
    TYPE_CHOICES = [
        (TYPE_LOGBOOK, "Logbook Entry"),
        (TYPE_MILESTONE, "Milestone Completion"),
        (TYPE_REPORT, "Report"),
        (TYPE_OTHER, "Other"),
    ]
    
    evidence_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_OTHER)

    class Meta:
        app_label = "internships"
        db_table = "internship_evidence"

class Incident(BaseModel):
    """
    Represents a misconduct flag or issue raised during an internship.
    """
    STATUS_OPEN = "OPEN"
    STATUS_RESOLVED = "RESOLVED"
    STATUS_DISMISSED = "DISMISSED"
    
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_DISMISSED, "Dismissed"),
    ]
    
    # Changed from 'internship' to 'application'
    application = models.ForeignKey(InternshipApplication, on_delete=models.CASCADE, related_name="incidents", null=True)
    reported_by = models.UUIDField()
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    
    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.UUIDField(null=True, blank=True)
    
    class Meta:
        app_label = "internships"
        db_table = "internship_incidents"

class SuccessStory(BaseModel):
    """
    Represents a success story or testimonial from a completed internship.
    """
    # Changed from 'internship' to 'application'
    application = models.OneToOneField(InternshipApplication, on_delete=models.CASCADE, related_name="success_story", null=True)
    student_testimonial = models.TextField(help_text="Quote from the student")
    employer_feedback = models.TextField(blank=True, help_text="Feedback from the employer")
    is_published = models.BooleanField(default=False)
    
    class Meta:
        app_label = "internships"
        db_table = "internship_success_stories"
        ordering = ["-created_at"]
