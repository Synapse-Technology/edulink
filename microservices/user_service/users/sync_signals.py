"""Django signals for user service data synchronization."""

import sys
import os
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import UserProfile, User
from institutions.models import Institution, InstitutionMembership

# Add shared modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))
from events.sync_events import SyncEventPublisher


# Initialize event publisher
event_publisher = SyncEventPublisher("user_service")


@receiver(post_save, sender=UserProfile)
def user_profile_created_or_updated(sender, instance, created, **kwargs):
    """Handle UserProfile creation and updates."""
    try:
        profile_data = {
            'id': str(instance.id),
            'auth_user_id': str(instance.auth_user_id),
            'username': instance.username,
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'phone_number': instance.phone_number,
            'avatar': instance.avatar.url if instance.avatar else None,
            'bio': instance.bio,
            'date_of_birth': instance.date_of_birth.isoformat() if instance.date_of_birth else None,
            'gender': instance.gender,
            'address': instance.address,
            'city': instance.city,
            'country': instance.country,
            'postal_code': instance.postal_code,
            'language_preference': instance.language_preference,
            'timezone': instance.timezone,
            'profile_visibility': instance.profile_visibility,
            'email_notifications': instance.email_notifications,
            'sms_notifications': instance.sms_notifications,
            'push_notifications': instance.push_notifications,
            'two_factor_enabled': instance.two_factor_enabled,
            'created_at': instance.created_at.isoformat(),
            'updated_at': instance.updated_at.isoformat(),
        }
        
        if created:
            event_publisher.publish_profile_created(profile_data)
        else:
            event_publisher.publish_profile_updated(profile_data)
            
    except Exception as e:
        print(f"Error publishing user profile sync event: {str(e)}")


@receiver(pre_save, sender=UserProfile)
def user_profile_change_detection(sender, instance, **kwargs):
    """Detect specific changes in UserProfile for targeted events."""
    if instance.pk:
        try:
            old_instance = UserProfile.objects.get(pk=instance.pk)
            
            # Check for significant changes that other services might care about
            changes = {}
            
            # Check username change
            if old_instance.username != instance.username:
                changes['username'] = {
                    'old': old_instance.username,
                    'new': instance.username
                }
            
            # Check contact information changes
            if old_instance.phone_number != instance.phone_number:
                changes['phone_number'] = {
                    'old': old_instance.phone_number,
                    'new': instance.phone_number
                }
            
            # Check notification preferences
            notification_fields = ['email_notifications', 'sms_notifications', 'push_notifications']
            for field in notification_fields:
                old_value = getattr(old_instance, field)
                new_value = getattr(instance, field)
                if old_value != new_value:
                    changes[field] = {
                        'old': old_value,
                        'new': new_value
                    }
            
            # If there are significant changes, we can publish specific events
            if changes:
                # Store changes in instance for post_save to use
                instance._profile_changes = changes
                
        except UserProfile.DoesNotExist:
            # This is a new instance, will be handled by post_save
            pass
        except Exception as e:
            print(f"Error in user profile pre_save signal: {str(e)}")


@receiver(post_delete, sender=UserProfile)
def user_profile_deleted(sender, instance, **kwargs):
    """Handle UserProfile deletion."""
    try:
        from events.sync_events import SyncEvent, EventType
        import uuid
        from datetime import datetime
        
        event = SyncEvent(
            event_id=str(uuid.uuid4()),
            event_type=EventType.PROFILE_DELETED,
            source_service="user_service",
            target_service="auth_service",
            timestamp=datetime.utcnow(),
            data={
                'id': str(instance.id),
                'auth_user_id': str(instance.auth_user_id),
                'username': instance.username,
            },
            correlation_id=str(instance.auth_user_id)
        )
        
        event_publisher._publish_event(event)
        
    except Exception as e:
        print(f"Error publishing user profile deletion event: {str(e)}")


@receiver(post_save, sender=Institution)
def institution_created_or_updated(sender, instance, created, **kwargs):
    """Handle Institution creation and updates."""
    try:
        institution_data = {
            'id': str(instance.id),
            'name': instance.name,
            'type': instance.type,
            'description': instance.description,
            'email': instance.email,
            'phone': instance.phone,
            'website': instance.website,
            'address': instance.address,
            'city': instance.city,
            'state': instance.state,
            'country': instance.country,
            'postal_code': instance.postal_code,
            'registration_number': instance.registration_number,
            'accreditation_status': instance.accreditation_status,
            'status': instance.status,
            'logo': instance.logo.url if instance.logo else None,
            'banner_image': instance.banner_image.url if instance.banner_image else None,
            'established_year': instance.established_year,
            'student_count': instance.student_count,
            'faculty_count': instance.faculty_count,
            'created_at': instance.created_at.isoformat(),
            'updated_at': instance.updated_at.isoformat(),
        }
        
        from events.sync_events import SyncEvent, EventType
        import uuid
        from datetime import datetime
        
        event_type = EventType.INSTITUTION_CREATED if created else EventType.INSTITUTION_UPDATED
        
        event = SyncEvent(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            source_service="user_service",
            target_service="all",  # All services might need institution data
            timestamp=datetime.utcnow(),
            data=institution_data,
            correlation_id=str(instance.id)
        )
        
        event_publisher._publish_event(event)
        
    except Exception as e:
        print(f"Error publishing institution sync event: {str(e)}")


@receiver(post_save, sender=InstitutionMembership)
def institution_membership_created_or_updated(sender, instance, created, **kwargs):
    """Handle InstitutionMembership creation and updates."""
    try:
        membership_data = {
            'id': str(instance.id),
            'user_profile_id': str(instance.user_profile_id),
            'institution_id': str(instance.institution.id),
            'role': instance.role,
            'status': instance.status,
            'joined_at': instance.joined_at.isoformat(),
            'left_at': instance.left_at.isoformat() if instance.left_at else None,
            'student_id': instance.student_id,
            'department': instance.department,
            'year_of_study': instance.year_of_study,
            'created_at': instance.created_at.isoformat(),
            'updated_at': instance.updated_at.isoformat(),
        }
        
        from events.sync_events import SyncEvent, EventType
        import uuid
        from datetime import datetime
        
        event_type = EventType.MEMBERSHIP_CREATED if created else EventType.MEMBERSHIP_UPDATED
        
        event = SyncEvent(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            source_service="user_service",
            target_service="all",  # All services might need membership data
            timestamp=datetime.utcnow(),
            data=membership_data,
            correlation_id=str(instance.user_profile_id)
        )
        
        event_publisher._publish_event(event)
        
    except Exception as e:
        print(f"Error publishing institution membership sync event: {str(e)}")


# Legacy User model signals (for backward compatibility during migration)
@receiver(post_save, sender=User)
def legacy_user_profile_sync(sender, instance, created, **kwargs):
    """Handle legacy User model sync during migration period."""
    try:
        # Convert legacy user to UserProfile format
        profile_data = {
            'id': str(instance.id),
            'email': instance.email,
            'username': instance.username,
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'phone_number': instance.phone_number,
            'is_active': instance.is_active,
            'is_staff': instance.is_staff,
            'is_verified': instance.is_verified,
            'date_joined': instance.date_joined.isoformat(),
            'last_login': instance.last_login.isoformat() if instance.last_login else None,
            'avatar': instance.avatar.url if instance.avatar else None,
            'bio': instance.bio,
            # Additional legacy fields
            'date_of_birth': instance.date_of_birth.isoformat() if instance.date_of_birth else None,
            'gender': instance.gender,
            'address': instance.address,
            'city': instance.city,
            'country': instance.country,
        }
        
        if created:
            event_publisher.publish_profile_created(profile_data)
        else:
            event_publisher.publish_profile_updated(profile_data)
            
    except Exception as e:
        print(f"Error publishing legacy user profile sync event: {str(e)}")


def setup_user_sync_signals():
    """Setup function to initialize user service synchronization signals."""
    print("User service synchronization signals initialized")
    
    # You can add any additional setup logic here
    # For example, checking Redis connection, validating configuration, etc.
    
    return True