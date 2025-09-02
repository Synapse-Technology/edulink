from django.core.management.base import BaseCommand
from django.db import transaction
from institutions.models import MasterInstitution

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
                        'institution_type': 'university',
                        'accreditation_body': 'cue',
                        'county': 'Nairobi',
                        'is_public': True,
                        'data_source': 'manual',
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
                self.stdout.write(f'  County: {institution.county}')
                self.stdout.write(f'  Is Public: {institution.is_public}')
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