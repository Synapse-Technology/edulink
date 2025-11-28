from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import Report
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Report)
def invalidate_report_cache_on_save(sender, instance, created, **kwargs):
    """Invalidate report-related cache when a Report is created or updated."""
    try:
        # Invalidate cache for the user who generated the report
        user_id = instance.generated_by.id
        cache_patterns = [
            f"recent_reports_{user_id}_*",
            f"dashboard_stats_{user_id}_*",
        ]
        
        for pattern in cache_patterns:
            cache.delete_pattern(pattern)
        
        # If the report belongs to an institution, invalidate institution-wide cache
        if instance.institution:
            institution_cache_patterns = [
                f"recent_reports_*_{instance.institution.id}_*",
                f"dashboard_stats_*_{instance.institution.id}_*",
            ]
            for pattern in institution_cache_patterns:
                cache.delete_pattern(pattern)
        
        # Invalidate superuser cache (they can see all reports)
        cache.delete_pattern("recent_reports_*")
        
        action = "created" if created else "updated"
        logger.info(f"Report cache invalidated for {action} report: {instance.title} (ID: {instance.id})")
        
    except Exception as e:
        logger.error(f"Failed to invalidate report cache for report {instance.id}: {e}")


@receiver(post_delete, sender=Report)
def invalidate_report_cache_on_delete(sender, instance, **kwargs):
    """Invalidate report-related cache when a Report is deleted."""
    try:
        # Invalidate cache for the user who generated the report
        user_id = instance.generated_by.id
        cache_patterns = [
            f"recent_reports_{user_id}_*",
            f"dashboard_stats_{user_id}_*",
        ]
        
        for pattern in cache_patterns:
            cache.delete_pattern(pattern)
        
        # If the report belongs to an institution, invalidate institution-wide cache
        if instance.institution:
            institution_cache_patterns = [
                f"recent_reports_*_{instance.institution.id}_*",
                f"dashboard_stats_*_{instance.institution.id}_*",
            ]
            for pattern in institution_cache_patterns:
                cache.delete_pattern(pattern)
        
        # Invalidate superuser cache (they can see all reports)
        cache.delete_pattern("recent_reports_*")
        
        logger.info(f"Report cache invalidated for deleted report: {instance.title} (ID: {instance.id})")
        
    except Exception as e:
        logger.error(f"Failed to invalidate report cache for deleted report {instance.id}: {e}")