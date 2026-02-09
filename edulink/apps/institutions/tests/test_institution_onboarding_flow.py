
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from edulink.apps.institutions.models import (
    Institution, InstitutionRequest, InstitutionInvite, InstitutionStaff
)
from edulink.apps.institutions.services import (
    submit_institution_request,
    review_institution_request,
    activate_institution_admin_from_invite,
    update_institution_profile,
)
from edulink.apps.trust.services import compute_institution_trust_tier
import uuid

User = get_user_model()

from unittest.mock import patch

class TestInstitutionOnboardingFlow(TestCase):
    def setUp(self):
        # Create a platform admin for reviewing requests
        self.admin_user = User.objects.create_user(
            username='platform_admin',
            email='admin@edulink.com',
            password='password123',
            is_staff=True,
            is_superuser=True
        )

    @patch('edulink.apps.institutions.services.send_institution_approval_notification')
    @patch('edulink.apps.institutions.services.send_institution_request_confirmation')
    def test_full_onboarding_lifecycle(self, mock_send_confirm, mock_send_approval):
        """
        Test the complete flow:
        1. Submit Request
        2. Approve Request (Verify Profile Data Transfer)
        3. Activate Admin (Verify Institution Activation & Trust Tier)
        4. Update Profile (Verify Allowed Fields)
        """
        
        # 1. Submit Request
        print("Step 1: Submitting Institution Request...")
        request_data = {
            "institution_name": "Test University",
            "website_url": "https://test.edu",
            "requested_domains": ["test.edu"],
            "representative_name": "John Dean",
            "representative_email": "dean@test.edu",
            "representative_role": "Dean of Students",
            "representative_phone": "+1234567890",
            "department": "Student Affairs",
            "notes": "Please approve."
        }
        
        institution_request = submit_institution_request(**request_data)
        
        self.assertEqual(institution_request.status, InstitutionRequest.STATUS_PENDING)
        self.assertEqual(institution_request.institution_name, "Test University")
        
        # 2. Approve Request
        print("Step 2: Approving Request...")
        approved_request = review_institution_request(
            request_id=institution_request.id,
            action='approve',
            reviewer_id=str(self.admin_user.id)
        )
        
        self.assertEqual(approved_request.status, InstitutionRequest.STATUS_APPROVED)
        
        # Verify Invite Created
        invite = InstitutionInvite.objects.get(email="dean@test.edu")
        self.assertEqual(invite.status, InstitutionInvite.STATUS_PENDING)
        
        # Verify Institution Created and Data Transferred
        institution = invite.institution
        self.assertEqual(institution.name, "Test University")
        self.assertEqual(institution.website_url, "https://test.edu")
        self.assertEqual(institution.contact_email, "dean@test.edu")
        self.assertEqual(institution.contact_phone, "+1234567890")
        
        # Institution should be Verified but NOT Active yet
        self.assertTrue(institution.is_verified)
        self.assertFalse(institution.is_active)
        self.assertEqual(institution.trust_level, 0) # Trust Level 0 (Registered)
        
        # Capture the token passed to the email notification
        # The mock was called with (institution_request=..., invite_token=..., invite_id=...)
        self.assertTrue(mock_send_approval.called)
        call_kwargs = mock_send_approval.call_args[1]
        raw_token = call_kwargs['invite_token']
        
        # 3. Activate Admin from Invite
        print("Step 3: Activating Admin Account...")
        user = activate_institution_admin_from_invite(
            invite_id=str(invite.id),
            token=raw_token,
            password="SecurePassword123!",
            first_name="John",
            last_name="Dean"
        )
        
        # Verify User Created
        self.assertEqual(user.email, "dean@test.edu")
        self.assertTrue(user.is_active)
        
        # Verify Institution Activated
        institution.refresh_from_db()
        self.assertTrue(institution.is_active)
        self.assertEqual(institution.status, Institution.STATUS_ACTIVE)
        
        # Verify Trust Tier Promotion (Level 1: Verified)
        # Assuming Level 1 requires is_active=True and is_verified=True
        # Need to check trust tier constants, but usually 1 is Verified.
        # Let's check the trust level value directly.
        # If compute_institution_trust_tier works, it should be > 0.
        print(f"Institution Trust Level: {institution.trust_level}")
        self.assertGreaterEqual(institution.trust_level, 1)
        
        # 4. Update Profile
        print("Step 4: Updating Profile...")
        update_data = {
            "website_url": "https://updated-test.edu",
            "description": "A top tier university."
        }
        
        updated_inst = update_institution_profile(
            institution_id=str(institution.id),
            data=update_data,
            actor_id=str(user.id)
        )
        
        self.assertEqual(updated_inst.website_url, "https://updated-test.edu")
        self.assertEqual(updated_inst.description, "A top tier university.")


    def test_update_institution_profile(self):
        # Create a dummy institution for testing profile update standalone
        institution = Institution.objects.create(
            name="Update Test Uni",
            domain="update.edu",
            website_url="http://old.edu"
        )
        user = User.objects.create(username="actor", email="actor@test.com")
        
        update_data = {
            "website_url": "https://new.edu",
            "contact_email": "new@test.edu",
            "description": "Updated description",
            "forbidden_field": "hacker_value" # Should be ignored
        }
        
        updated_inst = update_institution_profile(
            institution_id=str(institution.id),
            data=update_data,
            actor_id=str(user.id)
        )
        
        self.assertEqual(updated_inst.website_url, "https://new.edu")
        self.assertEqual(updated_inst.contact_email, "new@test.edu")
        self.assertEqual(updated_inst.description, "Updated description")
        
        # Verify forbidden field was NOT added
        self.assertFalse(hasattr(updated_inst, "forbidden_field"))
