import logging
from datetime import datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .handlers import EventHandler
from .publisher import EventPublisher
from .types import EventType, EventPriority
from user_service.utils.permissions import IsServiceAuthenticated

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class EventReceiveView(APIView):
    """API endpoint for receiving events from other services."""
    
    permission_classes = [IsServiceAuthenticated]
    
    def post(self, request):
        """Receive and process an event from another service."""
        try:
            event_payload = request.data
            
            # Validate required fields
            required_fields = ['event_id', 'event_type', 'source_service', 'data']
            for field in required_fields:
                if field not in event_payload:
                    return Response(
                        {'error': f'Missing required field: {field}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Process event
            handler = EventHandler()
            result = handler.handle_event(event_payload)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error receiving event: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EventPublishView(APIView):
    """API endpoint for publishing events to other services."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Publish an event to other services."""
        try:
            data = request.data
            
            # Validate required fields
            if 'event_type' not in data:
                return Response(
                    {'error': 'event_type is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if 'data' not in data:
                return Response(
                    {'error': 'data is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate event type
            try:
                event_type = EventType(data['event_type'])
            except ValueError:
                return Response(
                    {'error': f'Invalid event_type: {data["event_type"]}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get optional parameters
            priority = EventPriority.MEDIUM
            if 'priority' in data:
                try:
                    priority = EventPriority(data['priority'])
                except ValueError:
                    return Response(
                        {'error': f'Invalid priority: {data["priority"]}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            target_services = data.get('target_services')
            async_processing = data.get('async_processing', True)
            
            # Publish event
            publisher = EventPublisher()
            event_id = publisher.publish(
                event_type=event_type,
                data=data['data'],
                priority=priority,
                target_services=target_services,
                async_processing=async_processing
            )
            
            return Response(
                {
                    'event_id': event_id,
                    'message': 'Event published successfully'
                },
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Error publishing event: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EventStatusView(APIView):
    """API endpoint for checking event processing status."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, event_id):
        """Get the processing status of an event."""
        try:
            # Check published events
            published_key = f"events:published:{event_id}"
            published_data = cache.get(published_key)
            
            # Check processed events
            processed_key = f"events:processed:{event_id}"
            processed_data = cache.get(processed_key)
            
            if not published_data and not processed_data:
                return Response(
                    {'error': 'Event not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            response_data = {
                'event_id': event_id,
                'published': published_data,
                'processed': processed_data
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting event status: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EventStatsView(APIView):
    """API endpoint for event statistics."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get event processing statistics."""
        try:
            # Get recent events
            recent_events = cache.get('events:published:recent', [])
            
            # Get failed events
            failed_events = cache.get('events:failed', [])
            
            # Calculate stats
            total_events = len(recent_events)
            failed_count = len(failed_events)
            success_rate = ((total_events - failed_count) / total_events * 100) if total_events > 0 else 0
            
            # Group by event type
            event_type_stats = {}
            for event in recent_events:
                event_type = event.get('event_type', 'unknown')
                event_type_stats[event_type] = event_type_stats.get(event_type, 0) + 1
            
            response_data = {
                'total_events': total_events,
                'failed_events': failed_count,
                'success_rate': round(success_rate, 2),
                'event_type_distribution': event_type_stats,
                'recent_events': recent_events[-10:],  # Last 10 events
                'recent_failures': failed_events[-5:]   # Last 5 failures
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting event stats: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retry_failed_event(request, event_id):
    """Retry a failed event."""
    try:
        # Get failed event
        failed_events = cache.get('events:failed', [])
        failed_event = None
        
        for event in failed_events:
            if event['event_payload']['event_id'] == event_id:
                failed_event = event
                break
        
        if not failed_event:
            return Response(
                {'error': 'Failed event not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Retry the event
        publisher = EventPublisher()
        event_payload = failed_event['event_payload']
        event_payload['retry_count'] = 0  # Reset retry count
        
        new_event_id = publisher.publish(
            event_type=EventType(event_payload['event_type']),
            data=event_payload['data'],
            priority=EventPriority(event_payload['priority']),
            target_services=event_payload['target_services']
        )
        
        return Response(
            {
                'message': 'Event retry initiated',
                'original_event_id': event_id,
                'new_event_id': new_event_id
            },
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Error retrying event: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_check(request):
    """Health check endpoint for event system."""
    try:
        # Check cache connectivity
        cache.set('health_check', 'ok', timeout=10)
        cache_status = cache.get('health_check') == 'ok'
        
        # Check recent event processing
        recent_events = cache.get('events:published:recent', [])
        recent_processing = len([e for e in recent_events if 
                               (datetime.utcnow() - datetime.fromisoformat(e['timestamp'])).seconds < 300]) > 0
        
        health_status = {
            'status': 'healthy' if cache_status else 'unhealthy',
            'cache_connectivity': cache_status,
            'recent_event_activity': recent_processing,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        status_code = status.HTTP_200_OK if cache_status else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(health_status, status=status_code)
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return Response(
            {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )