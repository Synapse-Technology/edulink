#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(project_dir))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

from institutions.models import MasterInstitution, InstitutionType, AccreditationBody, DataSource
from django.db import transaction

def add_test_university():
    try:
        with transaction.atomic():
            institution, created = MasterInstitution.objects.get_or_create(
                name='Test University',
                defaults={
                    'short_name': 'TU',
                    'institution_type': InstitutionType.UNIVERSITY,
                    'accreditation_body': AccreditationBody.CUE,
                    'accreditation_number': 'CUE/TEST/001',
                    'accreditation_status': 'Fully Accredited',
                    'location': 'Nairobi, Kenya',
                    'county': 'Nairobi',
                    'region': 'Central',
                    'website': 'https://testuniversity.ac.ke',
                    'email': 'info@testuniversity.ac.ke',
                    'phone': '+254-20-1234567',
                    'data_source': DataSource.MANUAL,
                    'is_active': True,
                    'is_verified': True,
                    'metadata': {
                        'test_institution': True,
                        'created_for': 'frontend_testing',
                        'verification_status': 'manually_verified'
                    }
                }
            )
            
            if created:
                print(f'Successfully created Test University with ID: {institution.id}')
            else:
                print(f'Test University already exists with ID: {institution.id}')
            
            # Display institution details
            print(f'Institution Details:')
            print(f'  Name: {institution.name}')
            print(f'  Short Name: {institution.short_name}')
            print(f'  Type: {institution.institution_type}')
            print(f'  Accreditation Body: {institution.accreditation_body}')
            print(f'  County: {institution.county}')
            print(f'  Is Active: {institution.is_active}')
            print(f'  Is Verified: {institution.is_verified}')
            
    except Exception as e:
        print(f'Error adding Test University: {e}')
        raise
    
    # Display total count
    total_institutions = MasterInstitution.objects.count()
    print(f'Total institutions in database: {total_institutions}')

if __name__ == '__main__':
    add_test_university()