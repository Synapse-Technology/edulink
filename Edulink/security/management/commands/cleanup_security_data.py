from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta
from security.models import SecurityEvent, AuditLog, FailedLoginAttempt, UserSession
from django.db import transaction


class Command(BaseCommand):
    help = 'Clean up old security data to maintain database performance'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Delete records older than this many days (default: 90)'
        )
        parser.add_argument(
            '--model',
            type=str,
            choices=['all', 'events', 'audit', 'failed_logins', 'sessions'],
            default='all',
            help='Specific model to clean up (default: all)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of records to delete in each batch (default: 1000)'
        )
        parser.add_argument(
            '--keep-critical',
            action='store_true',
            help='Keep critical security events regardless of age'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force deletion without confirmation'
        )
    
    def handle(self, *args, **options):
        try:
            self.stdout.write(
                self.style.SUCCESS('Starting security data cleanup...')
            )
            
            # Calculate cutoff date
            cutoff_date = timezone.now() - timedelta(days=options['days'])
            
            self.stdout.write(
                f"Cleaning up records older than {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}"
            )
            
            # Determine which models to clean
            models_to_clean = self.get_models_to_clean(options['model'])
            
            # Get deletion counts
            deletion_counts = self.get_deletion_counts(
                cutoff_date, models_to_clean, options
            )
            
            # Show what will be deleted
            self.show_deletion_summary(deletion_counts)
            
            if options['dry_run']:
                self.stdout.write(
                    self.style.WARNING('DRY RUN: No data was actually deleted')
                )
                return
            
            # Confirm deletion unless forced
            if not options['force']:
                if not self.confirm_deletion(deletion_counts):
                    self.stdout.write(
                        self.style.WARNING('Cleanup cancelled by user')
                    )
                    return
            
            # Perform cleanup
            total_deleted = self.perform_cleanup(
                cutoff_date, models_to_clean, options
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Cleanup completed successfully. Total records deleted: {total_deleted}'
                )
            )
            
        except Exception as e:
            raise CommandError(f'Cleanup failed: {str(e)}')
    
    def get_models_to_clean(self, model_choice):
        """Get list of models to clean based on user choice."""
        model_map = {
            'events': [SecurityEvent],
            'audit': [AuditLog],
            'failed_logins': [FailedLoginAttempt],
            'sessions': [UserSession],
            'all': [SecurityEvent, AuditLog, FailedLoginAttempt, UserSession]
        }
        
        return model_map.get(model_choice, model_map['all'])
    
    def get_deletion_counts(self, cutoff_date, models_to_clean, options):
        """Get count of records that would be deleted."""
        counts = {}
        
        for model in models_to_clean:
            query = self.build_deletion_query(model, cutoff_date, options)
            counts[model.__name__] = query.count()
        
        return counts
    
    def build_deletion_query(self, model, cutoff_date, options):
        """Build deletion query for a specific model."""
        # Determine the timestamp field for each model
        timestamp_field = 'timestamp'
        if model == UserSession:
            timestamp_field = 'created_at'
        
        query = model.objects.filter(**{f'{timestamp_field}__lt': cutoff_date})
        
        # Keep critical events if requested
        if options['keep_critical'] and model == SecurityEvent:
            query = query.exclude(severity='critical')
        
        return query
    
    def show_deletion_summary(self, deletion_counts):
        """Show summary of what will be deleted."""
        self.stdout.write("\n" + "-" * 50)
        self.stdout.write(self.style.WARNING("DELETION SUMMARY"))
        self.stdout.write("-" * 50)
        
        total = 0
        for model_name, count in deletion_counts.items():
            if count > 0:
                self.stdout.write(f"{model_name}: {count:,} records")
                total += count
            else:
                self.stdout.write(f"{model_name}: No records to delete")
        
        self.stdout.write("-" * 50)
        self.stdout.write(f"Total: {total:,} records")
        self.stdout.write("-" * 50)
    
    def confirm_deletion(self, deletion_counts):
        """Ask user to confirm deletion."""
        total = sum(deletion_counts.values())
        
        if total == 0:
            self.stdout.write(
                self.style.SUCCESS('No records to delete')
            )
            return False
        
        self.stdout.write(
            self.style.WARNING(
                f"\nThis will permanently delete {total:,} records."
            )
        )
        
        response = input("Are you sure you want to continue? (yes/no): ")
        return response.lower() in ['yes', 'y']
    
    def perform_cleanup(self, cutoff_date, models_to_clean, options):
        """Perform the actual cleanup operation."""
        total_deleted = 0
        batch_size = options['batch_size']
        
        for model in models_to_clean:
            model_name = model.__name__
            self.stdout.write(f"\nCleaning up {model_name}...")
            
            deleted_count = self.delete_model_records(
                model, cutoff_date, options, batch_size
            )
            
            total_deleted += deleted_count
            
            if deleted_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Deleted {deleted_count:,} {model_name} records"
                    )
                )
            else:
                self.stdout.write(f"No {model_name} records to delete")
        
        return total_deleted
    
    def delete_model_records(self, model, cutoff_date, options, batch_size):
        """Delete records for a specific model in batches."""
        total_deleted = 0
        
        while True:
            with transaction.atomic():
                # Build query for this batch
                query = self.build_deletion_query(model, cutoff_date, options)
                
                # Get IDs for this batch
                ids = list(query.values_list('id', flat=True)[:batch_size])
                
                if not ids:
                    break  # No more records to delete
                
                # Delete this batch
                deleted_count = model.objects.filter(id__in=ids).delete()[0]
                total_deleted += deleted_count
                
                # Show progress
                if total_deleted % (batch_size * 10) == 0:
                    self.stdout.write(
                        f"  Deleted {total_deleted:,} {model.__name__} records so far..."
                    )
        
        return total_deleted
    
    def handle_cleanup_error(self, model, error):
        """Handle cleanup errors gracefully."""
        self.stdout.write(
            self.style.ERROR(
                f"Error cleaning up {model.__name__}: {str(error)}"
            )
        )
        
        # Log the error for debugging
        import logging
        logger = logging.getLogger('security.cleanup')
        logger.error(f"Cleanup error for {model.__name__}: {str(error)}")
    
    def optimize_database(self):
        """Optimize database after cleanup."""
        from django.db import connection
        
        try:
            with connection.cursor() as cursor:
                # Get database engine
                engine = connection.settings_dict['ENGINE']
                
                if 'postgresql' in engine:
                    # PostgreSQL optimization
                    cursor.execute("VACUUM ANALYZE;")
                    self.stdout.write(
                        self.style.SUCCESS("Database optimized (PostgreSQL VACUUM)")
                    )
                elif 'mysql' in engine:
                    # MySQL optimization
                    cursor.execute("OPTIMIZE TABLE security_securityevent, security_auditlog, security_failedloginattempt, security_usersession;")
                    self.stdout.write(
                        self.style.SUCCESS("Database optimized (MySQL OPTIMIZE)")
                    )
                elif 'sqlite' in engine:
                    # SQLite optimization
                    cursor.execute("VACUUM;")
                    self.stdout.write(
                        self.style.SUCCESS("Database optimized (SQLite VACUUM)")
                    )
                
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(
                    f"Database optimization failed: {str(e)}"
                )
            )
    
    def get_cleanup_statistics(self, cutoff_date):
        """Get statistics about the cleanup operation."""
        stats = {
            'cutoff_date': cutoff_date,
            'models': {}
        }
        
        models = [SecurityEvent, AuditLog, FailedLoginAttempt, UserSession]
        
        for model in models:
            model_name = model.__name__
            
            # Get total count
            total_count = model.objects.count()
            
            # Get count of old records
            timestamp_field = 'timestamp'
            if model == UserSession:
                timestamp_field = 'created_at'
            
            old_count = model.objects.filter(
                **{f'{timestamp_field}__lt': cutoff_date}
            ).count()
            
            stats['models'][model_name] = {
                'total_records': total_count,
                'old_records': old_count,
                'retention_percentage': (
                    ((total_count - old_count) / total_count * 100) 
                    if total_count > 0 else 0
                )
            }
        
        return stats
    
    def create_cleanup_report(self, stats, deleted_counts):
        """Create a cleanup report."""
        from datetime import datetime
        import json
        
        report = {
            'cleanup_date': datetime.now().isoformat(),
            'cutoff_date': stats['cutoff_date'].isoformat(),
            'statistics': stats,
            'deleted_counts': deleted_counts,
            'total_deleted': sum(deleted_counts.values())
        }
        
        # Save report to file
        report_filename = f"security_cleanup_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(report_filename, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Cleanup report saved to {report_filename}"
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(
                    f"Failed to save cleanup report: {str(e)}"
                )
            )
        
        return report