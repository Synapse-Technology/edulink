import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4
from datetime import date, datetime

from django.core.files.base import ContentFile
from edulink.apps.reports.services import (
    generate_completion_certificate,
    generate_performance_summary,
    generate_logbook_report,
    verify_artifact,
    ArtifactType
)
from edulink.apps.reports.models import Artifact

@pytest.fixture
def mock_dependencies():
    with patch("edulink.apps.reports.services.get_application_by_id") as mock_get_app, \
         patch("edulink.apps.reports.services.get_student_by_id") as mock_get_student, \
         patch("edulink.apps.reports.services.get_employer_by_id") as mock_get_employer, \
         patch("edulink.apps.reports.services.get_supervisor_by_id") as mock_get_supervisor, \
         patch("edulink.apps.reports.services.get_institution_staff_by_id") as mock_get_inst_staff, \
         patch("edulink.apps.reports.services.get_evidence_for_application") as mock_get_evidence, \
         patch("edulink.apps.reports.services.get_incidents_for_application") as mock_get_incidents, \
         patch("edulink.apps.reports.services.record_event") as mock_record_event, \
         patch("edulink.apps.reports.services._get_student_institution_info") as mock_get_inst_info:
        
        yield {
            "get_app": mock_get_app,
            "get_student": mock_get_student,
            "get_employer": mock_get_employer,
            "get_supervisor": mock_get_supervisor,
            "get_inst_staff": mock_get_inst_staff,
            "get_evidence": mock_get_evidence,
            "get_incidents": mock_get_incidents,
            "record_event": mock_record_event,
            "get_inst_info": mock_get_inst_info
        }

@pytest.mark.django_db
class TestReportGeneration:
    def setup_method(self):
        self.actor_id = uuid4()
        self.application_id = uuid4()
        self.student_id = uuid4()
        self.employer_id = uuid4()
        
        # Common Mock Objects
        self.mock_app = MagicMock()
        self.mock_app.id = self.application_id
        self.mock_app.student_id = self.student_id
        self.mock_app.status = "COMPLETED"
        self.mock_app.opportunity.title = "Software Engineer Intern"
        self.mock_app.opportunity.employer_id = self.employer_id
        self.mock_app.opportunity.start_date = date(2023, 1, 1)
        self.mock_app.opportunity.end_date = date(2023, 6, 30)
        self.mock_app.opportunity.department = "Engineering"
        self.mock_app.employer_supervisor_id = uuid4()
        self.mock_app.institution_supervisor_id = uuid4()
        self.mock_app.final_feedback = "Excellent work!"

        self.mock_student = MagicMock()
        self.mock_student.user.first_name = "John"
        self.mock_student.user.last_name = "Doe"

        self.mock_employer = MagicMock()
        self.mock_employer.name = "Tech Corp"

    def test_generate_certificate_success(self, mock_dependencies):
        """Test successful certificate generation"""
        # Setup Mocks
        mock_dependencies["get_app"].return_value = self.mock_app
        mock_dependencies["get_student"].return_value = self.mock_student
        mock_dependencies["get_employer"].return_value = self.mock_employer
        mock_dependencies["get_inst_info"].return_value = "University of Tech"
        
        # Mock Notification Service
        with patch("edulink.apps.reports.services.send_certificate_generated_notification") as mock_notify:
            # Execute
            artifact = generate_completion_certificate(
                application_id=self.application_id, 
                actor_id=self.actor_id
            )

            # Assertions
            assert artifact.artifact_type == ArtifactType.CERTIFICATE
            assert artifact.tracking_code.startswith("EDULINK-C-")
            assert artifact.metadata["student_name"] == "John Doe"
            assert artifact.metadata["employer_name"] == "Tech Corp"
            assert artifact.file is not None
            
            # Verify Ledger Event
            mock_dependencies["record_event"].assert_called_once()
            call_args = mock_dependencies["record_event"].call_args[1]
            assert call_args["event_type"] == "CERTIFICATE_GENERATED"
            assert call_args["entity_id"] == self.application_id
            
            # Verify Notification
            mock_notify.assert_called_once()

    def test_generate_certificate_invalid_status(self, mock_dependencies):
        """Test certificate generation fails if status is not COMPLETED/CERTIFIED"""
        self.mock_app.status = "IN_PROGRESS"
        mock_dependencies["get_app"].return_value = self.mock_app

        with pytest.raises(ValueError, match="Internship must be marked as COMPLETED"):
            generate_completion_certificate(
                application_id=self.application_id, 
                actor_id=self.actor_id
            )

    def test_generate_performance_summary(self, mock_dependencies):
        """Test performance summary generation with metrics"""
        # Setup Mocks
        mock_dependencies["get_app"].return_value = self.mock_app
        mock_dependencies["get_student"].return_value = self.mock_student
        mock_dependencies["get_employer"].return_value = self.mock_employer
        mock_dependencies["get_inst_info"].return_value = "University of Tech"
        
        # Mock Evidence/Incidents
        mock_logbooks = MagicMock()
        mock_logbooks.filter.return_value.count.return_value = 10 # 10 Logbooks
        mock_dependencies["get_evidence"].return_value = mock_logbooks
        
        mock_incidents = MagicMock()
        mock_incidents.count.return_value = 0
        mock_dependencies["get_incidents"].return_value = mock_incidents

        # Mock Notification Service
        with patch("edulink.apps.reports.services.send_performance_summary_generated_notification") as mock_notify:
            # Execute
            artifact = generate_performance_summary(
                application_id=self.application_id, 
                actor_id=self.actor_id
            )

            # Assertions
            assert artifact.artifact_type == ArtifactType.PERFORMANCE_SUMMARY
            assert artifact.metadata["logbooks_accepted"] == 10
            assert artifact.metadata["final_feedback"] == "Excellent work!"
            assert "performance_" in artifact.file.name
            
            # Verify Notification
            mock_notify.assert_called_once()

    def test_generate_logbook_report(self, mock_dependencies):
        """Test logbook report generation with entries"""
        # Setup Mocks
        mock_dependencies["get_app"].return_value = self.mock_app
        mock_dependencies["get_student"].return_value = self.mock_student
        mock_dependencies["get_inst_info"].return_value = "University of Tech"
        
        # Ensure employer mock is set correctly
        self.mock_employer.name = "Tech Corp"
        mock_dependencies["get_employer"].return_value = self.mock_employer
        
        # Mock Logbook Data
        mock_logbook_item = MagicMock()
        mock_logbook_item.title = "Week 1"
        mock_logbook_item.description = "Onboarding"
        mock_logbook_item.metadata = {"entries": {"2023-01-01": "Orientation"}}
        mock_logbook_item.employer_review_notes = "Good start"
        mock_logbook_item.institution_review_notes = None
        mock_logbook_item.created_at = datetime(2023, 1, 7)
        
        mock_qs = MagicMock()
        mock_qs.filter.return_value.order_by.return_value = [mock_logbook_item]
        mock_dependencies["get_evidence"].return_value = mock_qs

        # Mock Notification Service
        with patch("edulink.apps.reports.services.send_logbook_report_generated_notification") as mock_notify:
            # Execute
            artifact = generate_logbook_report(
                application_id=self.application_id, 
                actor_id=self.actor_id
            )

            # Assertions
            assert artifact.artifact_type == ArtifactType.LOGBOOK_REPORT
            assert len(artifact.metadata["logbooks"]) == 1
            assert artifact.metadata["logbooks"][0]["title"] == "Week 1"
            assert "logbook_report_" in artifact.file.name
            
            # Verify Notification
            mock_notify.assert_called_once()

@pytest.mark.django_db
class TestArtifactVerification:
    def test_verify_artifact_success(self, mock_dependencies):
        """Test verification logic"""
        # Create Artifact
        artifact = Artifact.objects.create(
            application_id=uuid4(),
            student_id=uuid4(),
            artifact_type=ArtifactType.CERTIFICATE,
            generated_by=uuid4(),
            metadata={"student_name": "Jane Doe"},
            tracking_code="EDULINK-C-TEST12"
        )
        
        # Mock Ledger Event
        mock_event = MagicMock()
        mock_event.id = uuid4()
        mock_event.occurred_at = datetime.now()
        mock_event.hash = "abc123hash"
        mock_event.event_type = "CERTIFICATE_GENERATED"
        
        with patch("edulink.apps.reports.services.find_event_by_artifact_id", return_value=mock_event):
            # Test with Tracking Code
            result = verify_artifact("EDULINK-C-TEST12")
            
            assert result["verified"] is True
            assert result["student_name"] == "Jane Doe"
            assert result["ledger_event"]["hash"] == "abc123hash"

    def test_verify_artifact_not_found(self):
        """Test verification with invalid code"""
        result = verify_artifact("INVALID-CODE")
        assert result["verified"] is False
        assert result["error"] == "Artifact not found in system"
