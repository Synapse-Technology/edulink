"""Celery configuration for Edulink project."""

from celery import Celery
from celery.schedules import crontab
from django.conf import settings
import os

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings')

app = Celery('edulink')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat Schedule for External Opportunities
app.conf.beat_schedule = {
    # Refresh all external opportunities every 4 hours
    'refresh-external-opportunities': {
        'task': 'internship.tasks.refresh_external_opportunities',
        'schedule': crontab(minute=0, hour='*/4'),  # Every 4 hours
        'options': {
            'expires': 3600,  # Task expires after 1 hour if not executed
        },
        'kwargs': {
            'force': False,
            'batch_size': 100
        }
    },
    
    # Clean up stale opportunities daily at 2 AM
    'cleanup-stale-opportunities': {
        'task': 'internship.tasks.cleanup_stale_opportunities',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2:00 AM
        'kwargs': {
            'days_old': 30
        }
    },
    
    # Warm cache every 2 hours during business hours
    'warm-opportunity-cache': {
        'task': 'internship.tasks.warm_opportunity_cache',
        'schedule': crontab(minute=0, hour='8-18/2'),  # Every 2 hours from 8 AM to 6 PM
    },
    
    # Monitor source health every hour
    'monitor-source-health': {
        'task': 'internship.tasks.monitor_source_health',
        'schedule': crontab(minute=30),  # Every hour at 30 minutes past
    },
    
    # Generate daily report at 6 AM
    'generate-daily-report': {
        'task': 'internship.tasks.generate_daily_report',
        'schedule': crontab(hour=6, minute=0),  # Daily at 6:00 AM
    },
    
    # High-priority sources refresh every hour during business hours
    'refresh-priority-sources': {
        'task': 'internship.tasks.refresh_external_opportunities',
        'schedule': crontab(minute=15, hour='9-17'),  # Every hour from 9 AM to 5 PM
        'kwargs': {
            'force': False,
            'batch_size': 50
        },
        'options': {
            'queue': 'priority',
        }
    },
}

# Celery Configuration
app.conf.update(
    # Task routing
    task_routes={
        'internship.tasks.refresh_external_opportunities': {'queue': 'external_data'},
        'internship.tasks.refresh_single_source': {'queue': 'external_data'},
        'internship.tasks.cleanup_stale_opportunities': {'queue': 'maintenance'},
        'internship.tasks.warm_opportunity_cache': {'queue': 'cache'},
        'internship.tasks.monitor_source_health': {'queue': 'monitoring'},
        'internship.tasks.generate_daily_report': {'queue': 'reports'},
    },
    
    # Task time limits
    task_time_limit=30 * 60,  # 30 minutes hard limit
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit
    
    # Task result settings
    result_expires=3600,  # Results expire after 1 hour
    task_ignore_result=False,
    
    # Worker settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    
    # Timezone
    timezone='UTC',
    enable_utc=True,
    
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Error handling
    task_reject_on_worker_lost=True,
    
    # Beat settings
    beat_scheduler='django_celery_beat.schedulers:DatabaseScheduler',
)

# Queue configuration
app.conf.task_default_queue = 'default'
app.conf.task_queues = {
    'default': {
        'exchange': 'default',
        'routing_key': 'default',
    },
    'external_data': {
        'exchange': 'external_data',
        'routing_key': 'external_data',
    },
    'maintenance': {
        'exchange': 'maintenance',
        'routing_key': 'maintenance',
    },
    'cache': {
        'exchange': 'cache',
        'routing_key': 'cache',
    },
    'monitoring': {
        'exchange': 'monitoring',
        'routing_key': 'monitoring',
    },
    'reports': {
        'exchange': 'reports',
        'routing_key': 'reports',
    },
    'priority': {
        'exchange': 'priority',
        'routing_key': 'priority',
    },
}

@app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery setup."""
    print(f'Request: {self.request!r}')
    return 'Debug task completed'


# Custom task base class for external opportunity tasks
class ExternalOpportunityTask(app.Task):
    """Base task class for external opportunity related tasks."""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure."""
        from django.core.mail import send_mail
        from django.conf import settings
        
        # Log the failure
        print(f'Task {self.name} failed: {exc}')
        
        # Send notification if configured
        if getattr(settings, 'SEND_TASK_FAILURE_NOTIFICATIONS', False):
            try:
                send_mail(
                    subject=f'Celery Task Failed: {self.name}',
                    message=f'Task {self.name} (ID: {task_id}) failed with error: {exc}\n\nArgs: {args}\nKwargs: {kwargs}',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=getattr(settings, 'ADMIN_EMAIL_LIST', []),
                    fail_silently=True
                )
            except Exception as e:
                print(f'Failed to send task failure notification: {e}')
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Handle task retry."""
        print(f'Task {self.name} retrying: {exc}')
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success."""
        print(f'Task {self.name} completed successfully')


# Apply the custom base class to external opportunity tasks
app.Task = ExternalOpportunityTask


# Health check endpoint for monitoring
@app.task
def health_check():
    """Simple health check task."""
    from django.db import connection
    from django.core.cache import cache
    
    try:
        # Check database connection
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        
        # Check cache connection
        cache.set('health_check', 'ok', 30)
        cache_result = cache.get('health_check')
        
        return {
            'status': 'healthy',
            'database': 'ok',
            'cache': 'ok' if cache_result == 'ok' else 'error',
            'timestamp': app.now().isoformat()
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': app.now().isoformat()
        }


# Development/Testing tasks
if settings.DEBUG:
    app.conf.beat_schedule.update({
        # More frequent refresh for development
        'dev-refresh-external-opportunities': {
            'task': 'internship.tasks.refresh_external_opportunities',
            'schedule': crontab(minute='*/30'),  # Every 30 minutes in development
            'kwargs': {
                'force': False,
                'batch_size': 20
            }
        },
    })


# Production optimizations
if not settings.DEBUG:
    app.conf.update(
        # More conservative settings for production
        worker_max_tasks_per_child=1000,
        worker_disable_rate_limits=False,
        
        # Enhanced monitoring
        worker_send_task_events=True,
        task_send_sent_event=True,
        
        # Security
        task_always_eager=False,
        task_store_eager_result=False,
    )