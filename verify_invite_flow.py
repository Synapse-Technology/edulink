import os
import django
import sys
# Setup Django
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'edulink'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "edulink.config.settings.dev")
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from edulink.apps.platform_admin.models import PlatformStaffProfile

User = get_user_model()

def test_invite_flow():
    client = APIClient()
    
    # 1. Create Super Admin
    email = "super_admin_test_flow@edulink.com"
    password = "securepassword123"
    user, created = User.objects.get_or_create(email=email, defaults={"username": email})
    user.set_password(password)
    user.save()
    
    if not hasattr(user, 'platform_staff_profile'):
        PlatformStaffProfile.objects.create(
            user=user,
            role=PlatformStaffProfile.ROLE_SUPER_ADMIN,
            is_active=True
        )
    
    # 2. Login to get token
    print("Logging in...")
    login_resp = client.post('/api/admin/auth/login/', {
        "email": email,
        "password": password
    }, format='json')
    
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.status_code} {login_resp.data}")
        return
        
    token = login_resp.data['tokens']['access']
    print(f"Got access token: {token[:20]}...")
    
    # 3. Use token to invite staff
    print("Inviting staff...")
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
    invite_resp = client.post('/api/admin/staff/invites/', {
        "email": "new_staff@edulink.com",
        "role": "MODERATOR",
        "message": "Welcome!"
    }, format='json')
    
    print(f"Invite Status: {invite_resp.status_code}")
    print(f"Invite Response: {invite_resp.data}")

if __name__ == "__main__":
    test_invite_flow()
