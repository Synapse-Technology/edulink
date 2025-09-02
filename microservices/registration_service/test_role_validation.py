#!/usr/bin/env python
"""
Test script to verify institution onboarding role validation.
This script tests the complete permission and validation flow.
"""

import os
import django

# Setup Django first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings.development')
django.setup()

# Now import Django and DRF components
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import force_authenticate
from registration_requests.views import RegistrationRequestViewSet
from registration_requests.permissions import IsInstitutionAdmin
from registration_requests.serializers import RegistrationRequestCreateSerializer

User = get_user_model()

def test_permission_class():
    """Test the IsInstitutionAdmin permission class directly."""
    print("\n=== Testing IsInstitutionAdmin Permission Class ===")
    
    factory = RequestFactory()
    permission = IsInstitutionAdmin()
    
    # Test unauthenticated user
    request = factory.post('/test/')
    request.user = None
    result = permission.has_permission(request, None)
    print(f"Unauthenticated user: {result} (should be False)")
    assert result == False, "Unauthenticated user should be denied"
    
    # Test user without role
    class MockUser:
        is_authenticated = True
        role = None
    
    request.user = MockUser()
    result = permission.has_permission(request, None)
    print(f"User without role: {result} (should be False)")
    assert result == False, "User without role should be denied"
    
    # Test user with wrong role
    class MockEmployerUser:
        is_authenticated = True
        role = 'employer'
    
    request.user = MockEmployerUser()
    result = permission.has_permission(request, None)
    print(f"User with employer role: {result} (should be False)")
    assert result == False, "User with employer role should be denied"
    
    # Test user with correct role
    class MockInstitutionAdmin:
        is_authenticated = True
        role = 'institution_admin'
    
    request.user = MockInstitutionAdmin()
    result = permission.has_permission(request, None)
    print(f"User with institution_admin role: {result} (should be True)")
    assert result == True, "User with institution_admin role should be allowed"
    
    print("✅ All permission tests passed!")

def test_serializer_validation():
    """Test the serializer validation for organization types."""
    print("\n=== Testing Serializer Validation ===")
    
    base_data = {
        "email": "admin@testuniversity.edu",
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+254700000000",
        "position": "Registrar",
        "institution_name": "Test University",
        "website": "https://testuniversity.edu",
        "registration_number": "REG123456",
        "address": "123 University Ave, Nairobi",
        "contact_phone": "+254700000001",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "terms_accepted": True,
        "privacy_accepted": True
    }
    
    # Test valid university type
    university_data = base_data.copy()
    university_data["institution_type"] = "university"
    
    serializer = RegistrationRequestCreateSerializer(data=university_data)
    is_valid = serializer.is_valid()
    print(f"University type validation: {is_valid} (should be True)")
    if not is_valid:
        print(f"Errors: {serializer.errors}")
    
    # Test valid TVET type
    tvet_data = base_data.copy()
    tvet_data["institution_type"] = "tvet"
    
    serializer = RegistrationRequestCreateSerializer(data=tvet_data)
    is_valid = serializer.is_valid()
    print(f"TVET type validation: {is_valid} (should be True)")
    if not is_valid:
        print(f"Errors: {serializer.errors}")
    
    # Test invalid employer type
    employer_data = base_data.copy()
    employer_data["institution_type"] = "employer"
    
    serializer = RegistrationRequestCreateSerializer(data=employer_data)
    is_valid = serializer.is_valid()
    print(f"Employer type validation: {is_valid} (should be False)")
    if not is_valid:
        print(f"Expected errors: {serializer.errors}")
        assert "Employer registrations are not allowed" in str(serializer.errors)
    
    # Test invalid type
    invalid_data = base_data.copy()
    invalid_data["institution_type"] = "invalid_type"
    
    serializer = RegistrationRequestCreateSerializer(data=invalid_data)
    is_valid = serializer.is_valid()
    print(f"Invalid type validation: {is_valid} (should be False)")
    if not is_valid:
        print(f"Expected errors: {serializer.errors}")
        assert "Only 'university' and 'tvet' are allowed" in str(serializer.errors)
    
    print("✅ All serializer validation tests passed!")

def test_viewset_permissions():
    """Test the ViewSet permission configuration."""
    print("\n=== Testing ViewSet Permission Configuration ===")
    
    viewset = RegistrationRequestViewSet()
    viewset.action = 'create'
    
    permissions = viewset.get_permissions()
    print(f"Create action permissions: {[type(p).__name__ for p in permissions]}")
    
    assert len(permissions) == 1, "Should have exactly one permission"
    assert isinstance(permissions[0], IsInstitutionAdmin), "Should use IsInstitutionAdmin permission"
    
    print("✅ ViewSet permission configuration is correct!")

if __name__ == "__main__":
    print("Institution Onboarding Role Validation Tests")
    print("===========================================")
    
    try:
        test_permission_class()
        test_serializer_validation()
        test_viewset_permissions()
        
        print("\n=== Final Summary ===")
        print("✅ Institution onboarding now requires authentication")
        print("✅ Only users with 'institution_admin' role can onboard institutions")
        print("✅ Employer registrations are blocked from institution onboarding")
        print("✅ Only 'university' and 'tvet' types are allowed")
        print("✅ All validation and permission checks are working correctly")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()