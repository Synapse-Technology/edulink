#!/usr/bin/env python
import os
import django
import traceback

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.test import RequestFactory
from authentication.serializers import UnifiedStudentRegistrationSerializer
from django.db import transaction
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_registration_with_audit():
    """Test registration with audit logging enabled to reproduce the email error."""
    try:
        # Create a mock request
        factory = RequestFactory()
        request = factory.post('/api/auth/register/student/')
        request.META['REMOTE_ADDR'] = '127.0.0.1'
        request.META['HTTP_USER_AGENT'] = 'Test Agent'
        
        # Test data
        data = {
            'email': 'debug.email.test@example.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'Debug',
            'last_name': 'EmailTest',
            'phone_number': '+254712888999',
            'national_id': 'DEBUG888',
            'university_code': 'EDUJKUAT25-01',
            'registration_method': 'university_code',
            'registration_number': 'DEBUG/888/2021',
            'year_of_study': 2
        }
        
        print("Starting registration test...")
        
        # Create serializer with request context
        serializer = UnifiedStudentRegistrationSerializer(
            data=data, 
            context={'request': request}
        )
        
        print(f"Validation result: {serializer.is_valid()}")
        if not serializer.is_valid():
            print(f"Validation errors: {serializer.errors}")
            return
        
        print("Attempting to save...")
        
        # This should trigger the audit logging and potentially the email error
        with transaction.atomic():
            student_profile = serializer.save()
            print(f"Student profile created successfully: {student_profile}")
            print(f"Associated user: {student_profile.user}")
            print(f"User email: {student_profile.user.email}")
            
    except Exception as e:
        print(f"ERROR: {e}")
        print(f"Error type: {type(e).__name__}")
        print("Full traceback:")
        traceback.print_exc()
        
        # Check if it's the email attribute error
        if "'StudentProfile' object has no attribute 'email'" in str(e):
            print("\n*** FOUND THE EMAIL ATTRIBUTE ERROR! ***")
            print("This confirms the issue is in the audit logging or signal handling.")

if __name__ == '__main__':
    test_registration_with_audit()