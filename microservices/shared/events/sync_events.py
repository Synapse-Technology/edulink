"""Event-driven data synchronization between microservices."""

import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(Enum):
    """Types of synchronization events."""
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    USER_ACTIVATED = "user.activated"
    USER_DEACTIVATED = "user.deactivated"
    USER_EMAIL_VERIFIED = "user.email_verified"
    USER_ROLE_CHANGED = "user.role_changed"
    PROFILE_CREATED = "profile.created"
    PROFILE_UPDATED = "profile.updated"
    PROFILE_DELETED = "profile.deleted"


@dataclass
class SyncEvent:
    """Base synchronization event structure."""
    event_id: str
    event_type: EventType
    source_service: str
    target_service: str
    timestamp: datetime
    data: Dict[str, Any]
    correlation_id: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization."""
        result = asdict(self)
        result['event_type'] = self.event_type.value
        result['timestamp'] = self.timestamp.isoformat()
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SyncEvent':
        """Create event from dictionary."""
        data['event_type'] = EventType(data['event_type'])
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)


class SyncEventPublisher:
    """Publisher for synchronization events."""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
    
    def publish_user_created(self, user_data: Dict[str, Any], target_service: str = "user_service") -> SyncEvent:
        """Publish user created event."""
        event = SyncEvent(
            event_id=str(uuid.uuid4()),
            event_type=EventType.USER_CREATED,
            source_service=self.service_name,
            target_service=target_service,
            timestamp=datetime.utcnow(),
            data=user_data,
            correlation_id=str(user_data.get('id', uuid.uuid4()))
        )
        return self._publish_event(event)
    
    def publish_user_updated(self, user_data: Dict[str, Any], target_service: str = "user_service") -> SyncEvent:
        """Publish user updated event."""
        event = SyncEvent(
            event_id=str(uuid.uuid4()),
            event_type=EventType.USER_UPDATED,
            source_service=self.service_name,
            target_service=target_service,
            timestamp=datetime.utcnow(),
            data=user_data,
            correlation_id=str(user_data.get('id', uuid.uuid4()))
        )
        return self._publish_event(event)
    
    def publish_user_email_verified(self, user_id: str, email: str, verified_at: datetime, target_service: str = "user_service") -> SyncEvent:
        """Publish user email verified event."""
        event = SyncEvent(
            event_id=str(uuid.uuid4()),
            event_type=EventType.USER_EMAIL_VERIFIED,
            source_service=self.service_name,
            target_service=target_service,
            timestamp=datetime.utcnow(),
            data={
                'user_id': user_id,
                'email': email,
                'verified_at': verified_at.isoformat(),
                'is_verified': True
            },
            correlation_id=user_id
        )
        return self._publish_event(event)
    
    def publish_user_role_changed(self, user_id: str, old_role: str, new_role: str, target_service: str = "user_service") -> SyncEvent:
        """Publish user role changed event."""
        event = SyncEvent(
            event_id=str(uuid.uuid4()),
            event_type=EventType.USER_ROLE_CHANGED,
            source_service=self.service_name,
            target_service=target_service,
            timestamp=datetime.utcnow(),
            data={
                'user_id': user_id,
                'old_role': old_role,
                'new_role': new_role
            },
            correlation_id=user_id
        )
        return self._publish_event(event)
    
    def publish_profile_updated(self, profile_data: Dict[str, Any], target_service: str = "auth_service") -> SyncEvent:
        """Publish profile updated event."""
        event = SyncEvent(
            event_id=str(uuid.uuid4()),
            event_type=EventType.PROFILE_UPDATED,
            source_service=self.service_name,
            target_service=target_service,
            timestamp=datetime.utcnow(),
            data=profile_data,
            correlation_id=str(profile_data.get('auth_user_id', uuid.uuid4()))
        )
        return self._publish_event(event)
    
    def _publish_event(self, event: SyncEvent) -> SyncEvent:
        """Publish event to message queue."""
        # This would integrate with your message queue system (Redis, RabbitMQ, etc.)
        # For now, we'll use a simple Redis implementation
        try:
            from shared.message_queue import MessageQueue
            queue = MessageQueue()
            queue.publish(f"sync.{event.target_service}", event.to_dict())
            print(f"Published event {event.event_id}: {event.event_type.value}")
            return event
        except Exception as e:
            print(f"Failed to publish event {event.event_id}: {str(e)}")
            raise


class SyncEventHandler:
    """Handler for processing synchronization events."""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.handlers = {
            EventType.USER_CREATED: self.handle_user_created,
            EventType.USER_UPDATED: self.handle_user_updated,
            EventType.USER_EMAIL_VERIFIED: self.handle_user_email_verified,
            EventType.USER_ROLE_CHANGED: self.handle_user_role_changed,
            EventType.PROFILE_UPDATED: self.handle_profile_updated,
        }
    
    def process_event(self, event_data: Dict[str, Any]) -> bool:
        """Process incoming synchronization event."""
        try:
            event = SyncEvent.from_dict(event_data)
            
            if event.target_service != self.service_name:
                print(f"Event {event.event_id} not for this service ({self.service_name})")
                return True
            
            handler = self.handlers.get(event.event_type)
            if not handler:
                print(f"No handler for event type {event.event_type.value}")
                return False
            
            return handler(event)
            
        except Exception as e:
            print(f"Error processing event: {str(e)}")
            return False
    
    def handle_user_created(self, event: SyncEvent) -> bool:
        """Handle user created event."""
        # Implementation depends on the target service
        if self.service_name == "user_service":
            return self._create_user_profile(event.data)
        return True
    
    def handle_user_updated(self, event: SyncEvent) -> bool:
        """Handle user updated event."""
        if self.service_name == "user_service":
            return self._update_user_profile(event.data)
        return True
    
    def handle_user_email_verified(self, event: SyncEvent) -> bool:
        """Handle user email verified event."""
        if self.service_name == "user_service":
            return self._update_user_verification_status(event.data)
        return True
    
    def handle_user_role_changed(self, event: SyncEvent) -> bool:
        """Handle user role changed event."""
        if self.service_name == "user_service":
            return self._update_user_role(event.data)
        return True
    
    def handle_profile_updated(self, event: SyncEvent) -> bool:
        """Handle profile updated event."""
        if self.service_name == "auth_service":
            return self._sync_profile_to_auth(event.data)
        return True
    
    def _create_user_profile(self, user_data: Dict[str, Any]) -> bool:
        """Create user profile from auth user data."""
        try:
            # This would be implemented in the user service
            print(f"Creating user profile for auth user {user_data.get('id')}")
            # Implementation would create UserProfile instance
            return True
        except Exception as e:
            print(f"Error creating user profile: {str(e)}")
            return False
    
    def _update_user_profile(self, user_data: Dict[str, Any]) -> bool:
        """Update user profile from auth user data."""
        try:
            print(f"Updating user profile for auth user {user_data.get('id')}")
            # Implementation would update UserProfile instance
            return True
        except Exception as e:
            print(f"Error updating user profile: {str(e)}")
            return False
    
    def _update_user_verification_status(self, data: Dict[str, Any]) -> bool:
        """Update user verification status."""
        try:
            print(f"Updating verification status for user {data.get('user_id')}")
            # Implementation would update UserProfile verification fields
            return True
        except Exception as e:
            print(f"Error updating verification status: {str(e)}")
            return False
    
    def _update_user_role(self, data: Dict[str, Any]) -> bool:
        """Update user role."""
        try:
            print(f"Updating role for user {data.get('user_id')} to {data.get('new_role')}")
            # Implementation would update UserProfile role field
            return True
        except Exception as e:
            print(f"Error updating user role: {str(e)}")
            return False
    
    def _sync_profile_to_auth(self, profile_data: Dict[str, Any]) -> bool:
        """Sync profile changes back to auth service."""
        try:
            print(f"Syncing profile changes for auth user {profile_data.get('auth_user_id')}")
            # Implementation would update relevant auth user fields
            return True
        except Exception as e:
            print(f"Error syncing profile to auth: {str(e)}")
            return False


class ConflictResolver:
    """Handles data conflicts during synchronization."""
    
    @staticmethod
    def resolve_email_conflict(auth_email: str, profile_email: str, auth_updated: datetime, profile_updated: datetime) -> str:
        """Resolve email conflicts - auth service wins."""
        return auth_email
    
    @staticmethod
    def resolve_role_conflict(auth_role: str, profile_role: str, auth_updated: datetime, profile_updated: datetime) -> str:
        """Resolve role conflicts - auth service wins."""
        return auth_role
    
    @staticmethod
    def resolve_status_conflict(auth_status: bool, profile_status: bool, auth_updated: datetime, profile_updated: datetime) -> bool:
        """Resolve status conflicts - auth service wins."""
        return auth_status