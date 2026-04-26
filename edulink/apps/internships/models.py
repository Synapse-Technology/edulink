from django.db import models
from django.utils.translation import gettext_lazy as _
from edulink.shared.db.base_models import BaseModel

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
    WITHDRAWN = "WITHDRAWN", _("Withdrawn by Student")

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
    
    @property
    def is_deadline_expired(self) -> bool:
        """
        Computed property: Returns True if the application deadline has passed.
        
        Per architecture rules: This is a read-only computed property that combines
        data fields to derive state. Follows rule: models describe what exists, not
        computed behavior. No DB writes, no side effects.
        """
        from django.utils import timezone
        return self.application_deadline and timezone.now() > self.application_deadline
    
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
    
    # Optimistic locking: prevents concurrent state corruption
    version = models.PositiveIntegerField(default=1, help_text="Version for optimistic locking")
    
    # Snapshot of student profile at time of application
    application_snapshot = models.JSONField(default=dict, blank=True, help_text="Snapshot of student profile at time of application")
    
    # User Input
    cover_letter = models.TextField(blank=True, help_text="Why the student is a good fit")

    # Final Feedback (Authored by supervisors upon completion)
    final_feedback = models.TextField(blank=True, help_text="Authoritative feedback from supervisor(s)")
    final_rating = models.PositiveIntegerField(null=True, blank=True, help_text="Numeric rating (1-5)")
    
    # Withdrawal metadata
    withdrawn_at = models.DateTimeField(null=True, blank=True, help_text="When student withdrew")
    withdrawal_reason = models.TextField(blank=True, help_text="Why student withdrew")

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
    Workflow: OPEN → ASSIGNED → INVESTIGATING → PENDING_APPROVAL → RESOLVED
                                                                  ↘ DISMISSED
    """
    STATUS_OPEN = "OPEN"
    STATUS_ASSIGNED = "ASSIGNED"
    STATUS_INVESTIGATING = "INVESTIGATING"
    STATUS_PENDING_APPROVAL = "PENDING_APPROVAL"
    STATUS_RESOLVED = "RESOLVED"
    STATUS_DISMISSED = "DISMISSED"
    
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open / Reported"),
        (STATUS_ASSIGNED, "Assigned to Investigator"),
        (STATUS_INVESTIGATING, "Under Investigation"),
        (STATUS_PENDING_APPROVAL, "Pending Resolution Approval"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_DISMISSED, "Dismissed"),
    ]
    
    # Changed from 'internship' to 'application'
    application = models.ForeignKey(InternshipApplication, on_delete=models.CASCADE, related_name="incidents", null=True)
    reported_by = models.UUIDField()
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    
    # Investigation tracking
    investigator_id = models.UUIDField(null=True, blank=True, help_text="Who is investigating this incident")
    assigned_at = models.DateTimeField(null=True, blank=True, help_text="When investigator was assigned")
    
    resolution_notes = models.TextField(blank=True, help_text="Public resolution notes visible to all parties")
    investigation_notes = models.TextField(blank=True, help_text="Private investigation notes")
    
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.UUIDField(null=True, blank=True)
    
    # Audit metadata
    metadata = models.JSONField(default=dict, blank=True, help_text="History and tracking data")
    
    class Meta:
        app_label = "internships"
        db_table = "internship_incidents"

class SupervisorAssignment(BaseModel):
    """
    Represents the assignment of a supervisor to an internship application.
    Workflow: PENDING → ACCEPTED or REJECTED
    
    Separation of concerns:
    - Admin assigns supervisor (creates assignment in PENDING state)
    - Supervisor reviews and accepts/rejects
    - Acceptance converts to final supervisor on the application
    """
    STATUS_PENDING = "PENDING"
    STATUS_ACCEPTED = "ACCEPTED"
    STATUS_REJECTED = "REJECTED"
    
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending Supervisor Review"),
        (STATUS_ACCEPTED, "Supervisor Accepted"),
        (STATUS_REJECTED, "Supervisor Rejected"),
    ]
    
    ASSIGNMENT_EMPLOYER = "EMPLOYER"
    ASSIGNMENT_INSTITUTION = "INSTITUTION"
    
    ASSIGNMENT_TYPE_CHOICES = [
        (ASSIGNMENT_EMPLOYER, "Employer Supervisor"),
        (ASSIGNMENT_INSTITUTION, "Institution Supervisor"),
    ]
    
    # Core references
    application = models.ForeignKey(
        InternshipApplication,
        on_delete=models.CASCADE,
        related_name="supervisor_assignments",
        help_text="The internship application being assigned"
    )
    supervisor_id = models.UUIDField(help_text="The supervisor being assigned")
    assigned_by_id = models.UUIDField(help_text="Who assigned this supervisor (admin)")
    
    # Assignment metadata
    assignment_type = models.CharField(
        max_length=20,
        choices=ASSIGNMENT_TYPE_CHOICES,
        help_text="Whether this is employer or institution supervisor"
    )
    
    # Workflow state
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Current state: PENDING (assigned but not reviewed), ACCEPTED (supervisor accepted), REJECTED (supervisor rejected)"
    )
    
    # Timestamps
    assigned_at = models.DateTimeField(auto_now_add=True, help_text="When supervisor was assigned by admin")
    accepted_at = models.DateTimeField(null=True, blank=True, help_text="When supervisor accepted the assignment")
    rejected_at = models.DateTimeField(null=True, blank=True, help_text="When supervisor rejected the assignment")
    rejection_reason = models.TextField(blank=True, help_text="Why supervisor rejected (optional)")
    
    # Audit metadata
    metadata = models.JSONField(default=dict, blank=True, help_text="Audit trail and tracking data")
    
    class Meta:
        app_label = "internships"
        db_table = "internship_supervisor_assignments"
        unique_together = [("application", "supervisor_id", "assignment_type")]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["application", "assignment_type"]),
            models.Index(fields=["supervisor_id"]),
        ]

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


class InternshipState:
    """Backward-compatible state namespace for older callers and tests."""

    DRAFT = OpportunityStatus.DRAFT
    OPEN = OpportunityStatus.OPEN
    CLOSED = OpportunityStatus.CLOSED
    APPLIED = ApplicationStatus.APPLIED
    SHORTLISTED = ApplicationStatus.SHORTLISTED
    ACCEPTED = ApplicationStatus.ACCEPTED
    REJECTED = ApplicationStatus.REJECTED
    ACTIVE = ApplicationStatus.ACTIVE
    COMPLETED = ApplicationStatus.COMPLETED
    TERMINATED = ApplicationStatus.TERMINATED
    CERTIFIED = ApplicationStatus.CERTIFIED
    WITHDRAWN = ApplicationStatus.WITHDRAWN


Internship = InternshipOpportunity
