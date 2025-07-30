from django.db.models.signals import post_save, post_delete, pre_save
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver, Signal
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.utils import timezone
from django.core.cache import cache
from .models import SecurityEvent, UserSession, FailedLoginAttempt, AuditLog
from .utils import ThreatDetector
from security.apps import is_audit_logging_enabled  # <-- Important Guard

User = get_user_model()

@receiver(user_logged_in)
def handle_user_login(sender, request, user, **kwargs):
    if not is_audit_logging_enabled():
        return

    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')

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
    if not is_audit_logging_enabled():
        return

    if user:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

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

        session_key = request.session.session_key
        if session_key:
            UserSession.objects.filter(
                session_key=session_key,
                user=user
            ).update(is_active=False)

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
    if not is_audit_logging_enabled():
        return

    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    email = credentials.get('email', credentials.get('username', 'unknown'))

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
    if not is_audit_logging_enabled():
        return

    if sender._meta.app_label == 'security':
        return

    if sender._meta.model_name in ['session', 'logentry']:
        return

    action = 'create' if created else 'update'
    model_name = f"{sender._meta.app_label}.{sender._meta.model_name}"

    user = getattr(instance, 'user', None) or getattr(instance, 'created_by', None) or getattr(instance, 'updated_by', None)

    try:
        AuditLog.objects.create(
            action=action,
            user=user,
            resource_type=model_name,
            resource_id=str(instance.pk),
            description=f'{action.title()} {model_name} object',
            ip_address='127.0.0.1',
            metadata={
                'model_fields': _get_model_fields(instance),
                'timestamp': timezone.now().isoformat()
            }
        )
    except Exception:
        pass


@receiver(post_delete)
def handle_model_delete(sender, instance, **kwargs):
    if not is_audit_logging_enabled():
        return

    if sender._meta.app_label == 'security':
        return

    if sender._meta.model_name in ['session', 'logentry']:
        return

    model_name = f"{sender._meta.app_label}.{sender._meta.model_name}"
    user = getattr(instance, 'user', None) or getattr(instance, 'created_by', None)

    try:
        AuditLog.objects.create(
            action='delete',
            user=user,
            resource_type=model_name,
            resource_id=str(instance.pk),
            description=f'Delete {model_name} object',
            ip_address='127.0.0.1',
            metadata={
                'deleted_object_data': _get_model_fields(instance),
                'timestamp': timezone.now().isoformat()
            }
        )
    except Exception:
        pass


@receiver(pre_save, sender=User)
def handle_user_changes(sender, instance, **kwargs):
    if not is_audit_logging_enabled():
        return

    if instance.pk:
        try:
            old_instance = User.objects.get(pk=instance.pk)
            sensitive_changes = []

            if old_instance.email != instance.email:
                sensitive_changes.append('email')
            if old_instance.is_staff != instance.is_staff:
                sensitive_changes.append('is_staff')
            if old_instance.is_superuser != instance.is_superuser:
                sensitive_changes.append('is_superuser')
            if old_instance.is_active != instance.is_active:
                sensitive_changes.append('is_active')

            if sensitive_changes:
                SecurityEvent.objects.create(
                    event_type='user_profile_change',
                    severity='medium',
                    description=f'Sensitive user fields changed: {", ".join(sensitive_changes)}',
                    user=instance,
                    ip_address='127.0.0.1',
                    metadata={
                        'changed_fields': sensitive_changes,
                        'old_values': {field: getattr(old_instance, field) for field in sensitive_changes},
                        'new_values': {field: getattr(instance, field) for field in sensitive_changes}
                    }
                )
        except User.DoesNotExist:
            pass


# Utility Functions
def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    return (x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')) or '127.0.0.1'


def _get_model_fields(instance):
    fields = {}
    for field in instance._meta.fields:
        try:
            value = getattr(instance, field.name)
            if hasattr(value, 'isoformat'):
                value = value.isoformat()
            elif hasattr(value, '__str__'):
                value = str(value)
            fields[field.name] = value
        except Exception:
            fields[field.name] = 'Unable to serialize'
    return fields


# Custom Signals
security_event_created = Signal()
threat_detected = Signal()
suspicious_activity_detected = Signal()

@receiver(security_event_created)
def handle_security_event_created(sender, event, **kwargs):
    if not is_audit_logging_enabled():
        return
    if event.severity == 'critical':
        pass  # Alerting logic here


@receiver(threat_detected)
def handle_threat_detected(sender, threat_data, **kwargs):
    if not is_audit_logging_enabled():
        return
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
    if not is_audit_logging_enabled():
        return
    SecurityEvent.objects.create(
        event_type='suspicious_activity',
        severity='medium',
        description=f"Suspicious activity detected: {activity_data.get('description', 'Unknown activity')}",
        user=activity_data.get('user'),
        ip_address=activity_data.get('ip_address', '127.0.0.1'),
        user_agent=activity_data.get('user_agent', ''),
        metadata=activity_data
    )
