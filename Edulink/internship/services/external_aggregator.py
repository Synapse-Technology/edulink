import requests
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from urllib.parse import urljoin, urlparse
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db import transaction
from bs4 import BeautifulSoup
import time
import hashlib
from ..models import ExternalOpportunitySource, ExternalOpportunity, Internship
from ..models.internship import Internship
# from employers.models import Employer  # Not needed for external aggregation
from institutions.models import Institution


logger = logging.getLogger(__name__)


class ExternalOpportunityAggregator:
    """Service for aggregating opportunities from external sources."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'EduLink Opportunity Aggregator 1.0 (Educational Platform)',
            'Accept': 'application/json, text/html, */*',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        
        # Rate limiting configuration
        self.rate_limits = {}
        self.last_request_times = {}
    
    def aggregate_all_sources(self) -> Dict[str, Any]:
        """Aggregate opportunities from all active sources."""
        results = {
            'total_processed': 0,
            'successful_syncs': 0,
            'failed_syncs': 0,
            'new_opportunities': 0,
            'updated_opportunities': 0,
            'errors': [],
            'source_results': {}
        }
        
        active_sources = ExternalOpportunitySource.objects.filter(
            is_active=True,
            health_status__in=['healthy', 'degraded']
        )
        
        logger.info(f"Starting aggregation for {active_sources.count()} active sources")
        
        for source in active_sources:
            try:
                source_result = self.aggregate_source(source)
                results['source_results'][source.name] = source_result
                
                # Update totals
                results['total_processed'] += source_result.get('total_processed', 0)
                results['successful_syncs'] += source_result.get('successful_syncs', 0)
                results['failed_syncs'] += source_result.get('failed_syncs', 0)
                results['new_opportunities'] += source_result.get('new_opportunities', 0)
                results['updated_opportunities'] += source_result.get('updated_opportunities', 0)
                
                if source_result.get('errors'):
                    results['errors'].extend(source_result['errors'])
                    
            except Exception as e:
                error_msg = f"Failed to aggregate source {source.name}: {str(e)}"
                logger.error(error_msg, exc_info=True)
                results['errors'].append(error_msg)
                results['failed_syncs'] += 1
        
        logger.info(f"Aggregation completed. Processed: {results['total_processed']}, "
                   f"New: {results['new_opportunities']}, Updated: {results['updated_opportunities']}")
        
        return results
    
    def check_source_health(self, source: ExternalOpportunitySource) -> Dict[str, Any]:
        """Check the health status of an external opportunity source."""
        health_result = {
            'source_name': source.name,
            'is_healthy': False,
            'response_time': None,
            'status_code': None,
            'error_message': None,
            'last_checked': timezone.now()
        }
        
        try:
            # Check rate limiting before making request
            if not self._check_rate_limit(source):
                health_result['error_message'] = 'Rate limit exceeded'
                return health_result
            
            # Make a test request to the source
            start_time = time.time()
            
            if source.source_type == 'api' and source.api_endpoint:
                response = self.session.get(
                    source.api_endpoint,
                    timeout=30,
                    headers=self._get_auth_headers(source)
                )
            elif source.source_type == 'rss' and source.rss_feed_url:
                response = self.session.get(
                    source.rss_feed_url,
                    timeout=30
                )
            else:
                response = self.session.get(
                    source.base_url,
                    timeout=30
                )
            
            end_time = time.time()
            health_result['response_time'] = round((end_time - start_time) * 1000, 2)  # ms
            health_result['status_code'] = response.status_code
            
            # Consider source healthy if status code is 2xx
            if 200 <= response.status_code < 300:
                health_result['is_healthy'] = True
                health_result['status'] = 'Healthy'
            else:
                health_result['error_message'] = f'HTTP {response.status_code}'
                health_result['status'] = f'HTTP {response.status_code}'
                
        except requests.exceptions.Timeout:
            health_result['error_message'] = 'Request timeout'
            health_result['status'] = 'Timeout'
        except requests.exceptions.ConnectionError:
            health_result['error_message'] = 'Connection error'
            health_result['status'] = 'Connection Error'
        except requests.exceptions.RequestException as e:
            health_result['error_message'] = f'Request error: {str(e)}'
            health_result['status'] = 'Request Error'
        except Exception as e:
            health_result['error_message'] = f'Unexpected error: {str(e)}'
            health_result['status'] = 'Error'
            logger.error(f'Health check failed for source {source.name}: {e}', exc_info=True)
        
        return health_result
    
    def aggregate_source(self, source: ExternalOpportunitySource) -> Dict[str, Any]:
        """Aggregate opportunities from a specific source."""
        logger.info(f"Starting aggregation for source: {source.name}")
        
        result = {
            'source_name': source.name,
            'total_processed': 0,
            'successful_syncs': 0,
            'failed_syncs': 0,
            'new_opportunities': 0,
            'updated_opportunities': 0,
            'errors': []
        }
        
        try:
            # Check rate limiting
            if not self._check_rate_limit(source):
                error_msg = f"Rate limit exceeded for source {source.name}"
                logger.warning(error_msg)
                result['errors'].append(error_msg)
                return result
            
            # Update last sync attempt
            source.last_sync_attempt = timezone.now()
            source.save(update_fields=['last_sync_attempt'])
            
            # Fetch opportunities based on source type
            if source.source_type == 'api':
                # Check for specific API sources
                if source.slug == 'linkedin-jobs':
                    opportunities_data = self._fetch_linkedin_jobs(source)
                else:
                    opportunities_data = self._fetch_api_opportunities(source)
            elif source.source_type == 'rss':
                opportunities_data = self._fetch_rss_opportunities(source)
            elif source.source_type == 'scraping':
                opportunities_data = self._fetch_scraped_opportunities(source)
            else:
                raise ValueError(f"Unsupported source type: {source.source_type}")
            
            # Process each opportunity
            for opp_data in opportunities_data:
                try:
                    processed = self._process_opportunity(source, opp_data)
                    result['total_processed'] += 1
                    
                    if processed['created']:
                        result['new_opportunities'] += 1
                    else:
                        result['updated_opportunities'] += 1
                    
                    result['successful_syncs'] += 1
                    
                except Exception as e:
                    error_msg = f"Failed to process opportunity {opp_data.get('id', 'unknown')}: {str(e)}"
                    logger.error(error_msg, exc_info=True)
                    result['errors'].append(error_msg)
                    result['failed_syncs'] += 1
            
            # Update source sync status
            source.mark_sync_success()
            
        except Exception as e:
            error_msg = f"Source aggregation failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            result['errors'].append(error_msg)
            source.mark_sync_failure(error_msg)
        
        return result
    
    def _check_rate_limit(self, source: ExternalOpportunitySource) -> bool:
        """Check if we can make a request to this source without exceeding rate limits."""
        now = time.time()
        source_key = f"{source.id}_{source.name}"
        
        # Get the last request time for this source
        last_request = self.last_request_times.get(source_key, 0)
        
        # Calculate minimum interval based on rate limit
        if source.rate_limit_per_hour > 0:
            min_interval = 3600 / source.rate_limit_per_hour  # seconds between requests
        else:
            min_interval = 1  # Default to 1 second
        
        # Check if enough time has passed
        if now - last_request < min_interval:
            return False
        
        # Update last request time
        self.last_request_times[source_key] = now
        return True
    
    def _get_auth_headers(self, source: ExternalOpportunitySource) -> Dict[str, str]:
        """Get authentication headers for API requests."""
        headers = {'User-Agent': 'Edulink-Aggregator/1.0'}
        
        if hasattr(source, 'api_key') and source.api_key:
            headers['Authorization'] = f'Bearer {source.api_key}'
        elif hasattr(source, 'auth_token') and source.auth_token:
            headers['Authorization'] = f'Token {source.auth_token}'
            
        return headers
    
    def _fetch_api_opportunities(self, source: ExternalOpportunitySource) -> List[Dict]:
        """Fetch opportunities from an API source."""
        headers = self.session.headers.copy()
        
        # Add authentication if configured
        if source.auth_type == 'api_key' and source.api_key:
            if source.auth_header_name:
                headers[source.auth_header_name] = source.api_key
            else:
                headers['Authorization'] = f'Bearer {source.api_key}'
        elif source.auth_type == 'basic' and source.username and source.password:
            from requests.auth import HTTPBasicAuth
            auth = HTTPBasicAuth(source.username, source.password)
        else:
            auth = None
        
        # Build request parameters
        params = {}
        if source.api_params:
            params.update(source.api_params)
        
        # Add pagination if supported
        if source.supports_pagination:
            params['page'] = 1
            params['limit'] = min(source.max_results_per_request or 100, 100)
        
        opportunities = []
        page = 1
        max_pages = 10  # Safety limit
        
        while page <= max_pages:
            try:
                response = self.session.get(
                    source.api_endpoint,
                    headers=headers,
                    params=params,
                    auth=auth if 'auth' in locals() else None,
                    timeout=30
                )
                response.raise_for_status()
                
                data = response.json()
                
                # Extract opportunities based on response structure
                if isinstance(data, list):
                    page_opportunities = data
                elif isinstance(data, dict):
                    # Common API response patterns
                    page_opportunities = (
                        data.get('data', []) or
                        data.get('results', []) or
                        data.get('opportunities', []) or
                        data.get('jobs', []) or
                        data.get('items', [])
                    )
                else:
                    logger.warning(f"Unexpected API response format from {source.name}")
                    break
                
                opportunities.extend(page_opportunities)
                
                # Check if there are more pages
                if not source.supports_pagination or len(page_opportunities) == 0:
                    break
                
                # Update pagination parameters
                page += 1
                params['page'] = page
                
                # Respect rate limits between pages
                time.sleep(1)
                
            except requests.exceptions.RequestException as e:
                logger.error(f"API request failed for {source.name}: {str(e)}")
                break
        
        logger.info(f"Fetched {len(opportunities)} opportunities from API source {source.name}")
        return opportunities
    
    def _fetch_rss_opportunities(self, source: ExternalOpportunitySource) -> List[Dict]:
        """Fetch opportunities from an RSS source."""
        try:
            response = self.session.get(source.api_endpoint, timeout=30)
            response.raise_for_status()
            
            # Parse RSS/XML content
            soup = BeautifulSoup(response.content, 'xml')
            items = soup.find_all('item')
            
            opportunities = []
            for item in items:
                opportunity = {
                    'id': self._extract_text(item, 'guid') or self._extract_text(item, 'link'),
                    'title': self._extract_text(item, 'title'),
                    'description': self._extract_text(item, 'description'),
                    'link': self._extract_text(item, 'link'),
                    'published': self._extract_text(item, 'pubDate'),
                    'category': self._extract_text(item, 'category'),
                }
                
                # Extract custom fields if configured
                if source.field_mappings:
                    for field, xpath in source.field_mappings.items():
                        try:
                            opportunity[field] = self._extract_text(item, xpath)
                        except Exception:
                            pass
                
                opportunities.append(opportunity)
            
            logger.info(f"Fetched {len(opportunities)} opportunities from RSS source {source.name}")
            return opportunities
            
        except Exception as e:
            logger.error(f"RSS fetch failed for {source.name}: {str(e)}")
            return []
    
    def _fetch_scraped_opportunities(self, source: ExternalOpportunitySource) -> List[Dict]:
        """Fetch opportunities by scraping a website."""
        try:
            # Handle specific sources with custom logic
            if source.slug == 'opportunities-for-youth':
                return self._scrape_opportunities_for_youth(source)
            
            # Generic scraping logic for other sources
            response = self.session.get(source.api_endpoint, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Use CSS selectors or XPath to extract opportunities
            opportunities = []
            
            # This is a simplified example - real implementation would need
            # specific selectors for each source
            if source.field_mappings:
                container_selector = source.field_mappings.get('container', '.job-listing')
                containers = soup.select(container_selector)
                
                for container in containers:
                    opportunity = {
                        'id': self._generate_scraped_id(container, source),
                    }
                    
                    # Extract fields based on mappings
                    for field, selector in source.field_mappings.items():
                        if field == 'container':
                            continue
                        
                        try:
                            element = container.select_one(selector)
                            if element:
                                if field == 'link':
                                    opportunity[field] = urljoin(source.api_endpoint, element.get('href', ''))
                                else:
                                    opportunity[field] = element.get_text(strip=True)
                        except Exception:
                            pass
                    
                    opportunities.append(opportunity)
            
            logger.info(f"Scraped {len(opportunities)} opportunities from {source.name}")
            return opportunities
            
        except Exception as e:
            logger.error(f"Scraping failed for {source.name}: {str(e)}")
            return []
    
    def _extract_text(self, element, tag_name: str) -> Optional[str]:
        """Extract text content from an XML/HTML element."""
        try:
            tag = element.find(tag_name)
            return tag.get_text(strip=True) if tag else None
        except Exception:
            return None
    
    def _scrape_opportunities_for_youth(self, source: ExternalOpportunitySource) -> List[Dict]:
        """Scrape opportunities from OpportunitiesForYouth.org."""
        opportunities = []
        
        try:
            # Scrape the jobs/internships category page
            category_url = f"{source.base_url}/category/jobs-internships/"
            response = self.session.get(category_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find article containers
            articles = soup.find_all('article', class_='post')
            
            for article in articles[:20]:  # Limit to 20 most recent
                try:
                    # Extract title and link
                    title_element = article.find('h2', class_='entry-title') or article.find('h1', class_='entry-title')
                    if not title_element:
                        continue
                        
                    link_element = title_element.find('a')
                    if not link_element:
                        continue
                    
                    title = title_element.get_text(strip=True)
                    link = urljoin(source.base_url, link_element.get('href', ''))
                    
                    # Extract excerpt/description
                    excerpt_element = article.find('div', class_='entry-summary') or article.find('div', class_='entry-content')
                    description = excerpt_element.get_text(strip=True)[:500] if excerpt_element else ''
                    
                    # Extract date
                    date_element = article.find('time') or article.find('span', class_='posted-on')
                    posted_date = date_element.get('datetime') if date_element and date_element.get('datetime') else None
                    
                    # Extract categories/tags
                    categories = []
                    category_elements = article.find_all('a', rel='category tag')
                    for cat_elem in category_elements:
                        categories.append(cat_elem.get_text(strip=True))
                    
                    opportunity = {
                        'id': self._generate_scraped_id(article, source),
                        'title': title,
                        'description': description,
                        'external_url': link,
                        'company_name': 'Various Organizations',
                        'location': 'Global/Remote',
                        'posted_date': posted_date,
                        'categories': categories,
                        'source_type': 'Youth Opportunities',
                        'is_remote': True,
                        'application_deadline': None,
                        'raw_data': {
                            'scraped_from': category_url,
                            'categories': categories
                        }
                    }
                    
                    opportunities.append(opportunity)
                    
                except Exception as e:
                    logger.warning(f"Failed to parse article from {source.name}: {str(e)}")
                    continue
            
            logger.info(f"Scraped {len(opportunities)} opportunities from {source.name}")
            return opportunities
            
        except Exception as e:
            logger.error(f"Failed to scrape {source.name}: {str(e)}")
            return []
    
    def _fetch_linkedin_jobs(self, source: ExternalOpportunitySource) -> List[Dict]:
        """Fetch jobs from LinkedIn Jobs API (requires approval and proper authentication)."""
        opportunities = []
        
        try:
            headers = self._get_auth_headers(source)
            
            # LinkedIn Jobs API parameters
            params = {
                'keywords': 'internship OR "entry level"',
                'locationName': 'United States',
                'dateSincePosted': 'pastWeek',
                'jobType': 'I',  # Internship
                'count': 25,
                'start': 0
            }
            
            response = self.session.get(
                source.api_endpoint,
                headers=headers,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            
            if 'elements' in data:
                for job in data['elements']:
                    try:
                        opportunity = {
                            'id': str(job.get('id', '')),
                            'title': job.get('title', ''),
                            'description': job.get('description', {}).get('text', ''),
                            'company_name': job.get('companyDetails', {}).get('company', {}).get('name', ''),
                            'location': job.get('formattedLocation', ''),
                            'external_url': job.get('applyMethod', {}).get('companyApplyUrl', ''),
                            'posted_date': job.get('listedAt'),
                            'application_deadline': job.get('expireAt'),
                            'is_remote': 'remote' in job.get('workplaceTypes', []),
                            'employment_type': job.get('employmentStatus', ''),
                            'experience_level': job.get('experienceLevel', ''),
                            'raw_data': job
                        }
                        
                        opportunities.append(opportunity)
                        
                    except Exception as e:
                        logger.warning(f"Failed to parse LinkedIn job: {str(e)}")
                        continue
            
            logger.info(f"Fetched {len(opportunities)} opportunities from LinkedIn Jobs API")
            return opportunities
            
        except Exception as e:
            logger.error(f"Failed to fetch from LinkedIn Jobs API: {str(e)}")
            return []
    
    def _generate_scraped_id(self, container, source: ExternalOpportunitySource) -> str:
        """Generate a unique ID for scraped content."""
        # Use a combination of source and content hash
        content = container.get_text(strip=True)[:200]  # First 200 chars
        content_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        return f"{source.name}_{content_hash}"
    
    def _process_opportunity(self, source: ExternalOpportunitySource, opp_data: Dict) -> Dict[str, Any]:
        """Process a single opportunity and create/update records."""
        external_id = str(opp_data.get('id', ''))
        if not external_id:
            raise ValueError("Opportunity missing required 'id' field")
        
        # Check if this opportunity already exists
        try:
            external_opp = ExternalOpportunity.objects.get(
                source=source,
                external_id=external_id
            )
            created = False
            internship = external_opp.internship
        except ExternalOpportunity.DoesNotExist:
            created = True
            external_opp = None
            internship = None
        
        # Transform external data to our internal format
        internship_data = self._transform_opportunity_data(source, opp_data)
        
        with transaction.atomic():
            if created:
                # Create new internship and external opportunity
                internship = self._create_internship(internship_data)
                external_opp = ExternalOpportunity.objects.create(
                    internship=internship,
                    source=source,
                    external_id=external_id,
                    external_url=opp_data.get('link', ''),
                    external_company_name=opp_data.get('company', ''),
                    raw_data=opp_data,
                    sync_status='synced',
                    last_successful_sync=timezone.now()
                )
            else:
                # Update existing internship
                self._update_internship(internship, internship_data)
                external_opp.external_url = opp_data.get('link', external_opp.external_url)
                external_opp.external_company_name = opp_data.get('company', external_opp.external_company_name)
                external_opp.raw_data = opp_data
                external_opp.mark_sync_success()
            
            # Calculate and update data quality score
            external_opp.calculate_data_quality_score()
            external_opp.save()
        
        return {
            'created': created,
            'external_opportunity_id': external_opp.id,
            'internship_id': internship.id,
            'data_quality_score': external_opp.data_quality_score
        }
    
    def _transform_opportunity_data(self, source: ExternalOpportunitySource, opp_data: Dict) -> Dict:
        """Transform external opportunity data to internal format."""
        # Default field mappings
        default_mappings = {
            'title': ['title', 'name', 'job_title', 'position'],
            'description': ['description', 'summary', 'details', 'content'],
            'company': ['company', 'employer', 'organization', 'company_name'],
            'location': ['location', 'city', 'address', 'workplace'],
            'salary': ['salary', 'stipend', 'compensation', 'pay'],
            'category': ['category', 'type', 'field', 'industry'],
            'deadline': ['deadline', 'closing_date', 'expires', 'apply_by'],
            'start_date': ['start_date', 'begins', 'start', 'commencement'],
            'requirements': ['requirements', 'qualifications', 'skills', 'criteria'],
        }
        
        # Use source-specific mappings if available
        field_mappings = source.field_mappings or {}
        
        transformed = {}
        
        # Map each field
        for internal_field, external_fields in default_mappings.items():
            value = None
            
            # Check source-specific mapping first
            if internal_field in field_mappings:
                mapped_field = field_mappings[internal_field]
                value = opp_data.get(mapped_field)
            
            # Fall back to default mappings
            if not value:
                for ext_field in external_fields:
                    if ext_field in opp_data and opp_data[ext_field]:
                        value = opp_data[ext_field]
                        break
            
            if value:
                transformed[internal_field] = str(value).strip()
        
        # Set defaults for required fields
        transformed.setdefault('title', 'Untitled Opportunity')
        transformed.setdefault('description', 'No description available')
        
        # Parse and validate dates
        for date_field in ['deadline', 'start_date']:
            if date_field in transformed:
                transformed[date_field] = self._parse_date(transformed[date_field])
        
        # Map category to our internal categories
        if 'category' in transformed:
            transformed['category'] = self._map_category(transformed['category'])
        
        return transformed
    
    def _create_internship(self, data: Dict) -> Internship:
        """Create a new internship from transformed data."""
        # Get or create a default employer for external opportunities
        employer, _ = Employer.objects.get_or_create(
            name=data.get('company', 'External Employer'),
            defaults={
                'description': 'External employer from opportunity aggregation',
                'is_verified': False,
            }
        )
        
        # Create internship
        internship = Internship.objects.create(
            employer=employer,
            title=data['title'],
            description=data['description'],
            category=data.get('category', 'other'),
            location=data.get('location', ''),
            stipend=self._parse_salary(data.get('salary')),
            deadline=data.get('deadline'),
            start_date=data.get('start_date'),
            required_skills=data.get('requirements', ''),
            is_verified=False,  # External opportunities need manual verification
            visibility='public',
            is_active=True,
        )
        
        return internship
    
    def _update_internship(self, internship: Internship, data: Dict) -> None:
        """Update an existing internship with new data."""
        # Update fields that might have changed
        internship.title = data['title']
        internship.description = data['description']
        internship.location = data.get('location', internship.location)
        internship.deadline = data.get('deadline') or internship.deadline
        internship.start_date = data.get('start_date') or internship.start_date
        internship.required_skills = data.get('requirements', internship.required_skills)
        
        # Update salary if provided
        salary = self._parse_salary(data.get('salary'))
        if salary is not None:
            internship.stipend = salary
        
        internship.save()
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse various date formats."""
        if not date_str:
            return None
        
        # Common date formats
        formats = [
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%m/%d/%Y',
            '%Y-%m-%d %H:%M:%S',
            '%d %B %Y',
            '%B %d, %Y',
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue
        
        logger.warning(f"Could not parse date: {date_str}")
        return None
    
    def _parse_salary(self, salary_str: str) -> Optional[float]:
        """Parse salary/stipend from various formats."""
        if not salary_str:
            return None
        
        # Remove common currency symbols and text
        import re
        cleaned = re.sub(r'[^\d.,]', '', str(salary_str))
        cleaned = cleaned.replace(',', '')
        
        try:
            return float(cleaned)
        except ValueError:
            return None
    
    def _map_category(self, external_category: str) -> str:
        """Map external category to internal category choices."""
        category_mappings = {
            'technology': ['tech', 'it', 'software', 'programming', 'development'],
            'business': ['business', 'management', 'admin', 'finance', 'marketing'],
            'healthcare': ['health', 'medical', 'nursing', 'pharmacy'],
            'education': ['education', 'teaching', 'academic', 'research'],
            'engineering': ['engineering', 'mechanical', 'civil', 'electrical'],
            'arts': ['arts', 'design', 'creative', 'media', 'graphics'],
            'science': ['science', 'biology', 'chemistry', 'physics', 'lab'],
        }
        
        external_lower = external_category.lower()
        
        for internal_cat, keywords in category_mappings.items():
            if any(keyword in external_lower for keyword in keywords):
                return internal_cat
        
        return 'other'  # Default category