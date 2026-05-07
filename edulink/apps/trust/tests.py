from django.test import TestCase
from unittest.mock import patch, MagicMock
from uuid import uuid4
import uuid

from edulink.apps.trust.services import (
    compute_institution_trust_tier,
    compute_employer_trust_tier,
    compute_student_trust_tier
)
from edulink.apps.trust.queries import calculate_student_trust_state

# Import constants directly to avoid model dependency
from edulink.apps.institutions.constants import (
    STATUS_ACTIVE as INSTITUTION_STATUS_ACTIVE,
    TRUST_REGISTERED as INSTITUTION_TRUST_REGISTERED,
    TRUST_ACTIVE as INSTITUTION_TRUST_ACTIVE,
    TRUST_HIGH as INSTITUTION_TRUST_HIGH,
    TRUST_PARTNER as INSTITUTION_TRUST_PARTNER,
    STATUS_VERIFIED as INSTITUTION_STATUS_VERIFIED
)

from edulink.apps.employers.constants import (
    EMPLOYER_STATUS_ACTIVE,
    EMPLOYER_TRUST_UNVERIFIED,
    EMPLOYER_TRUST_VERIFIED,
    EMPLOYER_TRUST_ACTIVE_HOST,
    EMPLOYER_TRUST_PARTNER
)

from edulink.apps.students.constants import TRUST_EVENT_POINTS
from edulink.apps.institutions.models import Institution
from edulink.apps.internships.models import ApplicationStatus, InternshipApplication, InternshipOpportunity
from edulink.apps.students.models import Student, StudentInstitutionAffiliation

class TrustServiceTests(TestCase):
    
    # -------------------------------------------------------------------------
    # Institution Tests
    # -------------------------------------------------------------------------

    @patch('edulink.apps.trust.services.get_institution_details_for_trust')
    @patch('edulink.apps.trust.services.get_events_for_entity')
    @patch('edulink.apps.trust.services.update_institution_trust_level')
    @patch('edulink.apps.trust.services.record_event')
    def test_institution_trust_tier_active(self, mock_record, mock_update, mock_get_events, mock_get_details):
        """Test institution trust tier promotion to ACTIVE (Level 1)"""
        inst_id = uuid4()
        
        # Mock details: Active status, currently Registered tier
        mock_get_details.return_value = {
            "id": inst_id,
            "status": INSTITUTION_STATUS_ACTIVE,
            "trust_level": INSTITUTION_TRUST_REGISTERED,
            "trust_label": "Registered"
        }
        
        # Mock events: None relevant
        mock_get_events.return_value = []
        
        # Execute
        result = compute_institution_trust_tier(institution_id=inst_id)
        
        # Assert result
        self.assertEqual(result['trust_level'], INSTITUTION_TRUST_ACTIVE)
        
        # Assert update called
        mock_update.assert_called_once_with(institution_id=inst_id, new_level=INSTITUTION_TRUST_ACTIVE)
        
        # Assert ledger event
        mock_record.assert_called_once()
        self.assertEqual(mock_record.call_args[1]['event_type'], "INSTITUTION_TRUST_TIER_UPDATED")

    @patch('edulink.apps.trust.services.get_institution_details_for_trust')
    @patch('edulink.apps.trust.services.check_institution_has_internships')
    @patch('edulink.apps.trust.services.get_events_for_entity')
    @patch('edulink.apps.trust.services.update_institution_trust_level')
    def test_institution_trust_tier_high(self, mock_update, mock_get_events, mock_has_internships, mock_get_details):
        """Test institution promotion to HIGH TRUST (Level 2)"""
        inst_id = uuid4()
        
        # Mock details: Active, currently Active tier
        mock_get_details.return_value = {
            "id": inst_id,
            "status": INSTITUTION_STATUS_ACTIVE,
            "trust_level": INSTITUTION_TRUST_ACTIVE,
            "trust_label": "Active"
        }
        
        # Mock Internships exist
        mock_has_internships.return_value = True
        
        # Mock ledger events: STUDENT_VERIFIED_BY_INSTITUTION
        mock_event = MagicMock()
        mock_event.event_type = "STUDENT_VERIFIED_BY_INSTITUTION"
        mock_get_events.return_value = [mock_event]
        
        # Execute
        result = compute_institution_trust_tier(institution_id=inst_id)
        
        # Assert result
        self.assertEqual(result['trust_level'], INSTITUTION_TRUST_HIGH)
        mock_update.assert_called_once_with(institution_id=inst_id, new_level=INSTITUTION_TRUST_HIGH)

    # -------------------------------------------------------------------------
    # Employer Tests
    # -------------------------------------------------------------------------

    @patch('edulink.apps.trust.services.get_employer_details_for_trust')
    @patch('edulink.apps.trust.services.count_completed_internships_for_employer')
    @patch('edulink.apps.trust.services.get_events_for_entity')
    @patch('edulink.apps.trust.services.update_employer_trust_level')
    def test_employer_trust_tier_partner(self, mock_update, mock_get_events, mock_count_completed, mock_get_details):
        """Test employer trust tier promotion to PARTNER (Level 3)"""
        emp_id = uuid4()
        
        # Mock details: Active, currently Verified
        mock_get_details.return_value = {
            "id": emp_id,
            "status": EMPLOYER_STATUS_ACTIVE,
            "trust_level": EMPLOYER_TRUST_VERIFIED,
            "trust_label": "Verified"
        }
        
        # Mock 5 completed internships (High Volume)
        mock_count_completed.return_value = 5
        
        # Mock events: None
        mock_get_events.return_value = []
        
        # Execute
        result = compute_employer_trust_tier(employer_id=emp_id)
        
        # Assert result
        self.assertEqual(result['trust_level'], EMPLOYER_TRUST_PARTNER)
        mock_update.assert_called_once_with(employer_id=emp_id, new_level=EMPLOYER_TRUST_PARTNER)

    # -------------------------------------------------------------------------
    # Student Tests
    # -------------------------------------------------------------------------

    @patch('edulink.apps.notifications.services.send_trust_tier_changed_notification')
    @patch('edulink.apps.trust.services.update_student_trust_level')
    def test_student_trust_tier_calculation(self, mock_update, mock_notification):
        """Institution verification is a canonical state requirement, not just an event name."""
        institution = Institution.objects.create(
            name="Trust University",
            domain=f"trust-{uuid.uuid4()}.ac.ke",
            is_active=True,
            is_verified=True,
            status=Institution.STATUS_ACTIVE,
        )
        student = Student.objects.create(
            user_id=uuid4(),
            email=f"student-{uuid.uuid4()}@example.com",
            institution_id=institution.id,
            is_verified=True,
        )
        StudentInstitutionAffiliation.objects.create(
            student_id=student.id,
            institution_id=institution.id,
            status=StudentInstitutionAffiliation.STATUS_APPROVED,
            claimed_via=StudentInstitutionAffiliation.CLAIMED_VIA_DOMAIN,
        )

        result = compute_student_trust_tier(student_id=str(student.id))

        self.assertEqual(result["tier_level"], 2)
        self.assertEqual(result["tier_label"], "Institution Verified")
        self.assertEqual(result["score"], 50)
        self.assertFalse(result["requirement_status"]["documents_uploaded"]["completed"])
        mock_update.assert_called_once_with(
            student_id=student.id,
            new_level=2,
            new_points=50,
        )
        mock_notification.assert_called_once()

    def test_student_trust_state_promotes_certified_completion(self):
        institution = Institution.objects.create(
            name="Certified University",
            domain=f"certified-{uuid.uuid4()}.ac.ke",
            is_active=True,
            is_verified=True,
            status=Institution.STATUS_ACTIVE,
        )
        student = Student.objects.create(
            user_id=uuid4(),
            email=f"certified-{uuid.uuid4()}@example.com",
            institution_id=institution.id,
            is_verified=True,
        )
        StudentInstitutionAffiliation.objects.create(
            student_id=student.id,
            institution_id=institution.id,
            status=StudentInstitutionAffiliation.STATUS_APPROVED,
            claimed_via=StudentInstitutionAffiliation.CLAIMED_VIA_DOMAIN,
        )
        opportunity = InternshipOpportunity.objects.create(
            title="Certified Placement",
            description="Placement",
            institution_id=institution.id,
        )
        InternshipApplication.objects.create(
            opportunity=opportunity,
            student_id=student.id,
            status=ApplicationStatus.CERTIFIED,
        )

        result = calculate_student_trust_state(student_id=str(student.id))

        self.assertEqual(result["tier_level"], 4)
        self.assertEqual(result["tier_label"], "Completion Certified")
        self.assertTrue(result["requirement_status"]["completion_certified"]["completed"])
