from celery import shared_task
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import logging

from .models import StudentProfile, EmployerProfile, InstitutionProfile, ProfileInvitation
from user_service.utils.helpers import notify_service, make_service_request

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def sync_student_with_institution(self, student_profile_id):
    """
    Sync student profile with institution service for verification.
    """
    try:
        profile = StudentProfile.objects.get(id=student_profile_id)
        
        # Prepare data for institution service
        sync_data = {
            'user_id': str(profile.user_id),
            'registration_number': profile.registration_number,
            'institution_id': str(profile.institution_id),
            'course_id': str(profile.course_id) if profile.course_id else None,
            'year_of_study': profile.year_of_study,
            'academic_year': profile.academic_year,
            'registration_method': profile.registration_method,
            'university_code_used': profile.university_code_used
        }
        
        # Make request to institution service
        from django.conf import settings
        institution_url = f"{settings.INSTITUTION_SERVICE_URL}/api/students/verify/"
        response = make_service_request(
            institution_url,
            method='POST',
            data=sync_data
        )
        
        if response and response.get('verified'):
            profile.university_verified = True
            profile.last_university_sync = timezone.now()
            profile.save()
            
            # Notify user about verification
            notify_service(
                'notification',
                'student_verified',
                {
                    'user_id': str(profile.user_id),
                    'institution_name': profile.institution_name,
                    'verification_type': 'university'
                }
            )
            
            logger.info(f"Student profile {profile.id} verified successfully")
        else:
            logger.warning(f"Student profile {profile.id} verification failed")
            
    except StudentProfile.DoesNotExist:
        logger.error(f"Student profile {student_profile_id} not found")
    except Exception as exc:
        logger.error(f"Error syncing student profile {student_profile_id}: {exc}")
        raise self.retry(countdown=60 * (self.request.retries + 1))


@shared_task
def cleanup_expired_invitations():
    """
    Clean up expired profile invitations.
    """
    try:
        expired_invitations = ProfileInvitation.objects.filter(
            expires_at__lt=timezone.now(),
            is_used=False
        )
        
        count = expired_invitations.count()
        expired_invitations.delete()
        
        logger.info(f"Cleaned up {count} expired invitations")
        return count
        
    except Exception as e:
        logger.error(f"Error cleaning up expired invitations: {e}")
        raise


@shared_task
def sync_profile_completion_scores():
    """
    Update profile completion scores for all profiles.
    """
    try:
        updated_count = 0
        
        # Update student profiles
        for profile in StudentProfile.objects.filter(is_active=True):
            old_score = profile.profile_completion_score
            new_score = profile.calculate_completion_score()
            
            if old_score != new_score:
                profile.profile_completion_score = new_score
                profile.save(update_fields=['profile_completion_score'])
                updated_count += 1
        
        # Update employer profiles
        for profile in EmployerProfile.objects.filter(is_active=True):
            old_score = profile.profile_completion_score
            new_score = profile.calculate_completion_score()
            
            if old_score != new_score:
                profile.profile_completion_score = new_score
                profile.save(update_fields=['profile_completion_score'])
                updated_count += 1
        
        # Update institution profiles
        for profile in InstitutionProfile.objects.filter(is_active=True):
            old_score = profile.profile_completion_score
            new_score = profile.calculate_completion_score()
            
            if old_score != new_score:
                profile.profile_completion_score = new_score
                profile.save(update_fields=['profile_completion_score'])
                updated_count += 1
        
        logger.info(f"Updated completion scores for {updated_count} profiles")
        return updated_count
        
    except Exception as e:
        logger.error(f"Error syncing profile completion scores: {e}")
        raise


@shared_task
def cleanup_inactive_profiles():
    """
    Clean up inactive profiles older than specified period.
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=365)  # 1 year
        
        # Find inactive profiles
        inactive_students = StudentProfile.objects.filter(
            is_active=False,
            updated_at__lt=cutoff_date
        )
        
        inactive_employers = EmployerProfile.objects.filter(
            is_active=False,
            updated_at__lt=cutoff_date
        )
        
        student_count = inactive_students.count()
        employer_count = inactive_employers.count()
        
        # Archive or delete (depending on business requirements)
        # For now, we'll just mark them for cleanup
        inactive_students.update(is_active=False)
        inactive_employers.update(is_active=False)
        
        logger.info(f"Marked {student_count} student and {employer_count} employer profiles for cleanup")
        return student_count + employer_count
        
    except Exception as e:
        logger.error(f"Error cleaning up inactive profiles: {e}")
        raise


@shared_task(bind=True, max_retries=3)
def send_profile_completion_reminder(self, user_id, profile_type):
    """
    Send reminder to complete profile.
    """
    try:
        # Get profile based on type
        if profile_type == 'student':
            profile = StudentProfile.objects.get(user_id=user_id)
        elif profile_type == 'employer':
            profile = EmployerProfile.objects.get(user_id=user_id)
        elif profile_type == 'institution':
            profile = InstitutionProfile.objects.get(user_id=user_id)
        else:
            logger.error(f"Invalid profile type: {profile_type}")
            return
        
        # Check if reminder is needed
        if profile.profile_completion_score >= 80:
            logger.info(f"Profile {profile.id} already well completed, skipping reminder")
            return
        
        # Send notification
        notify_service(
            'notification',
            'profile_completion_reminder',
            {
                'user_id': str(user_id),
                'profile_type': profile_type,
                'completion_score': profile.profile_completion_score,
                'missing_fields': profile.get_missing_fields() if hasattr(profile, 'get_missing_fields') else []
            }
        )
        
        logger.info(f"Sent profile completion reminder to user {user_id}")
        
    except Exception as exc:
        logger.error(f"Error sending profile completion reminder to {user_id}: {exc}")
        raise self.retry(countdown=60 * (self.request.retries + 1))


@shared_task
def batch_verify_students(institution_id, student_ids):
    """
    Batch verify students for an institution.
    """
    try:
        verified_count = 0
        failed_count = 0
        
        for student_id in student_ids:
            try:
                profile = StudentProfile.objects.get(
                    id=student_id,
                    institution_id=institution_id
                )
                
                profile.university_verified = True
                profile.last_university_sync = timezone.now()
                profile.save()
                
                # Send notification
                notify_service(
                    'notification',
                    'student_verified',
                    {
                        'user_id': str(profile.user_id),
                        'institution_name': profile.institution_name,
                        'verification_type': 'batch_university'
                    }
                )
                
                verified_count += 1
                
            except StudentProfile.DoesNotExist:
                logger.warning(f"Student profile {student_id} not found")
                failed_count += 1
            except Exception as e:
                logger.error(f"Error verifying student {student_id}: {e}")
                failed_count += 1
        
        logger.info(f"Batch verification completed: {verified_count} verified, {failed_count} failed")
        return {'verified': verified_count, 'failed': failed_count}
        
    except Exception as e:
        logger.error(f"Error in batch student verification: {e}")
        raise


@shared_task
def sync_institution_data(institution_id):
    """
    Sync institution data with institution service.
    """
    try:
        from django.conf import settings
        
        # Get institution data from institution service
        institution_url = f"{settings.INSTITUTION_SERVICE_URL}/api/institutions/{institution_id}/"
        response = make_service_request(institution_url, method='GET')
        
        if response:
            # Update all profiles with this institution
            StudentProfile.objects.filter(institution_id=institution_id).update(
                institution_name=response.get('name', ''),
                updated_at=timezone.now()
            )
            
            InstitutionProfile.objects.filter(institution_id=institution_id).update(
                updated_at=timezone.now()
            )
            
            logger.info(f"Synced institution data for {institution_id}")
        else:
            logger.warning(f"Failed to sync institution data for {institution_id}")
            
    except Exception as e:
        logger.error(f"Error syncing institution data for {institution_id}: {e}")
        raise


@shared_task
def generate_profile_analytics(profile_type=None, institution_id=None):
    """
    Generate analytics data for profiles.
    """
    try:
        from django.db.models import Count, Avg
        
        analytics_data = {
            'timestamp': timezone.now().isoformat(),
            'profile_analytics': {}
        }
        
        if not profile_type or profile_type == 'student':
            student_queryset = StudentProfile.objects.all()
            if institution_id:
                student_queryset = student_queryset.filter(institution_id=institution_id)
            
            analytics_data['profile_analytics']['students'] = {
                'total': student_queryset.count(),
                'verified': student_queryset.filter(university_verified=True).count(),
                'active': student_queryset.filter(is_active=True).count(),
                'avg_completion': student_queryset.aggregate(
                    avg=Avg('profile_completion_score')
                )['avg'] or 0,
                'by_year': list(student_queryset.values('year_of_study').annotate(
                    count=Count('id')
                ).order_by('year_of_study')),
                'by_internship_status': list(student_queryset.values('internship_status').annotate(
                    count=Count('id')
                ))
            }
        
        if not profile_type or profile_type == 'employer':
            employer_queryset = EmployerProfile.objects.all()
            
            analytics_data['profile_analytics']['employers'] = {
                'total': employer_queryset.count(),
                'verified': employer_queryset.filter(is_verified=True).count(),
                'active': employer_queryset.filter(is_active=True).count(),
                'avg_completion': employer_queryset.aggregate(
                    avg=Avg('profile_completion_score')
                )['avg'] or 0,
                'by_industry': list(employer_queryset.values('industry').annotate(
                    count=Count('id')
                ).order_by('industry')),
                'by_company_size': list(employer_queryset.values('company_size').annotate(
                    count=Count('id')
                ))
            }
        
        # Store analytics in cache or send to analytics service
        from django.core.cache import cache
        cache_key = f"profile_analytics:{profile_type or 'all'}:{institution_id or 'all'}"
        cache.set(cache_key, analytics_data, 3600)  # Cache for 1 hour
        
        logger.info(f"Generated profile analytics for {profile_type or 'all'} profiles")
        return analytics_data
        
    except Exception as e:
        logger.error(f"Error generating profile analytics: {e}")
        raise