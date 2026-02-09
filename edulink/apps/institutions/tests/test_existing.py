from django.test import TransactionTestCase
from edulink.apps.accounts.models import User
from edulink.apps.institutions.models import Institution, InstitutionStaff
from edulink.apps.institutions.queries import get_institution_staff_profile
from edulink.apps.internships.models import Internship, InternshipState
from edulink.apps.internships.policies import can_review_evidence

class InstitutionSupervisorTest(TransactionTestCase):
    def setUp(self):
        self.institution = Institution.objects.create(
            name="Test University",
            domain="test.edu",
            is_active=True,
            is_verified=True,
            status=Institution.STATUS_VERIFIED
        )
        self.supervisor_user = User.objects.create_user(
            username="inst_supervisor",
            email="sup@test.edu",
            password="password"
        )
        self.student_user = User.objects.create_user(
            username="student",
            email="student@test.edu",
            password="password",
            role=User.ROLE_STUDENT
        )
        
    def test_institution_supervisor_role(self):
        # 1. Assign Supervisor Role
        staff = InstitutionStaff.objects.create(
            institution=self.institution,
            user=self.supervisor_user,
            role=InstitutionStaff.ROLE_SUPERVISOR
        )
        
        # 2. Verify Helper
        profile = get_institution_staff_profile(self.supervisor_user.id)
        self.assertIsNotNone(profile)
        self.assertEqual(profile.role, InstitutionStaff.ROLE_SUPERVISOR)
        self.assertEqual(profile.institution, self.institution)
        
        # 3. Verify Internship Policy Integration
        # Create an internship assigned to this supervisor
        internship = Internship.objects.create(
            title="Research Project",
            description="Academic research",
            institution_id=self.institution.id,
            status=InternshipState.ACTIVE,
            institution_supervisor_id=self.supervisor_user.id
        )
        
        # Check permission
        can_review = can_review_evidence(self.supervisor_user, internship)
        self.assertTrue(can_review, "Assigned institution supervisor should be able to review evidence")
        
        # Negative test (unassigned user)
        other_user = User.objects.create_user(username="other", email="other@test.edu", password="password")
        self.assertFalse(can_review_evidence(other_user, internship))
