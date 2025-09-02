from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
import logging

from security.models import (
    SecurityEvent,
    AuditLog,
    UserSession,
    FailedLoginAttempt,
    SecurityConfiguration,
    SeverityLevel
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up old security data based on retention policies'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        
        parser.add_argument(
            '--events-days',
            type=int,
            help='Days to retain security events (overrides config)'
        )
        
        parser.add_argument(
            '--audit-days',
            type=int,
            help='Days to retain audit logs (overrides config)'
        )
        
        parser.add_argument(
            '--session-days',
            type=int,
            help='Days to retain inactive sessions (overrides config)'
        )
        
        parser.add_argument(
            '--failed-attempts-days',
            type=int,
            help='Days to retain failed login attempts (overrides config)'
        )
        
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force cleanup without confirmation'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        self.stdout.write(
            self.style.SUCCESS('Starting security data cleanup...')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No data will be deleted')
            )
        
        try:
            # Get retention periods
            events_days = options['events_days'] or SecurityConfiguration.get_value(
                'security_event_retention_days', 90
            )
            
            critical_events_days = SecurityConfiguration.get_value(
                'critical_event_retention_days', 365
            )
            
            audit_days = options['audit_days'] or SecurityConfiguration.get_value(
                'audit_log_retention_days', 180
            )
            
            session_days = options['session_days'] or SecurityConfiguration.get_value(
                'session_retention_days', 30
            )
            
            failed_attempts_days = options['failed_attempts_days'] or SecurityConfiguration.get_value(
                'failed_attempt_retention_days', 30
            )
            
            # Calculate cutoff dates
            now = timezone.now()
            events_cutoff = now - timedelta(days=events_days)
            critical_events_cutoff = now - timedelta(days=critical_events_days)
            audit_cutoff = now - timedelta(days=audit_days)
            session_cutoff = now - timedelta(days=session_days)
            failed_attempts_cutoff = now - timedelta(days=failed_attempts_days)
            
            # Show what will be cleaned
            self.stdout.write('\nRetention policies:')
            self.stdout.write(f'  Security events (low/medium): {events_days} days')
            self.stdout.write(f'  Security events (high/critical): {critical_events_days} days')
            self.stdout.write(f'  Audit logs: {audit_days} days')
            self.stdout.write(f'  Inactive sessions: {session_days} days')
            self.stdout.write(f'  Failed login attempts: {failed_attempts_days} days')
            
            # Count items to be deleted
            events_to_delete = SecurityEvent.objects.filter(
                timestamp__lt=events_cutoff,
                severity__in=[SeverityLevel.LOW, SeverityLevel.MEDIUM]
            ).count()
            
            critical_events_to_delete = SecurityEvent.objects.filter(
                timestamp__lt=critical_events_cutoff,
                severity__in=[SeverityLevel.HIGH, SeverityLevel.CRITICAL]
            ).count()
            
            audit_logs_to_delete = AuditLog.objects.filter(
                timestamp__lt=audit_cutoff
            ).count()
            
            sessions_to_delete = UserSession.objects.filter(
                expires_at__lt=session_cutoff,
                is_active=False
            ).count()
            
            failed_attempts_to_delete = FailedLoginAttempt.objects.filter(
                timestamp__lt=failed_attempts_cutoff
            ).count()
            
            total_to_delete = (
                events_to_delete + critical_events_to_delete + 
                audit_logs_to_delete + sessions_to_delete + failed_attempts_to_delete
            )
            
            self.stdout.write('\nItems to be deleted:')
            self.stdout.write(f'  Security events (low/medium): {events_to_delete}')
            self.stdout.write(f'  Security events (high/critical): {critical_events_to_delete}')
            self.stdout.write(f'  Audit logs: {audit_logs_to_delete}')
            self.stdout.write(f'  Inactive sessions: {sessions_to_delete}')
            self.stdout.write(f'  Failed login attempts: {failed_attempts_to_delete}')
            self.stdout.write(f'  Total: {total_to_delete}')
            
            if total_to_delete == 0:
                self.stdout.write(
                    self.style.SUCCESS('No data to clean up.')
                )
                return
            
            if dry_run:
                self.stdout.write(
                    self.style.SUCCESS('Dry run completed. No data was deleted.')
                )
                return
            
            # Confirm deletion
            if not force:
                confirm = input(f'\nAre you sure you want to delete {total_to_delete} items? (yes/no): ')
                if confirm.lower() != 'yes':
                    self.stdout.write(
                        self.style.WARNING('Cleanup cancelled.')
                    )
                    return
            
            # Perform cleanup in transaction
            with transaction.atomic():
                deleted_counts = {}
                
                # Delete security events
                if events_to_delete > 0:
                    deleted_counts['events'] = SecurityEvent.objects.filter(
                        timestamp__lt=events_cutoff,
                        severity__in=[SeverityLevel.LOW, SeverityLevel.MEDIUM]
                    ).delete()[0]
                
                if critical_events_to_delete > 0:
                    deleted_counts['critical_events'] = SecurityEvent.objects.filter(
                        timestamp__lt=critical_events_cutoff,
                        severity__in=[SeverityLevel.HIGH, SeverityLevel.CRITICAL]
                    ).delete()[0]
                
                # Delete audit logs
                if audit_logs_to_delete > 0:
                    deleted_counts['audit_logs'] = AuditLog.objects.filter(
                        timestamp__lt=audit_cutoff
                    ).delete()[0]
                
                # Delete inactive sessions
                if sessions_to_delete > 0:
                    deleted_counts['sessions'] = UserSession.objects.filter(
                        expires_at__lt=session_cutoff,
                        is_active=False
                    ).delete()[0]
                
                # Delete failed login attempts
                if failed_attempts_to_delete > 0:
                    deleted_counts['failed_attempts'] = FailedLoginAttempt.objects.filter(
                        timestamp__lt=failed_attempts_cutoff
                    ).delete()[0]
            
            # Report results
            self.stdout.write('\nCleanup completed:')
            total_deleted = 0
            for item_type, count in deleted_counts.items():
                self.stdout.write(f'  {item_type}: {count} deleted')
                total_deleted += count
            
            self.stdout.write(
                self.style.SUCCESS(f'\nTotal items deleted: {total_deleted}')
            )
            
            # Log the cleanup
            logger.info(f'Security data cleanup completed: {total_deleted} items deleted')
            
        except Exception as e:
            logger.error(f'Security data cleanup failed: {e}')
            raise CommandError(f'Cleanup failed: {e}')