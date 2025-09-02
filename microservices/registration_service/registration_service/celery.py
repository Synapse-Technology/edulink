"""Celery configuration for registration service."""

import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings.development')

app = Celery('registration_service')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery beat schedule configuration
app.conf.beat_schedule = {
    'cleanup-expired-requests': {
        'task': 'registration_requests.tasks.bulk_cleanup_expired_requests',
        'schedule': 3600.0,  # Every hour
    },
    'send-daily-admin-summary': {
        'task': 'registration_requests.tasks.send_daily_admin_summary',
        'schedule': 86400.0,  # Daily at midnight
    },
    'update-risk-scores': {
        'task': 'registration_requests.tasks.update_risk_scores',
        'schedule': 604800.0,  # Weekly
    },
    'send-reminder-emails': {
        'task': 'registration_requests.tasks.send_reminder_emails',
        'schedule': 21600.0,  # Every 6 hours
    },
    'verify-institution-domains': {
        'task': 'registration_requests.tasks.verify_institution_domains',
        'schedule': 86400.0,  # Daily
    },
    'cleanup-old-attachments': {
        'task': 'registration_requests.tasks.cleanup_old_attachments',
        'schedule': 604800.0,  # Weekly
    },
    'generate-analytics-reports': {
        'task': 'registration_requests.tasks.generate_analytics_reports',
        'schedule': 86400.0,  # Daily
    },
}

# Celery configuration
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone=settings.TIME_ZONE,
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_routes={
        'registration_requests.tasks.send_email_*': {'queue': 'email'},
        'registration_requests.tasks.verify_*': {'queue': 'verification'},
        'registration_requests.tasks.bulk_*': {'queue': 'bulk'},
        'registration_requests.tasks.generate_*': {'queue': 'reports'},
    },
    task_annotations={
        'registration_requests.tasks.send_email_verification': {'rate_limit': '100/m'},
        'registration_requests.tasks.send_admin_notification': {'rate_limit': '50/m'},
        'registration_requests.tasks.verify_institution_domain': {'rate_limit': '10/m'},
        'registration_requests.tasks.calculate_risk_score': {'rate_limit': '200/m'},
    },
)

@app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery configuration."""
    print(f'Request: {self.request!r}')
    return 'Debug task completed successfully'

@app.task(bind=True)
def health_check_task(self):
    """Health check task for monitoring Celery workers."""
    return {
        'status': 'healthy',
        'worker_id': self.request.id,
        'timestamp': app.now().isoformat(),
    }