# All models must inherit from BaseModel unless explicitly justified.

from django.db import models
from django.utils.translation import gettext_lazy as _
from shared.db.base_models import BaseModel

class ArtifactType(models.TextChoices):
    CERTIFICATE = "CERTIFICATE", _("Certificate of Completion")
    LOGBOOK_REPORT = "LOGBOOK_REPORT", _("Internship Logbook Report")
    PERFORMANCE_SUMMARY = "PERFORMANCE_SUMMARY", _("Performance Summary")

class Artifact(BaseModel):
    """
    Represents a generated professional document (PDF) for an internship.
    """
    application_id = models.UUIDField(help_text="Reference to InternshipApplication")
    student_id = models.UUIDField(help_text="Reference to Student")
    
    artifact_type = models.CharField(
        max_length=50,
        choices=ArtifactType.choices,
        default=ArtifactType.LOGBOOK_REPORT
    )
    
    file = models.FileField(upload_to='artifacts/%Y/%m/', help_text="The generated PDF file")
    
    # Store context to allow regeneration if needed
    metadata = models.JSONField(default=dict, blank=True, help_text="Contextual data used for generation")
    
    # Traceability
    generated_by = models.UUIDField(help_text="User ID who triggered the generation")
    
    tracking_code = models.CharField(
        max_length=20, 
        unique=True, 
        null=True, 
        blank=True,
        help_text="Unique verification code (e.g. EDULINK-ABC123)"
    )
    
    class Meta:
        app_label = "reports"
        db_table = "generated_artifacts"
        indexes = [
            models.Index(fields=["application_id"]),
            models.Index(fields=["student_id"]),
            models.Index(fields=["artifact_type"]),
            models.Index(fields=["tracking_code"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_artifact_type_display()} - {self.application_id}"