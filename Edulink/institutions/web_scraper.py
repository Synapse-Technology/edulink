import requests
from bs4 import BeautifulSoup
import time
import logging
from typing import List, Dict, Optional
from django.utils import timezone
from .models import MasterInstitution

logger = logging.getLogger(__name__)

class KenyanInstitutionScraper:
    """Web scraper for Kenyan higher learning institutions"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
    def scrape_cue_universities(self) -> List[Dict]:
        """Scrape universities from Commission for University Education website"""
        institutions = []
        
        try:
            # CUE accredited universities list
            url = "https://www.cue.or.ke/index.php/accreditation/accredited-universities"
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for university listings (this may need adjustment based on actual website structure)
            university_elements = soup.find_all(['tr', 'li', 'div'], class_=lambda x: x and ('university' in x.lower() or 'institution' in x.lower()))
            
            for element in university_elements:
                text = element.get_text(strip=True)
                if text and len(text) > 5:  # Basic validation
                    institutions.append({
                        'name': text,
                        'institution_type': 'university',
                        'accreditation_body': 'cue',
                        'data_source': 'webscrape',
                        'is_public': self._determine_if_public(text)
                    })
                    
        except Exception as e:
            logger.error(f"Error scraping CUE universities: {e}")
            
        return institutions
    
    def scrape_kuccps_institutions(self) -> List[Dict]:
        """Scrape institutions from KUCCPS website"""
        institutions = []
        
        try:
            # KUCCPS participating institutions
            url = "https://www.kuccps.net/index.php/participating-institutions"
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for institution listings
            institution_elements = soup.find_all(['tr', 'li', 'div'])
            
            for element in institution_elements:
                text = element.get_text(strip=True)
                if self._is_valid_institution_name(text):
                    institutions.append({
                        'name': text,
                        'institution_type': self._determine_institution_type(text),
                        'accreditation_body': self._determine_accreditation_body(text),
                        'data_source': 'webscrape',
                        'is_public': self._determine_if_public(text)
                    })
                    
        except Exception as e:
            logger.error(f"Error scraping KUCCPS institutions: {e}")
            
        return institutions
    
    def scrape_tveta_institutions(self) -> List[Dict]:
        """Scrape TVET institutions from TVETA website"""
        institutions = []
        
        try:
            # TVETA registered institutions
            url = "https://www.tveta.go.ke/index.php/registered-institutions"
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for TVET institution listings
            institution_elements = soup.find_all(['tr', 'li', 'div'])
            
            for element in institution_elements:
                text = element.get_text(strip=True)
                if self._is_valid_institution_name(text):
                    institutions.append({
                        'name': text,
                        'institution_type': 'tvet',
                        'accreditation_body': 'tveta',
                        'data_source': 'webscrape',
                        'is_public': self._determine_if_public(text)
                    })
                    
        except Exception as e:
            logger.error(f"Error scraping TVETA institutions: {e}")
            
        return institutions
    
    def get_manual_kenyan_institutions(self) -> List[Dict]:
        """Manually curated list of major Kenyan institutions as fallback"""
        return [
            # Public Universities
            {'name': 'University of Nairobi', 'short_name': 'UoN', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': True, 'county': 'Nairobi'},
            {'name': 'Kenyatta University', 'short_name': 'KU', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': True, 'county': 'Kiambu'},
            {'name': 'Jomo Kenyatta University of Agriculture and Technology', 'short_name': 'JKUAT', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': True, 'county': 'Kiambu'},
            {'name': 'Moi University', 'short_name': 'MU', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': True, 'county': 'Uasin Gishu'},
            {'name': 'Egerton University', 'short_name': 'EU', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': True, 'county': 'Nakuru'},
            {'name': 'Maseno University', 'short_name': 'MSU', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': True, 'county': 'Kisumu'},
            {'name': 'Technical University of Kenya', 'short_name': 'TUK', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': True, 'county': 'Nairobi'},
            {'name': 'Dedan Kimathi University of Technology', 'short_name': 'DeKUT', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': True, 'county': 'Nyeri'},
            {'name': 'Masinde Muliro University of Science and Technology', 'short_name': 'MMUST', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': True, 'county': 'Kakamega'},
            {'name': 'Pwani University', 'short_name': 'PU', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': True, 'county': 'Kilifi'},
            
            # Private Universities
            {'name': 'Strathmore University', 'short_name': 'SU', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': False, 'county': 'Nairobi'},
            {'name': 'United States International University Africa', 'short_name': 'USIU-Africa', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': False, 'county': 'Nairobi'},
            {'name': 'Mount Kenya University', 'short_name': 'MKU', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': False, 'county': 'Kiambu'},
            {'name': 'Kenya Methodist University', 'short_name': 'KeMU', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': False, 'county': 'Meru'},
            {'name': 'Daystar University', 'short_name': 'DU', 'institution_type': 'university', 'accreditation_body': 'cue', 'is_public': False, 'county': 'Kajiado'},
            
            # Colleges and Institutes
            {'name': 'Kenya Institute of Management', 'short_name': 'KIM', 'institution_type': 'institute', 'accreditation_body': 'knqa', 'is_public': True, 'county': 'Nairobi'},
            {'name': 'Kenya Medical Training College', 'short_name': 'KMTC', 'institution_type': 'college', 'accreditation_body': 'knqa', 'is_public': True, 'county': 'Nairobi'},
            {'name': 'Kenya Technical Trainers College', 'short_name': 'KTTC', 'institution_type': 'college', 'accreditation_body': 'tveta', 'is_public': True, 'county': 'Nairobi'},
            {'name': 'Kenya Polytechnic University College', 'short_name': 'KPUC', 'institution_type': 'polytechnic', 'accreditation_body': 'tveta', 'is_public': True, 'county': 'Nairobi'},
        ]
    
    def _is_valid_institution_name(self, text: str) -> bool:
        """Validate if text is a valid institution name"""
        if not text or len(text) < 5:
            return False
        
        # Filter out common non-institution text
        invalid_keywords = ['click', 'here', 'more', 'info', 'contact', 'email', 'phone', 'website']
        text_lower = text.lower()
        
        for keyword in invalid_keywords:
            if keyword in text_lower:
                return False
                
        # Must contain institution-related keywords
        institution_keywords = ['university', 'college', 'institute', 'polytechnic', 'school']
        return any(keyword in text_lower for keyword in institution_keywords)
    
    def _determine_institution_type(self, name: str) -> str:
        """Determine institution type from name"""
        name_lower = name.lower()
        
        if 'university' in name_lower:
            return 'university'
        elif 'polytechnic' in name_lower:
            return 'polytechnic'
        elif 'institute' in name_lower:
            return 'institute'
        elif 'college' in name_lower:
            return 'college'
        else:
            return 'institute'  # Default
    
    def _determine_accreditation_body(self, name: str) -> str:
        """Determine accreditation body from institution name"""
        name_lower = name.lower()
        
        if 'university' in name_lower:
            return 'cue'
        elif any(keyword in name_lower for keyword in ['polytechnic', 'technical', 'tvet']):
            return 'tveta'
        else:
            return 'knqa'
    
    def _determine_if_public(self, name: str) -> bool:
        """Determine if institution is public based on name patterns"""
        name_lower = name.lower()
        
        # Common patterns for private institutions
        private_indicators = ['catholic', 'christian', 'adventist', 'methodist', 'presbyterian', 'baptist']
        
        return not any(indicator in name_lower for indicator in private_indicators)
    
    def scrape_all_institutions(self) -> List[Dict]:
        """Scrape institutions from all sources"""
        all_institutions = []
        
        logger.info("Starting institution scraping...")
        
        # Add manual institutions first (as fallback)
        manual_institutions = self.get_manual_kenyan_institutions()
        all_institutions.extend(manual_institutions)
        logger.info(f"Added {len(manual_institutions)} manual institutions")
        
        # Try web scraping (with error handling)
        try:
            cue_institutions = self.scrape_cue_universities()
            all_institutions.extend(cue_institutions)
            logger.info(f"Scraped {len(cue_institutions)} CUE institutions")
            time.sleep(2)  # Be respectful to servers
        except Exception as e:
            logger.warning(f"CUE scraping failed: {e}")
        
        try:
            kuccps_institutions = self.scrape_kuccps_institutions()
            all_institutions.extend(kuccps_institutions)
            logger.info(f"Scraped {len(kuccps_institutions)} KUCCPS institutions")
            time.sleep(2)
        except Exception as e:
            logger.warning(f"KUCCPS scraping failed: {e}")
        
        try:
            tveta_institutions = self.scrape_tveta_institutions()
            all_institutions.extend(tveta_institutions)
            logger.info(f"Scraped {len(tveta_institutions)} TVETA institutions")
        except Exception as e:
            logger.warning(f"TVETA scraping failed: {e}")
        
        # Remove duplicates based on name
        unique_institutions = []
        seen_names = set()
        
        for institution in all_institutions:
            name = institution['name'].strip()
            if name not in seen_names:
                seen_names.add(name)
                unique_institutions.append(institution)
        
        logger.info(f"Total unique institutions found: {len(unique_institutions)}")
        return unique_institutions
    
    def populate_master_institutions(self) -> int:
        """Populate MasterInstitution model with scraped data"""
        institutions_data = self.scrape_all_institutions()
        created_count = 0
        
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
                        'last_verified': timezone.now(),
                    }
                )
                
                if created:
                    created_count += 1
                    logger.info(f"Created institution: {institution.name}")
                else:
                    # Update last_verified for existing institutions
                    institution.last_verified = timezone.now()
                    institution.save(update_fields=['last_verified'])
                    
            except Exception as e:
                logger.error(f"Error creating institution {data['name']}: {e}")
        
        logger.info(f"Successfully created {created_count} new institutions")
        return created_count