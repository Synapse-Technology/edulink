from uuid import uuid4
from unittest.mock import patch
from io import BytesIO

from django.core.files.base import ContentFile
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from edulink.apps.accounts.models import User
from edulink.apps.reports.models import Artifact, ArtifactType
from edulink.apps.reports.views import ArtifactViewSet


class ArtifactDownloadViewTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username="artifact-user",
            email="artifact-user@test.com",
            password="password123",
            role=User.ROLE_SYSTEM_ADMIN,
        )

    def test_download_returns_404_when_storage_file_missing(self):
        artifact = Artifact.objects.create(
            application_id=uuid4(),
            student_id=uuid4(),
            artifact_type=ArtifactType.CERTIFICATE,
            generated_by=self.user.id,
            metadata={"student_name": "Test User"},
            tracking_code="EDULINK-C-MISS01",
            file="artifacts/2026/04/missing.pdf",
        )

        view = ArtifactViewSet.as_view({"get": "download"})
        request = self.factory.get(f"/api/reports/artifacts/{artifact.id}/download/")
        force_authenticate(request, user=self.user)

        with patch("edulink.apps.reports.views.get_artifact_by_id", return_value=artifact), \
             patch("edulink.apps.reports.views.can_view_artifact", return_value=True):
            response = view(request, pk=str(artifact.id))

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error"], "File not found")

    def test_download_streams_file_when_present(self):
        artifact = Artifact.objects.create(
            application_id=uuid4(),
            student_id=uuid4(),
            artifact_type=ArtifactType.CERTIFICATE,
            generated_by=self.user.id,
            metadata={"student_name": "Test User"},
            tracking_code="EDULINK-C-OK0001",
        )
        artifact.file.save("certificate_test.pdf", ContentFile(b"%PDF-1.4 test"))

        view = ArtifactViewSet.as_view({"get": "download"})
        request = self.factory.get(f"/api/reports/artifacts/{artifact.id}/download/")
        force_authenticate(request, user=self.user)

        with patch("edulink.apps.reports.views.get_artifact_by_id", return_value=artifact), \
             patch("edulink.apps.reports.views.can_view_artifact", return_value=True):
            response = view(request, pk=str(artifact.id))

        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment; filename=", response["Content-Disposition"])

    def test_download_uses_url_fallback_when_storage_open_fails(self):
        artifact = Artifact.objects.create(
            application_id=uuid4(),
            student_id=uuid4(),
            artifact_type=ArtifactType.PERFORMANCE_SUMMARY,
            generated_by=self.user.id,
            metadata={"student_name": "Test User"},
            tracking_code="EDULINK-P-FALLBK",
            file="artifacts/2026/04/fallback.pdf",
        )

        view = ArtifactViewSet.as_view({"get": "download"})
        request = self.factory.get(f"/api/reports/artifacts/{artifact.id}/download/")
        force_authenticate(request, user=self.user)

        class _RemoteFile(BytesIO):
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc_val, exc_tb):
                self.close()

        with patch("edulink.apps.reports.views.get_artifact_by_id", return_value=artifact), \
             patch("edulink.apps.reports.views.can_view_artifact", return_value=True), \
             patch.object(artifact.file.storage, "open", side_effect=Exception("open failed")), \
               patch("edulink.apps.reports.services.urlopen", return_value=_RemoteFile(b"%PDF-1.4 fallback")):
            response = view(request, pk=str(artifact.id))

        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment; filename=", response["Content-Disposition"])
