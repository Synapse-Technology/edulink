#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from institutions.models import Institution, UniversityRegistrationCode
from django.utils import timezone
from datetime import datetime, timedelta

def check_and_create_code():
    """Check if the university code exists and create it if needed"""
    
    # Check if the code exists
    code_to_check = 'EDUJKUAT25-01'
    
    try:
        existing_code = UniversityRegistrationCode.objects.get(code=code_to_check)
        print(f"Code {code_to_check} exists:")
        print(f"  Institution: {existing_code.institution.name}")
        print(f"  Is Active: {existing_code.is_active}")
        print(f"  Current Uses: {existing_code.current_uses}/{existing_code.max_uses}")
        print(f"  Expires At: {existing_code.expires_at}")
        
        is_valid, message = existing_code.is_valid()
        print(f"  Is Valid: {is_valid} - {message}")
        
    except UniversityRegistrationCode.DoesNotExist:
        print(f"Code {code_to_check} does not exist. Creating it...")
        
        # Get or create JKUAT institution
        institution, created = Institution.objects.get_or_create(
            name='Jomo Kenyatta University of Agriculture and Technology',
            defaults={
                'institution_type': 'university',
                'location': 'Juja, Kenya',
                'website': 'https://www.jkuat.ac.ke',
                'is_active': True
            }
        )
        
        if created:
            print(f"Created institution: {institution.name}")
        else:
            print(f"Found existing institution: {institution.name}")
        
        # Create the registration code
        registration_code = UniversityRegistrationCode.objects.create(
            institution=institution,
            code=code_to_check,
            year=2025,
            sequence_number=1,
            is_active=True,
            expires_at=timezone.now() + timedelta(days=365),  # Valid for 1 year
            max_uses=100,  # Allow 100 uses
            current_uses=0,
            created_by='System Admin'
        )
        
        print(f"Created registration code: {registration_code.code}")
        print(f"  Institution: {registration_code.institution.name}")
        print(f"  Valid until: {registration_code.expires_at}")
        print(f"  Max uses: {registration_code.max_uses}")

if __name__ == '__main__':
    check_and_create_code()