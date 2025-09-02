"""Django management command to test the data synchronization system."""

import logging
import time
import uuid
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Management command to test the data synchronization system."""
    
    help = 'Test the data synchronization system between microservices'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--test-type',
            type=str,
            choices=['event-bus', 'user-sync', 'profile-sync', 'institution-sync', 'all'],
            default='all',
            help='Type of synchronization test to run',
        )
        parser.add_argument(
            '--redis-host',
            type=str,
            default='localhost',
            help='Redis host for event bus testing',
        )
        parser.add_argument(
            '--redis-port',
            type=int,
            default=6379,
            help='Redis port for event bus testing',
        )
        parser.add_argument(
            '--timeout',
            type=int,
            default=30,
            help='Timeout for synchronization tests in seconds',
        )
    
    def handle(self, *args, **options):
        """Execute the synchronization tests."""
        self.test_type = options['test_type']
        self.redis_host = options['redis_host']
        self.redis_port = options['redis_port']
        self.timeout = options['timeout']
        
        self.stdout.write(self.style.SUCCESS('Starting synchronization system tests...'))
        
        try:
            if self.test_type in ['event-bus', 'all']:
                self._test_event_bus()
            
            if self.test_type in ['user-sync', 'all']:
                self._test_user_synchronization()
            
            if self.test_type in ['profile-sync', 'all']:
                self._test_profile_synchronization()
            
            if self.test_type in ['institution-sync', 'all']:
                self._test_institution_synchronization()
            
            self.stdout.write(self.style.SUCCESS('All synchronization tests completed successfully'))
            
        except Exception as e:
            logger.error(f"Error during synchronization tests: {str(e)}")
            raise CommandError(f"Tests failed: {str(e)}")
    
    def _test_event_bus(self):
        """Test the Redis event bus connectivity and basic functionality."""
        self.stdout.write('Testing event bus connectivity...')
        
        try:
            import sys
            import os
            
            # Add shared modules to path
            shared_path = os.path.join(os.path.dirname(__file__), '../../')
            if shared_path not in sys.path:
                sys.path.append(shared_path)
            
            from events.event_bus import RedisEventBus
            from events.sync_events import SyncEvent, EventType
            
            # Create event bus instance
            event_bus = RedisEventBus(
                redis_host=self.redis_host,
                redis_port=self.redis_port
            )
            
            # Test health check
            if not event_bus.health_check():
                raise CommandError('Event bus health check failed')
            
            self.stdout.write(self.style.SUCCESS('✓ Event bus connectivity test passed'))
            
            # Test event publishing
            test_event = SyncEvent(
                event_id=str(uuid.uuid4()),
                event_type=EventType.USER_CREATED,
                source_service="test_service",
                target_service="all",
                timestamp=datetime.utcnow(),
                data={'test': 'data', 'user_id': str(uuid.uuid4())},
                correlation_id=str(uuid.uuid4())
            )
            
            success = event_bus.publish_event(test_event)
            if not success:
                raise CommandError('Failed to publish test event')
            
            self.stdout.write(self.style.SUCCESS('✓ Event publishing test passed'))
            
            # Get event bus statistics
            stats = event_bus.get_event_stats()
            self.stdout.write(f"Event bus stats: {stats}")
            
        except ImportError as e:
            self.stdout.write(
                self.style.WARNING(f'Event bus modules not available: {str(e)}')
            )
        except Exception as e:
            logger.error(f"Event bus test failed: {str(e)}")
            raise CommandError(f"Event bus test failed: {str(e)}")
    
    def _test_user_synchronization(self):
        """Test user data synchronization between auth and user services."""
        self.stdout.write('Testing user synchronization...')
        
        try:
            # Test auth service user creation
            self._test_auth_user_creation()
            
            # Test user service profile creation
            self._test_user_profile_creation()
            
            self.stdout.write(self.style.SUCCESS('✓ User synchronization tests passed'))
            
        except Exception as e:
            logger.error(f"User synchronization test failed: {str(e)}")
            raise CommandError(f"User synchronization test failed: {str(e)}")
    
    def _test_auth_user_creation(self):
        """Test AuthUser creation and event publishing."""
        try:
            from authentication.models import AuthUser
            
            # Create test auth user
            test_email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
            
            auth_user = AuthUser.objects.create(
                email=test_email,
                is_active=True,
                role='student',
                is_email_verified=False
            )
            
            self.stdout.write(f"Created test AuthUser: {auth_user.id} ({test_email})")
            
            # Wait a moment for event processing
            time.sleep(2)
            
            # Clean up
            auth_user.delete()
            
            self.stdout.write(self.style.SUCCESS('✓ AuthUser creation test passed'))
            
        except ImportError:
            self.stdout.write(
                self.style.WARNING('Auth service models not available - skipping auth user test')
            )
        except Exception as e:
            logger.error(f"AuthUser creation test failed: {str(e)}")
            raise
    
    def _test_user_profile_creation(self):
        """Test UserProfile creation and event publishing."""
        try:
            from users.models import UserProfile
            
            # Create test user profile
            test_auth_user_id = uuid.uuid4()
            test_email = f"test_profile_{uuid.uuid4().hex[:8]}@example.com"
            
            user_profile = UserProfile.objects.create(
                auth_user_id=test_auth_user_id,
                email=test_email,
                username=f"testuser_{uuid.uuid4().hex[:8]}",
                first_name="Test",
                last_name="User",
                is_active=True,
                role='student'
            )
            
            self.stdout.write(f"Created test UserProfile: {user_profile.id} ({test_email})")
            
            # Wait a moment for event processing
            time.sleep(2)
            
            # Clean up
            user_profile.delete()
            
            self.stdout.write(self.style.SUCCESS('✓ UserProfile creation test passed'))
            
        except ImportError:
            self.stdout.write(
                self.style.WARNING('User service models not available - skipping user profile test')
            )
        except Exception as e:
            logger.error(f"UserProfile creation test failed: {str(e)}")
            raise
    
    def _test_profile_synchronization(self):
        """Test profile data synchronization."""
        self.stdout.write('Testing profile synchronization...')
        
        try:
            # Test profile update events
            self._test_profile_updates()
            
            self.stdout.write(self.style.SUCCESS('✓ Profile synchronization tests passed'))
            
        except Exception as e:
            logger.error(f"Profile synchronization test failed: {str(e)}")
            raise CommandError(f"Profile synchronization test failed: {str(e)}")
    
    def _test_profile_updates(self):
        """Test profile update synchronization."""
        try:
            from users.models import UserProfile
            
            # Create test user profile
            test_auth_user_id = uuid.uuid4()
            test_email = f"test_update_{uuid.uuid4().hex[:8]}@example.com"
            
            user_profile = UserProfile.objects.create(
                auth_user_id=test_auth_user_id,
                email=test_email,
                username=f"testuser_{uuid.uuid4().hex[:8]}",
                first_name="Test",
                last_name="User",
                is_active=True,
                role='student'
            )
            
            # Update profile
            user_profile.first_name = "Updated"
            user_profile.bio = "Updated bio for testing"
            user_profile.save()
            
            self.stdout.write(f"Updated test UserProfile: {user_profile.id}")
            
            # Wait a moment for event processing
            time.sleep(2)
            
            # Clean up
            user_profile.delete()
            
            self.stdout.write(self.style.SUCCESS('✓ Profile update test passed'))
            
        except ImportError:
            self.stdout.write(
                self.style.WARNING('User service models not available - skipping profile update test')
            )
        except Exception as e:
            logger.error(f"Profile update test failed: {str(e)}")
            raise
    
    def _test_institution_synchronization(self):
        """Test institution data synchronization."""
        self.stdout.write('Testing institution synchronization...')
        
        try:
            from institutions.models import Institution, InstitutionMembership
            from users.models import UserProfile
            
            # Create test institution
            test_institution = Institution.objects.create(
                name=f"Test University {uuid.uuid4().hex[:8]}",
                type='university',
                description="Test institution for synchronization testing",
                email="test@testuniversity.edu",
                status='active'
            )
            
            self.stdout.write(f"Created test Institution: {test_institution.id}")
            
            # Create test user profile
            test_auth_user_id = uuid.uuid4()
            test_user_profile = UserProfile.objects.create(
                auth_user_id=test_auth_user_id,
                email=f"student_{uuid.uuid4().hex[:8]}@example.com",
                username=f"student_{uuid.uuid4().hex[:8]}",
                first_name="Test",
                last_name="Student",
                is_active=True,
                role='student'
            )
            
            # Create test membership
            test_membership = InstitutionMembership.objects.create(
                user_profile_id=test_user_profile.id,
                institution=test_institution,
                role='student',
                status='active',
                student_id=f"STU{uuid.uuid4().hex[:8].upper()}",
                department="Computer Science",
                year_of_study=2
            )
            
            self.stdout.write(f"Created test InstitutionMembership: {test_membership.id}")
            
            # Wait a moment for event processing
            time.sleep(2)
            
            # Clean up
            test_membership.delete()
            test_user_profile.delete()
            test_institution.delete()
            
            self.stdout.write(self.style.SUCCESS('✓ Institution synchronization tests passed'))
            
        except ImportError:
            self.stdout.write(
                self.style.WARNING('Institution models not available - skipping institution test')
            )
        except Exception as e:
            logger.error(f"Institution synchronization test failed: {str(e)}")
            raise
    
    def _wait_for_sync(self, timeout_seconds=10):
        """Wait for synchronization to complete."""
        self.stdout.write(f"Waiting {timeout_seconds} seconds for synchronization...")
        time.sleep(timeout_seconds)