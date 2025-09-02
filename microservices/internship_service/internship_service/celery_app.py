import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'internship_service.settings')

app = Celery('internship_service')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Import shared celery configuration
try:
    from shared.celery_config import *
except ImportError:
    pass  # Shared config not available during testing

# Service-specific configuration
app.conf.update(
    task_routes={
        'internship_service.internships.tasks.*': {'queue': 'internship_queue'},
        'shared.celery_config.*': {'queue': 'shared_queue'},
    },
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=False,
    task_reject_on_worker_lost=True,
)


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')