from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from internship.services import ExternalOpportunityAggregator
from internship.models import ExternalOpportunitySource
import logging
import json


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Aggregate opportunities from external sources'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            help='Specific source name to aggregate (optional)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making any database changes'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose output'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force aggregation even if source is not due for sync'
        )
    
    def handle(self, *args, **options):
        if options['verbose']:
            logging.basicConfig(level=logging.INFO)
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Starting opportunity aggregation at {timezone.now()}"
            )
        )
        
        aggregator = ExternalOpportunityAggregator()
        
        try:
            if options['source']:
                # Aggregate specific source
                result = self._aggregate_specific_source(
                    aggregator, 
                    options['source'], 
                    options['force']
                )
            else:
                # Aggregate all sources
                result = aggregator.aggregate_all_sources()
            
            # Display results
            self._display_results(result)
            
            if result['errors']:
                self.stdout.write(
                    self.style.WARNING(
                        f"Completed with {len(result['errors'])} errors"
                    )
                )
                for error in result['errors']:
                    self.stdout.write(self.style.ERROR(f"  - {error}"))
            else:
                self.stdout.write(
                    self.style.SUCCESS("Aggregation completed successfully")
                )
        
        except Exception as e:
            logger.error(f"Aggregation failed: {str(e)}", exc_info=True)
            raise CommandError(f"Aggregation failed: {str(e)}")
    
    def _aggregate_specific_source(self, aggregator, source_name, force=False):
        """Aggregate opportunities from a specific source."""
        try:
            source = ExternalOpportunitySource.objects.get(
                name=source_name,
                is_active=True
            )
        except ExternalOpportunitySource.DoesNotExist:
            raise CommandError(f"Source '{source_name}' not found or inactive")
        
        # Check if source needs sync (unless forced)
        if not force and not source.needs_sync:
            self.stdout.write(
                self.style.WARNING(
                    f"Source '{source_name}' is not due for sync. Use --force to override."
                )
            )
            return {
                'total_processed': 0,
                'successful_syncs': 0,
                'failed_syncs': 0,
                'new_opportunities': 0,
                'updated_opportunities': 0,
                'errors': [],
                'source_results': {}
            }
        
        result = aggregator.aggregate_source(source)
        
        # Wrap single source result in the expected format
        return {
            'total_processed': result['total_processed'],
            'successful_syncs': result['successful_syncs'],
            'failed_syncs': result['failed_syncs'],
            'new_opportunities': result['new_opportunities'],
            'updated_opportunities': result['updated_opportunities'],
            'errors': result['errors'],
            'source_results': {source_name: result}
        }
    
    def _display_results(self, result):
        """Display aggregation results in a formatted way."""
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("AGGREGATION RESULTS"))
        self.stdout.write("=" * 60)
        
        # Overall statistics
        self.stdout.write(f"Total Processed: {result['total_processed']}")
        self.stdout.write(f"New Opportunities: {result['new_opportunities']}")
        self.stdout.write(f"Updated Opportunities: {result['updated_opportunities']}")
        self.stdout.write(f"Successful Syncs: {result['successful_syncs']}")
        self.stdout.write(f"Failed Syncs: {result['failed_syncs']}")
        
        # Per-source results
        if result['source_results']:
            self.stdout.write("\nPER-SOURCE RESULTS:")
            self.stdout.write("-" * 40)
            
            for source_name, source_result in result['source_results'].items():
                self.stdout.write(f"\n{source_name}:")
                self.stdout.write(f"  Processed: {source_result['total_processed']}")
                self.stdout.write(f"  New: {source_result['new_opportunities']}")
                self.stdout.write(f"  Updated: {source_result['updated_opportunities']}")
                self.stdout.write(f"  Success: {source_result['successful_syncs']}")
                self.stdout.write(f"  Failed: {source_result['failed_syncs']}")
                
                if source_result['errors']:
                    self.stdout.write("  Errors:")
                    for error in source_result['errors'][:3]:  # Show first 3 errors
                        self.stdout.write(f"    - {error}")
                    if len(source_result['errors']) > 3:
                        self.stdout.write(f"    ... and {len(source_result['errors']) - 3} more")
        
        self.stdout.write("\n" + "=" * 60)