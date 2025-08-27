from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver, Signal
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import logging

from .models import UserRole, RoleAssignmentHistory, RoleInvitation, RoleChoices
from user_service.utils import ServiceClient

logger = logging.getLogger(__name__)

# Custom signals
role_assigned = Signal()
role_revoked = Signal()
role_updated = Signal()


@receiver(post_save, sender=UserRole)
def handle_user_role_created(sender, instance, created, **kwargs):
    """Handle user role creation and updates."""
    try:
        # Clear role-related cache
        cache_keys = [
            'user_role_stats',
            f'user_roles_{instance.user_id}',
            f'user_permissions_{instance.user_id}'
        ]
        cache.delete_many(cache_keys)
        
        if created:
            # Send role assignment notification
            try:
                service_client = ServiceClient()
                service_client.post(
                    'notification',
                    '/api/notifications/send-role-assignment/',
                    {
                        'user_id': instance.user_id,
                        'role': instance.role,
                        'institution_id': instance.institution_id,
                        'employer_id': instance.employer_id,
                        'assigned_by': instance.assigned_by_user_id,
                        'expires_at': instance.expires_at.isoformat() if instance.expires_at else None
                    }
                )
                logger.info(f"Role assignment notification sent for user {instance.user_id}")
            except Exception as e:
                logger.error(f"Failed to send role assignment notification: {e}")
            
            # Sync with other services based on role
            if instance.role == RoleChoices.STUDENT and instance.institution_id:
                try:
                    service_client = ServiceClient()
                    service_client.post(
                        'institution',
                        '/api/institutions/sync-student-role/',
                        {
                            'user_id': instance.user_id,
                            'institution_id': instance.institution_id,
                            'role_id': instance.id
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to sync student role with institution service: {e}")
            
            elif instance.role == RoleChoices.EMPLOYER and instance.employer_id:
                try:
                    service_client = ServiceClient()
                    service_client.post(
                        'internship',
                        '/api/internships/sync-employer-role/',
                        {
                            'user_id': instance.user_id,
                            'employer_id': instance.employer_id,
                            'role_id': instance.id
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to sync employer role with internship service: {e}")
            
            elif instance.role == RoleChoices.INSTITUTION_ADMIN and instance.institution_id:
                try:
                    service_client = ServiceClient()
                    service_client.post(
                        'institution',
                        '/api/institutions/sync-admin-role/',
                        {
                            'user_id': instance.user_id,
                            'institution_id': instance.institution_id,
                            'role_id': instance.id
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to sync admin role with institution service: {e}")
            
            # Emit custom signal
            role_assigned.send(
                sender=sender,
                user_role=instance,
                user_id=instance.user_id,
                role=instance.role
            )
        
        else:
            # Handle role updates
            role_updated.send(
                sender=sender,
                user_role=instance,
                user_id=instance.user_id,
                role=instance.role
            )
    
    except Exception as e:
        logger.error(f"Error in user role post_save signal: {e}")


@receiver(post_delete, sender=UserRole)
def handle_user_role_deleted(sender, instance, **kwargs):
    """Handle user role deletion."""
    try:
        # Clear role-related cache
        cache_keys = [
            'user_role_stats',
            f'user_roles_{instance.user_id}',
            f'user_permissions_{instance.user_id}'
        ]
        cache.delete_many(cache_keys)
        
        # Notify other services about role removal
        if instance.role == RoleChoices.STUDENT and instance.institution_id:
            try:
                service_client = ServiceClient()
                service_client.delete(
                    'institution',
                    f'/api/institutions/sync-student-role/{instance.user_id}/'
                )
            except Exception as e:
                logger.error(f"Failed to sync student role removal with institution service: {e}")
        
        elif instance.role == RoleChoices.EMPLOYER and instance.employer_id:
            try:
                service_client = ServiceClient()
                service_client.delete(
                    'internship',
                    f'/api/internships/sync-employer-role/{instance.user_id}/'
                )
            except Exception as e:
                logger.error(f"Failed to sync employer role removal with internship service: {e}")
        
        elif instance.role == RoleChoices.INSTITUTION_ADMIN and instance.institution_id:
            try:
                service_client = ServiceClient()
                service_client.delete(
                    'institution',
                    f'/api/institutions/sync-admin-role/{instance.user_id}/'
                )
            except Exception as e:
                logger.error(f"Failed to sync admin role removal with institution service: {e}")
        
        # Send role revocation notification
        try:
            service_client = ServiceClient()
            service_client.post(
                'notification',
                '/api/notifications/send-role-revocation/',
                {
                    'user_id': instance.user_id,
                    'role': instance.role,
                    'institution_id': instance.institution_id,
                    'employer_id': instance.employer_id
                }
            )
            logger.info(f"Role revocation notification sent for user {instance.user_id}")
        except Exception as e:
            logger.error(f"Failed to send role revocation notification: {e}")
        
        # Emit custom signal
        role_revoked.send(
            sender=sender,
            user_id=instance.user_id,
            role=instance.role,
            institution_id=instance.institution_id,
            employer_id=instance.employer_id
        )
    
    except Exception as e:
        logger.error(f"Error in user role post_delete signal: {e}")


@receiver(post_save, sender=RoleInvitation)
def handle_role_invitation_created(sender, instance, created, **kwargs):
    """Handle role invitation creation."""
    if created:
        try:
            # Send invitation email
            service_client = ServiceClient()
            service_client.post(
                'notification',
                '/api/notifications/send-role-invitation/',
                {
                    'email': instance.email,
                    'role': instance.role,
                    'invitation_token': str(instance.token),
                    'expires_at': instance.expires_at.isoformat(),
                    'invited_by': instance.invited_by_user_id,
                    'institution_id': instance.institution_id,
                    'employer_id': instance.employer_id,
                    'metadata': instance.metadata
                }
            )
            logger.info(f"Role invitation email sent to {instance.email}")
        except Exception as e:
            logger.error(f"Failed to send role invitation email: {e}")


@receiver(role_assigned)
def handle_role_assigned(sender, user_role, user_id, role, **kwargs):
    """Handle role assignment events."""
    try:
        # Log role assignment
        logger.info(f"Role {role} assigned to user {user_id}")
        
        # Send welcome message for new roles
        if role == RoleChoices.STUDENT:
            try:
                service_client = ServiceClient()
                service_client.post(
                    'notification',
                    '/api/notifications/send-welcome-student/',
                    {
                        'user_id': user_id,
                        'institution_id': user_role.institution_id
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send student welcome notification: {e}")
        
        elif role == RoleChoices.EMPLOYER:
            try:
                service_client = ServiceClient()
                service_client.post(
                    'notification',
                    '/api/notifications/send-welcome-employer/',
                    {
                        'user_id': user_id,
                        'employer_id': user_role.employer_id
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send employer welcome notification: {e}")
        
        elif role == RoleChoices.INSTITUTION_ADMIN:
            try:
                service_client = ServiceClient()
                service_client.post(
                    'notification',
                    '/api/notifications/send-welcome-admin/',
                    {
                        'user_id': user_id,
                        'institution_id': user_role.institution_id
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send admin welcome notification: {e}")
    
    except Exception as e:
        logger.error(f"Error handling role assignment: {e}")


@receiver(role_revoked)
def handle_role_revoked(sender, user_id, role, institution_id, employer_id, **kwargs):
    """Handle role revocation events."""
    try:
        # Log role revocation
        logger.info(f"Role {role} revoked from user {user_id}")
        
        # Handle role-specific cleanup
        if role == RoleChoices.STUDENT:
            # Notify about student access removal
            try:
                service_client = ServiceClient()
                service_client.post(
                    'internship',
                    '/api/internships/handle-student-role-removal/',
                    {
                        'user_id': user_id,
                        'institution_id': institution_id
                    }
                )
            except Exception as e:
                logger.error(f"Failed to handle student role removal in internship service: {e}")
        
        elif role == RoleChoices.EMPLOYER:
            # Handle employer access removal
            try:
                service_client = ServiceClient()
                service_client.post(
                    'internship',
                    '/api/internships/handle-employer-role-removal/',
                    {
                        'user_id': user_id,
                        'employer_id': employer_id
                    }
                )
            except Exception as e:
                logger.error(f"Failed to handle employer role removal in internship service: {e}")
    
    except Exception as e:
        logger.error(f"Error handling role revocation: {e}")


@receiver(role_updated)
def handle_role_updated(sender, user_role, user_id, role, **kwargs):
    """Handle role update events."""
    try:
        # Log role update
        logger.info(f"Role {role} updated for user {user_id}")
        
        # Clear user-specific cache
        cache_keys = [
            f'user_roles_{user_id}',
            f'user_permissions_{user_id}'
        ]
        cache.delete_many(cache_keys)
        
        # Sync role updates with other services
        if role == RoleChoices.STUDENT and user_role.institution_id:
            try:
                service_client = ServiceClient()
                service_client.put(
                    'institution',
                    f'/api/institutions/sync-student-role/{user_id}/',
                    {
                        'institution_id': user_role.institution_id,
                        'role_id': user_role.id,
                        'is_active': user_role.is_active,
                        'permissions': user_role.permissions
                    }
                )
            except Exception as e:
                logger.error(f"Failed to sync student role update with institution service: {e}")
        
        elif role == RoleChoices.EMPLOYER and user_role.employer_id:
            try:
                service_client = ServiceClient()
                service_client.put(
                    'internship',
                    f'/api/internships/sync-employer-role/{user_id}/',
                    {
                        'employer_id': user_role.employer_id,
                        'role_id': user_role.id,
                        'is_active': user_role.is_active,
                        'permissions': user_role.permissions
                    }
                )
            except Exception as e:
                logger.error(f"Failed to sync employer role update with internship service: {e}")
    
    except Exception as e:
        logger.error(f"Error handling role update: {e}")


# Periodic task to check for expired roles
def check_expired_roles():
    """Check and handle expired roles."""
    try:
        expired_roles = UserRole.objects.filter(
            is_active=True,
            expires_at__lte=timezone.now()
        )
        
        for role in expired_roles:
            # Deactivate expired role
            role.is_active = False
            role.save()
            
            # Create history record
            RoleAssignmentHistory.objects.create(
                user_id=role.user_id,
                role=role.role,
                action='expired',
                institution_id=role.institution_id,
                employer_id=role.employer_id,
                reason='Role expired automatically',
                previous_data={
                    'is_active': True,
                    'expires_at': role.expires_at.isoformat()
                },
                new_data={
                    'is_active': False,
                    'expires_at': role.expires_at.isoformat()
                }
            )
            
            # Send expiration notification
            try:
                service_client = ServiceClient()
                service_client.post(
                    'notification',
                    '/api/notifications/send-role-expiration/',
                    {
                        'user_id': role.user_id,
                        'role': role.role,
                        'expired_at': role.expires_at.isoformat()
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send role expiration notification: {e}")
            
            logger.info(f"Role {role.role} expired for user {role.user_id}")
    
    except Exception as e:
        logger.error(f"Error checking expired roles: {e}")


# Periodic task to check for expiring roles (7 days before expiration)
def check_expiring_roles():
    """Check and notify about roles expiring soon."""
    try:
        expiring_soon = timezone.now() + timedelta(days=7)
        expiring_roles = UserRole.objects.filter(
            is_active=True,
            expires_at__lte=expiring_soon,
            expires_at__gt=timezone.now()
        )
        
        for role in expiring_roles:
            # Check if we already sent a warning (to avoid spam)
            recent_warning = RoleAssignmentHistory.objects.filter(
                user_id=role.user_id,
                role=role.role,
                action='expiring_warning',
                created_at__gte=timezone.now() - timedelta(days=1)
            ).exists()
            
            if not recent_warning:
                # Send expiration warning
                try:
                    service_client = ServiceClient()
                    service_client.post(
                        'notification',
                        '/api/notifications/send-role-expiring-warning/',
                        {
                            'user_id': role.user_id,
                            'role': role.role,
                            'expires_at': role.expires_at.isoformat(),
                            'days_remaining': (role.expires_at - timezone.now()).days
                        }
                    )
                    
                    # Create history record
                    RoleAssignmentHistory.objects.create(
                        user_id=role.user_id,
                        role=role.role,
                        action='expiring_warning',
                        institution_id=role.institution_id,
                        employer_id=role.employer_id,
                        reason='Expiration warning sent',
                        new_data={
                            'expires_at': role.expires_at.isoformat(),
                            'warning_sent_at': timezone.now().isoformat()
                        }
                    )
                    
                    logger.info(f"Expiration warning sent for role {role.role} of user {role.user_id}")
                
                except Exception as e:
                    logger.error(f"Failed to send role expiration warning: {e}")
    
    except Exception as e:
        logger.error(f"Error checking expiring roles: {e}")