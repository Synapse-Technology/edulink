from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime
from .models import StudentProfile, EmployerProfile, InstitutionProfile, ProfileInvitation
from user_service.utils import ServiceClient, send_profile_update_notification
from events.publisher import EventPublisher
from events.types import EventType, EventPriority
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=StudentProfile)
def student_profile_post_save(sender, instance, created, **kwargs):
    """Handle student profile creation and updates."""
    try:
        # Clear profile stats cache
        cache.delete('profile_stats')
        
        # Publish event for profile creation/update
        publisher = EventPublisher()
        
        if created:
            logger.info(f"Student profile created for user {instance.user_id}")
            
            # Send welcome notification
            try:
                send_profile_update_notification(
                    instance.user_id,
                    'profile_created',
                    {
                        'profile_type': 'student',
                        'completion_score': instance.profile_completion_score
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send welcome notification: {e}")
            
            # Publish student profile created event
            publisher.publish(
                event_type=EventType.STUDENT_PROFILE_CREATED,
                data={
                    'user_id': instance.user_id,
                    'profile_id': instance.id,
                    'institution_id': instance.institution_id,
                    'registration_number': instance.registration_number,
                    'course_id': instance.course_id,
                    'year_of_study': instance.year_of_study,
                    'completion_score': instance.profile_completion_score
                },
                priority=EventPriority.HIGH
            )
        else:
            logger.info(f"Student profile updated for user {instance.user_id}")
            
            # Publish student profile updated event
            publisher.publish(
                event_type=EventType.STUDENT_PROFILE_UPDATED,
                data={
                    'user_id': instance.user_id,
                    'profile_id': instance.id,
                    'institution_id': instance.institution_id,
                    'completion_score': instance.profile_completion_score,
                    'changes': getattr(instance, '_changed_fields', [])
                },
                priority=EventPriority.MEDIUM
            )
            
            # Check if profile completion improved significantly
            if hasattr(instance, '_old_completion_score'):
                old_score = instance._old_completion_score
                new_score = instance.profile_completion_score
                
                if new_score - old_score >= 20:  # 20% improvement
                    try:
                        send_profile_update_notification(
                            instance.user_id,
                            'profile_completion_milestone',
                            {
                                'old_score': old_score,
                                'new_score': new_score,
                                'milestone': 'significant_improvement'
                            }
                        )
                    except Exception as e:
                        logger.error(f"Failed to send milestone notification: {e}")
        
        # Sync with institution service if institution-related fields changed
        if instance.institution_id:
            try:
                service_client = ServiceClient()
                service_client.post(
                    'institution',
                    '/api/students/sync/',
                    {
                        'user_id': instance.user_id,
                        'institution_id': instance.institution_id,
                        'registration_number': instance.registration_number,
                        'course_id': instance.course_id,
                        'year_of_study': instance.year_of_study
                    }
                )
            except Exception as e:
                logger.error(f"Failed to sync with institution service: {e}")
    
    except Exception as e:
        logger.error(f"Error in student profile post_save signal: {e}")


@receiver(pre_save, sender=StudentProfile)
def student_profile_pre_save(sender, instance, **kwargs):
    """Store old completion score before saving."""
    if instance.pk:
        try:
            old_instance = StudentProfile.objects.get(pk=instance.pk)
            instance._old_completion_score = old_instance.profile_completion_score
        except StudentProfile.DoesNotExist:
            instance._old_completion_score = 0


@receiver(post_save, sender=EmployerProfile)
def employer_profile_post_save(sender, instance, created, **kwargs):
    """Handle employer profile creation and updates."""
    try:
        # Clear profile stats cache
        cache.delete('profile_stats')
        
        # Publish event for profile creation/update
        publisher = EventPublisher()
        
        if created:
            logger.info(f"Employer profile created for user {instance.user_id}")
            
            # Send welcome notification
            try:
                send_profile_update_notification(
                    instance.user_id,
                    'profile_created',
                    {
                        'profile_type': 'employer',
                        'company_name': instance.company.name if instance.company else None,
                        'completion_score': instance.profile_completion_score
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send welcome notification: {e}")
            
            # Publish employer profile created event
            publisher.publish(
                event_type=EventType.EMPLOYER_PROFILE_CREATED,
                data={
                    'user_id': instance.user_id,
                    'profile_id': instance.id,
                    'company_name': instance.company.name if instance.company else None,
                    'completion_score': instance.profile_completion_score
                },
                priority=EventPriority.HIGH
            )
            
            # Notify admin for verification if profile is complete enough
            if instance.profile_completion_score >= 80:
                try:
                    service_client = ServiceClient()
                    service_client.post(
                        'notification',
                        '/api/notifications/admin/',
                        {
                            'type': 'employer_verification_needed',
                            'user_id': instance.user_id,
                            'company_name': instance.company.name if instance.company else None,
                            'completion_score': instance.profile_completion_score
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to notify admin for verification: {e}")
        else:
            logger.info(f"Employer profile updated for user {instance.user_id}")
            
            # Publish employer profile updated event
            publisher.publish(
                event_type=EventType.EMPLOYER_PROFILE_UPDATED,
                data={
                    'user_id': instance.user_id,
                    'profile_id': instance.id,
                    'company_name': instance.company.name if instance.company else None,
                    'completion_score': instance.profile_completion_score,
                    'changes': getattr(instance, '_changed_fields', [])
                },
                priority=EventPriority.MEDIUM
            )
    
    except Exception as e:
        logger.error(f"Error in employer profile post_save signal: {e}")


@receiver(pre_save, sender=EmployerProfile)
def employer_profile_pre_save(sender, instance, **kwargs):
    """Store old completion score before saving."""
    if instance.pk:
        try:
            old_instance = EmployerProfile.objects.get(pk=instance.pk)
            instance._old_completion_score = old_instance.profile_completion_score
        except EmployerProfile.DoesNotExist:
            instance._old_completion_score = 0


@receiver(post_save, sender=InstitutionProfile)
def institution_profile_post_save(sender, instance, created, **kwargs):
    """Handle institution profile creation and updates."""
    try:
        # Clear profile stats cache
        cache.delete('profile_stats')
        
        # Publish event for profile creation/update
        publisher = EventPublisher()
        
        if created:
            logger.info(f"Institution profile created for user {instance.user_id}")
            
            # Send welcome notification
            try:
                send_profile_update_notification(
                    instance.user_id,
                    'profile_created',
                    {
                        'profile_type': 'institution',
                        'institution_id': instance.institution_id,
                        'position': instance.position
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send welcome notification: {e}")
            
            # Publish institution profile created event
            publisher.publish(
                event_type=EventType.INSTITUTION_PROFILE_CREATED,
                data={
                    'user_id': instance.user_id,
                    'profile_id': instance.id,
                    'institution_id': instance.institution_id,
                    'position': instance.position,
                    'department': instance.department,
                    'permissions': {
                        'can_verify_students': instance.can_verify_students,
                        'can_manage_courses': instance.can_manage_courses,
                        'can_manage_departments': instance.can_manage_departments,
                        'can_view_analytics': instance.can_view_analytics
                    }
                },
                priority=EventPriority.HIGH
            )
            
            # Sync with institution service
            try:
                service_client = ServiceClient()
                service_client.post(
                    'institution',
                    '/api/staff/sync/',
                    {
                        'user_id': instance.user_id,
                        'institution_id': instance.institution_id,
                        'position': instance.position,
                        'department': instance.department,
                        'permissions': {
                            'can_verify_students': instance.can_verify_students,
                            'can_manage_courses': instance.can_manage_courses,
                            'can_manage_departments': instance.can_manage_departments,
                            'can_view_analytics': instance.can_view_analytics
                        }
                    }
                )
            except Exception as e:
                logger.error(f"Failed to sync with institution service: {e}")
        else:
            logger.info(f"Institution profile updated for user {instance.user_id}")
            
            # Publish institution profile updated event
            publisher.publish(
                event_type=EventType.INSTITUTION_PROFILE_UPDATED,
                data={
                    'user_id': instance.user_id,
                    'profile_id': instance.id,
                    'institution_id': instance.institution_id,
                    'changes': getattr(instance, '_changed_fields', [])
                },
                priority=EventPriority.MEDIUM
            )
    
    except Exception as e:
        logger.error(f"Error in institution profile post_save signal: {e}")


@receiver(post_save, sender=ProfileInvitation)
def profile_invitation_post_save(sender, instance, created, **kwargs):
    """Handle profile invitation creation."""
    if created:
        try:
            logger.info(f"Profile invitation created for {instance.email}")
            
            # Send invitation email
            service_client = ServiceClient()
            service_client.post(
                'notification',
                '/api/notifications/send-invitation/',
                {
                    'email': instance.email,
                    'profile_type': instance.profile_type,
                    'invitation_token': instance.token,
                    'expires_at': instance.expires_at.isoformat(),
                    'invited_by': instance.invited_by_user_id,
                    'institution_id': instance.institution_id,
                    'employer_id': instance.employer_id,
                    'metadata': instance.metadata
                }
            )
            
            logger.info(f"Invitation email sent to {instance.email}")
        
        except Exception as e:
            logger.error(f"Failed to send invitation email to {instance.email}: {e}")


@receiver(post_delete, sender=StudentProfile)
@receiver(post_delete, sender=EmployerProfile)
@receiver(post_delete, sender=InstitutionProfile)
def profile_post_delete(sender, instance, **kwargs):
    """Handle profile deletion."""
    try:
        # Clear profile stats cache
        cache.delete('profile_stats')
        
        profile_type = {
            StudentProfile: 'student',
            EmployerProfile: 'employer',
            InstitutionProfile: 'institution'
        }.get(sender, 'unknown')
        
        logger.info(f"{profile_type.title()} profile deleted for user {instance.user_id}")
        
        # Notify relevant services about profile deletion
        try:
            service_client = ServiceClient()
            
            if profile_type == 'student':
                # Notify institution service
                service_client.delete(
                    'institution',
                    f'/api/students/{instance.user_id}/'
                )
                
                # Notify internship service
                service_client.post(
                    'internship',
                    '/api/students/deactivate/',
                    {'user_id': instance.user_id}
                )
            
            elif profile_type == 'employer':
                # Notify internship service
                service_client.post(
                    'internship',
                    '/api/employers/deactivate/',
                    {'user_id': instance.user_id}
                )
            
            elif profile_type == 'institution':
                # Notify institution service
                service_client.delete(
                    'institution',
                    f'/api/staff/{instance.user_id}/'
                )
        
        except Exception as e:
            logger.error(f"Failed to notify services about profile deletion: {e}")
    
    except Exception as e:
        logger.error(f"Error in profile post_delete signal: {e}")


# Custom signal for profile verification
from django.dispatch import Signal

profile_verified = Signal()


@receiver(profile_verified)
def handle_profile_verification(sender, user_id, profile_type, **kwargs):
    """Handle profile verification event."""
    try:
        logger.info(f"{profile_type.title()} profile verified for user {user_id}")
        
        # Send verification notification
        send_profile_update_notification(
            user_id,
            'profile_verified',
            {
                'profile_type': profile_type,
                'verified_at': timezone.now().isoformat()
            }
        )
        
        # Publish profile verification event
        publisher = EventPublisher()
        publisher.publish(
            event_type=EventType.PROFILE_VERIFIED,
            data={
                'profile_type': profile_type,
                'user_id': user_id,
                'verified_at': timezone.now().isoformat()
            },
            priority=EventPriority.HIGH
        )
        
        # Notify relevant services
        service_client = ServiceClient()
        
        if profile_type == 'student':
            # Enable full access to internship features
            service_client.post(
                'internship',
                '/api/students/verify/',
                {'user_id': user_id}
            )
        
        elif profile_type == 'employer':
            # Enable posting internships
            service_client.post(
                'internship',
                '/api/employers/verify/',
                {'user_id': user_id}
            )
    
    except Exception as e:
        logger.error(f"Error handling profile verification: {e}")