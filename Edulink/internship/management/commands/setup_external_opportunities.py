from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from internship.models import ExternalOpportunitySource, ExternalOpportunity
from internship.services.external_aggregator import ExternalOpportunityAggregator
from internship.services.compliance_manager import ComplianceManager
import json


class Command(BaseCommand):
    help = 'Set up and test the external opportunities system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--create-sources',
            action='store_true',
            help='Create sample external opportunity sources'
        )
        parser.add_argument(
            '--test-aggregation',
            action='store_true', 
            help='Test the aggregation system'
        )
        parser.add_argument(
            '--test-compliance',
            action='store_true',
            help='Test compliance and attribution features'
        )
        parser.add_argument(
            '--full-setup',
            action='store_true',
            help='Run complete setup and testing'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Setting up External Opportunities System')
        )
        
        if options['create_sources'] or options['full_setup']:
            self.create_sample_sources()
        
        if options['test_aggregation'] or options['full_setup']:
            self.test_aggregation()
        
        if options['test_compliance'] or options['full_setup']:
            self.test_compliance()
        
        if options['full_setup']:
            self.display_summary()
    
    def create_sample_sources(self):
        """Create sample external opportunity sources"""
        self.stdout.write('Creating sample external opportunity sources...')
        
        sources_data = [
            {
                'name': 'LinkedIn Jobs',
                'slug': 'linkedin-jobs',
                'description': 'Professional internship and job opportunities from LinkedIn',
                'source_type': 'api',
                'base_url': 'https://www.linkedin.com',
                'api_endpoint': 'https://api.linkedin.com/v2/jobSearch',
                'is_active': False,  # Requires LinkedIn API approval
                'rate_limit_per_hour': 100,
                'requires_authentication': True,
                'api_key_required': True,
                'sync_frequency': 'daily',
                'target_categories': ['technology', 'business', 'finance', 'marketing', 'engineering'],
                'attribution_required': True,
                'attribution_text': 'Job opportunity from LinkedIn Jobs',
                'terms_of_service_url': 'https://www.linkedin.com/legal/user-agreement'
            },
            {
                'name': 'Opportunities for Youth',
                'slug': 'opportunities-for-youth',
                'description': 'Youth-focused internships, scholarships, and career opportunities',
                'source_type': 'scraping',
                'base_url': 'https://opportunitiesforyouth.org',
                'is_active': True,
                'rate_limit_per_hour': 30,
                'requires_authentication': False,
                'api_key_required': False,
                'sync_frequency': 'daily',
                'target_categories': ['internships', 'scholarships', 'youth', 'education', 'international'],
                'attribution_required': True,
                'attribution_text': 'Opportunity from Opportunities for Youth',
                'terms_of_service_url': 'https://opportunitiesforyouth.org'
            },
            {
                'name': 'TechJobs API',
                'slug': 'techjobs-api',
                'description': 'Technology internship opportunities from TechJobs platform',
                'source_type': 'api',
                'base_url': 'https://api.techjobs.com',
                'api_endpoint': 'https://api.techjobs.com/v1/jobs',
                'is_active': True,
                'rate_limit_per_hour': 100,
                'requires_authentication': True,
                'api_key_required': True,
                'sync_frequency': 'daily',
                'target_categories': ['technology', 'software', 'engineering'],
                'attribution_required': True,
                'attribution_text': 'Job listing provided by TechJobs API',
                'terms_of_service_url': 'https://techjobs.com/terms'
            },
            {
                'name': 'University Career Portal',
                'slug': 'university-careers',
                'description': 'University-sponsored internship opportunities',
                'source_type': 'rss',
                'base_url': 'https://careers.university.edu',
                'rss_feed_url': 'https://careers.university.edu/internships.rss',
                'is_active': True,
                'rate_limit_per_hour': 50,
                'requires_authentication': False,
                'api_key_required': False,
                'sync_frequency': 'daily',
                'target_categories': ['academic', 'research', 'education'],
                'attribution_required': True,
                'attribution_text': 'Opportunity from University Career Portal',
                'terms_of_service_url': 'https://careers.university.edu/terms'
            },
            {
                'name': 'StartupJobs Feed',
                'slug': 'startupjobs-feed',
                'description': 'Startup internship opportunities via web scraping',
                'source_type': 'scraping',
                'base_url': 'https://startupjobs.com',
                'is_active': True,
                'rate_limit_per_hour': 20,
                'requires_authentication': False,
                'api_key_required': False,
                'sync_frequency': 'weekly',
                'target_categories': ['startup', 'entrepreneurship', 'business'],
                'attribution_required': True,
                'attribution_text': 'Job from StartupJobs Feed',
                'terms_of_service_url': 'https://startupjobs.com/terms'
            }
        ]
        
        created_count = 0
        for source_data in sources_data:
            source, created = ExternalOpportunitySource.objects.get_or_create(
                name=source_data['name'],
                defaults=source_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    f'  ✓ Created source: {source.name}'
                )
            else:
                self.stdout.write(
                    f'  - Source already exists: {source.name}'
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Created {created_count} new sources')
        )
    
    def test_aggregation(self):
        """Test the aggregation system"""
        self.stdout.write('Testing aggregation system...')
        
        aggregator = ExternalOpportunityAggregator()
        
        # Test source health check
        self.stdout.write('  Testing source health checks...')
        sources = ExternalOpportunitySource.objects.filter(is_active=True)
        
        for source in sources:
            try:
                health_status = aggregator.check_source_health(source)
                status_icon = '✓' if health_status['is_healthy'] else '✗'
                self.stdout.write(
                    f'    {status_icon} {source.name}: {health_status["status"]}'
                )
                
                if not health_status['is_healthy']:
                    self.stdout.write(
                        f'      Error: {health_status.get("error", "Unknown error")}'
                    )
            except Exception as e:
                self.stdout.write(
                    f'    ✗ {source.name}: Error - {str(e)}'
                )
        
        # Test data fetching (mock)
        self.stdout.write('  Testing data fetching...')
        try:
            # Create some sample opportunities for testing
            sample_opportunities = self.create_sample_opportunities()
            self.stdout.write(
                f'    ✓ Created {len(sample_opportunities)} sample opportunities'
            )
        except Exception as e:
            self.stdout.write(
                f'    ✗ Error creating sample opportunities: {str(e)}'
            )
    
    def test_compliance(self):
        """Test compliance and attribution features"""
        self.stdout.write('Testing compliance system...')
        
        compliance_manager = ComplianceManager()
        
        # Test attribution validation
        self.stdout.write('  Testing attribution validation...')
        sources = ExternalOpportunitySource.objects.filter(is_active=True)
        
        for source in sources:
            try:
                is_valid = compliance_manager.validate_source_attribution(source)
                status_icon = '✓' if is_valid else '✗'
                self.stdout.write(
                    f'    {status_icon} {source.name}: Attribution validation'
                )
            except Exception as e:
                self.stdout.write(
                    f'    ✗ {source.name}: Error - {str(e)}'
                )
        
        # Test attribution rendering
        self.stdout.write('  Testing attribution rendering...')
        opportunities = ExternalOpportunity.objects.all()[:3]
        
        for opportunity in opportunities:
            try:
                attribution_html = compliance_manager.get_attribution_html(
                    opportunity.source, 
                    template_type='card'
                )
                if attribution_html:
                    self.stdout.write(
                        f'    ✓ {opportunity.source.name}: Attribution rendered'
                    )
                else:
                    self.stdout.write(
                        f'    ✗ {opportunity.source.name}: No attribution generated'
                    )
            except Exception as e:
                self.stdout.write(
                    f'    ✗ {opportunity.source.name}: Error - {str(e)}'
                )
    
    def create_sample_opportunities(self):
        """Create sample opportunities for testing"""
        # Skip creating sample opportunities for now as ExternalOpportunity
        # requires proper Internship objects to be created first
        self.stdout.write('  Skipping sample opportunity creation - requires Internship objects')
        return []
    
    def display_summary(self):
        """Display system summary"""
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('EXTERNAL OPPORTUNITIES SYSTEM SUMMARY'))
        self.stdout.write('='*50)
        
        # Sources summary
        total_sources = ExternalOpportunitySource.objects.count()
        active_sources = ExternalOpportunitySource.objects.filter(is_active=True).count()
        
        self.stdout.write(f'Sources: {active_sources}/{total_sources} active')
        
        # Opportunities summary
        total_opportunities = ExternalOpportunity.objects.count()
        recent_opportunities = ExternalOpportunity.objects.filter(
            created_at__gte=timezone.now() - timezone.timedelta(days=7)
        ).count()
        
        self.stdout.write(f'Opportunities: {total_opportunities} total')
        self.stdout.write(f'Recent (7 days): {recent_opportunities}')
        
        # Quality summary
        if total_opportunities > 0:
            avg_quality = ExternalOpportunity.objects.aggregate(
                avg_quality=models.Avg('data_quality_score')
            )['avg_quality'] or 0
            
            self.stdout.write(f'Average Quality: {avg_quality:.2f}/1.0')
        
        # Configuration check
        self.stdout.write('\nConfiguration:')
        
        # Check Redis
        try:
            from django.core.cache import cache
            cache.set('test_key', 'test_value', 10)
            if cache.get('test_key') == 'test_value':
                self.stdout.write('  ✓ Redis cache: Working')
            else:
                self.stdout.write('  ✗ Redis cache: Not working')
        except Exception as e:
            self.stdout.write(f'  ✗ Redis cache: Error - {str(e)}')
        
        # Check Celery configuration
        celery_configured = hasattr(settings, 'CELERY_BROKER_URL')
        self.stdout.write(
            f'  {"✓" if celery_configured else "✗"} Celery: {"Configured" if celery_configured else "Not configured"}'
        )
        
        # Check external opportunities settings
        ext_settings = getattr(settings, 'EXTERNAL_OPPORTUNITIES', {})
        self.stdout.write(
            f'  {"✓" if ext_settings else "✗"} External Opportunities Settings: {"Configured" if ext_settings else "Not configured"}'
        )
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write(
            self.style.SUCCESS('Setup complete! You can now:')
        )
        self.stdout.write('1. Start the Celery worker: celery -A Edulink worker -l info')
        self.stdout.write('2. Start the Celery beat scheduler: celery -A Edulink beat -l info')
        self.stdout.write('3. Access the external opportunities API at /api/internships/external/')
        self.stdout.write('4. View the admin interface for source management')
        self.stdout.write('='*50)