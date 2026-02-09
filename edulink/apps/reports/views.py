from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from uuid import UUID
import os

from .models import Artifact, ArtifactType
from .serializers import ArtifactSerializer
from .services import (
    generate_completion_certificate, 
    generate_logbook_report, 
    generate_performance_summary,
    verify_artifact
)
from .queries import list_artifacts_for_student, get_artifact_by_id
from .policies import can_generate_artifact, can_view_artifact

import logging

logger = logging.getLogger(__name__)

class ArtifactViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Viewset for managing professional artifacts (Certificates, Reports).
    """
    serializer_class = ArtifactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_system_admin:
            return Artifact.objects.all()
        
        # Logic to filter by student_id or application ownership
        from edulink.apps.students.queries import get_student_for_user
        student = get_student_for_user(str(user.id))
        if student:
            return list_artifacts_for_student(student.id)
            
        return Artifact.objects.none()

    def get_authenticators(self):
        if self.action == 'verify':
            return []
        return super().get_authenticators()

    @action(detail=False, methods=['post'], url_path='generate')
    def generate_artifact(self, request):
        """
        Trigger generation of an artifact.
        """
        application_id = request.data.get('application_id')
        artifact_type = request.data.get('artifact_type')
        
        if not application_id or not artifact_type:
            return Response(
                {"error": "application_id and artifact_type are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            application_id = UUID(application_id)
        except ValueError:
            return Response({"error": "Invalid application_id"}, status=status.HTTP_400_BAD_REQUEST)

        # Policy Check
        if not can_generate_artifact(request.user, application_id):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        # Rate Limiting / Generation Limit
        existing_count = Artifact.objects.filter(
            application_id=application_id, 
            artifact_type=artifact_type
        ).count()
        
        # Limit CERTIFICATE to 2 generations, others to 5 (as a safeguard)
        MAX_GENERATIONS = {
            ArtifactType.CERTIFICATE: 2,
            ArtifactType.LOGBOOK_REPORT: 5,
            ArtifactType.PERFORMANCE_SUMMARY: 5
        }
        
        limit = MAX_GENERATIONS.get(artifact_type, 3)
        if existing_count >= limit:
            return Response(
                {"error": f"You have reached the maximum generation limit ({limit}) for this document type. Please download your previous version."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if artifact_type == ArtifactType.CERTIFICATE:
                artifact = generate_completion_certificate(
                    application_id=application_id, 
                    actor_id=request.user.id
                )
            elif artifact_type == ArtifactType.LOGBOOK_REPORT:
                artifact = generate_logbook_report(
                    application_id=application_id, 
                    actor_id=request.user.id
                )
            elif artifact_type == ArtifactType.PERFORMANCE_SUMMARY:
                artifact = generate_performance_summary(
                    application_id=application_id, 
                    actor_id=request.user.id
                )
            else:
                return Response({"error": "Unsupported artifact type"}, status=status.HTTP_400_BAD_REQUEST)
                
            return Response(ArtifactSerializer(artifact).data, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Artifact generation failed")
            return Response({"error": "Failed to generate artifact"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='verify/(?P<artifact_id>[^/.]+)', permission_classes=[permissions.AllowAny])
    def verify(self, request, artifact_id=None):
        """
        Public endpoint to verify an artifact's authenticity.
        Accepts either a UUID or a tracking_code.
        """
        if not artifact_id:
            return Response({"error": "Artifact ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        result = verify_artifact(artifact_id)
        if not result["verified"]:
            return Response(result, status=status.HTTP_404_NOT_FOUND)

        # We don't want to expose everything in the public response
        response_data = {
            "verified": True,
            "artifact_type": result["type"],
            "student_name": result["student_name"],
            "generated_at": result["generated_at"],
            "tracking_code": result["tracking_code"],
            "ledger_hash": result["ledger_event"]["hash"],
            "ledger_timestamp": result["ledger_event"]["occurred_at"],
        }
        
        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download the artifact PDF.
        """
        try:
            artifact_id = UUID(pk)
        except ValueError:
            return Response({"error": "Invalid ID format"}, status=status.HTTP_400_BAD_REQUEST)
            
        artifact = get_artifact_by_id(artifact_id)
        if not artifact:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Policy check (May I?)
        if not can_view_artifact(request.user, artifact):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        if not artifact.file:
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)

        # Prepare response
        serializer = ArtifactSerializer(artifact)
        safe_filename = serializer.data['download_filename']

        response = HttpResponse(artifact.file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{safe_filename}"'
        return response
