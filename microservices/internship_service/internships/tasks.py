from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging
from typing import Dict, Any

from .models import Internship, SkillTag
from shared.events import EventType, publish_event
from shared.message_queue import publish_service_event

logger = logging.getLogger(__name__)


@shared_task(bind=True, queue='internship_queue')
def verify_internship(self, internship_id: int) -> Dict[str, Any]:
    """
    Verify an internship posting
    """
    try:
        internship = Internship.objects.get(id=internship_id)
        
        # Perform verification checks
        verification_passed = True
        verification_notes = []
        
        # Check if employer is verified
        # This would typically call the user service
        # For now, we'll simulate the check
        
        # Check internship content
        if len(internship.description) < 100:
            verification_passed = False
            verification_notes.append("Description too short")
        
        if not internship.requirements:
            verification_passed = False
            verification_notes.append("Missing requirements")
        
        if not internship.application_deadline or internship.application_deadline <= timezone.now().date():
            verification_passed = False
            verification_notes.append("Invalid application deadline")
        
        # Update internship status
        if verification_passed:
            internship.is_verified = True
            internship.verification_notes = "Verification passed"
            status = 'verified'
        else:
            internship.is_verified = False
            internship.verification_notes = "; ".join(verification_notes)
            status = 'rejected'
        
        internship.save()
        
        # Publish event
        publish_service_event(
            EventType.INTERNSHIP_VERIFIED,
            'internship_service',
            {
                'internship_id': internship_id,
                'status': status,
                'verification_notes': internship.verification_notes,
                'employer_id': internship.employer_id
            }
        )
        
        logger.info(f"Internship {internship_id} verification completed: {status}")
        
        return {
            'internship_id': internship_id,
            'status': status,
            'verification_passed': verification_passed,
            'notes': verification_notes
        }
        
    except Internship.DoesNotExist:
        logger.error(f"Internship {internship_id} not found for verification")
        raise self.retry(countdown=60, max_retries=3)
    except Exception as exc:
        logger.error(f"Error verifying internship {internship_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(bind=True, queue='internship_queue')
def calculate_analytics(self, internship_id: int) -> Dict[str, Any]:
    """
    Calculate analytics for an internship
    """
    try:
        internship = Internship.objects.get(id=internship_id)
        
        # Calculate various metrics
        # Note: In a real implementation, this would call the application service
        # to get application counts and other metrics
        
        analytics = {
            'internship_id': internship_id,
            'views_count': 0,  # Would be tracked separately
            'applications_count': 0,  # Would come from application service
            'acceptance_rate': 0.0,
            'avg_application_time': 0.0,
            'popular_skills': [],
            'calculated_at': timezone.now().isoformat()
        }
        
        # Update internship with analytics
        internship.analytics_data = analytics
        internship.save()
        
        logger.info(f"Analytics calculated for internship {internship_id}")
        
        return analytics
        
    except Internship.DoesNotExist:
        logger.error(f"Internship {internship_id} not found for analytics")
        raise self.retry(countdown=60, max_retries=3)
    except Exception as exc:
        logger.error(f"Error calculating analytics for internship {internship_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(queue='internship_queue')
def cleanup_expired() -> Dict[str, Any]:
    """
    Cleanup expired internships
    """
    try:
        # Find expired internships
        expired_internships = Internship.objects.filter(
            application_deadline__lt=timezone.now().date(),
            is_active=True
        )
        
        expired_count = 0
        for internship in expired_internships:
            # Mark as inactive
            internship.is_active = False
            internship.save()
            
            # Publish expiration event
            publish_service_event(
                EventType.INTERNSHIP_EXPIRED,
                'internship_service',
                {
                    'internship_id': internship.id,
                    'employer_id': internship.employer_id,
                    'title': internship.title,
                    'expired_at': timezone.now().isoformat()
                }
            )
            
            expired_count += 1
        
        logger.info(f"Marked {expired_count} internships as expired")
        
        return {
            'expired_count': expired_count,
            'processed_at': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Error during internship cleanup: {str(exc)}")
        raise


@shared_task(bind=True, queue='internship_queue')
def update_internship_statistics(self, employer_id: int = None) -> Dict[str, Any]:
    """
    Update internship statistics for an employer or globally
    """
    try:
        queryset = Internship.objects.all()
        if employer_id:
            queryset = queryset.filter(employer_id=employer_id)
        
        stats = {
            'total_internships': queryset.count(),
            'active_internships': queryset.filter(is_active=True).count(),
            'verified_internships': queryset.filter(is_verified=True).count(),
            'featured_internships': queryset.filter(is_featured=True).count(),
            'expired_internships': queryset.filter(
                application_deadline__lt=timezone.now().date()
            ).count(),
            'calculated_at': timezone.now().isoformat()
        }
        
        if employer_id:
            stats['employer_id'] = employer_id
        
        logger.info(f"Updated internship statistics: {stats}")
        
        return stats
        
    except Exception as exc:
        logger.error(f"Error updating internship statistics: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(bind=True, queue='internship_queue')
def process_skill_tag_analytics(self) -> Dict[str, Any]:
    """
    Process analytics for skill tags
    """
    try:
        # Calculate skill tag usage
        skill_stats = []
        
        for skill in SkillTag.objects.all():
            usage_count = skill.internships.filter(is_active=True).count()
            skill_stats.append({
                'skill_id': skill.id,
                'name': skill.name,
                'usage_count': usage_count,
                'category': skill.category
            })
        
        # Sort by usage
        skill_stats.sort(key=lambda x: x['usage_count'], reverse=True)
        
        result = {
            'skill_analytics': skill_stats[:50],  # Top 50 skills
            'total_skills': len(skill_stats),
            'calculated_at': timezone.now().isoformat()
        }
        
        logger.info(f"Processed skill tag analytics for {len(skill_stats)} skills")
        
        return result
        
    except Exception as exc:
        logger.error(f"Error processing skill tag analytics: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(bind=True, queue='internship_queue')
def sync_employer_data(self, employer_id: int) -> Dict[str, Any]:
    """
    Sync employer data from user service
    """
    try:
        # This would typically call the user service to get updated employer data
        # and update any cached information in the internship service
        
        # For now, we'll simulate the sync
        internships = Internship.objects.filter(employer_id=employer_id)
        
        updated_count = 0
        for internship in internships:
            # Update any employer-related cached data
            # internship.employer_name = employer_data['name']
            # internship.save()
            updated_count += 1
        
        result = {
            'employer_id': employer_id,
            'updated_internships': updated_count,
            'synced_at': timezone.now().isoformat()
        }
        
        logger.info(f"Synced employer data for employer {employer_id}")
        
        return result
        
    except Exception as exc:
        logger.error(f"Error syncing employer data for {employer_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(bind=True, queue='internship_queue')
def generate_internship_report(self, report_type: str, filters: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Generate various types of internship reports
    """
    try:
        filters = filters or {}
        queryset = Internship.objects.all()
        
        # Apply filters
        if 'employer_id' in filters:
            queryset = queryset.filter(employer_id=filters['employer_id'])
        if 'date_from' in filters:
            queryset = queryset.filter(created_at__gte=filters['date_from'])
        if 'date_to' in filters:
            queryset = queryset.filter(created_at__lte=filters['date_to'])
        
        if report_type == 'summary':
            report_data = {
                'total_internships': queryset.count(),
                'active_internships': queryset.filter(is_active=True).count(),
                'verified_internships': queryset.filter(is_verified=True).count(),
                'by_location': list(queryset.values('location').annotate(
                    count=models.Count('id')
                ).order_by('-count')[:10]),
                'by_type': list(queryset.values('internship_type').annotate(
                    count=models.Count('id')
                ).order_by('-count'))
            }
        elif report_type == 'detailed':
            report_data = {
                'internships': list(queryset.values(
                    'id', 'title', 'employer_id', 'location', 'internship_type',
                    'is_active', 'is_verified', 'created_at'
                )[:1000])  # Limit to 1000 records
            }
        else:
            raise ValueError(f"Unknown report type: {report_type}")
        
        result = {
            'report_type': report_type,
            'filters': filters,
            'data': report_data,
            'generated_at': timezone.now().isoformat()
        }
        
        logger.info(f"Generated {report_type} internship report")
        
        return result
        
    except Exception as exc:
        logger.error(f"Error generating internship report: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)