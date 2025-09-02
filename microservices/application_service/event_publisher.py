"""Event publisher for application service."""

import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class EventType(Enum):
    """Types of events that can be published."""
    APPLICATION_CREATED = "application.created"
    APPLICATION_UPDATED = "application.updated"
    APPLICATION_DELETED = "application.deleted"
    APPLICATION_SUBMITTED = "application.submitted"
    APPLICATION_APPROVED = "application.approved"
    APPLICATION_REJECTED = "application.rejected"
    APPLICATION_WITHDRAWN = "application.withdrawn"


class EventPriority(Enum):
    """Event priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EventPublisher:
    """Publisher for inter-service events."""
    
    def __init__(self):
        self.service_name = 'application_service'
        self.event_store_key = 'events:published'
    
    def publish(self, 
                event_type: EventType, 
                data: Dict[str, Any], 
                priority: EventPriority = EventPriority.MEDIUM,
                target_services: Optional[list] = None,
                async_processing: bool = True) -> str:
        """
        Publish an event to target services.
        
        Args:
            event_type: Type of event being published
            data: Event payload data
            priority: Event priority level
            target_services: List of target services (None for all)
            async_processing: Whether to process asynchronously
            
        Returns:
            Event ID for tracking
        """
        event_id = str(uuid.uuid4())
        
        event_payload = {
            'event_id': event_id,
            'event_type': event_type.value,
            'source_service': self.service_name,
            'timestamp': datetime.utcnow().isoformat(),
            'priority': priority.value,
            'data': data,
            'target_services': target_services or [],
        }
        
        try:
            # Log the event for now (placeholder implementation)
            logger.info(f"Publishing event {event_type.value} with ID {event_id}")
            logger.debug(f"Event payload: {json.dumps(event_payload, indent=2)}")
            
            # In a real implementation, this would send to message queue
            # For now, just return the event ID
            return event_id
            
        except Exception as e:
            logger.error(f"Failed to publish event {event_type.value}: {str(e)}")
            raise
    
    def publish_application_created(self, application_data: Dict[str, Any]) -> str:
        """Publish application created event."""
        return self.publish(
            EventType.APPLICATION_CREATED,
            application_data,
            EventPriority.MEDIUM
        )
    
    def publish_application_updated(self, application_data: Dict[str, Any]) -> str:
        """Publish application updated event."""
        return self.publish(
            EventType.APPLICATION_UPDATED,
            application_data,
            EventPriority.MEDIUM
        )
    
    def publish_application_submitted(self, application_data: Dict[str, Any]) -> str:
        """Publish application submitted event."""
        return self.publish(
            EventType.APPLICATION_SUBMITTED,
            application_data,
            EventPriority.HIGH
        )
    
    def publish_application_approved(self, application_data: Dict[str, Any]) -> str:
        """Publish application approved event."""
        return self.publish(
            EventType.APPLICATION_APPROVED,
            application_data,
            EventPriority.HIGH
        )
    
    def publish_application_rejected(self, application_data: Dict[str, Any]) -> str:
        """Publish application rejected event."""
        return self.publish(
            EventType.APPLICATION_REJECTED,
            application_data,
            EventPriority.HIGH
        )