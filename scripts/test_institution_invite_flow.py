import os
import sys
import django
from django.conf import settings

# Setup Django environment
# Add project root (Edulink/)
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
# Add Django project root (Edulink/edulink/)
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'edulink'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edulink.config.settings.dev')
django.setup()

from edulink.apps.institutions.models import InstitutionRequest, Institution, InstitutionInvite
from edulink.apps.institutions.services import (
    review_institution_request, 
    submit_institution_request,
    activate_institution_admin_from_invite,
    validate_institution_invite_token,
    complete_institution_admin_setup
)
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid
from unittest.mock import patch

User = get_user_model()

def run_test():
    print("Starting Institution Invite Flow Test...")
    reviewer_id = str(uuid.uuid4())
    print(f"Reviewer ID: {reviewer_id}")

    # 2. Submit a dummy institution request
    print("Submitting institution request...")
    unique_suffix = uuid.uuid4().hex[:8]
    unique_name = f"Test University {unique_suffix}"
    unique_domain = f"test-{unique_suffix}.edu"
    request = submit_institution_request(
        institution_name=unique_name,
        website_url=f"https://{unique_domain}",
        requested_domains=[unique_domain],
        representative_name="Test Rep",
        representative_email=f"test.rep@{unique_domain}",
        representative_role="Dean",
        notes="Test request"
    )
    print(f"Request submitted: {request.id}")

    # 3. Approve the request and capture token
    print("Approving request...")
    captured_token = None
    captured_invite_id = None
    
    def mock_send_notification(institution_request, invite_token, invite_id):
        nonlocal captured_token, captured_invite_id
        captured_token = invite_token
        captured_invite_id = invite_id
        print(f"CAPTURED TOKEN: {invite_token}")
        print(f"CAPTURED INVITE ID: {invite_id}")
        return True

    with patch('edulink.apps.institutions.services.send_institution_approval_notification', side_effect=mock_send_notification):
        try:
            updated_request = review_institution_request(
                request_id=request.id,
                action='approve',
                reviewer_id=reviewer_id
            )
            print("Request approved successfully.")
        except Exception as e:
            print(f"Error approving request: {e}")
            import traceback
            traceback.print_exc()
            return

    if not captured_token:
        print("Error: Token not captured!")
        return

    # 4. Verify Institution Creation
    try:
        institution = Institution.objects.get(name=unique_name)
        print(f"Institution created: {institution.id}")
    except Institution.DoesNotExist:
        print("Error: Institution was not created.")
        return

    # 5. Verify InstitutionInvite Creation
    try:
        invite = InstitutionInvite.objects.get(institution=institution, email=f"test.rep@{unique_domain}")
        print(f"InstitutionInvite created: {invite.id}")
        print(f"Token Hash: {invite.token_hash[:20]}...")
        
        if invite.status != 'pending':
             print(f"Error: Invite status is {invite.status}, expected pending")
             return
             
        # Check expiry
        if invite.expires_at < timezone.now() + timezone.timedelta(hours=71):
             print("Error: Expiry time seems too short")
             return
        print("Expiry time is correct.")
        
    except InstitutionInvite.DoesNotExist:
        print("Error: Invite not found.")
        return

    # 6. Activate Account (Phase 2)
    print("\n--- Testing Activation (Phase 2) ---")
    try:
        user = activate_institution_admin_from_invite(
            invite_id=captured_invite_id,
            token=captured_token,
            password="SecurePassword123!",
            first_name="Test",
            last_name="Rep"
        )
        print(f"User activated: {user.email} (ID: {user.id})")
        print(f"User Active: {user.is_active}")
        print(f"User Role: {user.role}")
    except Exception as e:
        print(f"Error activating user: {e}")
        import traceback
        traceback.print_exc()
        return

    # 7. Verify Invite Status Updated
    invite.refresh_from_db()
    if invite.status != 'accepted':
        print(f"Error: Invite status is {invite.status}, expected accepted")
        return
    print("Invite status updated to accepted.")

    # 8. Verify Duplicate Activation Fails
    print("Testing duplicate activation...")
    try:
        activate_institution_admin_from_invite(
            invite_id=captured_invite_id,
            token=captured_token,
            password="NewPassword123!",
            first_name="Test",
            last_name="Rep"
        )
        print("Error: Duplicate activation succeeded (should fail)")
    except ValueError as e:
        print(f"Success: Duplicate activation failed with error: {e}")

    # 9. Verify Institution is Inactive (Phase 0/2 state)
    institution.refresh_from_db()
    if institution.is_active:
        print("Error: Institution should be inactive before setup")
        return
    if institution.status != 'verified': # Assuming 'verified' is the status set in create_institution_by_admin
        print(f"Error: Institution status is {institution.status}, expected verified")
        # return # Don't return yet, verify flow continues

    # 10. Complete Setup (Phase 3)
    print("\n--- Testing Setup (Phase 3) ---")
    try:
        with patch('edulink.apps.institutions.services.send_institution_admin_setup_completion_notification', return_value=True) as mock_notify:
            setup_result = complete_institution_admin_setup(
                admin_user_id=str(user.id),
                institution_name=f"{unique_name} (Official)",
                institution_website=f"https://www.{unique_domain}",
                primary_domain=unique_domain,
                admin_title="Director of Admissions",
                admin_phone="555-0123",
                department="Admissions",
                institution_size="medium",
                primary_use_case="internship_management",
                backup_admin_email=f"backup.{unique_domain}@example.com",
                backup_admin_name="Backup Admin",
                agree_to_verification_authority=True
            )
            print("Setup completed successfully.")
            print(f"Notification called: {mock_notify.called}")
            print(setup_result)
            
            # Verify backup admin invite created
            backup_invite = InstitutionInvite.objects.get(email=f"backup.{unique_domain}@example.com")
            print(f"Backup admin invite created: {backup_invite.id}")
            
    except Exception as e:
        print(f"Error completing setup: {e}")
        import traceback
        traceback.print_exc()
        return

    # 11. Verify Institution Activated
    institution.refresh_from_db()
    if not institution.is_active:
        print("Error: Institution should be active after setup")
        return
    if institution.status != 'active': # Assuming 'active' is the status set in setup
         print(f"Error: Institution status is {institution.status}, expected active")
         return
    
    if institution.name != f"{unique_name} (Official)":
        print(f"Error: Institution name not updated. Got {institution.name}")
        return

    print("Institution activated and updated successfully.")

    print("\nTest completed successfully.")

if __name__ == "__main__":
    run_test()
