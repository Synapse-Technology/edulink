import requests
import time
import logging
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction
from institutions.models import MasterInstitution, AccreditationBody, DataSource, InstitutionType
from django.conf import settings
import re
import json
from urllib.parse import urljoin, urlparse
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class Command(BaseCommand):
    help = 'Scrape institution data from TVETA, CUE, and KUCCPS websites'
    
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.session = self.create_session()
        self.scraped_count = 0
        self.updated_count = 0
        self.error_count = 0
    
    def create_session(self):
        """Create a requests session with retry strategy"""
        session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        return session
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            choices=['tveta', 'cue', 'kuccps', 'all'],
            default='all',
            help='Specify which source to scrape (default: all)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without saving data to database'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of institutions to scrape per source'
        )
        parser.add_argument(
            '--update-existing',
            action='store_true',
            help='Update existing institutions with new data'
        )
    
    def handle(self, *args, **options):
        self.dry_run = options['dry_run']
        self.limit = options['limit']
        self.update_existing = options['update_existing']
        
        self.stdout.write(self.style.SUCCESS('Starting institution data scraping...'))
        
        if options['source'] in ['tveta', 'all']:
            self.scrape_tveta_institutions()
        
        if options['source'] in ['cue', 'all']:
            self.scrape_cue_institutions()
        
        if options['source'] in ['kuccps', 'all']:
            self.scrape_kuccps_institutions()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Scraping completed. '
                f'Scraped: {self.scraped_count}, '
                f'Updated: {self.updated_count}, '
                f'Errors: {self.error_count}'
            )
        )
    
    def scrape_tveta_institutions(self):
        """Scrape TVETA accredited institutions"""
        self.stdout.write('Scraping TVETA institutions...')
        
        try:
            # TVETA uses a paginated table system
            base_url = 'https://www.tveta.go.ke/accredited-tvet-institutions/'
            
            # Get initial page to understand pagination
            response = self.session.get(base_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find the DataTable
            table = soup.find('table')
            if not table:
                self.logger.error('Could not find institutions table on TVETA website')
                return
            
            # Extract institutions from current page
            institutions = self.extract_tveta_institutions(soup)
            
            for i, institution_data in enumerate(institutions):
                if self.limit and i >= self.limit:
                    break
                    
                try:
                    self.save_institution(institution_data, 'tveta')
                    time.sleep(0.5)  # Be respectful to the server
                except Exception as e:
                    self.logger.error(f'Error saving TVETA institution {institution_data.get("name", "Unknown")}: {e}')
                    self.error_count += 1
                    
        except Exception as e:
            self.logger.error(f'Error scraping TVETA: {e}')
            self.error_count += 1
    
    def extract_tveta_institutions(self, soup):
        """Extract institution data from TVETA page"""
        institutions = []
        
        # Find all table rows with institution data
        rows = soup.find_all('tr')
        
        for row in rows[1:]:  # Skip header row
            cells = row.find_all('td')
            if len(cells) >= 6:
                try:
                    institution = {
                        'name': cells[1].get_text(strip=True),
                        'accreditation_number': cells[2].get_text(strip=True),
                        'institution_type': self.map_tveta_category(cells[3].get_text(strip=True)),
                        'ownership_type': cells[4].get_text(strip=True),
                        'county': cells[5].get_text(strip=True),
                        'accreditation_status': cells[7].get_text(strip=True) if len(cells) > 7 else 'Active',
                        'is_public': cells[4].get_text(strip=True).lower() == 'public',
                        'source_url': 'https://www.tveta.go.ke/accredited-tvet-institutions/',
                        'raw_data': {
                            'registration_number': cells[2].get_text(strip=True),
                            'category': cells[3].get_text(strip=True),
                            'ownership': cells[4].get_text(strip=True)
                        }
                    }
                    institutions.append(institution)
                except Exception as e:
                    self.logger.warning(f'Error parsing TVETA row: {e}')
                    continue
        
        return institutions
    
    def map_tveta_category(self, category):
        """Map TVETA category to our institution type"""
        category_lower = category.lower()
        if 'college' in category_lower:
            return 'college'
        elif 'institute' in category_lower:
            return 'technical_institute'
        elif 'university' in category_lower:
            return 'university'
        elif 'vocational' in category_lower or 'vtc' in category_lower:
            return 'vocational_school'
        else:
            return 'other'
    
    def scrape_cue_institutions(self):
        """Scrape CUE accredited universities"""
        self.stdout.write('Scraping CUE institutions...')
        
        try:
            base_url = 'https://imis.cue.or.ke/RecognitionAndEquationforQualifications/AccreditedUniversities'
            
            response = self.session.get(base_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract universities from the page
            institutions = self.extract_cue_institutions(soup)
            
            for i, institution_data in enumerate(institutions):
                if self.limit and i >= self.limit:
                    break
                    
                try:
                    self.save_institution(institution_data, 'cue')
                    time.sleep(0.5)
                except Exception as e:
                    self.logger.error(f'Error saving CUE institution {institution_data.get("name", "Unknown")}: {e}')
                    self.error_count += 1
                    
        except Exception as e:
            self.logger.error(f'Error scraping CUE: {e}')
            self.error_count += 1
    
    def extract_cue_institutions(self, soup):
        """Extract institution data from CUE page"""
        institutions = []
        
        # Look for table rows or list items containing university names
        # The CUE site structure may vary, so we'll try multiple selectors
        university_elements = (
            soup.find_all('tr') + 
            soup.find_all('li') + 
            soup.find_all('div', class_=re.compile(r'university|institution'))
        )
        
        for element in university_elements:
            text = element.get_text(strip=True)
            if text and len(text) > 5 and any(keyword in text.lower() for keyword in ['university', 'college', 'institute']):
                # Clean up the university name
                name = self.clean_institution_name(text)
                if name:
                    institution = {
                        'name': name,
                        'institution_type': 'university',
                        'accreditation_status': 'Accredited',
                        'is_public': self.infer_public_status(name),
                        'source_url': 'https://imis.cue.or.ke/RecognitionAndEquationforQualifications/AccreditedUniversities',
                        'raw_data': {
                            'original_text': text,
                            'source': 'cue_accredited_list'
                        }
                    }
                    institutions.append(institution)
        
        # Remove duplicates
        seen_names = set()
        unique_institutions = []
        for inst in institutions:
            if inst['name'] not in seen_names:
                seen_names.add(inst['name'])
                unique_institutions.append(inst)
        
        return unique_institutions
    
    def scrape_kuccps_institutions(self):
        """Scrape KUCCPS institutions"""
        self.stdout.write('Scraping KUCCPS institutions...')
        
        try:
            base_url = 'https://students.kuccps.net/institutions/'
            
            response = self.session.get(base_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract institutions from the page
            institutions = self.extract_kuccps_institutions(soup)
            
            for i, institution_data in enumerate(institutions):
                if self.limit and i >= self.limit:
                    break
                    
                try:
                    self.save_institution(institution_data, 'kuccps')
                    time.sleep(0.5)
                except Exception as e:
                    self.logger.error(f'Error saving KUCCPS institution {institution_data.get("name", "Unknown")}: {e}')
                    self.error_count += 1
                    
        except Exception as e:
            self.logger.error(f'Error scraping KUCCPS: {e}')
            self.error_count += 1
    
    def extract_kuccps_institutions(self, soup):
        """Extract institution data from KUCCPS page"""
        institutions = []
        
        # Look for institution listings
        # KUCCPS may have institutions in various formats
        potential_elements = (
            soup.find_all('div', class_=re.compile(r'institution|university|college')) +
            soup.find_all('li') +
            soup.find_all('tr') +
            soup.find_all('a', href=re.compile(r'institution|university')) +
            soup.find_all('option')  # Dropdown options
        )
        
        for element in potential_elements:
            text = element.get_text(strip=True)
            if text and len(text) > 5:
                # Check if this looks like an institution name
                if any(keyword in text.lower() for keyword in [
                    'university', 'college', 'institute', 'polytechnic', 'school'
                ]):
                    name = self.clean_institution_name(text)
                    if name:
                        institution = {
                            'name': name,
                            'institution_type': self.infer_institution_type(name),
                            'accreditation_status': 'Recognized',
                            'is_public': self.infer_public_status(name),
                            'source_url': 'https://students.kuccps.net/institutions/',
                            'raw_data': {
                                'original_text': text,
                                'source': 'kuccps_institutions_list'
                            }
                        }
                        institutions.append(institution)
        
        # Remove duplicates
        seen_names = set()
        unique_institutions = []
        for inst in institutions:
            if inst['name'] not in seen_names:
                seen_names.add(inst['name'])
                unique_institutions.append(inst)
        
        return unique_institutions
    
    def clean_institution_name(self, name):
        """Clean and standardize institution name"""
        if not name:
            return None
        
        # Remove extra whitespace and common prefixes/suffixes
        name = re.sub(r'\s+', ' ', name.strip())
        name = re.sub(r'^\d+\.?\s*', '', name)  # Remove numbering
        name = re.sub(r'\s*-\s*$', '', name)  # Remove trailing dashes
        
        # Skip if too short or contains unwanted content
        if len(name) < 5 or any(skip in name.lower() for skip in [
            'show', 'entries', 'search', 'details', 'action', 'status'
        ]):
            return None
        
        return name.title()
    
    def infer_institution_type(self, name):
        """Infer institution type from name"""
        name_lower = name.lower()
        
        if 'university' in name_lower:
            return 'university'
        elif 'college' in name_lower:
            return 'college'
        elif 'institute' in name_lower or 'polytechnic' in name_lower:
            return 'technical_institute'
        elif 'school' in name_lower:
            return 'vocational_school'
        else:
            return 'other'
    
    def save_institution(self, institution_data, source):
        """Save institution data to database"""
        if self.dry_run:
            self.stdout.write(f'[DRY RUN] Would save: {institution_data["name"]} from {source}')
            return
        
        try:
            with transaction.atomic():
                # Check if institution already exists
                existing = None
                if institution_data.get('accreditation_number'):
                    existing = MasterInstitution.objects.filter(
                        accreditation_number=institution_data['accreditation_number']
                    ).first()
                
                if not existing:
                    existing = MasterInstitution.objects.filter(
                        name__iexact=institution_data['name']
                    ).first()
                
                if existing:
                    if self.update_existing:
                        # Update existing institution
                        for key, value in institution_data.items():
                            if value and hasattr(existing, key):
                                setattr(existing, key, value)
                        
                        # Update metadata
                        if not existing.metadata:
                            existing.metadata = {}
                        existing.metadata[f'{source}_scraped_at'] = timezone.now().isoformat()
                        existing.metadata[f'{source}_data'] = institution_data
                        
                        existing.save()
                        self.updated_count += 1
                        self.stdout.write(f'Updated: {existing.name}')
                    else:
                        self.stdout.write(f'Skipped existing: {existing.name}')
                else:
                    # Map source to accreditation body
                    accreditation_body_map = {
                        'tveta': AccreditationBody.TVETA,
                        'cue': AccreditationBody.CUE,
                        'kuccps': AccreditationBody.KUCCPS,
                    }
                    
                    # Create new institution
                    # Map fields to our model
                    institution_fields = {
                        'name': institution_data['name'],
                        'short_name': institution_data.get('short_name', ''),
                        'institution_type': institution_data.get('institution_type', InstitutionType.UNIVERSITY),
                        'accreditation_body': accreditation_body_map.get(source, AccreditationBody.OTHER),
                        'accreditation_number': institution_data.get('accreditation_number', ''),
                        'accreditation_status': institution_data.get('accreditation_status', ''),
                        'location': institution_data.get('location', ''),
                        'county': institution_data.get('county', ''),
                        'region': institution_data.get('region', ''),
                        'website': institution_data.get('website', ''),
                        'email': institution_data.get('email', ''),
                        'phone': institution_data.get('phone', ''),
                        'data_source': DataSource.WEBSCRAPE,
                        'source_url': institution_data.get('source_url', ''),
                        'is_active': True,
                        'is_verified': False,
                        'raw_data': institution_data.get('raw_data', {}),
                        'metadata': {
                            f'{source}_scraped_at': timezone.now().isoformat(),
                            f'{source}_data': institution_data,
                            'data_source': source
                        }
                    }
                    
                    institution = MasterInstitution.objects.create(**institution_fields)
                    self.scraped_count += 1
                    self.stdout.write(f'Created: {institution.name}')
                    
        except Exception as e:
            self.logger.error(f'Error saving institution {institution_data.get("name", "Unknown")}: {e}')
            self.error_count += 1
            raise
    
    def infer_public_status(self, name):
        """Infer if institution is public based on name patterns"""
        name_lower = name.lower()
        public_indicators = ['university of', 'national', 'public', 'government', 'state']
        private_indicators = ['private', 'international', 'catholic', 'christian', 'adventist']
        
        if any(indicator in name_lower for indicator in public_indicators):
            return True
        elif any(indicator in name_lower for indicator in private_indicators):
            return False
        else:
            return True  # Default to public for Kenyan institutions
    
    def extract_tveta_info(self, text, source_url):
        """Extract TVETA institution information from text."""
        if not text or len(text.strip()) < 5:
            return None
            
        name = self.clean_institution_name(text)
        if not name:
            return None
            
        return {
            'name': name,
            'institution_type': self.infer_institution_type(text),
            'accreditation_status': 'Accredited',
            'location': self.extract_location_from_text(text),
            'source_url': source_url,
            'raw_data': {
                'original_text': text,
                'source': 'tveta'
            }
        }
    
    def extract_cue_info(self, text, source_url):
        """Extract CUE institution information from text."""
        if not text or len(text.strip()) < 5:
            return None
            
        name = self.clean_institution_name(text)
        if not name:
            return None
            
        return {
             'name': name,
             'institution_type': InstitutionType.UNIVERSITY,
             'accreditation_status': 'Accredited',
             'location': self.extract_location_from_text(text),
             'source_url': source_url,
             'raw_data': {
                 'original_text': text,
                 'source': 'cue'
             }
         }
    
    def extract_kuccps_info(self, text, source_url):
        """Extract KUCCPS institution information from text."""
        if not text or len(text.strip()) < 5:
            return None
            
        name = self.clean_institution_name(text)
        if not name:
            return None
            
        return {
            'name': name,
            'institution_type': self.infer_institution_type(text),
            'accreditation_status': 'Recognized',
            'location': self.extract_location_from_text(text),
            'source_url': source_url,
            'raw_data': {
                'original_text': text,
                'source': 'kuccps'
            }
        }
    
    def extract_location_from_text(self, text):
        """Extract location information from text."""
        # Common Kenyan counties and cities
        kenyan_locations = [
            'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'thika', 'malindi',
            'kitale', 'garissa', 'kakamega', 'machakos', 'meru', 'nyeri', 'embu',
            'kericho', 'bomet', 'bungoma', 'siaya', 'migori', 'homa bay', 'kilifi'
        ]
        
        text_lower = text.lower()
        for location in kenyan_locations:
            if location in text_lower:
                return location.title()
        
        return ''
    
    def generate_email_domain(self, name):
        """Generate a plausible email domain from institution name"""
        # Simple domain generation - in practice, you'd want to verify these
        domain = re.sub(r'[^a-zA-Z0-9\s]', '', name.lower())
        domain = re.sub(r'\s+', '', domain)
        domain = domain[:20]  # Limit length
        return f'{domain}.ac.ke'