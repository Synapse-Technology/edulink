from uuid import UUID
from typing import Optional, Iterable
from .models import Artifact

def get_artifact_by_id(artifact_id: UUID) -> Optional[Artifact]:
    """
    Get a specific artifact by its UUID.
    """
    try:
        return Artifact.objects.get(id=artifact_id)
    except Artifact.DoesNotExist:
        return None

def list_artifacts_for_student(student_id: UUID) -> Iterable[Artifact]:
    """
    List all artifacts generated for a student.
    """
    return Artifact.objects.filter(student_id=student_id)

def list_artifacts_for_application(application_id: UUID) -> Iterable[Artifact]:
    """
    List all artifacts for a specific internship application/engagement.
    """
    return Artifact.objects.filter(application_id=application_id)

def get_latest_artifact(application_id: UUID, artifact_type: str) -> Optional[Artifact]:
    """
    Get the most recently generated artifact of a specific type for an application.
    """
    return Artifact.objects.filter(
        application_id=application_id, 
        artifact_type=artifact_type
    ).order_by('-created_at').first()
