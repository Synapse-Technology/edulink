import json
import logging
from datetime import datetime
from typing import Dict, Any, Callable
from django.core.cache import cache
from django.db import transaction

from .types import EventType, EventStatus
from profiles.models import StudentProfile, EmployerProfile, InstitutionProfile
from roles.models import UserRole

logger = logging.getLogger(__name__)


class EventHandler:
    """Handler for processing incoming events from other services."""
    
    def __init__(self):
        self.handlers = self._register_handlers()
        self.processed_events_key = 'events:processed'
    
    def handle_event(self, event_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle incoming event from another service.
        
        Args:
            event_payload: Event data from source service
            
        Returns:
            Processing result
        """
        event_id = event_payload.get('event_id')
        event_type = event_payload.get('event_type')
        source_service = event_payload.get('source_service')
        
        try:
            # Check if event already processed
            if self._is_event_processed(event_id):
                logger.info(f"Event {event_id} already processed, skipping")
                return {
                    'status': EventStatus.COMPLETED.value,
                    'message': 'Event already processed',
                    'event_id': event_id
                }
            
            # Mark event as processing
            self._mark_event_processing(event_id, event_payload)
            
            # Get handler for event type
            handler = self.handlers.get(event_type)
            if not handler:
                logger.warning(f"No handler found for event type: {event_type}")
                return {
                    'status': EventStatus.FAILED.value,
                    'message': f'No handler for event type: {event_type}',
                    'event_id': event_id
                }
            
            # Process event
            with transaction.atomic():
                result = handler(event_payload)
            
            # Mark as completed
            self._mark_event_completed(event_id, result)
            
            logger.info(f"Event {event_id} processed successfully")
            return {
                'status': EventStatus.COMPLETED.value,
                'message': 'Event processed successfully',
                'event_id': event_id,
                'result': result
            }
            
        except Exception as e:
            logger.error(f"Failed to process event {event_id}: {str(e)}")
            self._mark_event_failed(event_id, str(e))
            return {
                'status': EventStatus.FAILED.value,
                'message': str(e),
                'event_id': event_id
            }
    
    def _register_handlers(self) -> Dict[str, Callable]:
        """Register event handlers for different event types."""
        return {
            # Auth service events
            EventType.USER_ROLE_ASSIGNED.value: self._handle_user_role_assigned,
            EventType.USER_ROLE_REMOVED.value: self._handle_user_role_removed,
            
            # Institution service events
            EventType.STUDENT_ENROLLED.value: self._handle_student_enrolled,
            EventType.STUDENT_UNENROLLED.value: self._handle_student_unenrolled,
            EventType.COURSE_ENROLLMENT_UPDATED.value: self._handle_course_enrollment_updated,
            
            # Notification service events
            EventType.EMAIL_VERIFICATION_REQUESTED.value: self._handle_email_verification_requested,
            EventType.SMS_VERIFICATION_REQUESTED.value: self._handle_sms_verification_requested,
            
            # System events
            EventType.DATA_SYNC_REQUESTED.value: self._handle_data_sync_requested,
            EventType.CACHE_INVALIDATION_REQUESTED.value: self._handle_cache_invalidation,
        }
    
    def _is_event_processed(self, event_id: str) -> bool:
        """Check if event has already been processed."""
        cache_key = f"{self.processed_events_key}:{event_id}"
        return cache.get(cache_key) is not None
    
    def _mark_event_processing(self, event_id: str, event_payload: Dict[str, Any]):
        """Mark event as currently being processed."""
        cache_key = f"{self.processed_events_key}:{event_id}"
        processing_data = {
            'status': EventStatus.PROCESSING.value,
            'started_at': datetime.utcnow().isoformat(),
            'event_payload': event_payload
        }
        cache.set(cache_key, processing_data, timeout=3600)  # 1 hour
    
    def _mark_event_completed(self, event_id: str, result: Any):
        """Mark event as completed."""
        cache_key = f"{self.processed_events_key}:{event_id}"
        completed_data = {
            'status': EventStatus.COMPLETED.value,
            'completed_at': datetime.utcnow().isoformat(),
            'result': result
        }
        cache.set(cache_key, completed_data, timeout=86400)  # 24 hours
    
    def _mark_event_failed(self, event_id: str, error: str):
        """Mark event as failed."""
        cache_key = f"{self.processed_events_key}:{event_id}"
        failed_data = {
            'status': EventStatus.FAILED.value,
            'failed_at': datetime.utcnow().isoformat(),
            'error': error
        }
        cache.set(cache_key, failed_data, timeout=86400)  # 24 hours
    
    # Event handler methods
    
    def _handle_user_role_assigned(self, event_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user role assignment from auth service."""
        data = event_payload['data']
        user_id = data['user_id']
        role_name = data['role_name']
        permissions = data.get('permissions', [])
        
        # Update or create user role
        user_role, created = UserRole.objects.update_or_create(
            user_id=user_id,
            defaults={
                'role_name': role_name,
                'permissions': permissions,
                'is_active': True
            }
        )
        
        return {
            'user_id': user_id,
            'role_assigned': role_name,
            'created': created
        }
    
    def _handle_user_role_removed(self, event_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user role removal from auth service."""
        data = event_payload['data']
        user_id = data['user_id']
        role_name = data['role_name']
        
        # Deactivate user role
        updated = UserRole.objects.filter(
            user_id=user_id,
            role_name=role_name
        ).update(is_active=False)
        
        return {
            'user_id': user_id,
            'role_removed': role_name,
            'updated': updated > 0
        }
    
    def _handle_student_enrolled(self, event_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle student enrollment from institution service."""
        data = event_payload['data']
        user_id = data['user_id']
        institution_id = data['institution_id']
        course_id = data.get('course_id')
        registration_number = data.get('registration_number')
        
        # Update student profile with enrollment info
        try:
            profile = StudentProfile.objects.get(user_id=user_id)
            profile.institution_id = institution_id
            if course_id:
                profile.course_id = course_id
            if registration_number:
                profile.registration_number = registration_number
            profile.save()
            
            return {
                'user_id': user_id,
                'enrolled': True,
                'institution_id': institution_id
            }
        except StudentProfile.DoesNotExist:
            logger.warning(f"Student profile not found for user {user_id}")
            return {
                'user_id': user_id,
                'enrolled': False,
                'error': 'Student profile not found'
            }
    
    def _handle_student_unenrolled(self, event_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle student unenrollment from institution service."""
        data = event_payload['data']
        user_id = data['user_id']
        institution_id = data['institution_id']
        
        # Update student profile
        try:
            profile = StudentProfile.objects.get(
                user_id=user_id,
                institution_id=institution_id
            )
            profile.is_active = False
            profile.save()
            
            return {
                'user_id': user_id,
                'unenrolled': True,
                'institution_id': institution_id
            }
        except StudentProfile.DoesNotExist:
            logger.warning(f"Student profile not found for user {user_id}")
            return {
                'user_id': user_id,
                'unenrolled': False,
                'error': 'Student profile not found'
            }
    
    def _handle_course_enrollment_updated(self, event_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle course enrollment update from institution service."""
        data = event_payload['data']
        user_id = data['user_id']
        course_id = data['course_id']
        course_name = data.get('course_name')
        year_of_study = data.get('year_of_study')
        
        # Update student profile
        try:
            profile = StudentProfile.objects.get(user_id=user_id)
            profile.course_id = course_id
            if course_name:
                profile.course_name = course_name
            if year_of_study:
                profile.year_of_study = year_of_study
            profile.save()
            
            return {
                'user_id': user_id,
                'course_updated': True,
                'course_id': course_id
            }
        except StudentProfile.DoesNotExist:
            logger.warning(f"Student profile not found for user {user_id}")
            return {
                'user_id': user_id,
                'course_updated': False,
                'error': 'Student profile not found'
            }
    
    def _handle_email_verification_requested(self, event_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle email verification request from notification service."""
        data = event_payload['data']
        user_id = data['user_id']
        email = data['email']
        verification_code = data.get('verification_code')
        
        # Update profile verification status
        profiles_updated = 0
        
        for model in [StudentProfile, EmployerProfile, InstitutionProfile]:
            updated = model.objects.filter(user_id=user_id).update(
                phone_verified=True if verification_code else False
            )
            profiles_updated += updated
        
        return {
            'user_id': user_id,
            'email_verification_processed': True,
            'profiles_updated': profiles_updated
        }
    
    def _handle_sms_verification_requested(self, event_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle SMS verification request from notification service."""
        data = event_payload['data']
        user_id = data['user_id']
        phone_number = data['phone_number']
        verification_code = data.get('verification_code')
        
        # Update profile verification status
        profiles_updated = 0
        
        for model in [StudentProfile, EmployerProfile, InstitutionProfile]:
            updated = model.objects.filter(user_id=user_id).update(
                phone_verified=True if verification_code else False
            )
            profiles_updated += updated
        
        return {
            'user_id': user_id,
            'sms_verification_processed': True,
            'profiles_updated': profiles_updated
        }
    
    def _handle_data_sync_requested(self, event_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle data synchronization request."""
        data = event_payload['data']
        sync_type = data.get('sync_type', 'full')
        target_service = data.get('target_service')
        
        # Trigger appropriate sync tasks
        from profiles.tasks import sync_institution_data, sync_student_with_institution
        
        if sync_type == 'institution' and target_service == 'institution_service':
            # Sync all institution-related data
            institution_ids = StudentProfile.objects.values_list(
                'institution_id', flat=True
            ).distinct()
            
            for institution_id in institution_ids:
                if institution_id:
                    sync_institution_data.delay(str(institution_id))
        
        return {
            'sync_requested': True,
            'sync_type': sync_type,
            'target_service': target_service
        }
    
    def _handle_cache_invalidation(self, event_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle cache invalidation request."""
        data = event_payload['data']
        cache_keys = data.get('cache_keys', [])
        cache_patterns = data.get('cache_patterns', [])
        
        invalidated_count = 0
        
        # Invalidate specific keys
        for key in cache_keys:
            cache.delete(key)
            invalidated_count += 1
        
        # Invalidate by patterns (simplified - would need Redis for pattern matching)
        for pattern in cache_patterns:
            if pattern == 'profile_stats':
                cache.delete('profile_stats')
                invalidated_count += 1
            elif pattern.startswith('events:'):
                # Clear event-related cache
                for event_key in ['events:published:recent', 'events:failed']:
                    cache.delete(event_key)
                    invalidated_count += 1
        
        return {
            'cache_invalidated': True,
            'invalidated_count': invalidated_count
        }