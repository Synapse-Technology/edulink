"""Celery tasks for external opportunity management."""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from celery import shared_task
from django.utils import timezone
from django.core.management import call_command
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from .models import ExternalOpportunitySource, ExternalOpportunity
from .services.external_aggregator import ExternalOpportunityAggregator
from .services.cache_manager import OpportunityCacheManager

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def refresh_external_opportunities(self, source_id: Optional[int] = None, 
                                 force: bool = False, 
                                 batch_size: int = 50) -> Dict[str, Any]:
    """Refresh external opportunities from all or specific sources."""
    try:
        logger.info(f"Starting external opportunity refresh task (source_id={source_id})")
        
        # Prepare command arguments
        cmd_args = [
            '--batch-size', str(batch_size),
            '--verbose'
        ]
        
        if source_id:
            cmd_args.extend(['--source-id', str(source_id)])
        
        if force:
            cmd_args.append('--force')
        
        # Execute refresh command
        call_command('refresh_external_data', *cmd_args)
        
        # Get refresh statistics
        stats = get_refresh_statistics()
        
        logger.info(f"External opportunity refresh completed: {stats}")
        
        return {
            'success': True,
            'stats': stats,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"External opportunity refresh failed: {exc}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            countdown = 2 ** self.request.retries * 60  # 1, 2, 4 minutes
            logger.info(f"Retrying in {countdown} seconds (attempt {self.request.retries + 1})")
            raise self.retry(countdown=countdown, exc=exc)
        
        # Send failure notification after max retries
        send_refresh_failure_notification(str(exc))
        
        return {
            'success': False,
            'error': str(exc),
            'timestamp': timezone.now().isoformat()
        }


@shared_task
def refresh_single_source(source_id: int, force: bool = False) -> Dict[str, Any]:
    """Refresh opportunities from a single source."""
    try:
        logger.info(f"Refreshing single source: {source_id}")
        
        source = ExternalOpportunitySource.objects.get(id=source_id, is_active=True)
        
        # Call the main refresh task for this specific source
        result = refresh_external_opportunities.delay(
            source_id=source_id, 
            force=force
        )
        
        return {
            'success': True,
            'source_name': source.name,
            'task_id': result.id,
            'timestamp': timezone.now().isoformat()
        }
        
    except ExternalOpportunitySource.DoesNotExist:
        error_msg = f"Source {source_id} not found or inactive"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg,
            'timestamp': timezone.now().isoformat()
        }
    except Exception as exc:
        logger.error(f"Failed to refresh source {source_id}: {exc}")
        return {
            'success': False,
            'error': str(exc),
            'timestamp': timezone.now().isoformat()
        }


@shared_task
def cleanup_stale_opportunities(days_old: int = 30) -> Dict[str, Any]:
    """Clean up stale external opportunities."""
    try:
        logger.info(f"Starting cleanup of opportunities older than {days_old} days")
        
        cutoff_date = timezone.now() - timedelta(days=days_old)
        
        # Find stale opportunities
        stale_opportunities = ExternalOpportunity.objects.filter(
            last_synced__lt=cutoff_date
        ).select_related('internship', 'source')
        
        stale_count = stale_opportunities.count()
        
        if stale_count == 0:
            logger.info("No stale opportunities found")
            return {
                'success': True,
                'cleaned_count': 0,
                'timestamp': timezone.now().isoformat()
            }
        
        # Get list of internship IDs that will be affected
        affected_internships = set(
            stale_opportunities.values_list('internship_id', flat=True)
        )
        
        # Delete stale opportunities
        deleted_count, _ = stale_opportunities.delete()
        
        # Clean up orphaned internships (those with no remaining external opportunities)
        from .models import Internship
        orphaned_internships = Internship.objects.filter(
            id__in=affected_internships,
            externalopportunity__isnull=True,
            # Only delete if it's an external-only internship
            created_by_external=True
        )
        
        orphaned_count = orphaned_internships.count()
        orphaned_internships.delete()
        
        # Clear related caches
        cache_manager = OpportunityCacheManager()
        cache_manager.invalidate_search_cache()
        
        logger.info(
            f"Cleanup completed: {deleted_count} opportunities, "
            f"{orphaned_count} orphaned internships removed"
        )
        
        return {
            'success': True,
            'cleaned_count': deleted_count,
            'orphaned_internships': orphaned_count,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Cleanup task failed: {exc}")
        return {
            'success': False,
            'error': str(exc),
            'timestamp': timezone.now().isoformat()
        }


@shared_task
def warm_opportunity_cache() -> Dict[str, Any]:
    """Warm up the opportunity cache with frequently accessed data."""
    try:
        logger.info("Starting cache warming task")
        
        cache_manager = OpportunityCacheManager()
        results = cache_manager.warm_cache()
        
        logger.info(f"Cache warming completed: {results}")
        
        return {
            'success': True,
            'cached_items': results['cached'],
            'errors': results['errors'],
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Cache warming failed: {exc}")
        return {
            'success': False,
            'error': str(exc),
            'timestamp': timezone.now().isoformat()
        }


@shared_task
def monitor_source_health() -> Dict[str, Any]:
    """Monitor the health of external opportunity sources."""
    try:
        logger.info("Starting source health monitoring")
        
        sources = ExternalOpportunitySource.objects.filter(is_active=True)
        health_report = {
            'healthy': 0,
            'warning': 0,
            'error': 0,
            'issues': []
        }
        
        for source in sources:
            # Check last sync time
            if source.last_sync:
                hours_since_sync = (
                    timezone.now() - source.last_sync
                ).total_seconds() / 3600
                
                if hours_since_sync > 48:  # More than 2 days
                    health_report['error'] += 1
                    health_report['issues'].append({
                        'source': source.name,
                        'issue': f'No sync for {hours_since_sync:.1f} hours',
                        'severity': 'error'
                    })
                elif hours_since_sync > 24:  # More than 1 day
                    health_report['warning'] += 1
                    health_report['issues'].append({
                        'source': source.name,
                        'issue': f'No sync for {hours_since_sync:.1f} hours',
                        'severity': 'warning'
                    })
                else:
                    health_report['healthy'] += 1
            else:
                health_report['error'] += 1
                health_report['issues'].append({
                    'source': source.name,
                    'issue': 'Never synced',
                    'severity': 'error'
                })
            
            # Check error status
            if source.health_status == 'error':
                if source.name not in [issue['source'] for issue in health_report['issues']]:
                    health_report['error'] += 1
                    health_report['issues'].append({
                        'source': source.name,
                        'issue': f'Health status: {source.health_status}',
                        'severity': 'error',
                        'last_error': source.last_error
                    })
        
        # Send notifications for critical issues
        critical_issues = [issue for issue in health_report['issues'] 
                         if issue['severity'] == 'error']
        
        if critical_issues:
            send_health_alert_notification(critical_issues)
        
        logger.info(f"Health monitoring completed: {health_report}")
        
        return {
            'success': True,
            'health_report': health_report,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Health monitoring failed: {exc}")
        return {
            'success': False,
            'error': str(exc),
            'timestamp': timezone.now().isoformat()
        }


@shared_task
def generate_daily_report() -> Dict[str, Any]:
    """Generate daily report of external opportunity activities."""
    try:
        logger.info("Generating daily external opportunities report")
        
        # Get yesterday's date range
        yesterday = timezone.now().date() - timedelta(days=1)
        start_time = timezone.make_aware(datetime.combine(yesterday, datetime.min.time()))
        end_time = timezone.make_aware(datetime.combine(yesterday, datetime.max.time()))
        
        # Collect statistics
        stats = {
            'date': yesterday.isoformat(),
            'new_opportunities': ExternalOpportunity.objects.filter(
                created_at__range=(start_time, end_time)
            ).count(),
            'updated_opportunities': ExternalOpportunity.objects.filter(
                last_synced__range=(start_time, end_time),
                created_at__lt=start_time
            ).count(),
            'active_sources': ExternalOpportunitySource.objects.filter(
                is_active=True
            ).count(),
            'sources_synced': ExternalOpportunitySource.objects.filter(
                last_sync__range=(start_time, end_time)
            ).count(),
            'total_external_opportunities': ExternalOpportunity.objects.count(),
            'cache_stats': OpportunityCacheManager().get_cache_stats()
        }
        
        # Send report email if configured
        if getattr(settings, 'SEND_DAILY_REPORTS', False):
            send_daily_report_email(stats)
        
        logger.info(f"Daily report generated: {stats}")
        
        return {
            'success': True,
            'stats': stats,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Daily report generation failed: {exc}")
        return {
            'success': False,
            'error': str(exc),
            'timestamp': timezone.now().isoformat()
        }


# Helper functions

def get_refresh_statistics() -> Dict[str, Any]:
    """Get current refresh statistics."""
    try:
        sources = ExternalOpportunitySource.objects.all()
        
        return {
            'total_sources': sources.count(),
            'active_sources': sources.filter(is_active=True).count(),
            'healthy_sources': sources.filter(health_status='healthy').count(),
            'error_sources': sources.filter(health_status='error').count(),
            'total_opportunities': ExternalOpportunity.objects.count(),
            'recent_opportunities': ExternalOpportunity.objects.filter(
                last_synced__gte=timezone.now() - timedelta(hours=24)
            ).count()
        }
    except Exception as e:
        logger.error(f"Failed to get refresh statistics: {e}")
        return {}


def send_refresh_failure_notification(error_message: str):
    """Send notification when refresh fails."""
    try:
        if not getattr(settings, 'SEND_ERROR_NOTIFICATIONS', False):
            return
        
        recipients = getattr(settings, 'ADMIN_EMAIL_LIST', [])
        if not recipients:
            return
        
        subject = 'External Opportunity Refresh Failed'
        message = f"""
        The external opportunity refresh task has failed after maximum retries.
        
        Error: {error_message}
        Time: {timezone.now()}
        
        Please check the system logs and external sources for issues.
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=True
        )
        
    except Exception as e:
        logger.error(f"Failed to send refresh failure notification: {e}")


def send_health_alert_notification(critical_issues: List[Dict[str, Any]]):
    """Send notification for critical health issues."""
    try:
        if not getattr(settings, 'SEND_HEALTH_ALERTS', False):
            return
        
        recipients = getattr(settings, 'ADMIN_EMAIL_LIST', [])
        if not recipients:
            return
        
        subject = f'External Sources Health Alert - {len(critical_issues)} Critical Issues'
        
        # Render email template if available
        try:
            message = render_to_string('internship/emails/health_alert.txt', {
                'issues': critical_issues,
                'timestamp': timezone.now()
            })
        except:
            # Fallback to plain text
            issue_list = '\n'.join([
                f"- {issue['source']}: {issue['issue']}"
                for issue in critical_issues
            ])
            
            message = f"""
            Critical issues detected with external opportunity sources:
            
            {issue_list}
            
            Time: {timezone.now()}
            
            Please investigate and resolve these issues promptly.
            """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=True
        )
        
    except Exception as e:
        logger.error(f"Failed to send health alert notification: {e}")


def send_daily_report_email(stats: Dict[str, Any]):
    """Send daily report email."""
    try:
        recipients = getattr(settings, 'REPORT_EMAIL_LIST', [])
        if not recipients:
            return
        
        subject = f"Daily External Opportunities Report - {stats['date']}"
        
        # Render email template if available
        try:
            message = render_to_string('internship/emails/daily_report.txt', {
                'stats': stats
            })
        except:
            # Fallback to plain text
            message = f"""
            Daily External Opportunities Report for {stats['date']}
            
            New Opportunities: {stats['new_opportunities']}
            Updated Opportunities: {stats['updated_opportunities']}
            Active Sources: {stats['active_sources']}
            Sources Synced: {stats['sources_synced']}
            Total External Opportunities: {stats['total_external_opportunities']}
            
            Generated at: {timezone.now()}
            """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=True
        )
        
    except Exception as e:
        logger.error(f"Failed to send daily report email: {e}")