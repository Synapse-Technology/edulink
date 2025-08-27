import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from django.conf import settings
from django.core.cache import cache
from celery import shared_task

from .types import EventType, EventPriority
from user_service.utils import ServiceClient

logger = logging.getLogger(__name__)


class EventPublisher:
    """Publisher for inter-service events."""
    
    def __init__(self):
        self.service_name = 'user_service'
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
            'target_services': target_services or self._get_default_targets(event_type),
            'retry_count': 0,
            'max_retries': 3
        }
        
        try:
            # Store event for tracking
            self._store_event(event_id, event_payload)
            
            if async_processing:
                # Process asynchronously using Celery
                process_event_async.delay(event_payload)
            else:
                # Process synchronously
                self._process_event(event_payload)
            
            logger.info(f"Event published: {event_type.value} with ID {event_id}")
            return event_id
            
        except Exception as e:
            logger.error(f"Failed to publish event {event_type.value}: {str(e)}")
            raise
    
    def _get_default_targets(self, event_type: EventType) -> list:
        """Get default target services for an event type."""
        target_mapping = {
            # Profile events
            EventType.STUDENT_PROFILE_CREATED: ['auth_service', 'institution_service', 'notification_service'],
            EventType.STUDENT_PROFILE_UPDATED: ['institution_service', 'internship_service'],
            EventType.STUDENT_PROFILE_VERIFIED: ['institution_service', 'internship_service', 'notification_service'],
            EventType.STUDENT_PROFILE_DELETED: ['auth_service', 'institution_service', 'internship_service'],
            
            EventType.EMPLOYER_PROFILE_CREATED: ['auth_service', 'internship_service', 'notification_service'],
            EventType.EMPLOYER_PROFILE_UPDATED: ['internship_service'],
            EventType.EMPLOYER_PROFILE_VERIFIED: ['internship_service', 'notification_service'],
            EventType.EMPLOYER_PROFILE_DELETED: ['auth_service', 'internship_service'],
            
            EventType.INSTITUTION_PROFILE_CREATED: ['auth_service', 'institution_service', 'notification_service'],
            EventType.INSTITUTION_PROFILE_UPDATED: ['institution_service'],
            EventType.INSTITUTION_PROFILE_DELETED: ['auth_service', 'institution_service'],
            
            # Notification events
            EventType.PROFILE_COMPLETION_MILESTONE: ['notification_service'],
            EventType.PROFILE_COMPLETION_REMINDER: ['notification_service'],
            EventType.PROFILE_INVITATION_CREATED: ['notification_service'],
            
            # Verification events
            EventType.UNIVERSITY_VERIFICATION_REQUESTED: ['institution_service'],
            EventType.UNIVERSITY_VERIFICATION_COMPLETED: ['notification_service'],
            EventType.EMPLOYER_VERIFICATION_REQUESTED: ['internship_service'],
            EventType.EMPLOYER_VERIFICATION_COMPLETED: ['notification_service'],
            
            # Role events
            EventType.USER_ROLE_ASSIGNED: ['auth_service'],
            EventType.USER_ROLE_REMOVED: ['auth_service'],
            EventType.USER_PERMISSIONS_UPDATED: ['auth_service'],
        }
        
        return target_mapping.get(event_type, ['notification_service'])
    
    def _store_event(self, event_id: str, event_payload: Dict[str, Any]):
        """Store event for tracking and potential replay."""
        try:
            # Store in cache with TTL
            cache_key = f"{self.event_store_key}:{event_id}"
            cache.set(cache_key, event_payload, timeout=86400)  # 24 hours
            
            # Also store in a list for recent events
            recent_events_key = f"{self.event_store_key}:recent"
            recent_events = cache.get(recent_events_key, [])
            recent_events.append({
                'event_id': event_id,
                'event_type': event_payload['event_type'],
                'timestamp': event_payload['timestamp']
            })
            
            # Keep only last 100 events
            if len(recent_events) > 100:
                recent_events = recent_events[-100:]
            
            cache.set(recent_events_key, recent_events, timeout=86400)
            
        except Exception as e:
            logger.error(f"Failed to store event {event_id}: {str(e)}")
    
    def _process_event(self, event_payload: Dict[str, Any]):
        """Process event by sending to target services."""
        event_id = event_payload['event_id']
        target_services = event_payload['target_services']
        
        for service_name in target_services:
            try:
                self._send_to_service(service_name, event_payload)
                logger.info(f"Event {event_id} sent to {service_name}")
                
            except Exception as e:
                logger.error(f"Failed to send event {event_id} to {service_name}: {str(e)}")
                # Mark for retry
                self._mark_for_retry(event_payload, service_name, str(e))
    
    def _send_to_service(self, service_name: str, event_payload: Dict[str, Any]):
        """Send event to a specific service."""
        service_urls = {
            'auth_service': settings.AUTH_SERVICE_URL,
            'institution_service': settings.INSTITUTION_SERVICE_URL,
            'internship_service': settings.INTERNSHIP_SERVICE_URL,
            'notification_service': settings.NOTIFICATION_SERVICE_URL,
            'application_service': settings.APPLICATION_SERVICE_URL
        }
        
        service_tokens = {
            'auth_service': settings.AUTH_SERVICE_TOKEN,
            'institution_service': settings.INSTITUTION_SERVICE_TOKEN,
            'internship_service': settings.INTERNSHIP_SERVICE_TOKEN,
            'notification_service': settings.NOTIFICATION_SERVICE_TOKEN,
            'application_service': settings.APPLICATION_SERVICE_TOKEN
        }
        
        if service_name not in service_urls:
            raise ValueError(f"Unknown service: {service_name}")
        
        service_client = ServiceClient(
            service_urls[service_name],
            service_tokens.get(service_name)
        )
        
        # Send to service's event handler endpoint
        endpoint = '/api/events/receive/'
        service_client.post(endpoint, event_payload)
    
    def _mark_for_retry(self, event_payload: Dict[str, Any], failed_service: str, error: str):
        """Mark event for retry."""
        event_id = event_payload['event_id']
        retry_count = event_payload.get('retry_count', 0)
        max_retries = event_payload.get('max_retries', 3)
        
        if retry_count < max_retries:
            # Schedule retry
            retry_payload = event_payload.copy()
            retry_payload['retry_count'] = retry_count + 1
            retry_payload['failed_services'] = retry_payload.get('failed_services', [])
            retry_payload['failed_services'].append({
                'service': failed_service,
                'error': error,
                'attempt': retry_count + 1
            })
            
            # Retry after exponential backoff
            retry_delay = 60 * (2 ** retry_count)  # 60s, 120s, 240s
            process_event_retry.apply_async(args=[retry_payload], countdown=retry_delay)
            
            logger.info(f"Event {event_id} scheduled for retry {retry_count + 1}/{max_retries}")
        else:
            logger.error(f"Event {event_id} failed permanently after {max_retries} retries")
            # Store in dead letter queue
            self._store_failed_event(event_payload, failed_service, error)
    
    def _store_failed_event(self, event_payload: Dict[str, Any], failed_service: str, error: str):
        """Store permanently failed events for manual review."""
        try:
            failed_events_key = 'events:failed'
            failed_events = cache.get(failed_events_key, [])
            
            failed_event = {
                'event_payload': event_payload,
                'failed_service': failed_service,
                'final_error': error,
                'failed_at': datetime.utcnow().isoformat()
            }
            
            failed_events.append(failed_event)
            
            # Keep only last 1000 failed events
            if len(failed_events) > 1000:
                failed_events = failed_events[-1000:]
            
            cache.set(failed_events_key, failed_events, timeout=604800)  # 7 days
            
        except Exception as e:
            logger.error(f"Failed to store failed event: {str(e)}")


@shared_task(bind=True, max_retries=3)
def process_event_async(self, event_payload):
    """Process event asynchronously."""
    try:
        publisher = EventPublisher()
        publisher._process_event(event_payload)
    except Exception as exc:
        logger.error(f"Async event processing failed: {str(exc)}")
        raise self.retry(countdown=60)


@shared_task(bind=True, max_retries=1)
def process_event_retry(self, event_payload):
    """Retry failed event processing."""
    try:
        publisher = EventPublisher()
        publisher._process_event(event_payload)
    except Exception as exc:
        logger.error(f"Event retry failed: {str(exc)}")
        # Don't retry the retry task
        publisher = EventPublisher()
        publisher._store_failed_event(event_payload, 'retry_task', str(exc))