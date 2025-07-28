from django.db.models.signals import post_save, post_delete, pre_save
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.utils import timezone
from django.core.cache import cache
from .models import SecurityEvent, UserSession, FailedLoginAttempt, AuditLog
from .utils import ThreatDetector

User = get_user_model()


@receiver(user_logged_in)
def handle_user_login(sender, request, user, **kwargs):
    """Handle user login events."""
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # Create security event for successful login
    SecurityEvent.objects.create(
        event_type='user_login',
        severity='low',
        description=f'User {user.email} logged in successfully',
        user=user,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata={
            'login_method': 'standard',
            'session_key': request.session.session_key
        }
    )
    
    # Create or update user session tracking
    session_key = request.session.session_key
    if session_key:
        UserSession.objects.update_or_create(
            session_key=session_key,
            defaults={
                'user': user,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'is_active': True,
                'last_activity': timezone.now()
            }
        )
    
    # Create audit log
    AuditLog.objects.create(
        action='login',
        user=user,
        resource_type='User',
        resource_id=str(user.pk),
        description=f'User {user.email} logged in',
        ip_address=ip_address,
        user_agent=user_agent,
        metadata={
            'session_key': session_key,
            'login_timestamp': timezone.now().isoformat()
        }
    )


@receiver(user_logged_out)
def handle_user_logout(sender, request, user, **kwargs):
    """Handle user logout events."""
    if user:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Create security event for logout
        SecurityEvent.objects.create(
            event_type='user_logout',
            severity='low',
            description=f'User {user.email} logged out',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'logout_method': 'standard',
                'session_key': request.session.session_key
            }
        )
        
        # Deactivate user session
        session_key = request.session.session_key
        if session_key:
            UserSession.objects.filter(
                session_key=session_key,
                user=user
            ).update(is_active=False)
        
        # Create audit log
        AuditLog.objects.create(
            action='logout',
            user=user,
            resource_type='User',
            resource_id=str(user.pk),
            description=f'User {user.email} logged out',
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'session_key': session_key,
                'logout_timestamp': timezone.now().isoformat()
            }
        )


@receiver(user_login_failed)
def handle_failed_login(sender, credentials, request, **kwargs):
    """Handle failed login attempts."""
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    email = credentials.get('email', credentials.get('username', 'unknown'))
    
    # Record failed login attempt
    FailedLoginAttempt.objects.create(
        email=email,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata={
            'attempted_credentials': {
                'email': email,
                'has_password': bool(credentials.get('password'))
            },
            'request_path': request.path,
            'request_method': request.method
        }
    )
    
    # Create security event for failed login
    SecurityEvent.objects.create(
        event_type='failed_login',
        severity='medium',
        description=f'Failed login attempt for email: {email}',
        ip_address=ip_address,
        user_agent=user_agent,
        metadata={
            'attempted_email': email,
            'failure_reason': 'invalid_credentials'
        }
    )
    
    # Check for brute force patterns
    threat_detector = ThreatDetector()
    if threat_detector.check_brute_force(email, ip_address):
        SecurityEvent.objects.create(
            event_type='brute_force_attempt',
            severity='high',
            description=f'Potential brute force attack detected for {email} from {ip_address}',
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'target_email': email,
                'attack_type': 'brute_force',
                'detection_method': 'failed_login_threshold'
            }
        )


@receiver(post_save)
def handle_model_save(sender, instance, created, **kwargs):
    """Handle model save events for audit logging."""
    # Skip logging for security models to avoid recursion
    if sender._meta.app_label == 'security':
        return
    
    # Skip logging for session models
    if sender._meta.model_name in ['session', 'logentry']:
        return
    
    action = 'create' if created else 'update'
    model_name = f"{sender._meta.app_label}.{sender._meta.model_name}"
    
    # Try to get user from instance or current request
    user = None
    if hasattr(instance, 'user'):
        user = instance.user
    elif hasattr(instance, 'created_by'):
        user = instance.created_by
    elif hasattr(instance, 'updated_by'):
        user = instance.updated_by
    
    # Create audit log entry
    try:
        AuditLog.objects.create(
            action=action,
            user=user,
            resource_type=model_name,
            resource_id=str(instance.pk),
            description=f'{action.title()} {model_name} object',
            ip_address='127.0.0.1',  # Default IP, should be captured from request context
            metadata={
                'model_fields': _get_model_fields(instance),
                'timestamp': timezone.now().isoformat()
            }
        )
    except Exception:
        # Silently fail to avoid breaking the main operation
        pass


@receiver(post_delete)
def handle_model_delete(sender, instance, **kwargs):
    """Handle model delete events for audit logging."""
    # Skip logging for security models to avoid recursion
    if sender._meta.app_label == 'security':
        return
    
    # Skip logging for session models
    if sender._meta.model_name in ['session', 'logentry']:
        return
    
    model_name = f"{sender._meta.app_label}.{sender._meta.model_name}"
    
    # Try to get user from instance
    user = None
    if hasattr(instance, 'user'):
        user = instance.user
    elif hasattr(instance, 'created_by'):
        user = instance.created_by
    
    # Create audit log entry
    try:
        AuditLog.objects.create(
            action='delete',
            user=user,
            resource_type=model_name,
            resource_id=str(instance.pk),
            description=f'Delete {model_name} object',
            ip_address='127.0.0.1',  # Default IP, should be captured from request context
            metadata={
                'deleted_object_data': _get_model_fields(instance),
                'timestamp': timezone.now().isoformat()
            }
        )
    except Exception:
        # Silently fail to avoid breaking the main operation
        pass


@receiver(pre_save, sender=User)
def handle_user_changes(sender, instance, **kwargs):
    """Handle user model changes for security monitoring."""
    if instance.pk:  # Existing user being updated
        try:
            old_instance = User.objects.get(pk=instance.pk)
            
            # Check for sensitive field changes
            sensitive_changes = []
            
            if old_instance.email != instance.email:
                sensitive_changes.append('email')
            
            if old_instance.is_staff != instance.is_staff:
                sensitive_changes.append('is_staff')
            
            if old_instance.is_superuser != instance.is_superuser:
                sensitive_changes.append('is_superuser')
            
            if old_instance.is_active != instance.is_active:
                sensitive_changes.append('is_active')
            
            # Create security event for sensitive changes
            if sensitive_changes:
                SecurityEvent.objects.create(
                    event_type='user_profile_change',
                    severity='medium',
                    description=f'Sensitive user fields changed: {", ".join(sensitive_changes)}',
                    user=instance,
                    ip_address='127.0.0.1',  # Should be captured from request context
                    metadata={
                        'changed_fields': sensitive_changes,
                        'old_values': {
                            field: getattr(old_instance, field) for field in sensitive_changes
                        },
                        'new_values': {
                            field: getattr(instance, field) for field in sensitive_changes
                        }
                    }
                )
        
        except User.DoesNotExist:
            pass


def get_client_ip(request):
    """Extract client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip or '127.0.0.1'


def _get_model_fields(instance):
    """Get model fields as dictionary for audit logging."""
    fields = {}
    for field in instance._meta.fields:
        try:
            value = getattr(instance, field.name)
            # Convert non-serializable values to strings
            if hasattr(value, 'isoformat'):  # datetime objects
                value = value.isoformat()
            elif hasattr(value, '__str__'):
                value = str(value)
            fields[field.name] = value
        except Exception:
            fields[field.name] = 'Unable to serialize'
    return fields


# Custom signal for security events
from django.dispatch import Signal

security_event_created = Signal()
threat_detected = Signal()
suspicious_activity_detected = Signal()


@receiver(security_event_created)
def handle_security_event_created(sender, event, **kwargs):
    """Handle custom security event creation."""
    # Check if this is a critical event that needs immediate attention
    if event.severity == 'critical':
        # In a real implementation, this could:
        # - Send notifications to security team
        # - Trigger automated responses
        # - Update security dashboards
        # - Log to external security systems
        pass


@receiver(threat_detected)
def handle_threat_detected(sender, threat_data, **kwargs):
    """Handle threat detection events."""
    # Create security event for detected threat
    SecurityEvent.objects.create(
        event_type=threat_data.get('type', 'unknown_threat'),
        severity=threat_data.get('severity', 'medium'),
        description=f"Threat detected: {threat_data.get('description', 'Unknown threat')}",
        ip_address=threat_data.get('ip_address', '127.0.0.1'),
        user_agent=threat_data.get('user_agent', ''),
        metadata=threat_data
    )


@receiver(suspicious_activity_detected)
def handle_suspicious_activity(sender, activity_data, **kwargs):
    """Handle suspicious activity detection."""
    # Create security event for suspicious activity
    SecurityEvent.objects.create(
        event_type='suspicious_activity',
        severity='medium',
        description=f"Suspicious activity detected: {activity_data.get('description', 'Unknown activity')}",
        user=activity_data.get('user'),
        ip_address=activity_data.get('ip_address', '127.0.0.1'),
        user_agent=activity_data.get('user_agent', ''),
        metadata=activity_data
    )