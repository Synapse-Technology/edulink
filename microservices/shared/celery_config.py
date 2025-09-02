import os
from celery import Celery
from kombu import Queue
from .service_config import get_config

config = get_config()

# Celery configuration
celery_app = Celery('edulink_services')

# Broker configuration
celery_app.conf.update(
    broker_url=config.RABBITMQ_URL,
    result_backend=config.REDIS_URL,
    
    # Task serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task routing
    task_routes={
        'internship_service.tasks.*': {'queue': 'internship_queue'},
        'application_service.tasks.*': {'queue': 'application_queue'},
        'shared.tasks.*': {'queue': 'shared_queue'},
    },
    
    # Queue configuration
    task_default_queue='default',
    task_queues=(
        Queue('default', routing_key='default'),
        Queue('internship_queue', routing_key='internship'),
        Queue('application_queue', routing_key='application'),
        Queue('shared_queue', routing_key='shared'),
        Queue('notifications', routing_key='notifications'),
        Queue('emails', routing_key='emails'),
        Queue('analytics', routing_key='analytics'),
    ),
    
    # Worker configuration
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=False,
    
    # Task execution
    task_always_eager=False,
    task_eager_propagates=True,
    task_ignore_result=False,
    task_store_eager_result=True,
    
    # Retry configuration
    task_default_retry_delay=60,
    task_max_retries=3,
    
    # Result backend configuration
    result_expires=3600,
    result_persistent=True,
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Security
    worker_hijack_root_logger=False,
    worker_log_color=False,
    
    # Beat schedule for periodic tasks
    beat_schedule={
        'cleanup-expired-internships': {
            'task': 'internship_service.tasks.cleanup_expired_internships',
            'schedule': 3600.0,  # Every hour
        },
        'update-application-statistics': {
            'task': 'application_service.tasks.update_application_statistics',
            'schedule': 1800.0,  # Every 30 minutes
        },
        'send-pending-notifications': {
            'task': 'shared.tasks.send_pending_notifications',
            'schedule': 300.0,  # Every 5 minutes
        },
        'cleanup-old-events': {
            'task': 'shared.tasks.cleanup_old_events',
            'schedule': 86400.0,  # Daily
        },
    },
)

# Auto-discover tasks
celery_app.autodiscover_tasks([
    'internship_service',
    'application_service',
    'shared',
])


@celery_app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery setup"""
    print(f'Request: {self.request!r}')
    return 'Debug task completed'


# Task decorators for common patterns
def retry_on_failure(max_retries=3, countdown=60):
    """Decorator for tasks that should retry on failure"""
    def decorator(func):
        return celery_app.task(
            bind=True,
            autoretry_for=(Exception,),
            retry_kwargs={'max_retries': max_retries, 'countdown': countdown},
            retry_backoff=True
        )(func)
    return decorator


def high_priority_task(func):
    """Decorator for high priority tasks"""
    return celery_app.task(
        priority=9,
        queue='high_priority'
    )(func)


def low_priority_task(func):
    """Decorator for low priority tasks"""
    return celery_app.task(
        priority=1,
        queue='low_priority'
    )(func)


# Service-specific task configurations
class InternshipServiceTasks:
    """Task configuration for internship service"""
    
    @staticmethod
    @celery_app.task(bind=True, queue='internship_queue')
    def process_internship_verification(self, internship_id):
        """Process internship verification"""
        try:
            # Import here to avoid circular imports
            from internship_service.tasks import verify_internship
            return verify_internship(internship_id)
        except Exception as exc:
            self.retry(exc=exc, countdown=60, max_retries=3)
    
    @staticmethod
    @celery_app.task(bind=True, queue='internship_queue')
    def update_internship_analytics(self, internship_id):
        """Update internship analytics"""
        try:
            from internship_service.tasks import calculate_analytics
            return calculate_analytics(internship_id)
        except Exception as exc:
            self.retry(exc=exc, countdown=60, max_retries=3)
    
    @staticmethod
    @celery_app.task(queue='internship_queue')
    def cleanup_expired_internships():
        """Cleanup expired internships"""
        from internship_service.tasks import cleanup_expired
        return cleanup_expired()


class ApplicationServiceTasks:
    """Task configuration for application service"""
    
    @staticmethod
    @celery_app.task(bind=True, queue='application_queue')
    def process_application_status_change(self, application_id, old_status, new_status):
        """Process application status change"""
        try:
            from application_service.tasks import handle_status_change
            return handle_status_change(application_id, old_status, new_status)
        except Exception as exc:
            self.retry(exc=exc, countdown=60, max_retries=3)
    
    @staticmethod
    @celery_app.task(bind=True, queue='application_queue')
    def send_application_notification(self, application_id, notification_type):
        """Send application-related notification"""
        try:
            from application_service.tasks import send_notification
            return send_notification(application_id, notification_type)
        except Exception as exc:
            self.retry(exc=exc, countdown=60, max_retries=3)
    
    @staticmethod
    @celery_app.task(queue='application_queue')
    def update_application_statistics():
        """Update application statistics"""
        from application_service.tasks import update_statistics
        return update_statistics()


class SharedTasks:
    """Shared tasks across services"""
    
    @staticmethod
    @celery_app.task(bind=True, queue='notifications')
    def send_email_notification(self, user_id, template, context):
        """Send email notification"""
        try:
            from shared.tasks import send_email
            return send_email(user_id, template, context)
        except Exception as exc:
            self.retry(exc=exc, countdown=60, max_retries=3)
    
    @staticmethod
    @celery_app.task(bind=True, queue='notifications')
    def send_push_notification(self, user_id, message, data=None):
        """Send push notification"""
        try:
            from shared.tasks import send_push
            return send_push(user_id, message, data)
        except Exception as exc:
            self.retry(exc=exc, countdown=60, max_retries=3)
    
    @staticmethod
    @celery_app.task(queue='analytics')
    def process_analytics_event(event_data):
        """Process analytics event"""
        from shared.tasks import process_analytics
        return process_analytics(event_data)
    
    @staticmethod
    @celery_app.task(queue='shared_queue')
    def cleanup_old_events():
        """Cleanup old events from the system"""
        from shared.tasks import cleanup_events
        return cleanup_events()
    
    @staticmethod
    @celery_app.task(queue='shared_queue')
    def send_pending_notifications():
        """Send pending notifications"""
        from shared.tasks import process_pending_notifications
        return process_pending_notifications()


# Task monitoring and error handling
@celery_app.task(bind=True)
def handle_task_failure(self, task_id, error, traceback):
    """Handle task failures"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.error(f"Task {task_id} failed with error: {error}")
    logger.error(f"Traceback: {traceback}")
    
    # Could send notification to administrators
    # Could log to external monitoring service
    
    return f"Handled failure for task {task_id}"


# Health check task
@celery_app.task
def health_check():
    """Health check task for monitoring"""
    import time
    return {
        'status': 'healthy',
        'timestamp': time.time(),
        'worker_id': os.getpid()
    }


# Export the configured Celery app
__all__ = [
    'celery_app',
    'InternshipServiceTasks',
    'ApplicationServiceTasks', 
    'SharedTasks',
    'retry_on_failure',
    'high_priority_task',
    'low_priority_task'
]