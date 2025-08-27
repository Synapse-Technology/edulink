from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver, Signal
from django.core.cache import cache
from django.utils import timezone
from django.contrib.auth import get_user_model
import requests
import logging

from .models import (
    Institution, InstitutionDepartment, InstitutionProgram,
    InstitutionSettings, InstitutionInvitation
)

User = get_user_model()
logger = logging.getLogger(__name__)

# Custom signals
institution_verified = Signal()
institution_status_changed = Signal()
institution_settings_updated = Signal()


@receiver(pre_save, sender=Institution)
def institution_pre_save(sender, instance, **kwargs):
    """
    Store old status for comparison in post_save.
    """
    if instance.pk:
        try:
            old_instance = Institution.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
            instance._old_verified_status = old_instance.status == 'VERIFIED'
        except Institution.DoesNotExist:
            instance._old_status = None
            instance._old_verified_status = False
    else:
        instance._old_status = None
        instance._old_verified_status = False


@receiver(post_save, sender=Institution)
def institution_post_save(sender, instance, created, **kwargs):
    """
    Handle institution creation and updates.
    """
    # Clear cache
    cache.delete('institutions_stats')
    cache.delete(f'institution_{instance.id}')
    
    if created:
        # Send creation notification to admins
        try:
            requests.post(
                'http://notification-service:8000/api/notifications/send/',
                json={
                    'recipient_type': 'admin',
                    'notification_type': 'institution_created',
                    'title': 'New Institution Registered',
                    'message': f'Institution "{instance.name}" has been registered and requires verification.',
                    'data': {
                        'institution_id': instance.id,
                        'institution_name': instance.name,
                        'contact_email': instance.contact_email
                    }
                },
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to send institution creation notification: {e}")
        
        # Create default settings
        InstitutionSettings.objects.get_or_create(institution=instance)
        
        # Notify institution service
        try:
            requests.post(
                'http://institution-service:8000/api/institutions/created/',
                json={
                    'institution_id': instance.id,
                    'name': instance.name,
                    'type': instance.type,
                    'country': instance.country,
                    'status': instance.status
                },
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to notify institution service: {e}")
    
    else:
        # Check for status changes
        old_status = getattr(instance, '_old_status', None)
        if old_status and old_status != instance.status:
            # Send status change signal
            institution_status_changed.send(
                sender=sender,
                instance=instance,
                old_status=old_status,
                new_status=instance.status
            )
            
            # Handle verification status change
            if instance.status == 'VERIFIED' and old_status != 'VERIFIED':
                institution_verified.send(
                    sender=sender,
                    instance=instance
                )
            
            # Send status change notification
            try:
                requests.post(
                    'http://notification-service:8000/api/notifications/send/',
                    json={
                        'recipient_id': instance.contact_email,
                        'notification_type': f'institution_status_{instance.status.lower()}',
                        'title': f'Institution Status Updated',
                        'message': f'Your institution "{instance.name}" status has been changed to {instance.status}.',
                        'data': {
                            'institution_id': instance.id,
                            'old_status': old_status,
                            'new_status': instance.status
                        }
                    },
                    timeout=5
                )
            except Exception as e:
                logger.error(f"Failed to send status change notification: {e}")
        
        # Notify other services about updates
        try:
            requests.post(
                'http://institution-service:8000/api/institutions/updated/',
                json={
                    'institution_id': instance.id,
                    'name': instance.name,
                    'type': instance.type,
                    'country': instance.country,
                    'status': instance.status,
                    'changes': {
                        'status_changed': old_status != instance.status if old_status else False
                    }
                },
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to notify institution service about update: {e}")


@receiver(post_delete, sender=Institution)
def institution_post_delete(sender, instance, **kwargs):
    """
    Handle institution deletion.
    """
    # Clear cache
    cache.delete('institutions_stats')
    cache.delete(f'institution_{instance.id}')
    
    # Notify other services
    try:
        requests.post(
            'http://institution-service:8000/api/institutions/deleted/',
            json={'institution_id': instance.id},
            timeout=5
        )
    except Exception as e:
        logger.error(f"Failed to notify institution service about deletion: {e}")
    
    try:
        requests.post(
            'http://internship-service:8000/api/institutions/deleted/',
            json={'institution_id': instance.id},
            timeout=5
        )
    except Exception as e:
        logger.error(f"Failed to notify internship service about deletion: {e}")
    
    # Send deletion notification to admins
    try:
        requests.post(
            'http://notification-service:8000/api/notifications/send/',
            json={
                'recipient_type': 'admin',
                'notification_type': 'institution_deleted',
                'title': 'Institution Deleted',
                'message': f'Institution "{instance.name}" has been deleted from the system.',
                'data': {
                    'institution_name': instance.name,
                    'contact_email': instance.contact_email
                }
            },
            timeout=5
        )
    except Exception as e:
        logger.error(f"Failed to send institution deletion notification: {e}")


@receiver(post_save, sender=InstitutionDepartment)
def department_post_save(sender, instance, created, **kwargs):
    """
    Handle department creation and updates.
    """
    # Clear institution cache
    cache.delete(f'institution_{instance.institution.id}')
    cache.delete('institutions_stats')
    
    if created:
        # Notify institution service
        try:
            requests.post(
                'http://institution-service:8000/api/departments/created/',
                json={
                    'department_id': instance.id,
                    'institution_id': instance.institution.id,
                    'name': instance.name,
                    'code': instance.code
                },
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to notify institution service about department creation: {e}")


@receiver(post_delete, sender=InstitutionDepartment)
def department_post_delete(sender, instance, **kwargs):
    """
    Handle department deletion.
    """
    # Clear institution cache
    cache.delete(f'institution_{instance.institution.id}')
    cache.delete('institutions_stats')
    
    # Notify institution service
    try:
        requests.post(
            'http://institution-service:8000/api/departments/deleted/',
            json={
                'department_id': instance.id,
                'institution_id': instance.institution.id
            },
            timeout=5
        )
    except Exception as e:
        logger.error(f"Failed to notify institution service about department deletion: {e}")


@receiver(post_save, sender=InstitutionProgram)
def program_post_save(sender, instance, created, **kwargs):
    """
    Handle program creation and updates.
    """
    # Clear institution cache
    cache.delete(f'institution_{instance.institution.id}')
    cache.delete('institutions_stats')
    
    if created:
        # Notify institution service
        try:
            requests.post(
                'http://institution-service:8000/api/programs/created/',
                json={
                    'program_id': instance.id,
                    'institution_id': instance.institution.id,
                    'department_id': instance.department.id if instance.department else None,
                    'name': instance.name,
                    'code': instance.code,
                    'degree_type': instance.degree_type
                },
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to notify institution service about program creation: {e}")


@receiver(post_delete, sender=InstitutionProgram)
def program_post_delete(sender, instance, **kwargs):
    """
    Handle program deletion.
    """
    # Clear institution cache
    cache.delete(f'institution_{instance.institution.id}')
    cache.delete('institutions_stats')
    
    # Notify institution service
    try:
        requests.post(
            'http://institution-service:8000/api/programs/deleted/',
            json={
                'program_id': instance.id,
                'institution_id': instance.institution.id
            },
            timeout=5
        )
    except Exception as e:
        logger.error(f"Failed to notify institution service about program deletion: {e}")


@receiver(post_save, sender=InstitutionSettings)
def settings_post_save(sender, instance, created, **kwargs):
    """
    Handle institution settings updates.
    """
    # Clear cache
    cache.delete(f'institution_settings_{instance.institution.id}')
    cache.delete(f'institution_{instance.institution.id}')
    
    # Send settings update signal
    institution_settings_updated.send(
        sender=sender,
        instance=instance,
        created=created
    )
    
    # Notify internship service about settings changes
    try:
        requests.post(
            'http://internship-service:8000/api/institutions/settings-updated/',
            json={
                'institution_id': instance.institution.id,
                'settings': {
                    'min_internship_duration': instance.min_internship_duration,
                    'max_internship_duration': instance.max_internship_duration,
                    'allow_remote_internships': instance.allow_remote_internships,
                    'require_supervisor_approval': instance.require_supervisor_approval
                }
            },
            timeout=5
        )
    except Exception as e:
        logger.error(f"Failed to notify internship service about settings update: {e}")


@receiver(post_save, sender=InstitutionInvitation)
def invitation_post_save(sender, instance, created, **kwargs):
    """
    Handle invitation creation and updates.
    """
    if created:
        # Send invitation email
        try:
            requests.post(
                'http://notification-service:8000/api/notifications/send/',
                json={
                    'recipient_id': instance.contact_email,
                    'notification_type': 'institution_invitation',
                    'title': 'Institution Invitation to EduLink',
                    'message': f'You have been invited to register your institution "{instance.institution_name}" on EduLink.',
                    'data': {
                        'invitation_token': instance.token,
                        'institution_name': instance.institution_name,
                        'expires_at': instance.expires_at.isoformat(),
                        'invitation_url': f'/institutions/register/{instance.token}/',
                        'message': instance.message
                    }
                },
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to send institution invitation email: {e}")


# Custom signal handlers
@receiver(institution_verified)
def handle_institution_verified(sender, instance, **kwargs):
    """
    Handle institution verification.
    """
    # Send verification notification
    try:
        requests.post(
            'http://notification-service:8000/api/notifications/send/',
            json={
                'recipient_id': instance.contact_email,
                'notification_type': 'institution_verified',
                'title': 'Institution Verified Successfully',
                'message': f'Congratulations! Your institution "{instance.name}" has been verified and is now active on EduLink.',
                'data': {
                    'institution_id': instance.id,
                    'verified_at': instance.verified_at.isoformat() if instance.verified_at else None
                }
            },
            timeout=5
        )
    except Exception as e:
        logger.error(f"Failed to send verification notification: {e}")
    
    # Notify internship service about verified institution
    try:
        requests.post(
            'http://internship-service:8000/api/institutions/verified/',
            json={
                'institution_id': instance.id,
                'name': instance.name,
                'type': instance.type,
                'country': instance.country
            },
            timeout=5
        )
    except Exception as e:
        logger.error(f"Failed to notify internship service about verification: {e}")


@receiver(institution_status_changed)
def handle_institution_status_changed(sender, instance, old_status, new_status, **kwargs):
    """
    Handle institution status changes.
    """
    # Log status change
    logger.info(
        f"Institution {instance.id} ({instance.name}) status changed from {old_status} to {new_status}"
    )
    
    # Handle suspension
    if new_status == 'SUSPENDED':
        try:
            requests.post(
                'http://internship-service:8000/api/institutions/suspended/',
                json={'institution_id': instance.id},
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to notify internship service about suspension: {e}")
    
    # Handle reactivation
    elif new_status == 'ACTIVE' and old_status == 'SUSPENDED':
        try:
            requests.post(
                'http://internship-service:8000/api/institutions/reactivated/',
                json={'institution_id': instance.id},
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to notify internship service about reactivation: {e}")


@receiver(institution_settings_updated)
def handle_institution_settings_updated(sender, instance, created, **kwargs):
    """
    Handle institution settings updates.
    """
    if not created:
        # Send settings update notification to institution admins
        try:
            requests.post(
                'http://notification-service:8000/api/notifications/send/',
                json={
                    'recipient_type': 'institution_admin',
                    'recipient_filter': {'institution_id': instance.institution.id},
                    'notification_type': 'institution_settings_updated',
                    'title': 'Institution Settings Updated',
                    'message': f'Settings for "{instance.institution.name}" have been updated.',
                    'data': {
                        'institution_id': instance.institution.id,
                        'updated_at': timezone.now().isoformat()
                    }
                },
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to send settings update notification: {e}")


# Periodic tasks (would be called by Celery or similar)
def check_expired_invitations():
    """
    Check for expired invitations and clean them up.
    """
    from datetime import timedelta
    
    # Delete invitations expired for more than 30 days
    cutoff_date = timezone.now() - timedelta(days=30)
    expired_invitations = InstitutionInvitation.objects.filter(
        expires_at__lt=cutoff_date,
        is_used=False
    )
    
    count = expired_invitations.count()
    expired_invitations.delete()
    
    if count > 0:
        logger.info(f"Cleaned up {count} expired institution invitations")


def check_pending_institutions():
    """
    Check for institutions pending verification for too long.
    """
    from datetime import timedelta
    
    # Find institutions pending for more than 7 days
    cutoff_date = timezone.now() - timedelta(days=7)
    pending_institutions = Institution.objects.filter(
        status='PENDING',
        created_at__lt=cutoff_date
    )
    
    for institution in pending_institutions:
        try:
            requests.post(
                'http://notification-service:8000/api/notifications/send/',
                json={
                    'recipient_type': 'admin',
                    'notification_type': 'institution_pending_reminder',
                    'title': 'Institution Pending Verification',
                    'message': f'Institution "{institution.name}" has been pending verification for more than 7 days.',
                    'data': {
                        'institution_id': institution.id,
                        'institution_name': institution.name,
                        'pending_since': institution.created_at.isoformat()
                    }
                },
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to send pending institution reminder: {e}")