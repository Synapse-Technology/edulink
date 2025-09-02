from django.db.models.signals import post_save, pre_save, post_delete, pre_delete
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
import logging

from .models import User, UserSession, UserActivity, UserPreference
from utils.helpers import (
    send_notification_email, notify_service, generate_cache_key,
    get_client_ip
)

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """
    Handle user post-save signal.
    """
    if created:
        # Create user preferences
        UserPreference.objects.get_or_create(user=instance)
        
        # Send welcome email
        try:
            send_notification_email(
                to_email=instance.email,
                subject='Welcome to Edulink!',
                template='emails/welcome.html',
                context={'user': instance}
            )
        except Exception as e:
            logger.error(f"Failed to send welcome email to {instance.email}: {str(e)}")
        
        # Notify other services about new user
        try:
            notify_service('profile_service', 'user_created', {
                'user_id': str(instance.id),
                'email': instance.email,
                'first_name': instance.first_name,
                'last_name': instance.last_name
            })
        except Exception as e:
            logger.error(f"Failed to notify profile service: {str(e)}")
        
        logger.info(f"New user created: {instance.email} (ID: {instance.id})")
    
    else:
        # Clear user cache on update
        cache_key = generate_cache_key('user', instance.id)
        cache.delete(cache_key)
        
        # Check for important field changes
        if hasattr(instance, '_original_email') and instance._original_email != instance.email:
            # Email changed
            logger.info(f"User {instance.id} changed email from {instance._original_email} to {instance.email}")
            
            # Notify other services
            try:
                notify_service('profile_service', 'user_email_changed', {
                    'user_id': str(instance.id),
                    'old_email': instance._original_email,
                    'new_email': instance.email
                })
            except Exception as e:
                logger.error(f"Failed to notify services about email change: {str(e)}")
        
        if hasattr(instance, '_original_is_active') and instance._original_is_active != instance.is_active:
            # Active status changed
            status = 'activated' if instance.is_active else 'deactivated'
            logger.info(f"User {instance.id} {status}")
            
            # Notify other services
            try:
                notify_service('profile_service', 'user_status_changed', {
                    'user_id': str(instance.id),
                    'is_active': instance.is_active
                })
            except Exception as e:
                logger.error(f"Failed to notify services about status change: {str(e)}")
            
            # If deactivated, terminate all sessions
            if not instance.is_active:
                UserSession.objects.filter(user=instance).update(is_active=False)


@receiver(pre_save, sender=User)
def user_pre_save(sender, instance, **kwargs):
    """
    Handle user pre-save signal to track changes.
    """
    if instance.pk:
        try:
            original = User.objects.get(pk=instance.pk)
            instance._original_email = original.email
            instance._original_is_active = original.is_active
            instance._original_is_verified = original.is_verified
        except User.DoesNotExist:
            pass


@receiver(post_delete, sender=User)
def user_post_delete(sender, instance, **kwargs):
    """
    Handle user deletion.
    """
    # Clear user cache
    cache_key = generate_cache_key('user', instance.id)
    cache.delete(cache_key)
    
    # Notify other services
    try:
        notify_service('profile_service', 'user_deleted', {
            'user_id': str(instance.id),
            'email': instance.email
        })
    except Exception as e:
        logger.error(f"Failed to notify services about user deletion: {str(e)}")
    
    logger.info(f"User deleted: {instance.email} (ID: {instance.id})")


@receiver(user_logged_in)
def user_logged_in_handler(sender, request, user, **kwargs):
    """
    Handle user login signal.
    """
    # Update last login
    user.update_last_login()
    
    # Reset failed login attempts
    user.reset_failed_login()
    
    # Log activity
    UserActivity.objects.create(
        user=user,
        action='LOGIN',
        description='User logged in',
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        metadata={
            'session_key': request.session.session_key,
            'login_method': 'web'
        }
    )
    
    # Send login notification if enabled
    try:
        preferences = UserPreference.objects.get(user=user)
        if preferences.get_setting('login_notifications', False):
            send_notification_email(
                to_email=user.email,
                subject='New login to your account',
                template='emails/login_notification.html',
                context={
                    'user': user,
                    'ip_address': get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    'login_time': timezone.now()
                }
            )
    except (UserPreference.DoesNotExist, Exception) as e:
        logger.error(f"Failed to send login notification: {str(e)}")
    
    logger.info(f"User logged in: {user.email} from {get_client_ip(request)}")


@receiver(user_logged_out)
def user_logged_out_handler(sender, request, user, **kwargs):
    """
    Handle user logout signal.
    """
    if user:
        # Deactivate session
        if hasattr(request, 'session') and request.session.session_key:
            UserSession.objects.filter(
                user=user,
                session_key=request.session.session_key
            ).update(is_active=False)
        
        # Log activity
        UserActivity.objects.create(
            user=user,
            action='LOGOUT',
            description='User logged out',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'session_key': getattr(request.session, 'session_key', None),
                'logout_method': 'web'
            }
        )
        
        logger.info(f"User logged out: {user.email}")


@receiver(user_login_failed)
def user_login_failed_handler(sender, credentials, request, **kwargs):
    """
    Handle failed login attempts.
    """
    email = credentials.get('email') or credentials.get('username')
    
    if email:
        try:
            user = User.objects.get(email__iexact=email)
            
            # Increment failed login attempts
            user.increment_failed_login()
            
            # Log activity
            UserActivity.objects.create(
                user=user,
                action='LOGIN_FAILED',
                description='Failed login attempt',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                metadata={
                    'attempted_email': email,
                    'failure_reason': 'invalid_credentials'
                }
            )
            
            # Send security alert if account gets locked
            if user.is_account_locked():
                try:
                    send_notification_email(
                        to_email=user.email,
                        subject='Account temporarily locked',
                        template='emails/account_locked.html',
                        context={
                            'user': user,
                            'ip_address': get_client_ip(request),
                            'lock_duration': settings.ACCOUNT_LOCK_DURATION,
                            'unlock_time': user.account_locked_until
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to send account lock notification: {str(e)}")
            
            logger.warning(
                f"Failed login attempt for {email} from {get_client_ip(request)}. "
                f"Attempts: {user.failed_login_attempts}"
            )
        
        except User.DoesNotExist:
            # Log failed attempt for non-existent user
            logger.warning(
                f"Failed login attempt for non-existent user {email} "
                f"from {get_client_ip(request)}"
            )


@receiver(post_save, sender=UserSession)
def user_session_post_save(sender, instance, created, **kwargs):
    """
    Handle user session creation.
    """
    if created:
        # Clean up old sessions for the user (keep only last 10)
        old_sessions = UserSession.objects.filter(
            user=instance.user
        ).order_by('-created_at')[10:]
        
        if old_sessions:
            UserSession.objects.filter(
                id__in=[session.id for session in old_sessions]
            ).delete()
        
        logger.info(
            f"New session created for user {instance.user.email}: "
            f"{instance.session_key[:8]}... from {instance.ip_address}"
        )


@receiver(post_save, sender=UserActivity)
def user_activity_post_save(sender, instance, created, **kwargs):
    """
    Handle user activity logging.
    """
    if created:
        # Clean up old activities (keep only last 1000 per user)
        old_activities = UserActivity.objects.filter(
            user=instance.user
        ).order_by('-created_at')[1000:]
        
        if old_activities:
            UserActivity.objects.filter(
                id__in=[activity.id for activity in old_activities]
            ).delete()
        
        # Cache recent activities
        cache_key = generate_cache_key('user_activities', instance.user.id)
        recent_activities = UserActivity.objects.filter(
            user=instance.user
        ).order_by('-created_at')[:20]
        
        cache.set(cache_key, list(recent_activities.values()), 300)  # 5 minutes


@receiver(post_save, sender=UserPreference)
def user_preference_post_save(sender, instance, created, **kwargs):
    """
    Handle user preference changes.
    """
    # Clear user preferences cache
    cache_key = generate_cache_key('user_preferences', instance.user.id)
    cache.delete(cache_key)
    
    if not created:
        # Log preference change
        UserActivity.objects.create(
            user=instance.user,
            action='PREFERENCES_UPDATE',
            description='User updated preferences',
            metadata={
                'changed_fields': getattr(instance, '_changed_fields', [])
            }
        )
        
        logger.info(f"User {instance.user.email} updated preferences")


# Custom signal for email verification
from django.dispatch import Signal

user_email_verified = Signal()


@receiver(user_email_verified)
def user_email_verified_handler(sender, user, **kwargs):
    """
    Handle email verification.
    """
    # Send welcome email after verification
    try:
        send_notification_email(
            to_email=user.email,
            subject='Email verified successfully!',
            template='emails/email_verified.html',
            context={'user': user}
        )
    except Exception as e:
        logger.error(f"Failed to send email verification confirmation: {str(e)}")
    
    # Notify other services
    try:
        notify_service('profile_service', 'user_verified', {
            'user_id': str(user.id),
            'email': user.email,
            'verified_at': user.email_verified_at.isoformat() if user.email_verified_at else None
        })
    except Exception as e:
        logger.error(f"Failed to notify services about email verification: {str(e)}")
    
    # Log activity
    UserActivity.objects.create(
        user=user,
        action='EMAIL_VERIFIED',
        description='User verified email address',
        metadata={
            'verification_method': 'email_link'
        }
    )
    
    logger.info(f"User {user.email} verified their email address")


# Custom signal for password changes
user_password_changed = Signal()


@receiver(user_password_changed)
def user_password_changed_handler(sender, user, **kwargs):
    """
    Handle password changes.
    """
    # Send security notification
    try:
        send_notification_email(
            to_email=user.email,
            subject='Password changed successfully',
            template='emails/password_changed.html',
            context={
                'user': user,
                'change_time': timezone.now()
            }
        )
    except Exception as e:
        logger.error(f"Failed to send password change notification: {str(e)}")
    
    # Invalidate all sessions except current one
    # This would be handled in the view, but we log it here
    logger.info(f"User {user.email} changed their password")


# Custom signal for account lockout
account_locked = Signal()


@receiver(account_locked)
def account_locked_handler(sender, user, **kwargs):
    """
    Handle account lockout.
    """
    # Send security alert
    try:
        send_notification_email(
            to_email=user.email,
            subject='Account temporarily locked',
            template='emails/account_locked.html',
            context={
                'user': user,
                'lock_duration': settings.ACCOUNT_LOCK_DURATION,
                'unlock_time': user.account_locked_until
            }
        )
    except Exception as e:
        logger.error(f"Failed to send account lock notification: {str(e)}")
    
    # Terminate all active sessions
    UserSession.objects.filter(user=user).update(is_active=False)
    
    logger.warning(f"Account locked for user {user.email} due to failed login attempts")