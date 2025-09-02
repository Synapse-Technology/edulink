from django.core.management.base import BaseCommand
from django.db import transaction
from institutions.web_scraper import KenyanInstitutionScraper
from institutions.models import MasterInstitution

class Command(BaseCommand):
    help = 'Populate MasterInstitution database with Kenyan institutions data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force-update',
            action='store_true',
            help='Force update existing institutions',
        )
        parser.add_argument(
            '--source',
            type=str,
            choices=['all', 'manual', 'webscrape'],
            default='all',
            help='Data source to use for population',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting institution population...'))
        
        scraper = KenyanInstitutionScraper()
        
        try:
            with transaction.atomic():
                if options['source'] == 'manual':
                    # Only use manual data
                    institutions_data = scraper.get_manual_kenyan_institutions()
                    self.stdout.write(f'Using manual data: {len(institutions_data)} institutions')
                elif options['source'] == 'webscrape':
                    # Only use web scraped data
                    institutions_data = []
                    institutions_data.extend(scraper.scrape_cue_universities())
                    institutions_data.extend(scraper.scrape_kuccps_institutions())
                    institutions_data.extend(scraper.scrape_tveta_institutions())
                    self.stdout.write(f'Using web scraped data: {len(institutions_data)} institutions')
                else:
                    # Use all sources
                    created_count = scraper.populate_master_institutions()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Successfully populated {created_count} new institutions'
                        )
                    )
                    return
                
                # Manual processing for specific sources
                created_count = 0
                updated_count = 0
                
                for data in institutions_data:
                    try:
                        institution, created = MasterInstitution.objects.get_or_create(
                            name=data['name'],
                            defaults={
                                'short_name': data.get('short_name', ''),
                                'institution_type': data['institution_type'],
                                'accreditation_body': data['accreditation_body'],
                                'county': data.get('county', ''),
                                'is_public': data.get('is_public', True),
                                'data_source': data.get('data_source', 'manual'),
                            }
                        )
                        
                        if created:
                            created_count += 1
                            self.stdout.write(f'Created: {institution.name}')
                        elif options['force_update']:
                            # Update existing institution
                            for field, value in data.items():
                                if field != 'name' and hasattr(institution, field):
                                    setattr(institution, field, value)
                            institution.save()
                            updated_count += 1
                            self.stdout.write(f'Updated: {institution.name}')
                            
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'Error processing {data["name"]}: {e}')
                        )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully created {created_count} new institutions and updated {updated_count} existing ones'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during population: {e}')
            )
            raise
        
        # Display summary
        total_institutions = MasterInstitution.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f'Total institutions in database: {total_institutions}'
            )
        )
        
        # Display breakdown by type
        for inst_type, _ in MasterInstitution._meta.get_field('institution_type').choices:
            count = MasterInstitution.objects.filter(institution_type=inst_type).count()
            self.stdout.write(f'{inst_type.title()}s: {count}')