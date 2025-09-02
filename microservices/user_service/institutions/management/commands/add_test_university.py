from django.core.management.base import BaseCommand
from django.db import transaction
from institutions.models import MasterInstitution, InstitutionType, AccreditationBody, DataSource

class Command(BaseCommand):
    help = 'Add Test University to the master institution database for testing purposes'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Adding Test University to master institution database...'))
        
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
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Successfully created Test University with ID: {institution.id}'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Test University already exists with ID: {institution.id}'
                        )
                    )
                
                # Display institution details
                self.stdout.write(f'Institution Details:')
                self.stdout.write(f'  Name: {institution.name}')
                self.stdout.write(f'  Short Name: {institution.short_name}')
                self.stdout.write(f'  Type: {institution.institution_type}')
                self.stdout.write(f'  Accreditation Body: {institution.accreditation_body}')
                self.stdout.write(f'  Accreditation Number: {institution.accreditation_number}')
                self.stdout.write(f'  County: {institution.county}')
                self.stdout.write(f'  Website: {institution.website}')
                self.stdout.write(f'  Is Active: {institution.is_active}')
                self.stdout.write(f'  Is Verified: {institution.is_verified}')
                self.stdout.write(f'  Data Source: {institution.data_source}')
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error adding Test University: {e}')
            )
            raise
        
        # Display total count
        total_institutions = MasterInstitution.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f'Total institutions in database: {total_institutions}'
            )
        )