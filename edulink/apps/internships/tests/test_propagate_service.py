from django.test import TestCase
from uuid import uuid4
from edulink.apps.institutions.models import Institution
from edulink.apps.students.models import Student
from edulink.apps.internships.models import InternshipApplication, InternshipOpportunity, ApplicationStatus
from edulink.apps.internships.services import propagate_student_institution_to_applications
from edulink.apps.accounts.models import User

class PropagateServiceTest(TestCase):
    def test_propagate_student_institution_to_applications(self):
        # 1. Setup Data
        # Create a dummy user for the student
        user = User.objects.create_user(username="test_student", email="test@test.edu", password="pass")
        
        # Create Student
        student = Student.objects.create(
            user_id=user.id, 
            email=user.email, 
            is_verified=False
        )
        
        # Create Institution
        inst = Institution.objects.create(
            name="Test Uni", 
            domain="test.edu", 
            is_active=True, 
            is_verified=True
        )
        
        # Create Opportunity
        employer_id = uuid4()
        opportunity = InternshipOpportunity.objects.create(
            title="Test Internship", 
            description="Test Description",
            employer_id=employer_id, 
            status="OPEN"
        )
        
        # Create Application (initially without institution_id in snapshot)
        app = InternshipApplication.objects.create(
            opportunity=opportunity, 
            student_id=student.id, 
            status=ApplicationStatus.APPLIED, 
            application_snapshot={}
        )

        # 2. Execute Service (This used to crash)
        updated_count = propagate_student_institution_to_applications(
            student_id=student.id,
            institution_id=inst.id
        )

        # 3. Verify Results
        self.assertEqual(updated_count, 1)
        
        app.refresh_from_db()
        snapshot_inst_id = app.application_snapshot.get('institution_id')
        
        self.assertEqual(str(snapshot_inst_id), str(inst.id), "Internship application snapshot should be updated with institution ID")
