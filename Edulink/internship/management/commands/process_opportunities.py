from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from internship.services import OpportunityDataProcessor
from internship.models import ExternalOpportunity
import logging


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process opportunities through deduplication, validation, and categorization pipeline'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--opportunity-id',
            type=int,
            help='Process specific opportunity by ID (optional)'
        )
        parser.add_argument(
            '--quality-threshold',
            type=float,
            default=0.8,
            help='Only process opportunities below this quality score (default: 0.8)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of opportunities to process in each batch (default: 100)'
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
            '--stats-only',
            action='store_true',
            help='Only show processing statistics without running processing'
        )
    
    def handle(self, *args, **options):
        if options['verbose']:
            logging.basicConfig(level=logging.INFO)
        
        processor = OpportunityDataProcessor()
        
        # Show statistics if requested
        if options['stats_only']:
            self._show_statistics(processor)
            return
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Starting opportunity processing at {timezone.now()}"
            )
        )
        
        try:
            if options['opportunity_id']:
                # Process specific opportunity
                result = self._process_specific_opportunity(
                    processor, 
                    options['opportunity_id']
                )
            else:
                # Process all opportunities
                result = processor.process_all_opportunities()
            
            # Display results
            self._display_results(result)
            
            if result['errors'] > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f"Completed with {result['errors']} errors"
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS("Processing completed successfully")
                )
        
        except Exception as e:
            logger.error(f"Processing failed: {str(e)}", exc_info=True)
            raise CommandError(f"Processing failed: {str(e)}")
    
    def _process_specific_opportunity(self, processor, opportunity_id):
        """Process a specific opportunity by ID."""
        try:
            opportunity = ExternalOpportunity.objects.get(id=opportunity_id)
        except ExternalOpportunity.DoesNotExist:
            raise CommandError(f"Opportunity with ID {opportunity_id} not found")
        
        self.stdout.write(f"Processing opportunity: {opportunity.internship.title}")
        
        result = processor.process_opportunity(opportunity)
        
        # Convert single opportunity result to match batch processing format
        return {
            'processed': 1,
            'validated': 1 if result['validated'] else 0,
            'duplicates_found': 1 if result['duplicate_found'] else 0,
            'categorized': 1 if result['categorized'] else 0,
            'quality_improved': 1 if result['quality_improved'] else 0,
            'errors': 0
        }
    
    def _show_statistics(self, processor):
        """Display processing statistics."""
        stats = processor.get_processing_statistics()
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("OPPORTUNITY PROCESSING STATISTICS"))
        self.stdout.write("=" * 60)
        
        # Overall statistics
        self.stdout.write(f"Total Opportunities: {stats['total_opportunities']}")
        self.stdout.write(f"High Quality (≥0.8): {stats['high_quality']}")
        self.stdout.write(f"Medium Quality (0.5-0.8): {stats['medium_quality']}")
        self.stdout.write(f"Low Quality (<0.5): {stats['low_quality']}")
        self.stdout.write(f"Duplicates: {stats['duplicates']}")
        self.stdout.write(f"Needs Processing: {stats['needs_processing']}")
        self.stdout.write(f"Average Quality Score: {stats['average_quality_score']:.3f}")
        
        # Quality distribution
        total = stats['total_opportunities']
        if total > 0:
            self.stdout.write("\nQuality Distribution:")
            self.stdout.write(f"  High Quality: {stats['high_quality']/total*100:.1f}%")
            self.stdout.write(f"  Medium Quality: {stats['medium_quality']/total*100:.1f}%")
            self.stdout.write(f"  Low Quality: {stats['low_quality']/total*100:.1f}%")
        
        # Category distribution
        if stats['category_distribution']:
            self.stdout.write("\nCategory Distribution:")
            for category, count in list(stats['category_distribution'].items())[:10]:
                percentage = count / total * 100 if total > 0 else 0
                self.stdout.write(f"  {category}: {count} ({percentage:.1f}%)")
        
        self.stdout.write("\n" + "=" * 60)
    
    def _display_results(self, result):
        """Display processing results in a formatted way."""
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("PROCESSING RESULTS"))
        self.stdout.write("=" * 60)
        
        self.stdout.write(f"Opportunities Processed: {result['processed']}")
        self.stdout.write(f"Data Validated & Cleaned: {result['validated']}")
        self.stdout.write(f"Duplicates Found: {result['duplicates_found']}")
        self.stdout.write(f"Categories Improved: {result['categorized']}")
        self.stdout.write(f"Quality Scores Improved: {result['quality_improved']}")
        self.stdout.write(f"Processing Errors: {result['errors']}")
        
        # Calculate success rate
        if result['processed'] > 0:
            success_rate = (result['processed'] - result['errors']) / result['processed'] * 100
            self.stdout.write(f"Success Rate: {success_rate:.1f}%")
        
        self.stdout.write("\n" + "=" * 60)