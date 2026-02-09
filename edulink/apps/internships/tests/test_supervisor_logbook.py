
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from uuid import uuid4

from edulink.apps.institutions.models import Institution, InstitutionStaff
from edulink.apps.internships.models import Internship, InternshipEvidence, InternshipState
from edulink.apps.students.models import Student

User = get_user_model()

class SupervisorLogbookTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # 1. Setup Institution
        self.institution = Institution.objects.create(
            name="Test University",
            domain="test.edu",
            is_active=True,
            is_verified=True,
            status=Institution.STATUS_ACTIVE
        )
        
        # 2. Setup Supervisor
        self.supervisor_user = User.objects.create_user(
            username="supervisor@test.edu",
            email="supervisor@test.edu",
            password="password123",
            role=User.ROLE_SUPERVISOR
        )
        InstitutionStaff.objects.create(
            institution=self.institution,
            user=self.supervisor_user,
            role=InstitutionStaff.ROLE_SUPERVISOR,
            department="CS"
        )
        
        # 3. Setup Student
        self.student_user = User.objects.create_user(
            username="student@test.edu",
            email="student@test.edu",
            password="password123",
            role=User.ROLE_STUDENT,
            first_name="John",
            last_name="Doe"
        )
        self.student = Student.objects.create(
            user_id=self.student_user.id,
            email=self.student_user.email
        )
        
        # 4. Create Internship assigned to Supervisor
        self.internship = Internship.objects.create(
            title="Software Intern",
            institution_id=self.institution.id,
            student_id=self.student.id,
            institution_supervisor_id=self.supervisor_user.id,
            status=InternshipState.ACTIVE,
            start_date=timezone.now().date(),
        )
        
        # 5. Create Logbook Evidence
        self.evidence = InternshipEvidence.objects.create(
            internship=self.internship,
            submitted_by=self.student_user.id,
            title="Week 1 Logbook",
            description="Learned Django",
            evidence_type=InternshipEvidence.TYPE_LOGBOOK,
            status=InternshipEvidence.STATUS_SUBMITTED
        )

    def test_supervisor_can_view_internship(self):
        """Test that supervisor can view the internship they are assigned to"""
        self.client.force_authenticate(user=self.supervisor_user)
        url = f"/api/internships/{self.internship.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_supervisor_can_list_evidence(self):
        """Test that supervisor can list evidence for the internship"""
        self.client.force_authenticate(user=self.supervisor_user)
        url = f"/api/internships/{self.internship.id}/evidence/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if evidence is in list
        if isinstance(response.data, dict):
            results = response.data.get('results', response.data)
        else:
            results = response.data
            
        self.assertTrue(any(e['id'] == str(self.evidence.id) for e in results))

    def test_supervisor_can_review_logbook(self):
        """Test that supervisor can review (approve/reject) the logbook"""
        self.client.force_authenticate(user=self.supervisor_user)
        
        # Endpoint: POST /api/internships/{id}/review-evidence/{evidence_id}/
        url = f"/api/internships/{self.internship.id}/review-evidence/{self.evidence.id}/"
        data = {
            "status": InternshipEvidence.STATUS_ACCEPTED,
            "notes": "Great work!"
        }
        
        response = self.client.post(url, data, format='json')
        
        if response.status_code != status.HTTP_200_OK:
            print(f"Review response: {response.status_code} - {response.data}")
            
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify DB
        self.evidence.refresh_from_db()
        self.assertEqual(self.evidence.status, InternshipEvidence.STATUS_ACCEPTED)
        self.assertEqual(self.evidence.review_notes, "Great work!")
        self.assertEqual(str(self.evidence.reviewed_by), str(self.supervisor_user.id))

    def test_unassigned_supervisor_cannot_review(self):
        """Test that a supervisor NOT assigned to the internship cannot review"""
        other_supervisor = User.objects.create_user(
            username="other@test.edu",
            email="other@test.edu",
            password="pw",
            role=User.ROLE_SUPERVISOR
        )
        InstitutionStaff.objects.create(institution=self.institution, user=other_supervisor, role=InstitutionStaff.ROLE_SUPERVISOR)
        
        self.client.force_authenticate(user=other_supervisor)
        
        url = f"/api/internships/{self.internship.id}/review-evidence/{self.evidence.id}/"
        data = {
            "status": InternshipEvidence.STATUS_ACCEPTED
        }
        
        response = self.client.post(url, data, format='json')
        # Should be 400 Bad Request (PermissionError from service caught as Exception)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("User not authorized", str(response.data['detail']))
