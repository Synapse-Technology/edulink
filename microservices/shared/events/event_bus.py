"""Redis-based event bus for microservice communication."""

import json
import redis
import logging
import threading
import time
from typing import Dict, List, Callable, Optional
from datetime import datetime
from dataclasses import asdict
from .sync_events import SyncEvent, EventType
from .event_handlers import get_event_handler


logger = logging.getLogger(__name__)


class RedisEventBus:
    """Redis-based event bus for publishing and subscribing to synchronization events."""
    
    def __init__(self, redis_host: str = 'localhost', redis_port: int = 6379, redis_db: int = 0):
        """
        Initialize Redis event bus.
        
        Args:
            redis_host: Redis server host
            redis_port: Redis server port
            redis_db: Redis database number
        """
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.redis_db = redis_db
        
        # Redis connections
        self.redis_client = None
        self.pubsub = None
        
        # Event handlers
        self.event_handlers: Dict[str, Callable] = {}
        
        # Subscription management
        self.subscribed_channels: List[str] = []
        self.is_listening = False
        self.listener_thread = None
        
        # Event processing
        self.processed_events: Dict[str, datetime] = {}  # For deduplication
        self.max_processed_events = 10000  # Limit memory usage
        
        # Initialize connection
        self._connect()
    
    def _connect(self):
        """Establish Redis connection."""
        try:
            self.redis_client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                db=self.redis_db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            
            # Test connection
            self.redis_client.ping()
            
            self.pubsub = self.redis_client.pubsub()
            
            logger.info(f"Connected to Redis at {self.redis_host}:{self.redis_port}")
            
        except redis.ConnectionError as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error connecting to Redis: {str(e)}")
            raise
    
    def publish_event(self, event: SyncEvent) -> bool:
        """Publish a synchronization event to Redis."""
        try:
            if not self.redis_client:
                logger.error("Redis client not initialized")
                return False
            
            # Convert event to JSON
            event_data = asdict(event)
            event_json = json.dumps(event_data, default=str)
            
            # Determine channel based on target service
            if event.target_service == "all":
                # Publish to all service channels
                channels = [
                    "sync_events_auth_service",
                    "sync_events_user_service",
                    "sync_events_application_service",
                    "sync_events_notification_service",
                    "sync_events_internship_service"
                ]
            else:
                channels = [f"sync_events_{event.target_service}"]
            
            # Publish to channels
            success = True
            for channel in channels:
                try:
                    result = self.redis_client.publish(channel, event_json)
                    logger.debug(f"Published event {event.event_id} to {channel}, {result} subscribers")
                except Exception as e:
                    logger.error(f"Failed to publish to channel {channel}: {str(e)}")
                    success = False
            
            # Store event for deduplication and audit
            self._store_event_metadata(event)
            
            return success
            
        except Exception as e:
            logger.error(f"Error publishing event {event.event_id}: {str(e)}")
            return False
    
    def subscribe_to_service_events(self, service_name: str):
        """Subscribe to events for a specific service."""
        try:
            channel = f"sync_events_{service_name}"
            
            if channel not in self.subscribed_channels:
                self.pubsub.subscribe(channel)
                self.subscribed_channels.append(channel)
                logger.info(f"Subscribed to channel: {channel}")
            
        except Exception as e:
            logger.error(f"Error subscribing to service events for {service_name}: {str(e)}")
    
    def register_event_handler(self, event_type: EventType, handler: Callable[[SyncEvent], bool]):
        """Register a handler for a specific event type."""
        self.event_handlers[event_type.value] = handler
        logger.info(f"Registered handler for event type: {event_type.value}")
    
    def start_listening(self, service_name: str):
        """Start listening for events in a separate thread."""
        if self.is_listening:
            logger.warning("Event bus is already listening")
            return
        
        # Subscribe to service events
        self.subscribe_to_service_events(service_name)
        
        # Get event handler for this service
        self.service_handler = get_event_handler(service_name)
        
        if not self.service_handler:
            logger.error(f"No event handler found for service: {service_name}")
            return
        
        # Start listener thread
        self.is_listening = True
        self.listener_thread = threading.Thread(
            target=self._listen_for_events,
            args=(service_name,),
            daemon=True
        )
        self.listener_thread.start()
        
        logger.info(f"Started listening for events for service: {service_name}")
    
    def stop_listening(self):
        """Stop listening for events."""
        self.is_listening = False
        
        if self.listener_thread and self.listener_thread.is_alive():
            self.listener_thread.join(timeout=5)
        
        if self.pubsub:
            self.pubsub.close()
        
        logger.info("Stopped listening for events")
    
    def _listen_for_events(self, service_name: str):
        """Listen for events in a loop (runs in separate thread)."""
        logger.info(f"Event listener started for service: {service_name}")
        
        try:
            while self.is_listening:
                try:
                    # Get message with timeout
                    message = self.pubsub.get_message(timeout=1.0)
                    
                    if message and message['type'] == 'message':
                        self._process_message(message)
                    
                except redis.ConnectionError as e:
                    logger.error(f"Redis connection error in listener: {str(e)}")
                    time.sleep(5)  # Wait before retrying
                    try:
                        self._connect()  # Reconnect
                        self.subscribe_to_service_events(service_name)  # Re-subscribe
                    except Exception as reconnect_error:
                        logger.error(f"Failed to reconnect: {str(reconnect_error)}")
                
                except Exception as e:
                    logger.error(f"Error in event listener: {str(e)}")
                    time.sleep(1)  # Brief pause before continuing
        
        except Exception as e:
            logger.error(f"Fatal error in event listener: {str(e)}")
        
        finally:
            logger.info(f"Event listener stopped for service: {service_name}")
    
    def _process_message(self, message):
        """Process a received message."""
        try:
            # Parse event data
            event_data = json.loads(message['data'])
            
            # Convert back to SyncEvent
            event = SyncEvent(
                event_id=event_data['event_id'],
                event_type=EventType(event_data['event_type']),
                source_service=event_data['source_service'],
                target_service=event_data['target_service'],
                timestamp=datetime.fromisoformat(event_data['timestamp']),
                data=event_data['data'],
                correlation_id=event_data.get('correlation_id')
            )
            
            # Check for duplicate events
            if self._is_duplicate_event(event):
                logger.debug(f"Skipping duplicate event: {event.event_id}")
                return
            
            # Process event with service handler
            if self.service_handler:
                success = self._handle_event_with_service_handler(event)
                
                if success:
                    logger.info(f"Successfully processed event {event.event_id} of type {event.event_type.value}")
                    self._mark_event_processed(event)
                else:
                    logger.error(f"Failed to process event {event.event_id} of type {event.event_type.value}")
            else:
                logger.warning(f"No service handler available for event {event.event_id}")
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse event JSON: {str(e)}")
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
    
    def _handle_event_with_service_handler(self, event: SyncEvent) -> bool:
        """Handle event using the service-specific event handler."""
        try:
            # Map event types to handler methods
            handler_methods = {
                EventType.USER_CREATED: 'handle_user_created',
                EventType.USER_UPDATED: 'handle_user_updated',
                EventType.USER_DELETED: 'handle_user_deleted',
                EventType.USER_EMAIL_VERIFIED: 'handle_user_email_verified',
                EventType.USER_ROLE_CHANGED: 'handle_user_role_changed',
                EventType.PROFILE_CREATED: 'handle_profile_created',
                EventType.PROFILE_UPDATED: 'handle_profile_updated',
                EventType.PROFILE_DELETED: 'handle_profile_deleted',
                EventType.INSTITUTION_CREATED: 'handle_institution_created',
                EventType.INSTITUTION_UPDATED: 'handle_institution_updated',
                EventType.MEMBERSHIP_CREATED: 'handle_membership_created',
                EventType.MEMBERSHIP_UPDATED: 'handle_membership_updated',
            }
            
            method_name = handler_methods.get(event.event_type)
            
            if method_name and hasattr(self.service_handler, method_name):
                handler_method = getattr(self.service_handler, method_name)
                return handler_method(event)
            else:
                logger.warning(f"No handler method found for event type: {event.event_type.value}")
                return True  # Consider unknown events as "successfully" processed
        
        except Exception as e:
            logger.error(f"Error in service handler: {str(e)}")
            return False
    
    def _is_duplicate_event(self, event: SyncEvent) -> bool:
        """Check if event has already been processed."""
        return event.event_id in self.processed_events
    
    def _mark_event_processed(self, event: SyncEvent):
        """Mark event as processed for deduplication."""
        self.processed_events[event.event_id] = event.timestamp
        
        # Clean up old processed events to prevent memory issues
        if len(self.processed_events) > self.max_processed_events:
            # Remove oldest 20% of events
            sorted_events = sorted(self.processed_events.items(), key=lambda x: x[1])
            events_to_remove = sorted_events[:int(self.max_processed_events * 0.2)]
            
            for event_id, _ in events_to_remove:
                del self.processed_events[event_id]
    
    def _store_event_metadata(self, event: SyncEvent):
        """Store event metadata for audit and monitoring."""
        try:
            # Store in Redis with expiration (7 days)
            key = f"event_metadata:{event.event_id}"
            metadata = {
                'event_type': event.event_type.value,
                'source_service': event.source_service,
                'target_service': event.target_service,
                'timestamp': event.timestamp.isoformat(),
                'correlation_id': event.correlation_id
            }
            
            self.redis_client.hset(key, mapping=metadata)
            self.redis_client.expire(key, 7 * 24 * 60 * 60)  # 7 days
            
        except Exception as e:
            logger.error(f"Error storing event metadata: {str(e)}")
    
    def get_event_stats(self) -> Dict:
        """Get statistics about event processing."""
        try:
            stats = {
                'processed_events_count': len(self.processed_events),
                'subscribed_channels': self.subscribed_channels,
                'is_listening': self.is_listening,
                'redis_connected': self.redis_client is not None,
            }
            
            # Get Redis info if available
            if self.redis_client:
                try:
                    redis_info = self.redis_client.info()
                    stats['redis_info'] = {
                        'connected_clients': redis_info.get('connected_clients', 0),
                        'used_memory_human': redis_info.get('used_memory_human', 'unknown'),
                        'uptime_in_seconds': redis_info.get('uptime_in_seconds', 0),
                    }
                except Exception:
                    stats['redis_info'] = 'unavailable'
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting event stats: {str(e)}")
            return {'error': str(e)}
    
    def health_check(self) -> bool:
        """Check if the event bus is healthy."""
        try:
            if not self.redis_client:
                return False
            
            # Test Redis connection
            self.redis_client.ping()
            
            return True
            
        except Exception as e:
            logger.error(f"Event bus health check failed: {str(e)}")
            return False


# Global event bus instance
_event_bus_instance = None


def get_event_bus() -> RedisEventBus:
    """Get the global event bus instance."""
    global _event_bus_instance
    
    if _event_bus_instance is None:
        _event_bus_instance = RedisEventBus()
    
    return _event_bus_instance


def initialize_event_bus(service_name: str, redis_host: str = 'localhost', redis_port: int = 6379):
    """Initialize the event bus for a specific service."""
    global _event_bus_instance
    
    try:
        _event_bus_instance = RedisEventBus(redis_host=redis_host, redis_port=redis_port)
        _event_bus_instance.start_listening(service_name)
        
        logger.info(f"Event bus initialized for service: {service_name}")
        return _event_bus_instance
        
    except Exception as e:
        logger.error(f"Failed to initialize event bus: {str(e)}")
        raise


def shutdown_event_bus():
    """Shutdown the global event bus instance."""
    global _event_bus_instance
    
    if _event_bus_instance:
        _event_bus_instance.stop_listening()
        _event_bus_instance = None
        logger.info("Event bus shutdown complete")