from django.test import TransactionTestCase
from uuid import uuid4
from django.utils import timezone
from edulink.apps.accounts.models import User
from edulink.apps.employers.models import Employer, Supervisor, EmployerRequest, EmployerInvite
from edulink.apps.employers.services import (
    submit_employer_request, 
    review_employer_request, 
    complete_employer_profile, 
    invite_supervisor,
    activate_supervisor_invite,
    remove_supervisor
)
from edulink.apps.internships.models import Internship, InternshipState
from edulink.apps.internships.policies import can_create_internship, can_transition_internship
from edulink.apps.ledger.models import LedgerEvent
from edulink.apps.shared.error_handling import AuthorizationError, ConflictError

class EmployerBlueprintTest(TransactionTestCase):
    def setUp(self):
        # We need a reviewer (Platform Admin usually, but here just a user with ID)
        self.platform_admin = User.objects.create_user(username="platform", email="platform@test.com", password="password", is_superuser=True)
        self.supervisor_user = User.objects.create_user(username="supervisor", email="supervisor@test.com", password="password")

    def test_employer_onboarding_lifecycle(self):
        # 1. Submit Request
        employer_request = submit_employer_request(
            name="Acme Corp",
            official_email="contact@acme.com",
            domain="acme.com",
            organization_type="Company",
            contact_person="John Doe"
        )
        
        self.assertEqual(employer_request.status, EmployerRequest.STATUS_PENDING)
        self.assertTrue(LedgerEvent.objects.filter(event_type="EMPLOYER_ONBOARDING_REQUESTED").exists())
        
        # 2. Review Request (Approve)
        # This creates the Employer and the Admin Invite
        review_employer_request(
            request_id=employer_request.id,
            action="approve",
            reviewer_id=str(self.platform_admin.id)
        )
        
        employer_request.refresh_from_db()
        self.assertEqual(employer_request.status, EmployerRequest.STATUS_APPROVED)
        
        # Check Employer created
        employer = Employer.objects.get(official_email="contact@acme.com")
        self.assertEqual(employer.status, Employer.STATUS_APPROVED)
        self.assertEqual(employer.trust_level, Employer.TRUST_UNVERIFIED)
        
        # Check Invite created
        invite = EmployerInvite.objects.get(employer=employer, role="ADMIN")
        self.assertEqual(invite.status, EmployerInvite.STATUS_PENDING)
        
        # 3. Activate Admin Account (Simulate clicking link)
        # This SHOULD promote Employer to ACTIVE and TRUST_VERIFIED (Tier 1)
        raw_token = "mock_token" # In real test we need the actual token, but service hashes it.
        # We need to hack the token hash or retrieve the raw token if possible.
        # In review_employer_request, raw_token is not returned, it's sent via email.
        # So we need to manually set the hash for testing or mock the service.
        # Easier: Manually set the hash on the invite to a known value.
        from django.contrib.auth.hashers import make_password
        invite.token_hash = make_password("valid_token")
        invite.save()
        
        user = activate_supervisor_invite(
            invite_id=str(invite.id),
            token="valid_token",
            password="new_password",
            first_name="Admin",
            last_name="User"
        )
        
        # Verify User Created
        self.assertEqual(user.email, "contact@acme.com")
        self.assertTrue(user.is_active)
        
        # Verify Employer Promoted (The Fix)
        employer.refresh_from_db()
        self.assertEqual(employer.status, Employer.STATUS_ACTIVE)
        self.assertEqual(employer.trust_level, Employer.TRUST_VERIFIED) # Level 1
        
        self.assertTrue(LedgerEvent.objects.filter(event_type="EMPLOYER_ACTIVATED").exists())
        
        # 4. Complete Profile (Mandatory Setup - Optional now for status but needed for fields)
        profile_data = {
            # "max_active_students": 10, # Removed as per new system calculation rules
            # "supervisor_ratio": 3      # Removed
        }
        complete_employer_profile(
            employer_id=employer.id, 
            user=user,
            profile_data=profile_data
        )
        employer.refresh_from_db()
        
        self.assertEqual(employer.status, Employer.STATUS_ACTIVE)
        self.assertEqual(employer.trust_level, Employer.TRUST_VERIFIED) # Remains Level 1
        
        # Verify initial capacity (1 admin supervisor * 5 = 5)
        # We check via serializer since model field is legacy/ignored
        from edulink.apps.employers.serializers import EmployerSerializer
        self.assertEqual(EmployerSerializer(employer).data['max_active_students'], 5)
        
        # 5. Verify Permissions: Create Internship
        can_create = can_create_internship(user, employer_id=employer.id)
        self.assertTrue(can_create)
        
        # Create Internship
        internship = Internship.objects.create(
            title="Dev Internship",
            description="Code stuff",
            employer_id=employer.id,
            status=InternshipState.DRAFT
        )
        
        # Transition to OPEN (Publish)
        can_publish = can_transition_internship(user, internship, InternshipState.OPEN)
        self.assertTrue(can_publish)
        
        # 6. Invite Supervisor
        # Invite another user
        sup_invite = invite_supervisor(
            employer_id=employer.id,
            email="sup@acme.com",
            role="SUPERVISOR",
            actor_id=str(user.id)
        )
        
        # Manually set token for activation
        sup_invite.token_hash = make_password("sup_token")
        sup_invite.save()
        
        sup_user = activate_supervisor_invite(
            invite_id=str(sup_invite.id),
            token="sup_token",
            password="Sup3rvisor-pass-2026!",
            first_name="Sup",
            last_name="User"
        )
        
        # Verify Supervisor Role
        sup_staff = Supervisor.objects.get(user=sup_user, employer=employer)
        self.assertEqual(sup_staff.role, Supervisor.ROLE_SUPERVISOR)

        # Verify Capacity Increased (2 supervisors * 5 = 10)
        self.assertEqual(EmployerSerializer(employer).data['max_active_students'], 10)

    def test_only_employer_admin_can_invite_or_remove_staff(self):
        employer = Employer.objects.create(
            name="Role Guard Employer",
            official_email="admin@roleguard.test",
            domain="roleguard.test",
            organization_type="Company",
            contact_person="Admin User",
            status=Employer.STATUS_ACTIVE,
            trust_level=Employer.TRUST_VERIFIED,
        )
        admin = User.objects.create_user(
            username="role_guard_admin",
            email="admin@roleguard.test",
            password="password",
            role=User.ROLE_EMPLOYER_ADMIN,
        )
        supervisor_user = User.objects.create_user(
            username="role_guard_supervisor",
            email="supervisor@roleguard.test",
            password="password",
            role=User.ROLE_SUPERVISOR,
        )
        Supervisor.objects.create(
            employer=employer,
            user=admin,
            role=Supervisor.ROLE_ADMIN,
            is_active=True,
        )
        supervisor = Supervisor.objects.create(
            employer=employer,
            user=supervisor_user,
            role=Supervisor.ROLE_SUPERVISOR,
            is_active=True,
        )

        with self.assertRaises(AuthorizationError):
            invite_supervisor(
                employer_id=employer.id,
                email="new.supervisor@roleguard.test",
                role=Supervisor.ROLE_SUPERVISOR,
                actor_id=str(supervisor_user.id),
            )

        with self.assertRaises(AuthorizationError):
            remove_supervisor(
                supervisor_id=supervisor.id,
                actor_id=str(supervisor_user.id),
            )

        invite = invite_supervisor(
            employer_id=employer.id,
            email="new.supervisor@roleguard.test",
            role=Supervisor.ROLE_SUPERVISOR,
            actor_id=str(admin.id),
        )
        self.assertEqual(invite.email, "new.supervisor@roleguard.test")

    def test_employer_invite_cannot_attach_existing_wrong_role_account(self):
        employer = Employer.objects.create(
            name="Invite Isolation Employer",
            official_email="admin@inviteiso.test",
            domain="inviteiso.test",
            organization_type="Company",
            contact_person="Admin User",
            status=Employer.STATUS_ACTIVE,
            trust_level=Employer.TRUST_VERIFIED,
        )
        admin = User.objects.create_user(
            username="invite_iso_admin",
            email="admin@inviteiso.test",
            password="password",
            role=User.ROLE_EMPLOYER_ADMIN,
        )
        User.objects.create_user(
            username="existing_student",
            email="student@inviteiso.test",
            password="password",
            role=User.ROLE_STUDENT,
        )
        Supervisor.objects.create(
            employer=employer,
            user=admin,
            role=Supervisor.ROLE_ADMIN,
            is_active=True,
        )
        invite = invite_supervisor(
            employer_id=employer.id,
            email="student@inviteiso.test",
            role=Supervisor.ROLE_SUPERVISOR,
            actor_id=str(admin.id),
        )

        from django.contrib.auth.hashers import make_password
        invite.token_hash = make_password("existing_student_token")
        invite.save()

        with self.assertRaises(ConflictError):
            activate_supervisor_invite(
                invite_id=str(invite.id),
                token="existing_student_token",
                password="Sup3rvisor-pass-2026!",
                first_name="Existing",
                last_name="Student",
            )
