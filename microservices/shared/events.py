import json
import logging
from typing import Dict, Any, Callable, List
from datetime import datetime
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class EventType(Enum):
    """Event types for inter-service communication"""
    # Internship events
    INTERNSHIP_CREATED = "internship.created"
    INTERNSHIP_UPDATED = "internship.updated"
    INTERNSHIP_DELETED = "internship.deleted"
    INTERNSHIP_VERIFIED = "internship.verified"
    INTERNSHIP_EXPIRED = "internship.expired"
    
    # Application events
    APPLICATION_CREATED = "application.created"
    APPLICATION_UPDATED = "application.updated"
    APPLICATION_STATUS_CHANGED = "application.status_changed"
    APPLICATION_WITHDRAWN = "application.withdrawn"
    
    # User events
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_VERIFIED = "user.verified"
    
    # Notification events
    NOTIFICATION_SEND = "notification.send"
    EMAIL_SEND = "email.send"

@dataclass
class Event:
    """Base event class"""
    event_type: str
    event_id: str
    timestamp: datetime
    source_service: str
    data: Dict[str, Any]
    correlation_id: str = None
    version: str = "1.0"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary"""
        event_dict = asdict(self)
        event_dict['timestamp'] = self.timestamp.isoformat()
        return event_dict
    
    def to_json(self) -> str:
        """Convert event to JSON string"""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        """Create event from dictionary"""
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'Event':
        """Create event from JSON string"""
        data = json.loads(json_str)
        return cls.from_dict(data)

class EventHandler(ABC):
    """Abstract base class for event handlers"""
    
    @abstractmethod
    def handle(self, event: Event) -> None:
        """Handle an event"""
        pass
    
    @abstractmethod
    def can_handle(self, event_type: str) -> bool:
        """Check if handler can handle the event type"""
        pass

class EventBus:
    """Event bus for publishing and subscribing to events"""
    
    def __init__(self):
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._middleware: List[Callable[[Event], Event]] = []
    
    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        """Subscribe a handler to an event type"""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        logger.info(f"Subscribed handler {handler.__class__.__name__} to {event_type}")
    
    def unsubscribe(self, event_type: str, handler: EventHandler) -> None:
        """Unsubscribe a handler from an event type"""
        if event_type in self._handlers:
            self._handlers[event_type].remove(handler)
            logger.info(f"Unsubscribed handler {handler.__class__.__name__} from {event_type}")
    
    def add_middleware(self, middleware: Callable[[Event], Event]) -> None:
        """Add middleware to process events"""
        self._middleware.append(middleware)
    
    def publish(self, event: Event) -> None:
        """Publish an event to all subscribers"""
        try:
            # Apply middleware
            processed_event = event
            for middleware in self._middleware:
                processed_event = middleware(processed_event)
            
            # Get handlers for this event type
            handlers = self._handlers.get(processed_event.event_type, [])
            
            # Handle the event
            for handler in handlers:
                try:
                    if handler.can_handle(processed_event.event_type):
                        handler.handle(processed_event)
                except Exception as e:
                    logger.error(f"Error handling event {processed_event.event_type} with {handler.__class__.__name__}: {str(e)}")
            
            logger.info(f"Published event {processed_event.event_type} to {len(handlers)} handlers")
            
        except Exception as e:
            logger.error(f"Error publishing event {event.event_type}: {str(e)}")

class InternshipEventHandler(EventHandler):
    """Handler for internship-related events"""
    
    def can_handle(self, event_type: str) -> bool:
        return event_type.startswith('internship.')
    
    def handle(self, event: Event) -> None:
        """Handle internship events"""
        if event.event_type == EventType.INTERNSHIP_CREATED.value:
            self._handle_internship_created(event)
        elif event.event_type == EventType.INTERNSHIP_VERIFIED.value:
            self._handle_internship_verified(event)
        elif event.event_type == EventType.INTERNSHIP_EXPIRED.value:
            self._handle_internship_expired(event)
    
    def _handle_internship_created(self, event: Event) -> None:
        """Handle internship creation"""
        logger.info(f"Internship created: {event.data.get('internship_id')}")
        # Send notification to relevant users
        # Update search indexes
        # Log analytics event
    
    def _handle_internship_verified(self, event: Event) -> None:
        """Handle internship verification"""
        logger.info(f"Internship verified: {event.data.get('internship_id')}")
        # Send notification to employer
        # Update internship visibility
    
    def _handle_internship_expired(self, event: Event) -> None:
        """Handle internship expiration"""
        logger.info(f"Internship expired: {event.data.get('internship_id')}")
        # Update internship status
        # Send notifications

class ApplicationEventHandler(EventHandler):
    """Handler for application-related events"""
    
    def can_handle(self, event_type: str) -> bool:
        return event_type.startswith('application.')
    
    def handle(self, event: Event) -> None:
        """Handle application events"""
        if event.event_type == EventType.APPLICATION_CREATED.value:
            self._handle_application_created(event)
        elif event.event_type == EventType.APPLICATION_STATUS_CHANGED.value:
            self._handle_application_status_changed(event)
        elif event.event_type == EventType.APPLICATION_WITHDRAWN.value:
            self._handle_application_withdrawn(event)
    
    def _handle_application_created(self, event: Event) -> None:
        """Handle application creation"""
        logger.info(f"Application created: {event.data.get('application_id')}")
        # Send notification to employer
        # Update application statistics
    
    def _handle_application_status_changed(self, event: Event) -> None:
        """Handle application status change"""
        logger.info(f"Application status changed: {event.data.get('application_id')} -> {event.data.get('new_status')}")
        # Send notification to student
        # Update analytics
    
    def _handle_application_withdrawn(self, event: Event) -> None:
        """Handle application withdrawal"""
        logger.info(f"Application withdrawn: {event.data.get('application_id')}")
        # Send notification to employer
        # Update statistics

class NotificationEventHandler(EventHandler):
    """Handler for notification events"""
    
    def can_handle(self, event_type: str) -> bool:
        return event_type.startswith('notification.') or event_type.startswith('email.')
    
    def handle(self, event: Event) -> None:
        """Handle notification events"""
        if event.event_type == EventType.NOTIFICATION_SEND.value:
            self._send_notification(event)
        elif event.event_type == EventType.EMAIL_SEND.value:
            self._send_email(event)
    
    def _send_notification(self, event: Event) -> None:
        """Send in-app notification"""
        logger.info(f"Sending notification to user: {event.data.get('user_id')}")
        # Implementation for sending notifications
    
    def _send_email(self, event: Event) -> None:
        """Send email notification"""
        logger.info(f"Sending email to: {event.data.get('email')}")
        # Implementation for sending emails

# Global event bus instance
event_bus = EventBus()

# Register default handlers
event_bus.subscribe('internship.*', InternshipEventHandler())
event_bus.subscribe('application.*', ApplicationEventHandler())
event_bus.subscribe('notification.*', NotificationEventHandler())
event_bus.subscribe('email.*', NotificationEventHandler())

def publish_event(event_type: EventType, source_service: str, data: Dict[str, Any], 
                 correlation_id: str = None) -> None:
    """Convenience function to publish an event"""
    import uuid
    
    event = Event(
        event_type=event_type.value,
        event_id=str(uuid.uuid4()),
        timestamp=datetime.now(),
        source_service=source_service,
        data=data,
        correlation_id=correlation_id
    )
    
    event_bus.publish(event)

def logging_middleware(event: Event) -> Event:
    """Middleware to log all events"""
    logger.info(f"Event: {event.event_type} from {event.source_service} at {event.timestamp}")
    return event

# Add default middleware
event_bus.add_middleware(logging_middleware)