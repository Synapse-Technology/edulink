
import os
import django
import sys
import uuid
from unittest.mock import patch, MagicMock
from django.utils import timezone
from django.contrib.auth import get_user_model

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "edulink.settings")
django.setup()

from edulink.apps.institutions.models import Institution, InstitutionInvite, InstitutionStaff
from edulink.apps.institutions.services import create_institution_supervisor_invite, activate_institution_supervisor_account

User = get_user_model()

def run_test():
    print("--- Starting Institution Supervisor Invite Flow Test ---")
    
    # 1. Setup Data
    unique_suffix = str(uuid.uuid4())[:8]
    institution_name = f"Test University {unique_suffix}"
    admin_email = f"admin_{unique_suffix}@test.edu"
    supervisor_email = f"supervisor_{unique_suffix}@test.edu"
    
    # Create Institution
    institution = Institution.objects.create(
        name=institution_name,
        domain=f"test{unique_suffix}.edu",
        is_active=True,
        is_verified=True,
        status=Institution.STATUS_ACTIVE
    )
    print(f"Created Institution: {institution.name} ({institution.id})")
    
    # Create Admin User
    admin_user = User.objects.create_user(
        email=admin_email,
        password="AdminPassword123!",
        first_name="Admin",
        last_name="User",
        role=User.ROLE_INSTITUTION_ADMIN
    )
    InstitutionStaff.objects.create(
        institution=institution,
        user=admin_user,
        role=InstitutionStaff.ROLE_ADMIN,
        is_active=True
    )
    print(f"Created Admin: {admin_user.email}")
    
    # 2. Invite Supervisor
    print("\n--- Inviting Supervisor ---")
    captured_token = None
    captured_invite_id = None
    
    def mock_send_notification(*args, **kwargs):
        nonlocal captured_token, captured_invite_id
        # args: recipient_email, invite_token, invite_id, ...
        # kwargs: invite_token, invite_id, ...
        if 'invite_token' in kwargs:
            captured_token = kwargs['invite_token']
        if 'invite_id' in kwargs:
            captured_invite_id = kwargs['invite_id']
        return True

    with patch('edulink.apps.institutions.services.send_institution_staff_invite_notification', side_effect=mock_send_notification) as mock_notify:
        invite = create_institution_supervisor_invite(
            institution_id=institution.id,
            admin_user_id=str(admin_user.id),
            email=supervisor_email,
            department="Computer Science",
            cohort="2024"
        )
        print(f"Invite created: {invite.id}")
        
        # In real code, the service calls the notification service which sends the email.
        # Our mock captures the arguments passed to the notification service.
        # wait, create_institution_supervisor_invite calls send_institution_staff_invite_notification
        # which we mocked.
        
        # However, the mock might not have captured it if I messed up the arguments.
        # Let's check if invite has the token_hash, we can't reverse it but we need the raw token.
        # The service generates raw_token and passes it to the notification.
        
    if not captured_token:
        # Fallback: if mock didn't capture (maybe because I mocked the wrong thing or arguments mismatch),
        # we can't proceed because we don't have the raw token.
        # But wait, create_institution_supervisor_invite generates the token internally.
        # So I MUST capture it from the mock call.
        pass
        
    print(f"Captured Token: {captured_token}")
    print(f"Captured Invite ID: {captured_invite_id}")
    
    if not captured_token:
        print("ERROR: Failed to capture token from notification service.")
        # Let's try to inspect the mock call args if possible, but here we just exit
        return

    # 3. Verify Invite State
    invite.refresh_from_db()
    if invite.status != InstitutionInvite.STATUS_PENDING:
        print(f"ERROR: Invite status is {invite.status}, expected pending")
        return
        
    # 4. Activate Supervisor
    print("\n--- Activating Supervisor ---")
    try:
        user = activate_institution_supervisor_account(
            invite_id=str(invite.id),
            token=captured_token,
            password="SupervisorPassword123!",
            first_name="Super",
            last_name="Visor"
        )
        print(f"Supervisor Activated: {user.email} ({user.id})")
    except Exception as e:
        print(f"ERROR: Activation failed: {e}")
        import traceback
        traceback.print_exc()
        return
        
    # 5. Verify User State
    user.refresh_from_db()
    if not user.is_active:
        print("ERROR: User is not active")
        return
    if user.role != User.ROLE_INSTITUTION_ADMIN: # Wait, what role should they have?
        # Institution supervisors are usually INSTITUTION_ADMIN role in User model but with specific permissions?
        # Or do they have a separate role?
        # Let's check InstitutionStaff model role.
        pass
        
    # Check InstitutionStaff
    staff = InstitutionStaff.objects.get(user=user, institution=institution)
    print(f"Staff Role: {staff.role}")
    if staff.role != InstitutionStaff.ROLE_SUPERVISOR:
        print(f"ERROR: Staff role is {staff.role}, expected {InstitutionStaff.ROLE_SUPERVISOR}")
        return
    
    print(f"Staff Department: {staff.department}")
    if staff.department != "Computer Science":
        print(f"ERROR: Department mismatch")
        return
        
    print("User and Staff record verified.")
    
    # 6. Verify Invite Status
    invite.refresh_from_db()
    if invite.status != InstitutionInvite.STATUS_ACCEPTED:
        print(f"ERROR: Invite status is {invite.status}, expected accepted")
        return
        
    print("\nTest Completed Successfully!")

if __name__ == "__main__":
    run_test()
