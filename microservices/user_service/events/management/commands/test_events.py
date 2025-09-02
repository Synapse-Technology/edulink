from django.core.management.base import BaseCommand
from django.core.cache import cache
from events.publisher import EventPublisher
from events.types import EventType, EventPriority
import json


class Command(BaseCommand):
    help = 'Test event publishing and processing'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--event-type',
            type=str,
            default='STUDENT_PROFILE_CREATED',
            help='Event type to publish'
        )
        parser.add_argument(
            '--priority',
            type=str,
            default='MEDIUM',
            choices=['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            help='Event priority'
        )
        parser.add_argument(
            '--count',
            type=int,
            default=1,
            help='Number of events to publish'
        )
        parser.add_argument(
            '--clear-cache',
            action='store_true',
            help='Clear event cache before testing'
        )
        parser.add_argument(
            '--show-stats',
            action='store_true',
            help='Show event statistics'
        )
    
    def handle(self, *args, **options):
        if options['clear_cache']:
            self.stdout.write('Clearing event cache...')
            cache.delete_many([
                'events:published:recent',
                'events:failed',
                'events:stats'
            ])
            self.stdout.write(self.style.SUCCESS('Cache cleared'))
        
        if options['show_stats']:
            self.show_event_stats()
            return
        
        # Test event publishing
        event_type = getattr(EventType, options['event_type'])
        priority = getattr(EventPriority, options['priority'])
        count = options['count']
        
        self.stdout.write(f'Publishing {count} {event_type.value} event(s) with {priority.value} priority...')
        
        publisher = EventPublisher()
        published_events = []
        
        for i in range(count):
            test_data = {
                'user_id': f'test_user_{i + 1}',
                'profile_id': f'test_profile_{i + 1}',
                'test_sequence': i + 1,
                'timestamp': '2024-01-01T00:00:00Z'
            }
            
            try:
                event_id = publisher.publish(
                    event_type=event_type,
                    data=test_data,
                    priority=priority
                )
                published_events.append(event_id)
                self.stdout.write(f'  Published event {i + 1}: {event_id}')
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  Failed to publish event {i + 1}: {str(e)}')
                )
        
        self.stdout.write(self.style.SUCCESS(f'Successfully published {len(published_events)} events'))
        
        # Show published event details
        if published_events:
            self.stdout.write('\nPublished event details:')
            for event_id in published_events:
                event_data = cache.get(f'events:published:{event_id}')
                if event_data:
                    self.stdout.write(f'  {event_id}: {json.dumps(event_data, indent=2)}')
    
    def show_event_stats(self):
        """Display event statistics."""
        self.stdout.write('Event System Statistics:')
        self.stdout.write('=' * 50)
        
        # Recent events
        recent_events = cache.get('events:published:recent', [])
        self.stdout.write(f'Recent events: {len(recent_events)}')
        
        # Failed events
        failed_events = cache.get('events:failed', [])
        self.stdout.write(f'Failed events: {len(failed_events)}')
        
        # Success rate
        total_events = len(recent_events)
        failed_count = len(failed_events)
        success_rate = ((total_events - failed_count) / total_events * 100) if total_events > 0 else 0
        self.stdout.write(f'Success rate: {success_rate:.2f}%')
        
        # Event type distribution
        event_type_stats = {}
        for event in recent_events:
            event_type = event.get('event_type', 'unknown')
            event_type_stats[event_type] = event_type_stats.get(event_type, 0) + 1
        
        if event_type_stats:
            self.stdout.write('\nEvent type distribution:')
            for event_type, count in event_type_stats.items():
                self.stdout.write(f'  {event_type}: {count}')
        
        # Recent events details
        if recent_events:
            self.stdout.write('\nRecent events (last 5):')
            for event in recent_events[-5:]:
                self.stdout.write(f'  {event.get("event_id", "unknown")}: {event.get("event_type", "unknown")}')
        
        # Failed events details
        if failed_events:
            self.stdout.write('\nRecent failures (last 3):')
            for failure in failed_events[-3:]:
                event_payload = failure.get('event_payload', {})
                error = failure.get('error', 'Unknown error')
                self.stdout.write(f'  {event_payload.get("event_id", "unknown")}: {error}')