from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone
import logging
import requests
import json

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_email_task(self, subject, template, context, recipient_list, from_email=None):
    """Send email using template."""
    try:
        if from_email is None:
            from_email = settings.DEFAULT_FROM_EMAIL
        
        # Render HTML content
        html_message = render_to_string(template, context)
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False
        )
        
        logger.info(f"Email sent successfully to {recipient_list}")
        return f"Email sent to {len(recipient_list)} recipients"
        
    except Exception as exc:
        logger.error(f"Failed to send email: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def log_security_event(self, user_id, event_type, ip_address=None, user_agent=None, 
                      session_key=None, metadata=None, severity='medium'):
    """Log security event to security service."""
    try:
        # Prepare event data
        event_data = {
            'user_id': user_id,
            'event_type': event_type,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'session_key': session_key,
            'metadata': metadata or {},
            'severity': severity,
            'timestamp': timezone.now().isoformat(),
            'service': 'auth_service'
        }
        
        # Send to security service
        security_service_url = getattr(settings, 'SECURITY_SERVICE_URL', None)
        if security_service_url:
            response = requests.post(
                f"{security_service_url}/api/security/events/",
                json=event_data,
                headers={
                    'Content-Type': 'application/json',
                    'X-Service-Token': getattr(settings, 'SERVICE_TOKEN', '')
                },
                timeout=10
            )
            response.raise_for_status()
            logger.info(f"Security event logged: {event_type} for user {user_id}")
        else:
            # Fallback: log locally
            logger.warning(f"Security service URL not configured. Event: {event_data}")
        
        return f"Security event logged: {event_type}"
        
    except Exception as exc:
        logger.error(f"Failed to log security event: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def sync_user_profile(self, user_id, profile_data, action='create'):
    """Sync user profile with user service."""
    try:
        user_service_url = getattr(settings, 'USER_SERVICE_URL', None)
        if not user_service_url:
            logger.warning("User service URL not configured")
            return "User service not configured"
        
        # Prepare profile data
        sync_data = {
            'user_id': user_id,
            'action': action,
            'profile_data': profile_data,
            'timestamp': timezone.now().isoformat()
        }
        
        # Send to user service
        endpoint = f"{user_service_url}/api/users/sync/"
        response = requests.post(
            endpoint,
            json=sync_data,
            headers={
                'Content-Type': 'application/json',
                'X-Service-Token': getattr(settings, 'SERVICE_TOKEN', '')
            },
            timeout=15
        )
        response.raise_for_status()
        
        result = response.json()
        logger.info(f"User profile synced: {user_id} - {action}")
        return result
        
    except Exception as exc:
        logger.error(f"Failed to sync user profile: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task
def cleanup_expired_tokens():
    """Clean up expired tokens and OTPs."""
    try:
        from .models import EmailOTP, PasswordResetToken, RefreshToken
        from datetime import timedelta
        
        now = timezone.now()
        
        # Clean up expired OTPs (older than 1 hour)
        expired_otps = EmailOTP.objects.filter(
            created_at__lt=now - timedelta(hours=1)
        )
        otp_count = expired_otps.count()
        expired_otps.delete()
        
        # Clean up expired password reset tokens (older than 24 hours)
        expired_reset_tokens = PasswordResetToken.objects.filter(
            created_at__lt=now - timedelta(hours=24)
        )
        reset_count = expired_reset_tokens.count()
        expired_reset_tokens.delete()
        
        # Clean up expired refresh tokens
        expired_refresh_tokens = RefreshToken.objects.filter(
            expires_at__lt=now
        )
        refresh_count = expired_refresh_tokens.count()
        expired_refresh_tokens.delete()
        
        logger.info(
            f"Cleanup completed: {otp_count} OTPs, {reset_count} reset tokens, "
            f"{refresh_count} refresh tokens removed"
        )
        
        return {
            'otps_cleaned': otp_count,
            'reset_tokens_cleaned': reset_count,
            'refresh_tokens_cleaned': refresh_count
        }
        
    except Exception as exc:
        logger.error(f"Token cleanup failed: {exc}")
        raise


@shared_task
def unlock_accounts():
    """Unlock accounts that have passed their lock duration."""
    try:
        from .models import User
        
        now = timezone.now()
        
        # Find accounts that should be unlocked
        locked_users = User.objects.filter(
            account_locked_until__isnull=False,
            account_locked_until__lt=now
        )
        
        count = 0
        for user in locked_users:
            user.unlock_account()
            count += 1
            logger.info(f"Account unlocked: {user.email}")
        
        logger.info(f"Unlocked {count} accounts")
        return f"Unlocked {count} accounts"
        
    except Exception as exc:
        logger.error(f"Account unlock failed: {exc}")
        raise


@shared_task(bind=True, max_retries=3)
def notify_user_service(self, user_id, event_type, data=None):
    """Notify user service of authentication events."""
    try:
        user_service_url = getattr(settings, 'USER_SERVICE_URL', None)
        if not user_service_url:
            logger.warning("User service URL not configured")
            return "User service not configured"
        
        # Prepare notification data
        notification_data = {
            'user_id': user_id,
            'event_type': event_type,
            'data': data or {},
            'timestamp': timezone.now().isoformat(),
            'source': 'auth_service'
        }
        
        # Send notification
        endpoint = f"{user_service_url}/api/users/notifications/"
        response = requests.post(
            endpoint,
            json=notification_data,
            headers={
                'Content-Type': 'application/json',
                'X-Service-Token': getattr(settings, 'SERVICE_TOKEN', '')
            },
            timeout=10
        )
        response.raise_for_status()
        
        logger.info(f"User service notified: {event_type} for user {user_id}")
        return f"Notification sent: {event_type}"
        
    except Exception as exc:
        logger.error(f"Failed to notify user service: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))


@shared_task
def generate_user_activity_report():
    """Generate user activity report for monitoring."""
    try:
        from .models import User, RefreshToken
        from datetime import timedelta
        
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        
        # Calculate metrics
        total_users = User.objects.count()
        active_users_24h = User.objects.filter(last_login__gte=last_24h).count()
        active_users_7d = User.objects.filter(last_login__gte=last_7d).count()
        new_users_24h = User.objects.filter(date_joined__gte=last_24h).count()
        verified_users = User.objects.filter(is_email_verified=True).count()
        locked_accounts = User.objects.filter(
            account_locked_until__isnull=False,
            account_locked_until__gt=now
        ).count()
        
        # Active sessions
        active_sessions = RefreshToken.objects.filter(
            is_blacklisted=False,
            expires_at__gt=now
        ).count()
        
        report = {
            'timestamp': now.isoformat(),
            'total_users': total_users,
            'active_users_24h': active_users_24h,
            'active_users_7d': active_users_7d,
            'new_users_24h': new_users_24h,
            'verified_users': verified_users,
            'verification_rate': (verified_users / total_users * 100) if total_users > 0 else 0,
            'locked_accounts': locked_accounts,
            'active_sessions': active_sessions
        }
        
        logger.info(f"User activity report generated: {report}")
        
        # Send to monitoring service if configured
        monitoring_url = getattr(settings, 'MONITORING_SERVICE_URL', None)
        if monitoring_url:
            try:
                requests.post(
                    f"{monitoring_url}/api/metrics/auth/",
                    json=report,
                    headers={
                        'Content-Type': 'application/json',
                        'X-Service-Token': getattr(settings, 'SERVICE_TOKEN', '')
                    },
                    timeout=10
                )
            except Exception as e:
                logger.error(f"Failed to send report to monitoring service: {e}")
        
        return report
        
    except Exception as exc:
        logger.error(f"Failed to generate activity report: {exc}")
        raise


@shared_task(bind=True, max_retries=2)
def validate_service_token(self, token, requesting_service):
    """Validate service-to-service authentication token."""
    try:
        # Implement your service token validation logic
        # This could involve checking against a database, external service, etc.
        
        allowed_tokens = getattr(settings, 'ALLOWED_SERVICE_TOKENS', {})
        
        if token in allowed_tokens:
            service_info = allowed_tokens[token]
            if service_info.get('service') == requesting_service:
                return {
                    'valid': True,
                    'service': requesting_service,
                    'permissions': service_info.get('permissions', [])
                }
        
        return {'valid': False}
        
    except Exception as exc:
        logger.error(f"Service token validation failed: {exc}")
        raise self.retry(exc=exc, countdown=10 * (2 ** self.request.retries))