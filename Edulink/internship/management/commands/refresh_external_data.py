"""Management command for refreshing external opportunity data."""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction
from django.conf import settings

from ...models import ExternalOpportunitySource, ExternalOpportunity, Internship
from ...services.external_aggregator import ExternalOpportunityAggregator
from ...services.cache_manager import OpportunityCacheManager

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Refresh external opportunity data from configured sources'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--source-id',
            type=int,
            help='Refresh data from specific source ID only'
        )
        
        parser.add_argument(
            '--source-type',
            choices=['api', 'rss', 'scraper'],
            help='Refresh data from specific source type only'
        )
        
        parser.add_argument(
            '--max-age-hours',
            type=int,
            default=24,
            help='Only refresh sources not updated in the last N hours (default: 24)'
        )
        
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='Number of opportunities to process in each batch (default: 50)'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be refreshed without making changes'
        )
        
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force refresh even if recently updated'
        )
        
        parser.add_argument(
            '--clear-cache',
            action='store_true',
            help='Clear cache after refresh'
        )
        
        parser.add_argument(
            '--warm-cache',
            action='store_true',
            help='Warm cache after refresh'
        )
        
        parser.add_argument(
            '--stats-only',
            action='store_true',
            help='Only show refresh statistics without processing'
        )
        
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose output'
        )
    
    def handle(self, *args, **options):
        """Main command handler."""
        self.verbosity = options.get('verbosity', 1)
        self.verbose = options.get('verbose', False)
        self.dry_run = options.get('dry_run', False)
        
        # Initialize services
        self.aggregator = ExternalOpportunityAggregator()
        self.cache_manager = OpportunityCacheManager()
        
        # Track statistics
        self.stats = {
            'sources_processed': 0,
            'sources_skipped': 0,
            'opportunities_added': 0,
            'opportunities_updated': 0,
            'opportunities_removed': 0,
            'errors': 0,
            'start_time': timezone.now(),
            'end_time': None
        }
        
        try:
            if options.get('stats_only'):
                self._show_refresh_stats()
                return
            
            # Get sources to refresh
            sources = self._get_sources_to_refresh(options)
            
            if not sources:
                self.stdout.write(
                    self.style.WARNING('No sources found to refresh')
                )
                return
            
            self._log_info(f"Found {len(sources)} sources to refresh")
            
            if self.dry_run:
                self._show_dry_run_info(sources)
                return
            
            # Process each source
            for source in sources:
                try:
                    self._refresh_source(source, options)
                except Exception as e:
                    self.stats['errors'] += 1
                    self._log_error(f"Failed to refresh source {source.name}: {e}")
            
            # Post-processing
            if options.get('clear_cache'):
                self._clear_cache()
            
            if options.get('warm_cache'):
                self._warm_cache()
            
            # Final statistics
            self.stats['end_time'] = timezone.now()
            self._show_final_stats()
            
        except KeyboardInterrupt:
            self.stdout.write(
                self.style.WARNING('\nRefresh interrupted by user')
            )
        except Exception as e:
            self.stats['errors'] += 1
            raise CommandError(f"Refresh failed: {e}")
    
    def _get_sources_to_refresh(self, options: Dict[str, Any]) -> List[ExternalOpportunitySource]:
        """Get list of sources that need refreshing."""
        queryset = ExternalOpportunitySource.objects.filter(is_active=True)
        
        # Filter by specific source ID
        if options.get('source_id'):
            queryset = queryset.filter(id=options['source_id'])
        
        # Filter by source type
        if options.get('source_type'):
            queryset = queryset.filter(source_type=options['source_type'])
        
        # Filter by age unless forced
        if not options.get('force'):
            max_age_hours = options.get('max_age_hours', 24)
            cutoff_time = timezone.now() - timedelta(hours=max_age_hours)
            queryset = queryset.filter(
                models.Q(last_sync__isnull=True) | 
                models.Q(last_sync__lt=cutoff_time)
            )
        
        return list(queryset.select_related())
    
    def _refresh_source(self, source: ExternalOpportunitySource, options: Dict[str, Any]):
        """Refresh data from a single source."""
        self._log_info(f"Refreshing source: {source.name} ({source.source_type})")
        
        try:
            with transaction.atomic():
                # Update source status
                source.last_sync_attempt = timezone.now()
                source.health_status = 'syncing'
                source.save(update_fields=['last_sync_attempt', 'health_status'])
                
                # Fetch new data
                batch_size = options.get('batch_size', 50)
                results = self.aggregator.fetch_from_source(
                    source, 
                    batch_size=batch_size
                )
                
                if results['success']:
                    # Process fetched opportunities
                    processed = self._process_opportunities(
                        source, 
                        results['opportunities'],
                        options
                    )
                    
                    # Update source status
                    source.last_sync = timezone.now()
                    source.health_status = 'healthy'
                    source.total_opportunities = processed['total']
                    source.save(update_fields=[
                        'last_sync', 'health_status', 'total_opportunities'
                    ])
                    
                    # Update stats
                    self.stats['sources_processed'] += 1
                    self.stats['opportunities_added'] += processed['added']
                    self.stats['opportunities_updated'] += processed['updated']
                    
                    self._log_info(
                        f"Successfully refreshed {source.name}: "
                        f"{processed['added']} added, {processed['updated']} updated"
                    )
                    
                else:
                    # Handle fetch failure
                    source.health_status = 'error'
                    source.last_error = results.get('error', 'Unknown error')
                    source.save(update_fields=['health_status', 'last_error'])
                    
                    self.stats['sources_skipped'] += 1
                    self._log_error(
                        f"Failed to fetch from {source.name}: {results.get('error')}"
                    )
                
        except Exception as e:
            # Update source error status
            source.health_status = 'error'
            source.last_error = str(e)
            source.save(update_fields=['health_status', 'last_error'])
            
            self.stats['sources_skipped'] += 1
            raise
    
    def _process_opportunities(self, source: ExternalOpportunitySource, 
                             opportunities: List[Dict[str, Any]], 
                             options: Dict[str, Any]) -> Dict[str, int]:
        """Process fetched opportunities."""
        added = 0
        updated = 0
        
        for opp_data in opportunities:
            try:
                # Check if opportunity already exists
                external_id = opp_data.get('external_id')
                existing = ExternalOpportunity.objects.filter(
                    source=source,
                    external_id=external_id
                ).first()
                
                if existing:
                    # Update existing opportunity
                    if self._should_update_opportunity(existing, opp_data):
                        self._update_opportunity(existing, opp_data)
                        updated += 1
                        
                        # Invalidate cache
                        self.cache_manager.invalidate_opportunity(existing.id)
                        
                else:
                    # Create new opportunity
                    new_opp = self._create_opportunity(source, opp_data)
                    if new_opp:
                        added += 1
                
            except Exception as e:
                self._log_error(f"Failed to process opportunity {external_id}: {e}")
                continue
        
        return {'added': added, 'updated': updated, 'total': len(opportunities)}
    
    def _should_update_opportunity(self, existing: ExternalOpportunity, 
                                 new_data: Dict[str, Any]) -> bool:
        """Check if an existing opportunity should be updated."""
        # Always update if no last sync time
        if not existing.last_synced:
            return True
        
        # Update if data has changed significantly
        current_hash = existing.get_data_hash()
        new_hash = self.aggregator.calculate_data_hash(new_data)
        
        return current_hash != new_hash
    
    def _create_opportunity(self, source: ExternalOpportunitySource, 
                          opp_data: Dict[str, Any]) -> ExternalOpportunity:
        """Create a new external opportunity."""
        try:
            # Create or get internship
            internship_data = self.aggregator.extract_internship_data(opp_data)
            internship = self.aggregator.create_or_update_internship(internship_data)
            
            # Create external opportunity
            external_opp = ExternalOpportunity.objects.create(
                internship=internship,
                source=source,
                external_id=opp_data.get('external_id'),
                external_url=opp_data.get('external_url'),
                raw_data=opp_data,
                data_quality_score=self.aggregator.calculate_quality_score(opp_data),
                last_synced=timezone.now()
            )
            
            self._log_debug(f"Created opportunity: {external_opp.external_id}")
            return external_opp
            
        except Exception as e:
            self._log_error(f"Failed to create opportunity: {e}")
            return None
    
    def _update_opportunity(self, existing: ExternalOpportunity, 
                          new_data: Dict[str, Any]):
        """Update an existing external opportunity."""
        try:
            # Update internship data
            internship_data = self.aggregator.extract_internship_data(new_data)
            self.aggregator.create_or_update_internship(
                internship_data, 
                existing_internship=existing.internship
            )
            
            # Update external opportunity
            existing.raw_data = new_data
            existing.external_url = new_data.get('external_url', existing.external_url)
            existing.data_quality_score = self.aggregator.calculate_quality_score(new_data)
            existing.last_synced = timezone.now()
            existing.save()
            
            self._log_debug(f"Updated opportunity: {existing.external_id}")
            
        except Exception as e:
            self._log_error(f"Failed to update opportunity {existing.external_id}: {e}")
    
    def _clear_cache(self):
        """Clear opportunity caches."""
        try:
            self.cache_manager.clear_all_cache()
            self._log_info("Cache cleared successfully")
        except Exception as e:
            self._log_error(f"Failed to clear cache: {e}")
    
    def _warm_cache(self):
        """Warm up caches with fresh data."""
        try:
            results = self.cache_manager.warm_cache()
            self._log_info(
                f"Cache warmed: {results['cached']} items cached, "
                f"{results['errors']} errors"
            )
        except Exception as e:
            self._log_error(f"Failed to warm cache: {e}")
    
    def _show_dry_run_info(self, sources: List[ExternalOpportunitySource]):
        """Show what would be refreshed in dry run mode."""
        self.stdout.write(self.style.SUCCESS("DRY RUN MODE - No changes will be made\n"))
        
        for source in sources:
            last_sync = source.last_sync.strftime('%Y-%m-%d %H:%M:%S') if source.last_sync else 'Never'
            self.stdout.write(
                f"Would refresh: {source.name} ({source.source_type})\n"
                f"  Last sync: {last_sync}\n"
                f"  Status: {source.health_status}\n"
                f"  Total opportunities: {source.total_opportunities}\n"
            )
    
    def _show_refresh_stats(self):
        """Show current refresh statistics."""
        self.stdout.write(self.style.SUCCESS("External Opportunity Refresh Statistics\n"))
        
        # Source statistics
        sources = ExternalOpportunitySource.objects.all()
        active_sources = sources.filter(is_active=True).count()
        total_sources = sources.count()
        
        self.stdout.write(f"Sources: {active_sources} active / {total_sources} total")
        
        # Health status breakdown
        for status in ['healthy', 'error', 'syncing', 'inactive']:
            count = sources.filter(health_status=status).count()
            if count > 0:
                self.stdout.write(f"  {status.title()}: {count}")
        
        # Opportunity statistics
        total_external = ExternalOpportunity.objects.count()
        recent_external = ExternalOpportunity.objects.filter(
            last_synced__gte=timezone.now() - timedelta(hours=24)
        ).count()
        
        self.stdout.write(f"\nExternal Opportunities: {total_external} total")
        self.stdout.write(f"  Synced in last 24h: {recent_external}")
        
        # Cache statistics
        cache_stats = self.cache_manager.get_cache_stats()
        if cache_stats.get('enabled'):
            self.stdout.write(f"\nCache: Enabled ({cache_stats.get('backend', 'Unknown')})")
        else:
            self.stdout.write("\nCache: Disabled")
    
    def _show_final_stats(self):
        """Show final refresh statistics."""
        duration = self.stats['end_time'] - self.stats['start_time']
        
        self.stdout.write(self.style.SUCCESS("\nRefresh completed!"))
        self.stdout.write(f"Duration: {duration}")
        self.stdout.write(f"Sources processed: {self.stats['sources_processed']}")
        self.stdout.write(f"Sources skipped: {self.stats['sources_skipped']}")
        self.stdout.write(f"Opportunities added: {self.stats['opportunities_added']}")
        self.stdout.write(f"Opportunities updated: {self.stats['opportunities_updated']}")
        
        if self.stats['errors'] > 0:
            self.stdout.write(
                self.style.WARNING(f"Errors encountered: {self.stats['errors']}")
            )
    
    def _log_info(self, message: str):
        """Log info message."""
        if self.verbosity >= 1:
            self.stdout.write(message)
        logger.info(message)
    
    def _log_debug(self, message: str):
        """Log debug message."""
        if self.verbose:
            self.stdout.write(self.style.HTTP_INFO(message))
        logger.debug(message)
    
    def _log_error(self, message: str):
        """Log error message."""
        self.stdout.write(self.style.ERROR(message))
        logger.error(message)