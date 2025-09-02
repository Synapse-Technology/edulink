from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone
from celery import current_app
import logging

from .models import Notification, NotificationStatus, NotificationBatch
from .tasks import send_notification, check_batch_completion

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Notification)
def handle_notification_created(sender, instance, created, **kwargs):
    """Handle notification creation and scheduling"""
    if created and instance.status == NotificationStatus.PENDING:
        try:
            # Check if notification should be sent immediately or scheduled
            if instance.scheduled_at and instance.scheduled_at > timezone.now():
                # Schedule for later
                eta = instance.scheduled_at
                send_notification.apply_async(
                    args=[str(instance.id)],
                    eta=eta
                )
                logger.info(f"Scheduled notification {instance.id} for {eta}")
            else:
                # Send immediately
                send_notification.delay(str(instance.id))
                logger.info(f"Queued notification {instance.id} for immediate sending")
        
        except Exception as exc:
            logger.error(f"Error scheduling notification {instance.id}: {str(exc)}")
            # Mark as failed if we can't even schedule it
            instance.status = NotificationStatus.FAILED
            instance.error_message = f"Failed to schedule: {str(exc)}"
            instance.save(update_fields=['status', 'error_message', 'updated_at'])


@receiver(post_save, sender=Notification)
def handle_notification_status_change(sender, instance, created, **kwargs):
    """Handle notification status changes for batch tracking"""
    if not created and instance.metadata and instance.metadata.get('batch_id'):
        try:
            batch_id = instance.metadata['batch_id']
            
            # Check if this status change affects batch completion
            if instance.status in [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.FAILED]:
                # Schedule a batch completion check with a small delay
                check_batch_completion.apply_async(
                    args=[batch_id],
                    countdown=5  # 5 second delay to allow for other notifications to complete
                )
        
        except Exception as exc:
            logger.error(f"Error handling batch status update for notification {instance.id}: {str(exc)}")


@receiver(post_save, sender=NotificationBatch)
def handle_batch_created(sender, instance, created, **kwargs):
    """Handle batch creation"""
    if created:
        logger.info(f"Created notification batch {instance.id} with {instance.total_count} notifications")


@receiver(pre_delete, sender=Notification)
def handle_notification_deletion(sender, instance, **kwargs):
    """Handle notification deletion - cancel any pending tasks"""
    try:
        # Try to revoke any pending Celery tasks for this notification
        task_id = f"send_notification_{instance.id}"
        current_app.control.revoke(task_id, terminate=True)
        logger.info(f"Revoked pending task for deleted notification {instance.id}")
    
    except Exception as exc:
        logger.warning(f"Could not revoke task for deleted notification {instance.id}: {str(exc)}")


@receiver(pre_delete, sender=NotificationBatch)
def handle_batch_deletion(sender, instance, **kwargs):
    """Handle batch deletion - cancel any pending batch tasks"""
    try:
        # Try to revoke any pending batch completion checks
        task_id = f"check_batch_completion_{instance.id}"
        current_app.control.revoke(task_id, terminate=True)
        logger.info(f"Revoked pending batch tasks for deleted batch {instance.id}")
    
    except Exception as exc:
        logger.warning(f"Could not revoke batch tasks for deleted batch {instance.id}: {str(exc)}")