from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.utils import timezone
from django.conf import settings
import logging

from .models import User, RefreshToken
from .tasks import log_security_event, sync_user_profile, notify_user_service

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """Handle user creation and updates."""
    if created:
        # Log user creation
        log_security_event.delay(
            user_id=str(instance.id),
            event_type='user_created',
            metadata={
                'role': instance.role,
                'email': instance.email,
                'is_email_verified': instance.is_email_verified
            }
        )
        
        # Sync with user service
        profile_data = {
            'email': instance.email,
            'role': instance.role,
            'phone_number': instance.phone_number,
            'national_id': instance.national_id,
            'is_email_verified': instance.is_email_verified,
            'date_joined': instance.date_joined.isoformat()
        }
        
        sync_user_profile.delay(
            user_id=str(instance.id),
            profile_data=profile_data,
            action='create'
        )
        
        # Notify user service
        notify_user_service.delay(
            user_id=str(instance.id),
            event_type='user_registered',
            data=profile_data
        )
        
        logger.info(f"New user created: {instance.email} with role {instance.role}")
    
    else:
        # Handle user updates
        # Check if important fields changed
        if hasattr(instance, '_state') and instance._state.adding is False:
            # Get the previous instance from database
            try:
                old_instance = User.objects.get(pk=instance.pk)
                
                # Check for role changes
                if old_instance.role != instance.role:
                    log_security_event.delay(
                        user_id=str(instance.id),
                        event_type='role_changed',
                        metadata={
                            'old_role': old_instance.role,
                            'new_role': instance.role
                        }
                    )
                
                # Check for email verification
                if not old_instance.is_email_verified and instance.is_email_verified:
                    log_security_event.delay(
                        user_id=str(instance.id),
                        event_type='email_verified',
                        metadata={'email': instance.email}
                    )
                    
                    notify_user_service.delay(
                        user_id=str(instance.id),
                        event_type='email_verified',
                        data={'email': instance.email}
                    )
                
                # Check for account status changes
                if old_instance.is_active != instance.is_active:
                    event_type = 'account_activated' if instance.is_active else 'account_deactivated'
                    log_security_event.delay(
                        user_id=str(instance.id),
                        event_type=event_type,
                        metadata={'is_active': instance.is_active}
                    )
                
                # Sync profile updates
                profile_data = {
                    'email': instance.email,
                    'role': instance.role,
                    'phone_number': instance.phone_number,
                    'national_id': instance.national_id,
                    'is_email_verified': instance.is_email_verified,
                    'is_active': instance.is_active
                }
                
                sync_user_profile.delay(
                    user_id=str(instance.id),
                    profile_data=profile_data,
                    action='update'
                )
                
            except User.DoesNotExist:
                # This shouldn't happen, but handle gracefully
                logger.warning(f"Could not find previous instance for user {instance.id}")


@receiver(post_delete, sender=User)
def user_post_delete(sender, instance, **kwargs):
    """Handle user deletion."""
    log_security_event.delay(
        user_id=str(instance.id),
        event_type='user_deleted',
        metadata={
            'email': instance.email,
            'role': instance.role
        }
    )
    
    # Notify user service
    notify_user_service.delay(
        user_id=str(instance.id),
        event_type='user_deleted',
        data={'email': instance.email}
    )
    
    logger.info(f"User deleted: {instance.email}")


@receiver(user_logged_in)
def user_logged_in_handler(sender, request, user, **kwargs):
    """Handle successful user login."""
    # Update last login time
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    
    # Reset failed login attempts
    if user.failed_login_attempts > 0:
        user.reset_failed_login()
    
    # Log successful login
    log_security_event.delay(
        user_id=str(user.id),
        event_type='login_success',
        ip_address=request.META.get('REMOTE_ADDR') if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
        session_key=request.session.session_key if request and hasattr(request, 'session') else None,
        metadata={
            'email': user.email,
            'role': user.role,
            'two_factor_enabled': user.two_factor_enabled
        }
    )
    
    # Notify user service
    notify_user_service.delay(
        user_id=str(user.id),
        event_type='user_login',
        data={
            'email': user.email,
            'login_time': timezone.now().isoformat(),
            'ip_address': request.META.get('REMOTE_ADDR') if request else None
        }
    )
    
    logger.info(f"User logged in: {user.email}")


@receiver(user_logged_out)
def user_logged_out_handler(sender, request, user, **kwargs):
    """Handle user logout."""
    if user:
        # Log logout
        log_security_event.delay(
            user_id=str(user.id),
            event_type='logout',
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
            session_key=request.session.session_key if request and hasattr(request, 'session') else None,
            metadata={'email': user.email}
        )
        
        # Notify user service
        notify_user_service.delay(
            user_id=str(user.id),
            event_type='user_logout',
            data={
                'email': user.email,
                'logout_time': timezone.now().isoformat()
            }
        )
        
        logger.info(f"User logged out: {user.email}")


@receiver(user_login_failed)
def user_login_failed_handler(sender, credentials, request, **kwargs):
    """Handle failed login attempts."""
    email = credentials.get('email') or credentials.get('username')
    
    if email:
        try:
            user = User.objects.get(email=email)
            
            # Increment failed login attempts
            user.increment_failed_login()
            
            # Log failed login
            log_security_event.delay(
                user_id=str(user.id),
                event_type='login_failed',
                ip_address=request.META.get('REMOTE_ADDR') if request else None,
                user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
                metadata={
                    'email': email,
                    'failed_attempts': user.failed_login_attempts,
                    'account_locked': user.is_account_locked()
                },
                severity='high' if user.failed_login_attempts >= 3 else 'medium'
            )
            
            logger.warning(
                f"Failed login attempt for {email}. "
                f"Total attempts: {user.failed_login_attempts}"
            )
            
        except User.DoesNotExist:
            # Log failed login for non-existent user
            log_security_event.delay(
                user_id=None,
                event_type='login_failed_unknown_user',
                ip_address=request.META.get('REMOTE_ADDR') if request else None,
                user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
                metadata={'attempted_email': email},
                severity='high'
            )
            
            logger.warning(f"Failed login attempt for non-existent user: {email}")


@receiver(post_save, sender=RefreshToken)
def refresh_token_created(sender, instance, created, **kwargs):
    """Handle refresh token creation."""
    if created:
        # Log token creation
        log_security_event.delay(
            user_id=str(instance.user.id),
            event_type='refresh_token_created',
            ip_address=instance.ip_address,
            user_agent=instance.user_agent,
            metadata={
                'device_id': instance.device_id,
                'expires_at': instance.expires_at.isoformat()
            }
        )


@receiver(pre_save, sender=RefreshToken)
def refresh_token_blacklisted(sender, instance, **kwargs):
    """Handle refresh token blacklisting."""
    if instance.pk:  # Only for existing instances
        try:
            old_instance = RefreshToken.objects.get(pk=instance.pk)
            if not old_instance.is_blacklisted and instance.is_blacklisted:
                # Token is being blacklisted
                log_security_event.delay(
                    user_id=str(instance.user.id),
                    event_type='refresh_token_blacklisted',
                    ip_address=instance.ip_address,
                    metadata={
                        'device_id': instance.device_id,
                        'token_age': (timezone.now() - instance.created_at).total_seconds()
                    }
                )
        except RefreshToken.DoesNotExist:
            pass


# Custom signal for password changes
from django.dispatch import Signal

password_changed = Signal()


@receiver(password_changed)
def password_changed_handler(sender, user, **kwargs):
    """Handle password change events."""
    # Blacklist all existing refresh tokens
    RefreshToken.objects.filter(
        user=user,
        is_blacklisted=False
    ).update(is_blacklisted=True)
    
    # Log password change
    log_security_event.delay(
        user_id=str(user.id),
        event_type='password_changed',
        metadata={
            'email': user.email,
            'tokens_invalidated': True
        }
    )
    
    # Notify user service
    notify_user_service.delay(
        user_id=str(user.id),
        event_type='password_changed',
        data={
            'email': user.email,
            'change_time': timezone.now().isoformat()
        }
    )
    
    logger.info(f"Password changed for user: {user.email}")