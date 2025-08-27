import json
import logging
import pika
import redis
from typing import Dict, Any, Callable, Optional
from abc import ABC, abstractmethod
from datetime import datetime
from .events import Event, EventType
from .service_config import get_config

logger = logging.getLogger(__name__)


class MessageQueueError(Exception):
    """Exception raised for message queue errors"""
    pass


class MessageQueue(ABC):
    """Abstract base class for message queue implementations"""
    
    @abstractmethod
    def publish(self, queue_name: str, message: Dict[str, Any]) -> None:
        """Publish a message to a queue"""
        pass
    
    @abstractmethod
    def subscribe(self, queue_name: str, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Subscribe to a queue with a callback function"""
        pass
    
    @abstractmethod
    def close(self) -> None:
        """Close the connection"""
        pass


class RabbitMQQueue(MessageQueue):
    """RabbitMQ implementation of message queue"""
    
    def __init__(self, connection_url: str = None):
        self.config = get_config()
        self.connection_url = connection_url or self.config.RABBITMQ_URL
        self.connection = None
        self.channel = None
        self._connect()
    
    def _connect(self):
        """Establish connection to RabbitMQ"""
        try:
            self.connection = pika.BlockingConnection(
                pika.URLParameters(self.connection_url)
            )
            self.channel = self.connection.channel()
            logger.info("Connected to RabbitMQ")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {str(e)}")
            raise MessageQueueError(f"RabbitMQ connection failed: {str(e)}")
    
    def _ensure_queue(self, queue_name: str, durable: bool = True):
        """Ensure queue exists"""
        try:
            self.channel.queue_declare(queue=queue_name, durable=durable)
        except Exception as e:
            logger.error(f"Failed to declare queue {queue_name}: {str(e)}")
            raise MessageQueueError(f"Queue declaration failed: {str(e)}")
    
    def publish(self, queue_name: str, message: Dict[str, Any]) -> None:
        """Publish a message to RabbitMQ queue"""
        try:
            self._ensure_queue(queue_name)
            
            message_body = json.dumps(message, default=str)
            
            self.channel.basic_publish(
                exchange='',
                routing_key=queue_name,
                body=message_body,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                    timestamp=int(datetime.now().timestamp())
                )
            )
            
            logger.debug(f"Published message to queue {queue_name}")
            
        except Exception as e:
            logger.error(f"Failed to publish message to {queue_name}: {str(e)}")
            raise MessageQueueError(f"Message publishing failed: {str(e)}")
    
    def subscribe(self, queue_name: str, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Subscribe to RabbitMQ queue"""
        try:
            self._ensure_queue(queue_name)
            
            def wrapper(ch, method, properties, body):
                try:
                    message = json.loads(body.decode('utf-8'))
                    callback(message)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    logger.error(f"Error processing message from {queue_name}: {str(e)}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            
            self.channel.basic_qos(prefetch_count=1)
            self.channel.basic_consume(
                queue=queue_name,
                on_message_callback=wrapper
            )
            
            logger.info(f"Subscribed to queue {queue_name}")
            self.channel.start_consuming()
            
        except Exception as e:
            logger.error(f"Failed to subscribe to {queue_name}: {str(e)}")
            raise MessageQueueError(f"Subscription failed: {str(e)}")
    
    def close(self):
        """Close RabbitMQ connection"""
        try:
            if self.channel and not self.channel.is_closed:
                self.channel.close()
            if self.connection and not self.connection.is_closed:
                self.connection.close()
            logger.info("RabbitMQ connection closed")
        except Exception as e:
            logger.error(f"Error closing RabbitMQ connection: {str(e)}")


class RedisQueue(MessageQueue):
    """Redis implementation of message queue using pub/sub"""
    
    def __init__(self, connection_url: str = None):
        self.config = get_config()
        self.connection_url = connection_url or self.config.REDIS_URL
        self.redis_client = None
        self.pubsub = None
        self._connect()
    
    def _connect(self):
        """Establish connection to Redis"""
        try:
            self.redis_client = redis.from_url(self.connection_url)
            self.redis_client.ping()  # Test connection
            self.pubsub = self.redis_client.pubsub()
            logger.info("Connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise MessageQueueError(f"Redis connection failed: {str(e)}")
    
    def publish(self, queue_name: str, message: Dict[str, Any]) -> None:
        """Publish a message to Redis channel"""
        try:
            message_body = json.dumps(message, default=str)
            self.redis_client.publish(queue_name, message_body)
            logger.debug(f"Published message to Redis channel {queue_name}")
        except Exception as e:
            logger.error(f"Failed to publish message to {queue_name}: {str(e)}")
            raise MessageQueueError(f"Message publishing failed: {str(e)}")
    
    def subscribe(self, queue_name: str, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Subscribe to Redis channel"""
        try:
            self.pubsub.subscribe(queue_name)
            logger.info(f"Subscribed to Redis channel {queue_name}")
            
            for message in self.pubsub.listen():
                if message['type'] == 'message':
                    try:
                        data = json.loads(message['data'].decode('utf-8'))
                        callback(data)
                    except Exception as e:
                        logger.error(f"Error processing message from {queue_name}: {str(e)}")
                        
        except Exception as e:
            logger.error(f"Failed to subscribe to {queue_name}: {str(e)}")
            raise MessageQueueError(f"Subscription failed: {str(e)}")
    
    def close(self):
        """Close Redis connection"""
        try:
            if self.pubsub:
                self.pubsub.close()
            if self.redis_client:
                self.redis_client.close()
            logger.info("Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {str(e)}")


class EventMessageQueue:
    """Event-driven message queue that integrates with the event system"""
    
    def __init__(self, queue_impl: MessageQueue = None):
        self.queue = queue_impl or RabbitMQQueue()
        self.event_handlers = {}
    
    def publish_event(self, event: Event, queue_name: str = None) -> None:
        """Publish an event to the message queue"""
        queue_name = queue_name or f"events.{event.source_service}"
        
        message = {
            'event_id': event.event_id,
            'event_type': event.event_type,
            'timestamp': event.timestamp.isoformat(),
            'source_service': event.source_service,
            'data': event.data,
            'correlation_id': event.correlation_id
        }
        
        self.queue.publish(queue_name, message)
        logger.info(f"Published event {event.event_type} to queue {queue_name}")
    
    def subscribe_to_events(self, service_name: str, event_types: list = None) -> None:
        """Subscribe to events from a specific service"""
        queue_name = f"events.{service_name}"
        
        def event_callback(message: Dict[str, Any]):
            try:
                # Reconstruct event from message
                event = Event(
                    event_id=message['event_id'],
                    event_type=message['event_type'],
                    timestamp=datetime.fromisoformat(message['timestamp']),
                    source_service=message['source_service'],
                    data=message['data'],
                    correlation_id=message.get('correlation_id')
                )
                
                # Filter by event types if specified
                if event_types and event.event_type not in event_types:
                    return
                
                # Handle the event
                self._handle_received_event(event)
                
            except Exception as e:
                logger.error(f"Error processing event message: {str(e)}")
        
        self.queue.subscribe(queue_name, event_callback)
    
    def _handle_received_event(self, event: Event) -> None:
        """Handle received event from message queue"""
        handlers = self.event_handlers.get(event.event_type, [])
        
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"Error in event handler for {event.event_type}: {str(e)}")
        
        logger.debug(f"Processed event {event.event_type} with {len(handlers)} handlers")
    
    def register_event_handler(self, event_type: str, handler: Callable[[Event], None]) -> None:
        """Register a handler for a specific event type"""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        
        self.event_handlers[event_type].append(handler)
        logger.info(f"Registered handler for event type {event_type}")
    
    def close(self):
        """Close the message queue connection"""
        self.queue.close()


# Global message queue instance
message_queue = EventMessageQueue()


def get_message_queue(queue_type: str = 'rabbitmq') -> MessageQueue:
    """Factory function to get message queue implementation"""
    if queue_type.lower() == 'rabbitmq':
        return RabbitMQQueue()
    elif queue_type.lower() == 'redis':
        return RedisQueue()
    else:
        raise ValueError(f"Unsupported queue type: {queue_type}")


def publish_service_event(event_type: EventType, service_name: str, data: Dict[str, Any], 
                         correlation_id: str = None) -> None:
    """Convenience function to publish service events"""
    import uuid
    
    event = Event(
        event_type=event_type.value,
        event_id=str(uuid.uuid4()),
        timestamp=datetime.now(),
        source_service=service_name,
        data=data,
        correlation_id=correlation_id
    )
    
    message_queue.publish_event(event)


# Event handler decorators
def event_handler(event_type: str):
    """Decorator to register event handlers"""
    def decorator(func):
        message_queue.register_event_handler(event_type, func)
        return func
    return decorator


def handles_events(*event_types):
    """Decorator to register handlers for multiple event types"""
    def decorator(func):
        for event_type in event_types:
            message_queue.register_event_handler(event_type, func)
        return func
    return decorator