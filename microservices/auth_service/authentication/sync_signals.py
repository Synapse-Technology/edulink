"""Django signals for auth service data synchronization."""

import sys
import os
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import AuthUser, User

# Add shared modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

try:
    from events.sync_events import SyncEventPublisher
    # Initialize event publisher
    event_publisher = SyncEventPublisher("auth_service")
except ImportError:
    # Fallback when shared events module is not available
    event_publisher = None


@receiver(post_save, sender=AuthUser)
def auth_user_created_or_updated(sender, instance, created, **kwargs):
    """Handle AuthUser creation and updates."""
    try:
        user_data = {
            'id': str(instance.id),
            'email': instance.email,
            'is_active': instance.is_active,
            'is_staff': instance.is_staff,
            'date_joined': instance.date_joined.isoformat(),
            'is_email_verified': instance.is_email_verified,
            'email_verified_at': instance.email_verified_at.isoformat() if instance.email_verified_at else None,
            'role': instance.role,
            'two_factor_enabled': instance.two_factor_enabled,
            'user_profile_id': str(instance.user_profile_id) if instance.user_profile_id else None,
            'created_at': instance.created_at.isoformat(),
            'updated_at': instance.updated_at.isoformat(),
        }
        
        if event_publisher:
            if created:
                event_publisher.publish_user_created(user_data)
            else:
                event_publisher.publish_user_updated(user_data)
            
    except Exception as e:
        print(f"Error publishing auth user sync event: {str(e)}")


@receiver(pre_save, sender=AuthUser)
def auth_user_email_verification_check(sender, instance, **kwargs):
    """Check for email verification changes."""
    if instance.pk:
        try:
            old_instance = AuthUser.objects.get(pk=instance.pk)
            
            # Check if email verification status changed
            if not old_instance.is_email_verified and instance.is_email_verified:
                # Email was just verified
                instance.email_verified_at = timezone.now()
                
                # This will be handled in post_save, but we can also send a specific event
                if event_publisher:
                    try:
                        event_publisher.publish_user_email_verified(
                            user_id=str(instance.id),
                            email=instance.email,
                            verified_at=instance.email_verified_at
                        )
                    except Exception as e:
                        print(f"Error publishing email verification event: {str(e)}")
            
            # Check if role changed
            if old_instance.role != instance.role:
                if event_publisher:
                    try:
                        event_publisher.publish_user_role_changed(
                            user_id=str(instance.id),
                            old_role=old_instance.role,
                            new_role=instance.role
                        )
                    except Exception as e:
                        print(f"Error publishing role change event: {str(e)}")
                    
        except AuthUser.DoesNotExist:
            # This is a new instance, will be handled by post_save
            pass
        except Exception as e:
            print(f"Error in pre_save signal: {str(e)}")


@receiver(post_delete, sender=AuthUser)
def auth_user_deleted(sender, instance, **kwargs):
    """Handle AuthUser deletion."""
    try:
        from events.sync_events import SyncEvent, EventType
        import uuid
        from datetime import datetime
        
        event = SyncEvent(
            event_id=str(uuid.uuid4()),
            event_type=EventType.USER_DELETED,
            source_service="auth_service",
            target_service="user_service",
            timestamp=datetime.utcnow(),
            data={
                'id': str(instance.id),
                'email': instance.email,
                'user_profile_id': str(instance.user_profile_id) if instance.user_profile_id else None,
            },
            correlation_id=str(instance.id)
        )
        
        if event_publisher:
            event_publisher._publish_event(event)
        
    except Exception as e:
        print(f"Error publishing auth user deletion event: {str(e)}")


# Legacy User model signals (for backward compatibility during migration)
@receiver(post_save, sender=User)
def legacy_user_sync(sender, instance, created, **kwargs):
    """Handle legacy User model sync during migration period."""
    try:
        # Convert legacy user to AuthUser format
        user_data = {
            'id': str(instance.id),
            'email': instance.email,
            'is_active': instance.is_active,
            'is_staff': instance.is_staff,
            'date_joined': instance.date_joined.isoformat(),
            'is_email_verified': instance.email_verified,
            'role': instance.role,
            'two_factor_enabled': instance.two_factor_enabled,
            'profile_service_id': str(instance.profile_service_id) if instance.profile_service_id else None,
            # Legacy fields that will be moved to user service
            'phone_number': instance.phone_number,
            'national_id': instance.national_id,
        }
        
        if event_publisher:
            if created:
                event_publisher.publish_user_created(user_data)
            else:
                event_publisher.publish_user_updated(user_data)
            
    except Exception as e:
        print(f"Error publishing legacy user sync event: {str(e)}")


def setup_auth_sync_signals():
    """Setup function to initialize auth service synchronization signals."""
    print("Auth service synchronization signals initialized")
    
    # You can add any additional setup logic here
    # For example, checking Redis connection, validating configuration, etc.
    
    return True