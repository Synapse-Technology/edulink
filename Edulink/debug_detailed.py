#!/usr/bin/env python
import os
import django
import traceback

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from authentication.serializers import UnifiedStudentRegistrationSerializer
from django.test import RequestFactory
from users.models import User, StudentProfile

def debug_registration():
    print("=== DETAILED REGISTRATION DEBUG ===")
    
    # Clean up existing test data
    User.objects.filter(email='debug@test.com').delete()
    StudentProfile.objects.filter(national_id='DEBUG999').delete()
    
    # Create mock request
    factory = RequestFactory()
    request = factory.post('/api/auth/register/', {})
    request.META['REMOTE_ADDR'] = '127.0.0.1'
    request.META['HTTP_USER_AGENT'] = 'Debug Script'
    
    # Test data
    data = {
        'registration_method': 'university_code',
        'email': 'debug@test.com',
        'password': 'Test123!',
        'password_confirm': 'Test123!',
        'first_name': 'Debug',
        'last_name': 'Test',
        'phone_number': '+254712999888',
        'national_id': 'DEBUG999',
        'university_code': 'UON2024',
        'registration_number': 'DEBUG/999',
        'year_of_study': 2
    }
    
    print(f"Test data: {data}")
    
    # Test serializer
    serializer = UnifiedStudentRegistrationSerializer(
        data=data, 
        context={'request': request}
    )
    
    print(f"Validation: {serializer.is_valid()}")
    
    if not serializer.is_valid():
        print(f"Errors: {serializer.errors}")
        return
    
    print("Errors: None")
    
    try:
        print("Attempting to save...")
        result = serializer.save()
        print(f"SUCCESS: {result}")
        print(f"Result type: {type(result)}")
        
        if hasattr(result, 'email'):
            print(f"Result email: {result.email}")
        else:
            print("Result has no email attribute")
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        print("Full traceback:")
        traceback.print_exc()

if __name__ == '__main__':
    debug_registration()