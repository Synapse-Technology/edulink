"""Event handlers for processing synchronization events across microservices."""

import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import asdict
from .sync_events import SyncEvent, EventType, SyncEventHandler, ConflictResolver


logger = logging.getLogger(__name__)


class AuthServiceEventHandler(SyncEventHandler):
    """Event handler for Auth Service."""
    
    def __init__(self):
        super().__init__("auth_service")
        self.conflict_resolver = ConflictResolver()
    
    def handle_profile_updated(self, event: SyncEvent) -> bool:
        """Handle profile update events from user service."""
        try:
            from authentication.models import AuthUser
            
            profile_data = event.data
            auth_user_id = profile_data.get('auth_user_id')
            
            if not auth_user_id:
                logger.error(f"No auth_user_id in profile update event: {event.event_id}")
                return False
            
            try:
                auth_user = AuthUser.objects.get(id=auth_user_id)
                
                # Update fields that are synchronized from profile
                updated = False
                
                # Update phone number if provided
                if 'phone_number' in profile_data and profile_data['phone_number'] != auth_user.phone_number:
                    auth_user.phone_number = profile_data['phone_number']
                    updated = True
                
                # Update two-factor status if changed in profile
                if 'two_factor_enabled' in profile_data:
                    profile_2fa = profile_data['two_factor_enabled']
                    if profile_2fa != auth_user.two_factor_enabled:
                        auth_user.two_factor_enabled = profile_2fa
                        updated = True
                
                if updated:
                    auth_user.save()
                    logger.info(f"Updated AuthUser {auth_user_id} from profile event")
                
                return True
                
            except AuthUser.DoesNotExist:
                logger.warning(f"AuthUser {auth_user_id} not found for profile update")
                return False
                
        except Exception as e:
            logger.error(f"Error handling profile update event: {str(e)}")
            return False
    
    def handle_profile_deleted(self, event: SyncEvent) -> bool:
        """Handle profile deletion events from user service."""
        try:
            from authentication.models import AuthUser
            
            profile_data = event.data
            auth_user_id = profile_data.get('auth_user_id')
            
            if not auth_user_id:
                logger.error(f"No auth_user_id in profile deletion event: {event.event_id}")
                return False
            
            try:
                auth_user = AuthUser.objects.get(id=auth_user_id)
                
                # Clear the user_profile_id reference
                auth_user.user_profile_id = None
                auth_user.save()
                
                logger.info(f"Cleared profile reference for AuthUser {auth_user_id}")
                return True
                
            except AuthUser.DoesNotExist:
                logger.warning(f"AuthUser {auth_user_id} not found for profile deletion")
                return True  # Already doesn't exist, so deletion is "successful"
                
        except Exception as e:
            logger.error(f"Error handling profile deletion event: {str(e)}")
            return False


class UserServiceEventHandler(SyncEventHandler):
    """Event handler for User Service."""
    
    def __init__(self):
        super().__init__("user_service")
        self.conflict_resolver = ConflictResolver()
    
    def handle_user_created(self, event: SyncEvent) -> bool:
        """Handle user creation events from auth service."""
        try:
            from users.models import UserProfile
            
            user_data = event.data
            auth_user_id = user_data.get('id')
            
            if not auth_user_id:
                logger.error(f"No user id in user creation event: {event.event_id}")
                return False
            
            # Check if profile already exists
            if UserProfile.objects.filter(auth_user_id=auth_user_id).exists():
                logger.info(f"UserProfile for auth_user_id {auth_user_id} already exists")
                return True
            
            # Create new user profile
            profile = UserProfile(
                auth_user_id=auth_user_id,
                email=user_data.get('email', ''),
                username=user_data.get('email', '').split('@')[0],  # Default username from email
                is_active=user_data.get('is_active', True),
                is_verified=user_data.get('is_email_verified', False),
                role=user_data.get('role', 'student'),
                phone_number=user_data.get('phone_number', ''),
                two_factor_enabled=user_data.get('two_factor_enabled', False),
            )
            
            profile.save()
            
            # Update the auth user with the profile reference
            self._update_auth_user_profile_reference(auth_user_id, str(profile.id))
            
            logger.info(f"Created UserProfile {profile.id} for auth_user_id {auth_user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error handling user creation event: {str(e)}")
            return False
    
    def handle_user_updated(self, event: SyncEvent) -> bool:
        """Handle user update events from auth service."""
        try:
            from users.models import UserProfile
            
            user_data = event.data
            auth_user_id = user_data.get('id')
            
            if not auth_user_id:
                logger.error(f"No user id in user update event: {event.event_id}")
                return False
            
            try:
                profile = UserProfile.objects.get(auth_user_id=auth_user_id)
                
                # Update synchronized fields
                updated = False
                
                sync_fields = {
                    'email': 'email',
                    'is_active': 'is_active',
                    'is_email_verified': 'is_verified',
                    'role': 'role',
                    'phone_number': 'phone_number',
                    'two_factor_enabled': 'two_factor_enabled',
                }
                
                for auth_field, profile_field in sync_fields.items():
                    if auth_field in user_data:
                        new_value = user_data[auth_field]
                        current_value = getattr(profile, profile_field)
                        
                        if new_value != current_value:
                            setattr(profile, profile_field, new_value)
                            updated = True
                
                if updated:
                    profile.save()
                    logger.info(f"Updated UserProfile {profile.id} from auth event")
                
                return True
                
            except UserProfile.DoesNotExist:
                logger.warning(f"UserProfile for auth_user_id {auth_user_id} not found, creating new one")
                return self.handle_user_created(event)
                
        except Exception as e:
            logger.error(f"Error handling user update event: {str(e)}")
            return False
    
    def handle_user_email_verified(self, event: SyncEvent) -> bool:
        """Handle email verification events from auth service."""
        try:
            from users.models import UserProfile
            
            user_id = event.data.get('user_id')
            verified_at = event.data.get('verified_at')
            
            if not user_id:
                logger.error(f"No user_id in email verification event: {event.event_id}")
                return False
            
            try:
                profile = UserProfile.objects.get(auth_user_id=user_id)
                profile.is_verified = True
                profile.email_verified_at = datetime.fromisoformat(verified_at.replace('Z', '+00:00')) if verified_at else None
                profile.save()
                
                logger.info(f"Updated email verification for UserProfile {profile.id}")
                return True
                
            except UserProfile.DoesNotExist:
                logger.warning(f"UserProfile for auth_user_id {user_id} not found for email verification")
                return False
                
        except Exception as e:
            logger.error(f"Error handling email verification event: {str(e)}")
            return False
    
    def handle_user_role_changed(self, event: SyncEvent) -> bool:
        """Handle role change events from auth service."""
        try:
            from users.models import UserProfile
            
            user_id = event.data.get('user_id')
            new_role = event.data.get('new_role')
            
            if not user_id or not new_role:
                logger.error(f"Missing user_id or new_role in role change event: {event.event_id}")
                return False
            
            try:
                profile = UserProfile.objects.get(auth_user_id=user_id)
                profile.role = new_role
                profile.save()
                
                logger.info(f"Updated role to {new_role} for UserProfile {profile.id}")
                return True
                
            except UserProfile.DoesNotExist:
                logger.warning(f"UserProfile for auth_user_id {user_id} not found for role change")
                return False
                
        except Exception as e:
            logger.error(f"Error handling role change event: {str(e)}")
            return False
    
    def handle_user_deleted(self, event: SyncEvent) -> bool:
        """Handle user deletion events from auth service."""
        try:
            from users.models import UserProfile
            
            user_id = event.data.get('id')
            
            if not user_id:
                logger.error(f"No user id in user deletion event: {event.event_id}")
                return False
            
            try:
                profile = UserProfile.objects.get(auth_user_id=user_id)
                profile.delete()
                
                logger.info(f"Deleted UserProfile for auth_user_id {user_id}")
                return True
                
            except UserProfile.DoesNotExist:
                logger.info(f"UserProfile for auth_user_id {user_id} already doesn't exist")
                return True  # Already deleted, so deletion is "successful"
                
        except Exception as e:
            logger.error(f"Error handling user deletion event: {str(e)}")
            return False
    
    def _update_auth_user_profile_reference(self, auth_user_id: str, profile_id: str):
        """Update the auth user with the profile reference."""
        try:
            # This would typically be done via an API call or event to auth service
            # For now, we'll just log it
            logger.info(f"Should update AuthUser {auth_user_id} with profile_id {profile_id}")
            
            # In a real implementation, you might:
            # 1. Make an API call to auth service
            # 2. Publish an event back to auth service
            # 3. Use a shared database connection (if services share a database)
            
        except Exception as e:
            logger.error(f"Error updating auth user profile reference: {str(e)}")


class ApplicationServiceEventHandler(SyncEventHandler):
    """Event handler for Application Service."""
    
    def __init__(self):
        super().__init__("application_service")
        self.conflict_resolver = ConflictResolver()
    
    def handle_user_created(self, event: SyncEvent) -> bool:
        """Handle user creation events - might need to update application references."""
        # Application service might need to know about new users
        # for application tracking purposes
        logger.info(f"New user created: {event.data.get('id')}")
        return True
    
    def handle_institution_updated(self, event: SyncEvent) -> bool:
        """Handle institution update events."""
        # Application service might need to update cached institution data
        logger.info(f"Institution updated: {event.data.get('id')}")
        return True


class NotificationServiceEventHandler(SyncEventHandler):
    """Event handler for Notification Service."""
    
    def __init__(self):
        super().__init__("notification_service")
        self.conflict_resolver = ConflictResolver()
    
    def handle_user_created(self, event: SyncEvent) -> bool:
        """Handle user creation events - setup notification preferences."""
        try:
            user_data = event.data
            user_id = user_data.get('id')
            email = user_data.get('email')
            
            # Create default notification preferences for new user
            logger.info(f"Setting up notification preferences for user {user_id} ({email})")
            
            # In a real implementation, you would create notification preference records
            # For now, we'll just log the action
            
            return True
            
        except Exception as e:
            logger.error(f"Error setting up notification preferences: {str(e)}")
            return False
    
    def handle_profile_updated(self, event: SyncEvent) -> bool:
        """Handle profile update events - update notification preferences."""
        try:
            profile_data = event.data
            
            # Check if notification preferences changed
            notification_fields = ['email_notifications', 'sms_notifications', 'push_notifications']
            
            for field in notification_fields:
                if field in profile_data:
                    logger.info(f"Notification preference {field} updated for user {profile_data.get('auth_user_id')}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating notification preferences: {str(e)}")
            return False


def get_event_handler(service_name: str) -> Optional[SyncEventHandler]:
    """Factory function to get the appropriate event handler for a service."""
    handlers = {
        'auth_service': AuthServiceEventHandler,
        'user_service': UserServiceEventHandler,
        'application_service': ApplicationServiceEventHandler,
        'notification_service': NotificationServiceEventHandler,
    }
    
    handler_class = handlers.get(service_name)
    if handler_class:
        return handler_class()
    
    logger.warning(f"No event handler found for service: {service_name}")
    return None


def setup_event_handlers():
    """Setup function to initialize all event handlers."""
    logger.info("Setting up event handlers for data synchronization")
    
    # You can add any global setup logic here
    # For example, checking Redis connection, validating configuration, etc.
    
    return True