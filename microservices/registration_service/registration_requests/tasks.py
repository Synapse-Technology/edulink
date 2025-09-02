from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from datetime import timedelta
import logging

from .models import (
    RegistrationRequest,
    RegistrationRequestLog,
    RegistrationStatus
)
from .services import (
    EmailVerificationService,
    EmailNotificationService,
    RegistrationService
)

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_verification_email(self, request_id):
    """Send email verification asynchronously."""
    try:
        from .models import RegistrationRequest
        registration_request = RegistrationRequest.objects.get(id=request_id)
        email_service = EmailVerificationService()
        result = email_service.send_verification_email(registration_request)
        
        # Log success
        RegistrationRequestLog.objects.create(
            registration_request_id=request_id,
            action='EMAIL_VERIFICATION_SENT_ASYNC',
            notes=f'Verification email sent successfully via Celery task'
        )
        
        return result
        
    except Exception as exc:
        logger.error(f"Failed to send verification email for request {request_id}: {exc}")
        
        # Log failure
        try:
            RegistrationRequestLog.objects.create(
                registration_request_id=request_id,
                action='EMAIL_VERIFICATION_FAILED_ASYNC',
                notes=f'Failed to send verification email: {str(exc)}'
            )
        except Exception:
            pass  # Don't fail if logging fails
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            countdown = 2 ** self.request.retries * 60  # 1min, 2min, 4min
            raise self.retry(exc=exc, countdown=countdown)
        
        raise exc


@shared_task(bind=True, max_retries=3)
def send_approval_notification(self, request_id):
    """Send approval notification email asynchronously."""
    try:
        request_obj = RegistrationRequest.objects.get(id=request_id)
        notification_service = EmailNotificationService()
        result = notification_service.send_approval_notification(request_obj)
        
        # Log success
        RegistrationRequestLog.objects.create(
            registration_request=request_obj,
            action='APPROVAL_NOTIFICATION_SENT_ASYNC',
            notes='Approval notification sent successfully via Celery task'
        )
        
        return result
        
    except RegistrationRequest.DoesNotExist:
        logger.error(f"Registration request {request_id} not found")
        return False
        
    except Exception as exc:
        logger.error(f"Failed to send approval notification for request {request_id}: {exc}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            countdown = 2 ** self.request.retries * 60
            raise self.retry(exc=exc, countdown=countdown)
        
        raise exc


@shared_task(bind=True, max_retries=3)
def send_rejection_notification(self, request_id):
    """Send rejection notification email asynchronously."""
    try:
        request_obj = RegistrationRequest.objects.get(id=request_id)
        notification_service = EmailNotificationService()
        result = notification_service.send_rejection_notification(request_obj)
        
        # Log success
        RegistrationRequestLog.objects.create(
            registration_request=request_obj,
            action='REJECTION_NOTIFICATION_SENT_ASYNC',
            notes='Rejection notification sent successfully via Celery task'
        )
        
        return result
        
    except RegistrationRequest.DoesNotExist:
        logger.error(f"Registration request {request_id} not found")
        return False
        
    except Exception as exc:
        logger.error(f"Failed to send rejection notification for request {request_id}: {exc}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            countdown = 2 ** self.request.retries * 60
            raise self.retry(exc=exc, countdown=countdown)
        
        raise exc


@shared_task
def send_review_reminder(request_id):
    """Send reminder to admin for pending review."""
    try:
        request_obj = RegistrationRequest.objects.get(id=request_id)
        
        # Check if still under review
        if request_obj.status != RegistrationStatus.UNDER_REVIEW:
            logger.info(f"Request {request_id} no longer under review, skipping reminder")
            return False
        
        # Check if review has been going on for too long
        review_timeout_days = getattr(settings, 'ADMIN_REVIEW_TIMEOUT_DAYS', 7)
        timeout_date = request_obj.review_started_at + timedelta(days=review_timeout_days)
        
        if timezone.now() < timeout_date:
            logger.info(f"Request {request_id} review not yet overdue, skipping reminder")
            return False
        
        # Send reminder email to admins
        admin_emails = getattr(settings, 'ADMIN_EMAIL_LIST', [])
        if not admin_emails:
            logger.warning("No admin emails configured for review reminders")
            return False
        
        subject = f"Review Reminder: Registration Request {request_obj.request_number}"
        
        context = {
            'request': request_obj,
            'days_pending': (timezone.now() - request_obj.review_started_at).days,
            'admin_url': f"{getattr(settings, 'ADMIN_BASE_URL', '')}/admin/registration_requests/registrationrequest/{request_obj.id}/change/"
        }
        
        html_message = render_to_string('emails/admin_review_required.html', context)
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            html_message=html_message,
            fail_silently=False
        )
        
        # Log the reminder
        RegistrationRequestLog.objects.create(
            registration_request=request_obj,
            action='REVIEW_REMINDER_SENT',
            notes=f'Review reminder sent to admins after {(timezone.now() - request_obj.review_started_at).days} days'
        )
        
        return True
        
    except RegistrationRequest.DoesNotExist:
        logger.error(f"Registration request {request_id} not found for review reminder")
        return False
        
    except Exception as exc:
        logger.error(f"Failed to send review reminder for request {request_id}: {exc}")
        raise exc


@shared_task
def cleanup_expired_request(request_id):
    """Clean up expired registration request."""
    try:
        request_obj = RegistrationRequest.objects.get(id=request_id)
        
        # Check if request is actually expired
        if not request_obj.expires_at or timezone.now() < request_obj.expires_at:
            logger.info(f"Request {request_id} not yet expired, skipping cleanup")
            return False
        
        # Check if request is still pending (don't clean up approved/rejected requests)
        if request_obj.status in [RegistrationStatus.APPROVED, RegistrationStatus.REJECTED]:
            logger.info(f"Request {request_id} already processed, skipping cleanup")
            return False
        
        # Mark as expired
        request_obj.status = RegistrationStatus.EXPIRED
        request_obj.save(update_fields=['status'])
        
        # Log the expiration
        RegistrationRequestLog.objects.create(
            registration_request=request_obj,
            action='REQUEST_EXPIRED',
            notes='Registration request automatically expired due to timeout'
        )
        
        # Send expiration notification to user
        try:
            notification_service = EmailNotificationService()
            notification_service.send_expiration_notification(request_obj)
        except Exception as e:
            logger.error(f"Failed to send expiration notification for request {request_id}: {e}")
        
        logger.info(f"Successfully expired registration request {request_id}")
        return True
        
    except RegistrationRequest.DoesNotExist:
        logger.error(f"Registration request {request_id} not found for cleanup")
        return False
        
    except Exception as exc:
        logger.error(f"Failed to cleanup expired request {request_id}: {exc}")
        raise exc


@shared_task
def bulk_cleanup_expired_requests():
    """Clean up all expired registration requests."""
    try:
        now = timezone.now()
        expired_requests = RegistrationRequest.objects.filter(
            expires_at__lt=now,
            status__in=[
                RegistrationStatus.PENDING,
                RegistrationStatus.EMAIL_VERIFICATION_SENT,
                RegistrationStatus.EMAIL_VERIFIED,
                RegistrationStatus.DOMAIN_VERIFICATION_PENDING,
                RegistrationStatus.DOMAIN_VERIFIED,
                RegistrationStatus.INSTITUTIONAL_VERIFICATION_PENDING,
                RegistrationStatus.INSTITUTIONAL_VERIFIED,
                RegistrationStatus.UNDER_REVIEW
            ]
        )
        
        expired_count = 0
        for request_obj in expired_requests:
            try:
                cleanup_expired_request.delay(request_obj.id)
                expired_count += 1
            except Exception as e:
                logger.error(f"Failed to schedule cleanup for request {request_obj.id}: {e}")
        
        logger.info(f"Scheduled cleanup for {expired_count} expired requests")
        return expired_count
        
    except Exception as exc:
        logger.error(f"Failed to bulk cleanup expired requests: {exc}")
        raise exc


@shared_task
def send_daily_admin_summary():
    """Send daily summary of registration requests to admins."""
    try:
        # Get statistics for the last 24 hours
        yesterday = timezone.now() - timedelta(days=1)
        
        stats = {
            'new_requests': RegistrationRequest.objects.filter(created_at__gte=yesterday).count(),
            'pending_review': RegistrationRequest.objects.filter(status=RegistrationStatus.UNDER_REVIEW).count(),
            'approved_today': RegistrationRequest.objects.filter(
                status=RegistrationStatus.APPROVED,
                approved_at__gte=yesterday
            ).count(),
            'rejected_today': RegistrationRequest.objects.filter(
                status=RegistrationStatus.REJECTED,
                rejected_at__gte=yesterday
            ).count(),
            'high_risk_pending': RegistrationRequest.objects.filter(
                risk_level__in=['high', 'critical'],
                status__in=[
                    RegistrationStatus.UNDER_REVIEW,
                    RegistrationStatus.INSTITUTIONAL_VERIFIED
                ]
            ).count(),
        }
        
        # Only send if there's activity
        if not any(stats.values()):
            logger.info("No registration activity today, skipping daily summary")
            return False
        
        # Get admin emails
        admin_emails = getattr(settings, 'ADMIN_EMAIL_LIST', [])
        if not admin_emails:
            logger.warning("No admin emails configured for daily summary")
            return False
        
        subject = f"Daily Registration Summary - {timezone.now().strftime('%Y-%m-%d')}"
        
        context = {
            'stats': stats,
            'date': timezone.now().strftime('%Y-%m-%d'),
            'admin_url': getattr(settings, 'ADMIN_BASE_URL', '')
        }
        
        html_message = render_to_string('emails/daily_admin_summary.html', context)
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            html_message=html_message,
            fail_silently=False
        )
        
        logger.info("Daily admin summary sent successfully")
        return True
        
    except Exception as exc:
        logger.error(f"Failed to send daily admin summary: {exc}")
        raise exc


@shared_task
def process_institutional_verification_batch():
    """Process a batch of institutional verifications."""
    try:
        from .services import InstitutionalVerificationService
        
        # Get requests pending institutional verification
        pending_requests = RegistrationRequest.objects.filter(
            status=RegistrationStatus.INSTITUTIONAL_VERIFICATION_PENDING
        )[:10]  # Process 10 at a time
        
        verification_service = InstitutionalVerificationService()
        processed_count = 0
        
        for request_obj in pending_requests:
            try:
                verification_service.verify_institution(request_obj.id)
                processed_count += 1
            except Exception as e:
                logger.error(f"Failed to verify institution for request {request_obj.id}: {e}")
        
        logger.info(f"Processed {processed_count} institutional verifications")
        return processed_count
        
    except Exception as exc:
        logger.error(f"Failed to process institutional verification batch: {exc}")
        raise exc


@shared_task
def update_risk_scores():
    """Update risk scores for pending requests based on new data."""
    try:
        from .services import RiskAssessmentService
        
        # Get requests that might need risk score updates
        pending_requests = RegistrationRequest.objects.filter(
            status__in=[
                RegistrationStatus.PENDING,
                RegistrationStatus.EMAIL_VERIFIED,
                RegistrationStatus.DOMAIN_VERIFIED,
                RegistrationStatus.UNDER_REVIEW
            ]
        )
        
        risk_service = RiskAssessmentService()
        updated_count = 0
        
        for request_obj in pending_requests:
            try:
                # Recalculate risk score
                risk_data = risk_service.assess_registration_risk(
                    email=request_obj.email,
                    organization_website=request_obj.organization_website,
                    role=request_obj.role,
                    organization_type=request_obj.organization_type
                )
                
                # Update if risk score changed significantly
                if abs(request_obj.risk_score - risk_data['risk_score']) > 5:
                    request_obj.risk_score = risk_data['risk_score']
                    request_obj.risk_level = risk_data['risk_level']
                    request_obj.risk_factors = risk_data['risk_factors']
                    request_obj.save(update_fields=['risk_score', 'risk_level', 'risk_factors'])
                    
                    # Log the update
                    RegistrationRequestLog.objects.create(
                        registration_request=request_obj,
                        action='RISK_SCORE_UPDATED',
                        notes=f'Risk score updated from {request_obj.risk_score} to {risk_data["risk_score"]}'
                    )
                    
                    updated_count += 1
                    
            except Exception as e:
                logger.error(f"Failed to update risk score for request {request_obj.id}: {e}")
        
        logger.info(f"Updated risk scores for {updated_count} requests")
        return updated_count
        
    except Exception as exc:
        logger.error(f"Failed to update risk scores: {exc}")
        raise exc


# Periodic task setup (to be configured in Celery beat schedule)
@shared_task
def setup_periodic_tasks():
    """Setup periodic tasks for registration management."""
    from celery import current_app
    
    # Daily cleanup of expired requests
    current_app.add_periodic_task(
        86400.0,  # 24 hours
        bulk_cleanup_expired_requests.s(),
        name='Daily cleanup of expired requests'
    )
    
    # Daily admin summary
    current_app.add_periodic_task(
        86400.0,  # 24 hours
        send_daily_admin_summary.s(),
        name='Daily admin summary'
    )
    
    # Hourly institutional verification processing
    current_app.add_periodic_task(
        3600.0,  # 1 hour
        process_institutional_verification_batch.s(),
        name='Hourly institutional verification processing'
    )
    
    # Weekly risk score updates
    current_app.add_periodic_task(
        604800.0,  # 7 days
        update_risk_scores.s(),
        name='Weekly risk score updates'
    )
    
    return "Periodic tasks configured successfully"