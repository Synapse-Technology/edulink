from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from edulink.apps.internships.models import Internship, InternshipState, InternshipEvidence
from edulink.apps.internships.services import (
    create_internship_opportunity, publish_internship, apply_for_internship,
    submit_evidence, review_evidence
)
from edulink.apps.internships.workflows import workflow
from edulink.apps.ledger.models import LedgerEvent
from edulink.apps.students.models import Student
from edulink.apps.institutions.models import Institution, InstitutionStaff
from edulink.apps.employers.models import Supervisor
from uuid import uuid4

User = get_user_model()

class CoordinationEngineTest(TestCase):
    def setUp(self):
        # Setup Actors
        self.inst_admin = User.objects.create_user(username="inst_admin", email="inst@test.com", password="password", role=User.ROLE_INSTITUTION_ADMIN)
        self.employer_admin = User.objects.create_user(username="emp_admin", email="emp@test.com", password="password", role=User.ROLE_EMPLOYER_ADMIN)
        self.student_user = User.objects.create_user(username="student", email="student@test.com", password="password", role=User.ROLE_STUDENT)
        
        # Setup Institution & Staff
        self.institution = Institution.objects.create(name="Test Inst", domain="test.edu")
        InstitutionStaff.objects.create(user=self.inst_admin, institution=self.institution, role=InstitutionStaff.ROLE_ADMIN, is_active=True)
        
        # Setup Student Profile
        self.student = Student.objects.create(user_id=self.student_user.id, email=self.student_user.email)
        
        # Setup Employer
        self.employer_id = uuid4()
        
    def test_full_lifecycle(self):
        # 1. Create Opportunity (DRAFT)
        internship = create_internship_opportunity(
            actor=self.inst_admin,
            title="Software Eng Internship",
            description="Code things",
            institution_id=self.institution.id,
            employer_id=self.employer_id
        )
        self.assertEqual(internship.status, InternshipState.DRAFT)
        
        # 2. Publish (OPEN)
        internship = publish_internship(self.inst_admin, internship.id)
        self.assertEqual(internship.status, InternshipState.OPEN)
        
        # 3. Apply (APPLIED) - Creates NEW engagement
        application = apply_for_internship(self.student_user, internship.id)
        self.assertEqual(application.status, InternshipState.APPLIED)
        self.assertEqual(application.student_id, self.student.id)
        
        # 4. Shortlist (APPLIED -> SHORTLISTED)
        # Only Inst Admin (per current policy)
        workflow.transition(internship=application, target_state=InternshipState.SHORTLISTED, actor=self.inst_admin)
        self.assertEqual(application.status, InternshipState.SHORTLISTED)
        
        # 5. Accept (SHORTLISTED -> ACCEPTED)
        workflow.transition(internship=application, target_state=InternshipState.ACCEPTED, actor=self.inst_admin)
        self.assertEqual(application.status, InternshipState.ACCEPTED)
        
        # 6. Start (ACCEPTED -> ACTIVE)
        workflow.transition(internship=application, target_state=InternshipState.ACTIVE, actor=self.inst_admin)
        self.assertEqual(application.status, InternshipState.ACTIVE)
        
        # 7. Evidence Submission
        file = SimpleUploadedFile("log.pdf", b"content", content_type="application/pdf")
        evidence = submit_evidence(self.student_user, application.id, "Logbook 1", file)
        self.assertEqual(evidence.status, InternshipEvidence.STATUS_SUBMITTED)
        
        # 8. Try to Complete without Evidence Acceptance (Should Fail)
        # Note: We have evidence, but it's SUBMITTED, not ACCEPTED.
        with self.assertRaises(ValueError):
            workflow.transition(internship=application, target_state=InternshipState.COMPLETED, actor=self.inst_admin)
            
        # 9. Review Evidence
        # Inst Admin can review
        review_evidence(self.inst_admin, evidence.id, InternshipEvidence.STATUS_ACCEPTED, "Good job")
        evidence.refresh_from_db()
        self.assertEqual(evidence.status, InternshipEvidence.STATUS_ACCEPTED)
        
        # 10. Complete (ACTIVE -> COMPLETED)
        workflow.transition(internship=application, target_state=InternshipState.COMPLETED, actor=self.inst_admin)
        self.assertEqual(application.status, InternshipState.COMPLETED)
        
        # 11. Certify (COMPLETED -> CERTIFIED)
        workflow.transition(internship=application, target_state=InternshipState.CERTIFIED, actor=self.inst_admin)
        self.assertEqual(application.status, InternshipState.CERTIFIED)
        
        # 12. Verify Ledger
        events = LedgerEvent.objects.filter(entity_id=application.id).order_by('occurred_at')
        self.assertTrue(events.exists())
        # Check event types
        types = [e.event_type for e in events]
        expected = [
            "INTERNSHIP_APPLIED", 
            "INTERNSHIP_SHORTLISTED", 
            "INTERNSHIP_ACCEPTED", 
            "INTERNSHIP_STARTED", 
            "INTERNSHIP_COMPLETED", 
            "INTERNSHIP_CERTIFIED"
        ]
        # Filter only transition events (excluding evidence events which might be mixed in time)
        transition_events = [t for t in types if t in expected]
        self.assertEqual(transition_events, expected)
        
        # Check Hashing
        for event in events:
            self.assertTrue(event.hash)