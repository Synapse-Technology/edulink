from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
import requests
import json
import csv
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Import institutions from external sources (CUE, TVETA, CSV files)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            choices=['cue', 'tveta', 'csv', 'all'],
            required=True,
            help='Source to import from'
        )
        
        parser.add_argument(
            '--file',
            type=str,
            help='CSV file path for CSV import'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be imported without actually importing'
        )
        
        parser.add_argument(
            '--update-existing',
            action='store_true',
            help='Update existing institutions if found'
        )
        
        parser.add_argument(
            '--limit',
            type=int,
            help='Limit number of institutions to import'
        )
    
    def handle(self, *args, **options):
        source = options['source']
        file_path = options.get('file')
        dry_run = options['dry_run']
        update_existing = options['update_existing']
        limit = options.get('limit')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made')
            )
        
        try:
            if source == 'cue':
                self.import_from_cue(dry_run, update_existing, limit)
            elif source == 'tveta':
                self.import_from_tveta(dry_run, update_existing, limit)
            elif source == 'csv':
                if not file_path:
                    raise CommandError('CSV file path is required for CSV import')
                self.import_from_csv(file_path, dry_run, update_existing, limit)
            elif source == 'all':
                self.import_from_cue(dry_run, update_existing, limit)
                self.import_from_tveta(dry_run, update_existing, limit)
            
        except Exception as e:
            logger.error(f"Import failed: {e}")
            raise CommandError(f"Import failed: {e}")
    
    def import_from_cue(self, dry_run: bool, update_existing: bool, limit: Optional[int]):
        """Import universities from Commission for University Education (CUE)."""
        self.stdout.write("Importing from CUE...")
        
        # In a real implementation, this would call the actual CUE API
        # For now, we'll simulate with known Kenyan universities
        cue_institutions = [
            {
                'name': 'University of Nairobi',
                'code': 'UON',
                'type': 'public_university',
                'website': 'https://www.uonbi.ac.ke',
                'location': 'Nairobi',
                'accreditation_status': 'accredited',
                'established_year': 1970
            },
            {
                'name': 'Kenyatta University',
                'code': 'KU',
                'type': 'public_university',
                'website': 'https://www.ku.ac.ke',
                'location': 'Nairobi',
                'accreditation_status': 'accredited',
                'established_year': 1985
            },
            {
                'name': 'Moi University',
                'code': 'MU',
                'type': 'public_university',
                'website': 'https://www.mu.ac.ke',
                'location': 'Eldoret',
                'accreditation_status': 'accredited',
                'established_year': 1984
            },
            {
                'name': 'Egerton University',
                'code': 'EU',
                'type': 'public_university',
                'website': 'https://www.egerton.ac.ke',
                'location': 'Nakuru',
                'accreditation_status': 'accredited',
                'established_year': 1987
            },
            {
                'name': 'Jomo Kenyatta University of Agriculture and Technology',
                'code': 'JKUAT',
                'type': 'public_university',
                'website': 'https://www.jkuat.ac.ke',
                'location': 'Kiambu',
                'accreditation_status': 'accredited',
                'established_year': 1994
            },
            {
                'name': 'Maseno University',
                'code': 'MSU',
                'type': 'public_university',
                'website': 'https://www.maseno.ac.ke',
                'location': 'Kisumu',
                'accreditation_status': 'accredited',
                'established_year': 2001
            },
            {
                'name': 'Strathmore University',
                'code': 'SU',
                'type': 'private_university',
                'website': 'https://www.strathmore.edu',
                'location': 'Nairobi',
                'accreditation_status': 'accredited',
                'established_year': 2002
            },
            {
                'name': 'United States International University Africa',
                'code': 'USIU',
                'type': 'private_university',
                'website': 'https://www.usiu.ac.ke',
                'location': 'Nairobi',
                'accreditation_status': 'accredited',
                'established_year': 1999
            },
            {
                'name': 'Daystar University',
                'code': 'DU',
                'type': 'private_university',
                'website': 'https://www.daystar.ac.ke',
                'location': 'Nairobi',
                'accreditation_status': 'accredited',
                'established_year': 1994
            },
            {
                'name': 'Catholic University of Eastern Africa',
                'code': 'CUEA',
                'type': 'private_university',
                'website': 'https://www.cuea.edu',
                'location': 'Nairobi',
                'accreditation_status': 'accredited',
                'established_year': 1992
            }
        ]
        
        if limit:
            cue_institutions = cue_institutions[:limit]
        
        self._process_institutions(cue_institutions, 'CUE', dry_run, update_existing)
    
    def import_from_tveta(self, dry_run: bool, update_existing: bool, limit: Optional[int]):
        """Import TVET institutions from Technical and Vocational Education and Training Authority (TVETA)."""
        self.stdout.write("Importing from TVETA...")
        
        # Simulate TVETA institutions
        tveta_institutions = [
            {
                'name': 'Kenya Technical Trainers College',
                'code': 'KTTC',
                'type': 'technical_college',
                'website': 'https://www.kttc.ac.ke',
                'location': 'Gigiri',
                'accreditation_status': 'accredited',
                'established_year': 1978
            },
            {
                'name': 'Mombasa Technical Training Institute',
                'code': 'MTTI',
                'type': 'technical_institute',
                'website': 'https://www.mtti.ac.ke',
                'location': 'Mombasa',
                'accreditation_status': 'accredited',
                'established_year': 1958
            },
            {
                'name': 'Kenya Institute of Management',
                'code': 'KIM',
                'type': 'management_institute',
                'website': 'https://www.kim.ac.ke',
                'location': 'Nairobi',
                'accreditation_status': 'accredited',
                'established_year': 1961
            },
            {
                'name': 'Kisumu National Polytechnic',
                'code': 'KNP',
                'type': 'polytechnic',
                'website': 'https://www.knp.ac.ke',
                'location': 'Kisumu',
                'accreditation_status': 'accredited',
                'established_year': 1972
            },
            {
                'name': 'Eldoret National Polytechnic',
                'code': 'ENP',
                'type': 'polytechnic',
                'website': 'https://www.enp.ac.ke',
                'location': 'Eldoret',
                'accreditation_status': 'accredited',
                'established_year': 1981
            },
            {
                'name': 'Machakos Institute of Technology',
                'code': 'MACHIT',
                'type': 'technical_institute',
                'website': 'https://www.machit.ac.ke',
                'location': 'Machakos',
                'accreditation_status': 'accredited',
                'established_year': 1957
            },
            {
                'name': 'Rift Valley Institute of Science and Technology',
                'code': 'RVIST',
                'type': 'technical_institute',
                'website': 'https://www.rvist.ac.ke',
                'location': 'Nakuru',
                'accreditation_status': 'accredited',
                'established_year': 1972
            },
            {
                'name': 'Coast Institute of Technology',
                'code': 'CIT',
                'type': 'technical_institute',
                'website': 'https://www.cit.ac.ke',
                'location': 'Mombasa',
                'accreditation_status': 'accredited',
                'established_year': 1975
            }
        ]
        
        if limit:
            tveta_institutions = tveta_institutions[:limit]
        
        self._process_institutions(tveta_institutions, 'TVETA', dry_run, update_existing)
    
    def import_from_csv(self, file_path: str, dry_run: bool, update_existing: bool, limit: Optional[int]):
        """Import institutions from CSV file."""
        self.stdout.write(f"Importing from CSV file: {file_path}")
        
        try:
            institutions = []
            with open(file_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    # Expected CSV columns: name, code, type, website, location, accreditation_status, established_year
                    institution = {
                        'name': row.get('name', '').strip(),
                        'code': row.get('code', '').strip(),
                        'type': row.get('type', '').strip(),
                        'website': row.get('website', '').strip(),
                        'location': row.get('location', '').strip(),
                        'accreditation_status': row.get('accreditation_status', 'unknown').strip(),
                        'established_year': self._parse_year(row.get('established_year', ''))
                    }
                    
                    # Validate required fields
                    if institution['name'] and institution['code']:
                        institutions.append(institution)
                    else:
                        self.stdout.write(
                            self.style.WARNING(f"Skipping invalid row: {row}")
                        )
            
            if limit:
                institutions = institutions[:limit]
            
            self._process_institutions(institutions, 'CSV', dry_run, update_existing)
            
        except FileNotFoundError:
            raise CommandError(f"CSV file not found: {file_path}")
        except Exception as e:
            raise CommandError(f"Error reading CSV file: {e}")
    
    def _process_institutions(self, institutions: List[Dict], source: str, dry_run: bool, update_existing: bool):
        """Process and save institutions."""
        total_count = len(institutions)
        created_count = 0
        updated_count = 0
        skipped_count = 0
        
        self.stdout.write(f"Processing {total_count} institutions from {source}...")
        
        for institution in institutions:
            try:
                name = institution['name']
                code = institution['code']
                
                if dry_run:
                    self.stdout.write(f"  Would process: {name} ({code})")
                    created_count += 1
                    continue
                
                # In a real implementation, you would save to your institution model
                # For now, we'll just simulate the process
                
                # Check if institution already exists (by code or name)
                existing = self._check_existing_institution(code, name)
                
                if existing:
                    if update_existing:
                        # Update existing institution
                        self._update_institution(existing, institution)
                        updated_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f"  Updated: {name} ({code})")
                        )
                    else:
                        skipped_count += 1
                        self.stdout.write(
                            self.style.WARNING(f"  Skipped (exists): {name} ({code})")
                        )
                else:
                    # Create new institution
                    self._create_institution(institution)
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"  Created: {name} ({code})")
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"  Error processing {institution.get('name', 'Unknown')}: {e}")
                )
        
        # Summary
        self.stdout.write("\n=== Import Summary ===")
        self.stdout.write(f"Total processed: {total_count}")
        self.stdout.write(f"Created: {created_count}")
        self.stdout.write(f"Updated: {updated_count}")
        self.stdout.write(f"Skipped: {skipped_count}")
    
    def _check_existing_institution(self, code: str, name: str) -> Optional[Dict]:
        """Check if institution already exists."""
        # In a real implementation, this would query your institution model
        # For now, we'll simulate by checking against a known list
        known_institutions = {
            'UON': 'University of Nairobi',
            'KU': 'Kenyatta University',
            'JKUAT': 'Jomo Kenyatta University of Agriculture and Technology'
        }
        
        if code in known_institutions or name in known_institutions.values():
            return {'code': code, 'name': name}  # Simulate existing record
        
        return None
    
    def _create_institution(self, institution: Dict):
        """Create new institution."""
        # In a real implementation, this would create a new institution record
        # For now, we'll just log the action
        logger.info(f"Creating institution: {institution['name']} ({institution['code']})")
    
    def _update_institution(self, existing: Dict, new_data: Dict):
        """Update existing institution."""
        # In a real implementation, this would update the existing institution record
        # For now, we'll just log the action
        logger.info(f"Updating institution: {existing['name']} with new data")
    
    def _parse_year(self, year_str: str) -> Optional[int]:
        """Parse year from string."""
        try:
            return int(year_str.strip()) if year_str.strip() else None
        except (ValueError, AttributeError):
            return None
    
    def _call_external_api(self, url: str, headers: Dict = None) -> Dict:
        """Call external API (CUE or TVETA)."""
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"API call failed: {e}")
            raise CommandError(f"Failed to fetch data from {url}: {e}")