
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from uuid import uuid4
import json

from edulink.apps.institutions.models import Institution, InstitutionStaff, InstitutionInvite, Department, Cohort
from edulink.apps.institutions.services import create_institution_supervisor_invite, activate_institution_supervisor_from_invite

User = get_user_model()

class SupervisorInviteTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create Admin User
        self.admin_user = User.objects.create_user(
            username="admin@test.com",
            email="admin@test.com",
            password="password123",
            role=User.ROLE_INSTITUTION_ADMIN
        )
        
        # Create Institution
        self.institution = Institution.objects.create(
            name="Test University",
            domain="test.edu",
            is_active=True,
            is_verified=True,
            status=Institution.STATUS_ACTIVE
        )
        
        # Create Department
        self.department = Department.objects.create(
            institution=self.institution,
            name="Computer Science",
            code="CS"
        )
        
        # Create Cohort
        self.cohort = Cohort.objects.create(
            department=self.department,
            name="2024",
            start_year=2024
        )
        
        # Link Admin to Institution
        InstitutionStaff.objects.create(
            institution=self.institution,
            user=self.admin_user,
            role=InstitutionStaff.ROLE_ADMIN
        )
        
        self.client.force_authenticate(user=self.admin_user)

    def test_create_supervisor_invite_service(self):
        """Test the service to create an invite"""
        email = "supervisor@test.edu"
        
        invite = create_institution_supervisor_invite(
            institution_id=self.institution.id,
            admin_user_id=str(self.admin_user.id),
            email=email,
            department_id=self.department.id,
            cohort_id=self.cohort.id
        )
        
        self.assertEqual(invite.email, email)
        self.assertEqual(invite.department, self.department.name)
        self.assertEqual(invite.cohort, self.cohort.name)
        self.assertEqual(invite.role, InstitutionStaff.ROLE_SUPERVISOR)
        self.assertEqual(invite.status, InstitutionInvite.STATUS_PENDING)
        self.assertIsNotNone(invite.token_hash)

    def test_invite_supervisor_endpoint(self):
        """Test the API endpoint to invite a supervisor"""
        url = "/api/institutions/institution-staff/invite_supervisor/"
        data = {
            "email": "api_supervisor@test.edu",
            "department_id": str(self.department.id),
            "cohort_id": str(self.cohort.id)
        }
        
        response = self.client.post(url, data, format='json')
        if response.status_code != status.HTTP_201_CREATED:
            print(f"Invite response: {response.status_code} - {response.data}")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("invite_id", response.data)
        
        # Verify DB
        invite = InstitutionInvite.objects.get(id=response.data["invite_id"])
        self.assertEqual(invite.email, data["email"])
        self.assertEqual(invite.department, self.department.name)

    def test_activate_supervisor_service(self):
        """Test the service to activate a supervisor from invite"""
        # Create invite first
        email = "tobeactivated@test.edu"
        invite = create_institution_supervisor_invite(
            institution_id=self.institution.id,
            admin_user_id=str(self.admin_user.id),
            email=email,
            department_id=self.department.id,
            cohort_id=self.cohort.id
        )
        
        # We need the raw token to activate. 
        # Since the service hashes it, we can't get it back easily from DB.
        # BUT, the service sends email. In test, we can mock or just inspect the local var if we could.
        # Actually, create_institution_supervisor_invite returns the invite object, but NOT the raw token.
        # The raw token is sent in email.
        # Wait, looking at the service implementation:
        # It calls send_institution_staff_invite_notification(..., invite_token=raw_token, ...)
        # I should probably return the raw token from the service for testing purposes or modify the test to manually set a known token hash.
        
        # For this test, I will manually update the token hash with a known token.
        from django.contrib.auth.hashers import make_password
        raw_token = "known_token_123"
        invite.token_hash = make_password(raw_token)
        invite.save()
        
        # Now activate
        user = activate_institution_supervisor_from_invite(
            invite_id=str(invite.id),
            token=raw_token,
            password="NewPassword123!",
            first_name="Super",
            last_name="Visor"
        )
        
        self.assertEqual(user.email, email)
        self.assertTrue(user.is_active)
        # Check Staff record
        staff = InstitutionStaff.objects.get(user=user, institution=self.institution)
        self.assertEqual(staff.role, InstitutionStaff.ROLE_SUPERVISOR)
        self.assertEqual(staff.department, self.department.name)
        self.assertEqual(staff.cohort, self.cohort.name)

    def test_activate_supervisor_endpoint(self):
        """Test the API endpoint to activate supervisor"""
        # Create invite
        email = "endpoint_activation@test.edu"
        invite = create_institution_supervisor_invite(
            institution_id=self.institution.id,
            admin_user_id=str(self.admin_user.id),
            email=email,
            department_id=self.department.id,
            cohort_id=self.cohort.id
        )
        
        # Manually set token for test
        from django.contrib.auth.hashers import make_password
        raw_token = "activation_token_456"
        invite.token_hash = make_password(raw_token)
        invite.save()
        
        url = "/api/institutions/institution-invites/activate_supervisor/"
        data = {
            "invite_id": str(invite.id),
            "token": raw_token,
            "password": "SecurePassword789!",
            "first_name": "Endpoint",
            "last_name": "Tester"
        }
        
        client = APIClient() # New client (unauthenticated)
        response = client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user created
        self.assertTrue(User.objects.filter(email=email).exists())
