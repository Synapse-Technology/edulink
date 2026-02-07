from unittest.mock import MagicMock, patch
from uuid import uuid4
from django.test import SimpleTestCase
from edulink.apps.internships.policies import can_transition_application, can_view_application, can_review_evidence
from edulink.apps.internships.models import ApplicationStatus, InternshipApplication, InternshipOpportunity

class TestCertificationPolicy(SimpleTestCase):
    def test_institution_admin_can_review_evidence_external_internship(self):
        # Setup IDs
        inst_id = uuid4()
        student_id = uuid4()
        
        # Setup Actor
        actor = MagicMock()
        actor.is_institution_admin = True
        actor.is_employer_admin = False
        actor.is_system_admin = False
        actor.is_student = False
        actor.id = uuid4()
        
        # Setup Opportunity (Employer based)
        opportunity = MagicMock(spec=InternshipOpportunity)
        opportunity.institution_id = None
        opportunity.employer_id = uuid4()
        
        # Setup Application
        application = MagicMock(spec=InternshipApplication)
        application.opportunity = opportunity
        application.student_id = student_id
        application.status = ApplicationStatus.ACTIVE
        application.institution_supervisor_id = None
        application.employer_supervisor_id = None
        
        # Mock dependencies
        with patch('edulink.apps.internships.policies.get_student_approved_affiliation') as mock_get_affiliation, \
             patch('edulink.apps.internships.policies.get_actor_institution_id') as mock_get_inst_id, \
             patch('edulink.apps.internships.policies.get_institution_staff_profile') as mock_get_staff, \
             patch('edulink.apps.internships.policies.get_employer_supervisor_by_user') as mock_get_sup:
            
            # Configure Mocks
            mock_affiliation = MagicMock()
            mock_affiliation.institution_id = inst_id
            mock_get_affiliation.return_value = mock_affiliation
            
            mock_get_inst_id.return_value = inst_id
            mock_get_staff.return_value = None
            mock_get_sup.return_value = None
            
            # Execute
            result = can_review_evidence(actor, application)
            
            # Assert
            self.assertTrue(result, "Institution admin should be able to review evidence for their student")

    def test_institution_admin_can_view_student_application(self):
        # Setup IDs
        inst_id = uuid4()
        student_id = uuid4()
        
        # Setup Actor
        actor = MagicMock()
        actor.is_institution_admin = True
        actor.is_employer_admin = False
        actor.is_system_admin = False
        actor.is_student = False
        actor.id = uuid4()
        
        # Setup Opportunity (Employer based)
        opportunity = MagicMock(spec=InternshipOpportunity)
        opportunity.institution_id = None
        opportunity.employer_id = uuid4()
        
        # Setup Application
        application = MagicMock(spec=InternshipApplication)
        application.opportunity = opportunity
        application.student_id = student_id
        application.institution_supervisor_id = None
        application.employer_supervisor_id = None
        
        # Mock dependencies
        with patch('edulink.apps.internships.policies.get_student_approved_affiliation') as mock_get_affiliation, \
             patch('edulink.apps.internships.policies.get_actor_institution_id') as mock_get_inst_id, \
             patch('edulink.apps.internships.policies.get_student_for_user') as mock_get_student_user, \
             patch('edulink.apps.internships.policies.get_institution_staff_profile') as mock_get_staff:
            
            # Configure Mocks
            mock_affiliation = MagicMock()
            mock_affiliation.institution_id = inst_id
            mock_get_affiliation.return_value = mock_affiliation
            
            mock_get_inst_id.return_value = inst_id
            mock_get_student_user.return_value = None # Actor is not a student
            mock_get_staff.return_value = None
            
            # Execute
            result = can_view_application(actor, application)
            
            # Assert
            self.assertTrue(result, "Institution admin should be able to view their student's application")

    def test_supervisor_cannot_review_evidence_certified_internship(self):
        # Setup IDs
        emp_id = uuid4()
        sup_id = uuid4()
        actor_id = uuid4()
        
        # Setup Actor
        actor = MagicMock()
        actor.id = actor_id
        actor.is_institution_admin = False
        actor.is_employer_admin = False
        
        # Setup Opportunity
        opportunity = MagicMock(spec=InternshipOpportunity)
        opportunity.employer_id = emp_id
        opportunity.institution_id = None
        
        # Setup Application
        application = MagicMock(spec=InternshipApplication)
        application.opportunity = opportunity
        application.status = ApplicationStatus.CERTIFIED
        application.employer_supervisor_id = sup_id
        
        # Mock dependencies
        with patch('edulink.apps.internships.policies.get_employer_supervisor_by_user') as mock_get_sup:
            # Setup Supervisor
            supervisor = MagicMock()
            supervisor.id = sup_id
            mock_get_sup.return_value = supervisor
            
            # Execute
            result = can_review_evidence(actor, application)
            
            # Assert
            self.assertFalse(result, "Supervisor should NOT be able to review evidence for certified internship")


    def test_institution_admin_can_certify_student_external_internship(self):
        # Setup IDs
        inst_id = uuid4()
        student_id = uuid4()
        
        # Setup Actor
        actor = MagicMock()
        actor.is_institution_admin = True
        actor.id = uuid4()
        
        # Setup Opportunity (Employer based)
        opportunity = MagicMock(spec=InternshipOpportunity)
        opportunity.institution_id = None
        opportunity.employer_id = uuid4()
        
        # Setup Application
        application = MagicMock(spec=InternshipApplication)
        application.status = ApplicationStatus.COMPLETED
        application.opportunity = opportunity
        application.student_id = student_id
        
        # Mock dependencies
        with patch('edulink.apps.internships.policies.get_student_approved_affiliation') as mock_get_affiliation, \
             patch('edulink.apps.internships.policies.get_actor_institution_id') as mock_get_inst_id:
            
            # Configure Mocks
            mock_affiliation = MagicMock()
            mock_affiliation.institution_id = inst_id
            mock_get_affiliation.return_value = mock_affiliation
            
            mock_get_inst_id.return_value = inst_id
            
            # Execute
            result = can_transition_application(actor, application, ApplicationStatus.CERTIFIED)
            
            # Assert
            self.assertTrue(result)
            mock_get_affiliation.assert_called_with(student_id)
            # Check that it verified the actor belongs to the student's institution
            # Note: can_create_internship calls get_actor_institution_id internally
            
    def test_institution_admin_cannot_certify_unaffiliated_student(self):
        # Setup IDs
        inst_id = uuid4()
        other_inst_id = uuid4()
        student_id = uuid4()
        
        # Setup Actor
        actor = MagicMock()
        actor.is_institution_admin = True
        actor.id = uuid4()
        
        # Setup Opportunity (Employer based)
        opportunity = MagicMock(spec=InternshipOpportunity)
        opportunity.institution_id = None
        opportunity.employer_id = uuid4()
        
        # Setup Application
        application = MagicMock(spec=InternshipApplication)
        application.status = ApplicationStatus.COMPLETED
        application.opportunity = opportunity
        application.student_id = student_id
        
        # Mock dependencies
        with patch('edulink.apps.internships.policies.get_student_approved_affiliation') as mock_get_affiliation, \
             patch('edulink.apps.internships.policies.get_actor_institution_id') as mock_get_inst_id:
            
            # Configure Mocks
            mock_affiliation = MagicMock()
            mock_affiliation.institution_id = other_inst_id # Different institution
            mock_get_affiliation.return_value = mock_affiliation
            
            mock_get_inst_id.return_value = inst_id
            
            # Execute
            result = can_transition_application(actor, application, ApplicationStatus.CERTIFIED)
            
            # Assert
            self.assertFalse(result)
