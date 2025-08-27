from django.db.models.signals import post_save, post_delete, pre_save
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver, Signal
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
import logging
import json

from .models import (
    SecurityEvent,
    AuditLog,
    UserSession,
    FailedLoginAttempt,
    SecurityEventType,
    SeverityLevel
)
from authentication.models import RefreshToken, EmailOTP, PasswordResetToken
from authentication.tasks import log_security_event

User = get_user_model()
logger = logging.getLogger(__name__)

# Custom signals
password_changed = Signal()
security_event_created = Signal()


def get_client_ip(request):
    """Get client IP address from request."""
    if not request:
        return None
    
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_agent(request):
    """Get user agent from request."""
    if not request:
        return ''
    return request.META.get('HTTP_USER_AGENT', '')


def create_security_event(event_type, user=None, user_email=None, request=None, 
                         severity=SeverityLevel.MEDIUM, description='', metadata=None):
    """Helper function to create security events."""
    try:
        event_data = {
            'event_type': event_type,
            'severity': severity,
            'description': description,
            'metadata': metadata or {},
            'service_name': 'auth_service'
        }
        
        if user:
            event_data['user'] = user
        elif user_email:
            event_data['user_email'] = user_email
        
        if request:
            event_data.update({
                'ip_address': get_client_ip(request),
                'user_agent': get_user_agent(request),
                'session_key': getattr(request.session, 'session_key', '')
            })
        
        event = SecurityEvent.objects.create(**event_data)
        
        # Send signal for additional processing
        security_event_created.send(
            sender=SecurityEvent,
            instance=event,
            created=True
        )
        
        return event
    except Exception as e:
        logger.error(f"Failed to create security event: {e}")
        return None


def create_audit_log(action, resource_type, resource_id='', user=None, 
                    user_email=None, request=None, description='', 
                    changes=None, old_values=None, new_values=None, metadata=None):
    """Helper function to create audit logs."""
    try:
        log_data = {
            'action': action,
            'resource_type': resource_type,
            'resource_id': str(resource_id),
            'description': description,
            'changes': changes or {},
            'old_values': old_values or {},
            'new_values': new_values or {},
            'metadata': metadata or {},
            'service_name': 'auth_service'
        }
        
        if user:
            log_data['user'] = user
        elif user_email:
            log_data['user_email'] = user_email
        
        if request:
            log_data.update({
                'ip_address': get_client_ip(request),
                'user_agent': get_user_agent(request),
                'session_key': getattr(request.session, 'session_key', '')
            })
        
        return AuditLog.objects.create(**log_data)
    except Exception as e:
        logger.error(f"Failed to create audit log: {e}")
        return None


@receiver(post_save, sender=User)
def log_user_changes(sender, instance, created, **kwargs):
    """Log user creation and updates."""
    try:
        if created:
            # User creation
            create_security_event(
                event_type=SecurityEventType.USER_CREATED,
                user=instance,
                severity=SeverityLevel.LOW,
                description=f"New user account created: {instance.email}",
                metadata={
                    'user_id': str(instance.id),
                    'email': instance.email,
                    'role': instance.role,
                    'is_active': instance.is_active
                }
            )
            
            create_audit_log(
                action='create',
                resource_type='User',
                resource_id=instance.id,
                user=instance,
                description=f"User account created: {instance.email}",
                new_values={
                    'email': instance.email,
                    'role': instance.role,
                    'is_active': instance.is_active,
                    'email_verified': instance.email_verified
                }
            )
        else:
            # User update - track specific changes
            if hasattr(instance, '_state') and instance._state.adding is False:
                # Get old values from database
                try:
                    old_instance = User.objects.get(pk=instance.pk)
                    changes = {}
                    old_values = {}
                    new_values = {}
                    
                    # Track important field changes
                    fields_to_track = [
                        'email', 'role', 'is_active', 'email_verified',
                        'is_locked', 'failed_login_attempts', 'two_factor_enabled'
                    ]
                    
                    for field in fields_to_track:
                        old_value = getattr(old_instance, field, None)
                        new_value = getattr(instance, field, None)
                        
                        if old_value != new_value:
                            changes[field] = {'from': old_value, 'to': new_value}
                            old_values[field] = old_value
                            new_values[field] = new_value
                    
                    if changes:
                        # Log significant changes as security events
                        if 'role' in changes:
                            create_security_event(
                                event_type=SecurityEventType.ROLE_CHANGED,
                                user=instance,
                                severity=SeverityLevel.MEDIUM,
                                description=f"User role changed from {changes['role']['from']} to {changes['role']['to']}",
                                metadata={
                                    'user_id': str(instance.id),
                                    'old_role': changes['role']['from'],
                                    'new_role': changes['role']['to']
                                }
                            )
                        
                        if 'email_verified' in changes and changes['email_verified']['to']:
                            create_security_event(
                                event_type=SecurityEventType.EMAIL_VERIFIED,
                                user=instance,
                                severity=SeverityLevel.LOW,
                                description=f"Email verified for user: {instance.email}",
                                metadata={'user_id': str(instance.id)}
                            )
                        
                        if 'is_active' in changes:
                            event_type = SecurityEventType.ACCOUNT_ACTIVATED if changes['is_active']['to'] else SecurityEventType.ACCOUNT_DEACTIVATED
                            create_security_event(
                                event_type=event_type,
                                user=instance,
                                severity=SeverityLevel.MEDIUM,
                                description=f"Account {'activated' if changes['is_active']['to'] else 'deactivated'}: {instance.email}",
                                metadata={'user_id': str(instance.id)}
                            )
                        
                        if 'is_locked' in changes and changes['is_locked']['to']:
                            create_security_event(
                                event_type=SecurityEventType.ACCOUNT_LOCKED,
                                user=instance,
                                severity=SeverityLevel.HIGH,
                                description=f"Account locked: {instance.email}",
                                metadata={
                                    'user_id': str(instance.id),
                                    'failed_attempts': instance.failed_login_attempts
                                }
                            )
                        elif 'is_locked' in changes and not changes['is_locked']['to']:
                            create_security_event(
                                event_type=SecurityEventType.ACCOUNT_UNLOCKED,
                                user=instance,
                                severity=SeverityLevel.MEDIUM,
                                description=f"Account unlocked: {instance.email}",
                                metadata={'user_id': str(instance.id)}
                            )
                        
                        # Create audit log for all changes
                        create_audit_log(
                            action='update',
                            resource_type='User',
                            resource_id=instance.id,
                            user=instance,
                            description=f"User account updated: {instance.email}",
                            changes=changes,
                            old_values=old_values,
                            new_values=new_values
                        )
                
                except User.DoesNotExist:
                    pass
    except Exception as e:
        logger.error(f"Error in log_user_changes signal: {e}")


@receiver(post_delete, sender=User)
def log_user_deletion(sender, instance, **kwargs):
    """Log user deletion."""
    try:
        create_security_event(
            event_type=SecurityEventType.USER_DELETED,
            user_email=instance.email,
            severity=SeverityLevel.HIGH,
            description=f"User account deleted: {instance.email}",
            metadata={
                'user_id': str(instance.id),
                'email': instance.email,
                'role': instance.role
            }
        )
        
        create_audit_log(
            action='delete',
            resource_type='User',
            resource_id=instance.id,
            user_email=instance.email,
            description=f"User account deleted: {instance.email}",
            old_values={
                'email': instance.email,
                'role': instance.role,
                'is_active': instance.is_active
            }
        )
    except Exception as e:
        logger.error(f"Error in log_user_deletion signal: {e}")


@receiver(user_logged_in)
def log_successful_login(sender, request, user, **kwargs):
    """Log successful login."""
    try:
        # Reset failed login attempts
        if user.failed_login_attempts > 0:
            user.failed_login_attempts = 0
            user.save(update_fields=['failed_login_attempts'])
        
        # Create or update user session
        session_key = request.session.session_key
        if session_key:
            UserSession.objects.update_or_create(
                session_key=session_key,
                defaults={
                    'user': user,
                    'ip_address': get_client_ip(request),
                    'user_agent': get_user_agent(request),
                    'expires_at': timezone.now() + timezone.timedelta(hours=24),
                    'is_active': True
                }
            )
        
        create_security_event(
            event_type=SecurityEventType.LOGIN_SUCCESS,
            user=user,
            request=request,
            severity=SeverityLevel.LOW,
            description=f"Successful login: {user.email}",
            metadata={
                'user_id': str(user.id),
                'session_key': session_key
            }
        )
        
        create_audit_log(
            action='login',
            resource_type='User',
            resource_id=user.id,
            user=user,
            request=request,
            description=f"User logged in: {user.email}"
        )
    except Exception as e:
        logger.error(f"Error in log_successful_login signal: {e}")


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout."""
    try:
        # Terminate user session
        session_key = request.session.session_key
        if session_key:
            UserSession.objects.filter(
                session_key=session_key,
                is_active=True
            ).update(
                is_active=False,
                logout_reason='user_logout'
            )
        
        create_security_event(
            event_type=SecurityEventType.LOGOUT,
            user=user,
            request=request,
            severity=SeverityLevel.LOW,
            description=f"User logout: {user.email}",
            metadata={
                'user_id': str(user.id),
                'session_key': session_key
            }
        )
        
        create_audit_log(
            action='logout',
            resource_type='User',
            resource_id=user.id,
            user=user,
            request=request,
            description=f"User logged out: {user.email}"
        )
    except Exception as e:
        logger.error(f"Error in log_user_logout signal: {e}")


@receiver(user_login_failed)
def log_failed_login(sender, credentials, request, **kwargs):
    """Log failed login attempts."""
    try:
        email = credentials.get('email', '')
        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)
        
        # Determine failure reason
        reason = 'invalid_credentials'
        user = None
        
        try:
            user = User.objects.get(email=email)
            if not user.is_active:
                reason = 'account_inactive'
            elif user.is_locked:
                reason = 'account_locked'
            elif not user.email_verified:
                reason = 'email_not_verified'
        except User.DoesNotExist:
            reason = 'user_not_found'
            email = email or 'unknown'
        
        # Create failed login attempt record
        FailedLoginAttempt.objects.create(
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            reason=reason
        )
        
        # Increment failed attempts for existing users
        if user:
            user.failed_login_attempts += 1
            
            # Lock account if too many failed attempts
            max_attempts = getattr(settings, 'MAX_LOGIN_ATTEMPTS', 5)
            if user.failed_login_attempts >= max_attempts:
                user.is_locked = True
                user.locked_at = timezone.now()
            
            user.save(update_fields=['failed_login_attempts', 'is_locked', 'locked_at'])
        
        # Determine event type and severity
        event_type = SecurityEventType.LOGIN_FAILED if user else SecurityEventType.LOGIN_FAILED_UNKNOWN_USER
        severity = SeverityLevel.MEDIUM
        
        # Check for brute force patterns
        recent_attempts = FailedLoginAttempt.objects.filter(
            ip_address=ip_address,
            timestamp__gte=timezone.now() - timezone.timedelta(minutes=15)
        ).count()
        
        if recent_attempts >= 5:
            event_type = SecurityEventType.BRUTE_FORCE_ATTEMPT
            severity = SeverityLevel.HIGH
        elif recent_attempts >= 3:
            event_type = SecurityEventType.MULTIPLE_FAILED_LOGINS
            severity = SeverityLevel.MEDIUM
        
        create_security_event(
            event_type=event_type,
            user=user,
            user_email=email if not user else None,
            request=request,
            severity=severity,
            description=f"Failed login attempt: {email} (reason: {reason})",
            metadata={
                'reason': reason,
                'recent_attempts': recent_attempts,
                'user_id': str(user.id) if user else None,
                'failed_attempts': user.failed_login_attempts if user else 0,
                'account_locked': user.is_locked if user else False
            }
        )
        
        create_audit_log(
            action='login_failed',
            resource_type='User',
            resource_id=user.id if user else '',
            user=user,
            user_email=email if not user else None,
            request=request,
            description=f"Failed login attempt: {email}",
            metadata={
                'reason': reason,
                'recent_attempts': recent_attempts
            }
        )
    except Exception as e:
        logger.error(f"Error in log_failed_login signal: {e}")


@receiver(post_save, sender=RefreshToken)
def log_refresh_token_creation(sender, instance, created, **kwargs):
    """Log refresh token creation."""
    if created:
        try:
            create_security_event(
                event_type=SecurityEventType.REFRESH_TOKEN_CREATED,
                user=instance.user,
                severity=SeverityLevel.LOW,
                description=f"Refresh token created for user: {instance.user.email}",
                metadata={
                    'token_id': str(instance.id),
                    'user_id': str(instance.user.id),
                    'device_id': instance.device_id,
                    'expires_at': instance.expires_at.isoformat() if instance.expires_at else None
                }
            )
            
            create_audit_log(
                action='token_create',
                resource_type='RefreshToken',
                resource_id=instance.id,
                user=instance.user,
                description=f"Refresh token created for user: {instance.user.email}"
            )
        except Exception as e:
            logger.error(f"Error in log_refresh_token_creation signal: {e}")


@receiver(pre_save, sender=RefreshToken)
def log_refresh_token_blacklist(sender, instance, **kwargs):
    """Log refresh token blacklisting."""
    try:
        if instance.pk:
            old_instance = RefreshToken.objects.get(pk=instance.pk)
            if not old_instance.is_blacklisted and instance.is_blacklisted:
                create_security_event(
                    event_type=SecurityEventType.REFRESH_TOKEN_BLACKLISTED,
                    user=instance.user,
                    severity=SeverityLevel.LOW,
                    description=f"Refresh token blacklisted for user: {instance.user.email}",
                    metadata={
                        'token_id': str(instance.id),
                        'user_id': str(instance.user.id),
                        'device_id': instance.device_id
                    }
                )
                
                create_audit_log(
                    action='token_blacklist',
                    resource_type='RefreshToken',
                    resource_id=instance.id,
                    user=instance.user,
                    description=f"Refresh token blacklisted for user: {instance.user.email}"
                )
    except RefreshToken.DoesNotExist:
        pass
    except Exception as e:
        logger.error(f"Error in log_refresh_token_blacklist signal: {e}")


@receiver(password_changed)
def log_password_change(sender, user, request=None, **kwargs):
    """Log password changes."""
    try:
        # Blacklist all existing refresh tokens
        RefreshToken.objects.filter(
            user=user,
            is_blacklisted=False
        ).update(is_blacklisted=True)
        
        create_security_event(
            event_type=SecurityEventType.PASSWORD_CHANGED,
            user=user,
            request=request,
            severity=SeverityLevel.MEDIUM,
            description=f"Password changed for user: {user.email}",
            metadata={
                'user_id': str(user.id),
                'tokens_blacklisted': True
            }
        )
        
        create_audit_log(
            action='password_change',
            resource_type='User',
            resource_id=user.id,
            user=user,
            request=request,
            description=f"Password changed for user: {user.email}"
        )
    except Exception as e:
        logger.error(f"Error in log_password_change signal: {e}")


@receiver(post_save, sender=EmailOTP)
def log_otp_creation(sender, instance, created, **kwargs):
    """Log OTP creation."""
    if created:
        try:
            event_type = SecurityEventType.EMAIL_VERIFICATION_SENT
            if instance.purpose == 'password_reset':
                event_type = SecurityEventType.PASSWORD_RESET_REQUESTED
            elif instance.purpose == 'two_factor':
                event_type = SecurityEventType.TWO_FACTOR_VERIFIED
            
            create_security_event(
                event_type=event_type,
                user=instance.user,
                user_email=instance.email,
                severity=SeverityLevel.LOW,
                description=f"OTP created for {instance.purpose}: {instance.email}",
                metadata={
                    'otp_id': str(instance.id),
                    'purpose': instance.purpose,
                    'user_id': str(instance.user.id) if instance.user else None
                }
            )
        except Exception as e:
            logger.error(f"Error in log_otp_creation signal: {e}")


@receiver(security_event_created)
def handle_security_event_created(sender, instance, created, **kwargs):
    """Handle security event creation for additional processing."""
    if created:
        try:
            # Send notifications for high-risk events
            if instance.risk_score >= 70 or instance.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]:
                # Queue notification task
                log_security_event.delay(
                    event_type=instance.event_type,
                    user_email=instance.user.email if instance.user else instance.user_email,
                    ip_address=instance.ip_address,
                    severity=instance.severity,
                    description=instance.description,
                    metadata=instance.metadata
                )
        except Exception as e:
            logger.error(f"Error in handle_security_event_created signal: {e}")