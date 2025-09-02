import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'application_service.settings')

app = Celery('application_service')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Import shared celery configuration
from shared.celery_config import *

# Service-specific configuration
app.conf.update(
    task_routes={
        'application_service.applications.tasks.*': {'queue': 'application_queue'},
        'shared.celery_config.*': {'queue': 'shared_queue'},
    },
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=False,
    task_reject_on_worker_lost=True,
)

# Register event handlers
from applications.event_handlers import ApplicationServiceEventHandlers

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')


if __name__ == '__main__':
    app.start()