from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django.template import Template, Context
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
import logging
import requests
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioException
import time
from typing import Dict, Any, Optional

from .models import (
    Notification, NotificationTemplate, NotificationLog, NotificationBatch,
    NotificationStatus, NotificationType, NotificationPreference
)
from .services import EmailService, SMSService, TemplateService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_notification(self, notification_id: str):
    """Send a single notification"""
    try:
        notification = Notification.objects.get(id=notification_id)
        
        # Check if notification is still pending
        if notification.status != NotificationStatus.PENDING:
            logger.warning(f"Notification {notification_id} is not pending (status: {notification.status})")
            return
        
        # Update status to processing
        notification.status = NotificationStatus.PROCESSING
        notification.save(update_fields=['status', 'updated_at'])
        
        # Check user preferences
        if notification.recipient_user_id:
            try:
                preferences = NotificationPreference.objects.get(user_id=notification.recipient_user_id)
                if not preferences.is_category_enabled(notification.notification_type, notification.category):
                    logger.info(f"Notification {notification_id} blocked by user preferences")
                    notification.status = NotificationStatus.CANCELLED
                    notification.save(update_fields=['status', 'updated_at'])
                    return
            except NotificationPreference.DoesNotExist:
                pass  # No preferences set, allow notification
        
        # Process template if provided
        if notification.template:
            template_service = TemplateService()
            rendered_content = template_service.render_template(
                notification.template,
                notification.template_variables
            )
            notification.subject = rendered_content['subject']
            notification.message = rendered_content['message']
            notification.html_content = rendered_content.get('html_content', '')
        
        # Send notification based on type
        start_time = time.time()
        
        if notification.notification_type == NotificationType.EMAIL:
            result = _send_email_notification(notification)
        elif notification.notification_type == NotificationType.SMS:
            result = _send_sms_notification(notification)
        elif notification.notification_type == NotificationType.PUSH:
            result = _send_push_notification(notification)
        else:
            raise ValueError(f"Unsupported notification type: {notification.notification_type}")
        
        response_time = int((time.time() - start_time) * 1000)  # Convert to milliseconds
        
        # Update notification status based on result
        if result['success']:
            notification.mark_as_sent(
                external_id=result.get('external_id'),
                provider=result.get('provider')
            )
            logger.info(f"Successfully sent notification {notification_id}")
        else:
            notification.mark_as_failed(result.get('error_message'))
            logger.error(f"Failed to send notification {notification_id}: {result.get('error_message')}")
        
        # Create log entry
        NotificationLog.objects.create(
            notification=notification,
            attempt_number=notification.retry_count,
            status=notification.status,
            provider_response=result.get('provider_response', {}),
            error_message=result.get('error_message', ''),
            response_time_ms=response_time
        )
        
        # Retry if failed and retries available
        if not result['success'] and notification.can_retry():
            logger.info(f"Scheduling retry for notification {notification_id} (attempt {notification.retry_count + 1})")
            raise self.retry(countdown=300 * notification.retry_count)  # Exponential backoff
        
    except Notification.DoesNotExist:
        logger.error(f"Notification {notification_id} not found")
    except Exception as exc:
        logger.error(f"Error sending notification {notification_id}: {str(exc)}")
        
        try:
            notification = Notification.objects.get(id=notification_id)
            notification.mark_as_failed(str(exc))
            
            # Create error log
            NotificationLog.objects.create(
                notification=notification,
                attempt_number=notification.retry_count,
                status=NotificationStatus.FAILED,
                error_message=str(exc)
            )
            
            if notification.can_retry():
                raise self.retry(exc=exc, countdown=300 * notification.retry_count)
        except Notification.DoesNotExist:
            pass


@shared_task
def send_bulk_notifications(batch_id: str, notification_data: Dict[str, Any]):
    """Send bulk notifications"""
    try:
        batch = NotificationBatch.objects.get(id=batch_id)
        batch.status = 'processing'
        batch.started_at = timezone.now()
        batch.save(update_fields=['status', 'started_at', 'updated_at'])
        
        logger.info(f"Starting bulk notification batch {batch_id} with {len(notification_data['recipients'])} recipients")
        
        # Get template if provided
        template = None
        if notification_data.get('template_id'):
            try:
                template = NotificationTemplate.objects.get(id=notification_data['template_id'])
            except NotificationTemplate.DoesNotExist:
                logger.warning(f"Template {notification_data['template_id']} not found for batch {batch_id}")
        
        # Create individual notifications
        notifications_created = []
        
        with transaction.atomic():
            for recipient_data in notification_data['recipients']:
                # Merge template variables
                template_variables = {}
                template_variables.update(notification_data.get('template_variables', {}))
                template_variables.update(recipient_data.get('template_variables', {}))
                
                notification = Notification.objects.create(
                    recipient_email=recipient_data.get('email', ''),
                    recipient_phone=recipient_data.get('phone', ''),
                    recipient_user_id=recipient_data.get('user_id', ''),
                    notification_type=notification_data['notification_type'],
                    category=notification_data['category'],
                    priority=notification_data['priority'],
                    subject=notification_data.get('subject', ''),
                    message=notification_data['message'],
                    html_content=notification_data.get('html_content', ''),
                    template=template,
                    template_variables=template_variables,
                    scheduled_at=notification_data.get('scheduled_at', timezone.now()),
                    source_service=notification_data.get('source_service', ''),
                    reference_id=f"batch_{batch_id}",
                    metadata={'batch_id': str(batch_id)}
                )
                notifications_created.append(notification)
        
        # Queue individual notifications for sending
        for notification in notifications_created:
            send_notification.delay(str(notification.id))
        
        batch.processed_count = len(notifications_created)
        batch.save(update_fields=['processed_count', 'updated_at'])
        
        logger.info(f"Queued {len(notifications_created)} notifications for batch {batch_id}")
        
        # Schedule batch completion check
        check_batch_completion.apply_async(args=[str(batch_id)], countdown=60)
        
    except NotificationBatch.DoesNotExist:
        logger.error(f"Notification batch {batch_id} not found")
    except Exception as exc:
        logger.error(f"Error processing bulk notifications for batch {batch_id}: {str(exc)}")
        try:
            batch = NotificationBatch.objects.get(id=batch_id)
            batch.status = 'failed'
            batch.completed_at = timezone.now()
            batch.save(update_fields=['status', 'completed_at', 'updated_at'])
        except NotificationBatch.DoesNotExist:
            pass


@shared_task
def check_batch_completion(batch_id: str):
    """Check if a notification batch is completed"""
    try:
        batch = NotificationBatch.objects.get(id=batch_id)
        
        # Count notifications in this batch
        batch_notifications = Notification.objects.filter(
            metadata__batch_id=str(batch_id)
        )
        
        total_count = batch_notifications.count()
        success_count = batch_notifications.filter(
            status__in=[NotificationStatus.SENT, NotificationStatus.DELIVERED]
        ).count()
        failed_count = batch_notifications.filter(
            status=NotificationStatus.FAILED
        ).count()
        pending_count = batch_notifications.filter(
            status__in=[NotificationStatus.PENDING, NotificationStatus.PROCESSING]
        ).count()
        
        # Update batch statistics
        batch.total_count = total_count
        batch.success_count = success_count
        batch.failed_count = failed_count
        batch.processed_count = success_count + failed_count
        
        # Check if batch is completed
        if pending_count == 0:
            batch.status = 'completed'
            batch.completed_at = timezone.now()
            logger.info(f"Batch {batch_id} completed: {success_count} successful, {failed_count} failed")
        else:
            # Schedule another check
            check_batch_completion.apply_async(args=[str(batch_id)], countdown=60)
        
        batch.save()
        
    except NotificationBatch.DoesNotExist:
        logger.error(f"Notification batch {batch_id} not found")
    except Exception as exc:
        logger.error(f"Error checking batch completion for {batch_id}: {str(exc)}")


@shared_task
def cleanup_old_notifications():
    """Clean up old notifications and logs"""
    try:
        # Delete notifications older than 90 days
        cutoff_date = timezone.now() - timezone.timedelta(days=90)
        
        old_notifications = Notification.objects.filter(created_at__lt=cutoff_date)
        deleted_count = old_notifications.count()
        old_notifications.delete()
        
        logger.info(f"Cleaned up {deleted_count} old notifications")
        
        # Delete logs older than 30 days
        log_cutoff_date = timezone.now() - timezone.timedelta(days=30)
        old_logs = NotificationLog.objects.filter(attempted_at__lt=log_cutoff_date)
        deleted_logs = old_logs.count()
        old_logs.delete()
        
        logger.info(f"Cleaned up {deleted_logs} old notification logs")
        
    except Exception as exc:
        logger.error(f"Error during cleanup: {str(exc)}")


@shared_task
def retry_failed_notifications():
    """Retry failed notifications that can be retried"""
    try:
        # Find failed notifications that can be retried
        failed_notifications = Notification.objects.filter(
            status=NotificationStatus.FAILED,
            retry_count__lt=models.F('max_retries'),
            created_at__gte=timezone.now() - timezone.timedelta(hours=24)  # Only retry recent failures
        )
        
        retry_count = 0
        for notification in failed_notifications:
            if notification.can_retry():
                notification.status = NotificationStatus.PENDING
                notification.error_message = ''
                notification.save(update_fields=['status', 'error_message', 'updated_at'])
                
                # Queue for retry
                send_notification.delay(str(notification.id))
                retry_count += 1
        
        logger.info(f"Queued {retry_count} failed notifications for retry")
        
    except Exception as exc:
        logger.error(f"Error during failed notification retry: {str(exc)}")


def _send_email_notification(notification: Notification) -> Dict[str, Any]:
    """Send email notification"""
    try:
        email_service = EmailService()
        result = email_service.send_email(
            to_email=notification.recipient_email,
            subject=notification.subject,
            message=notification.message,
            html_content=notification.html_content
        )
        return result
    except Exception as exc:
        return {
            'success': False,
            'error_message': str(exc),
            'provider_response': {}
        }


def _send_sms_notification(notification: Notification) -> Dict[str, Any]:
    """Send SMS notification"""
    try:
        sms_service = SMSService()
        result = sms_service.send_sms(
            to_phone=notification.recipient_phone,
            message=notification.message
        )
        return result
    except Exception as exc:
        return {
            'success': False,
            'error_message': str(exc),
            'provider_response': {}
        }


def _send_push_notification(notification: Notification) -> Dict[str, Any]:
    """Send push notification"""
    try:
        # Placeholder for push notification implementation
        # This would integrate with services like Firebase Cloud Messaging
        logger.info(f"Push notification not implemented yet for {notification.id}")
        return {
            'success': False,
            'error_message': 'Push notifications not implemented yet',
            'provider_response': {}
        }
    except Exception as exc:
        return {
            'success': False,
            'error_message': str(exc),
            'provider_response': {}
        }