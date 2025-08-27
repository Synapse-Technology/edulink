from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging
from typing import Dict, Any, List

from .models import Application, ApplicationStatusHistory, SupervisorFeedback
from shared.events import EventType, publish_event
from shared.message_queue import publish_service_event
from shared.service_clients import UserServiceClient, InternshipServiceClient

logger = logging.getLogger(__name__)


@shared_task(bind=True, queue='application_queue')
def process_application_status_change(self, application_id: int, new_status: str, changed_by: int = None) -> Dict[str, Any]:
    """
    Process application status change and send notifications
    """
    try:
        application = Application.objects.get(id=application_id)
        old_status = application.status
        
        # Update application status
        application.status = new_status
        application.save()
        
        # Create status history record
        ApplicationStatusHistory.objects.create(
            application=application,
            old_status=old_status,
            new_status=new_status,
            changed_by_id=changed_by,
            changed_at=timezone.now(),
            notes=f"Status changed from {old_status} to {new_status}"
        )
        
        # Publish status change event
        publish_service_event(
            EventType.APPLICATION_STATUS_CHANGED,
            'application_service',
            {
                'application_id': application_id,
                'student_id': application.student_id,
                'internship_id': application.internship_id,
                'old_status': old_status,
                'new_status': new_status,
                'changed_by': changed_by,
                'changed_at': timezone.now().isoformat()
            }
        )
        
        # Send notification to student
        if new_status in ['accepted', 'rejected', 'interview_scheduled']:
            send_status_notification.delay(application_id, new_status)
        
        logger.info(f"Application {application_id} status changed from {old_status} to {new_status}")
        
        return {
            'application_id': application_id,
            'old_status': old_status,
            'new_status': new_status,
            'processed_at': timezone.now().isoformat()
        }
        
    except Application.DoesNotExist:
        logger.error(f"Application {application_id} not found")
        raise self.retry(countdown=60, max_retries=3)
    except Exception as exc:
        logger.error(f"Error processing status change for application {application_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(bind=True, queue='notifications')
def send_status_notification(self, application_id: int, status: str) -> Dict[str, Any]:
    """
    Send notification to student about application status change
    """
    try:
        application = Application.objects.get(id=application_id)
        
        # Get student information from user service
        user_client = UserServiceClient()
        student_data = user_client.get_user(application.student_id)
        
        # Get internship information
        internship_client = InternshipServiceClient()
        internship_data = internship_client.get_internship(application.internship_id)
        
        notification_data = {
            'recipient_id': application.student_id,
            'recipient_email': student_data.get('email'),
            'type': 'application_status_update',
            'title': f"Application Status Update: {internship_data.get('title', 'Internship')}",
            'message': f"Your application status has been updated to: {status.replace('_', ' ').title()}",
            'data': {
                'application_id': application_id,
                'internship_id': application.internship_id,
                'status': status,
                'internship_title': internship_data.get('title'),
                'company_name': internship_data.get('company_name')
            }
        }
        
        # Publish notification event
        publish_service_event(
            EventType.NOTIFICATION_CREATED,
            'application_service',
            notification_data
        )
        
        logger.info(f"Notification sent for application {application_id} status: {status}")
        
        return {
            'application_id': application_id,
            'status': status,
            'notification_sent': True,
            'sent_at': timezone.now().isoformat()
        }
        
    except Application.DoesNotExist:
        logger.error(f"Application {application_id} not found for notification")
        raise self.retry(countdown=60, max_retries=3)
    except Exception as exc:
        logger.error(f"Error sending notification for application {application_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(bind=True, queue='application_queue')
def calculate_priority_score(self, application_id: int) -> Dict[str, Any]:
    """
    Calculate and update priority score for an application
    """
    try:
        application = Application.objects.get(id=application_id)
        
        # Get student data for GPA and other factors
        user_client = UserServiceClient()
        student_data = user_client.get_user(application.student_id)
        
        # Get internship data for requirements matching
        internship_client = InternshipServiceClient()
        internship_data = internship_client.get_internship(application.internship_id)
        
        # Calculate priority score based on various factors
        score = 0.0
        factors = {}
        
        # GPA factor (0-40 points)
        gpa = student_data.get('gpa', 0.0)
        gpa_score = min(gpa * 10, 40)  # Max 40 points for 4.0 GPA
        score += gpa_score
        factors['gpa_score'] = gpa_score
        
        # Application completeness (0-20 points)
        completeness_score = 0
        if application.cover_letter:
            completeness_score += 10
        if application.custom_answers:
            completeness_score += 10
        score += completeness_score
        factors['completeness_score'] = completeness_score
        
        # Early application bonus (0-15 points)
        internship_created = internship_data.get('created_at')
        if internship_created:
            days_since_posting = (application.applied_at.date() - 
                                 timezone.datetime.fromisoformat(internship_created).date()).days
            early_bonus = max(15 - days_since_posting, 0)
            score += early_bonus
            factors['early_application_bonus'] = early_bonus
        
        # Skills matching (0-25 points)
        student_skills = student_data.get('skills', [])
        required_skills = internship_data.get('required_skills', [])
        if required_skills:
            matching_skills = len(set(student_skills) & set(required_skills))
            skills_score = min((matching_skills / len(required_skills)) * 25, 25)
            score += skills_score
            factors['skills_matching_score'] = skills_score
        
        # Update application with calculated score
        application.priority_score = round(score, 2)
        application.save()
        
        logger.info(f"Priority score calculated for application {application_id}: {application.priority_score}")
        
        return {
            'application_id': application_id,
            'priority_score': application.priority_score,
            'factors': factors,
            'calculated_at': timezone.now().isoformat()
        }
        
    except Application.DoesNotExist:
        logger.error(f"Application {application_id} not found for priority calculation")
        raise self.retry(countdown=60, max_retries=3)
    except Exception as exc:
        logger.error(f"Error calculating priority score for application {application_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(queue='application_queue')
def cleanup_old_applications() -> Dict[str, Any]:
    """
    Cleanup old applications and related data
    """
    try:
        # Find applications older than 2 years that are in final status
        cutoff_date = timezone.now() - timedelta(days=730)
        old_applications = Application.objects.filter(
            applied_at__lt=cutoff_date,
            status__in=['accepted', 'rejected', 'withdrawn']
        )
        
        archived_count = 0
        for application in old_applications:
            # Archive instead of delete to maintain data integrity
            application.is_archived = True
            application.save()
            archived_count += 1
        
        logger.info(f"Archived {archived_count} old applications")
        
        return {
            'archived_count': archived_count,
            'cutoff_date': cutoff_date.isoformat(),
            'processed_at': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Error during application cleanup: {str(exc)}")
        raise


@shared_task(bind=True, queue='application_queue')
def update_application_statistics(self, internship_id: int = None, student_id: int = None) -> Dict[str, Any]:
    """
    Update application statistics for internship or student
    """
    try:
        queryset = Application.objects.all()
        
        if internship_id:
            queryset = queryset.filter(internship_id=internship_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        
        stats = {
            'total_applications': queryset.count(),
            'pending_applications': queryset.filter(status='pending').count(),
            'under_review_applications': queryset.filter(status='under_review').count(),
            'accepted_applications': queryset.filter(status='accepted').count(),
            'rejected_applications': queryset.filter(status='rejected').count(),
            'withdrawn_applications': queryset.filter(status='withdrawn').count(),
            'interview_scheduled': queryset.filter(status='interview_scheduled').count(),
            'calculated_at': timezone.now().isoformat()
        }
        
        if internship_id:
            stats['internship_id'] = internship_id
            # Calculate acceptance rate
            total_final = stats['accepted_applications'] + stats['rejected_applications']
            if total_final > 0:
                stats['acceptance_rate'] = round((stats['accepted_applications'] / total_final) * 100, 2)
        
        if student_id:
            stats['student_id'] = student_id
        
        logger.info(f"Updated application statistics: {stats}")
        
        return stats
        
    except Exception as exc:
        logger.error(f"Error updating application statistics: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(bind=True, queue='application_queue')
def process_supervisor_feedback(self, feedback_id: int) -> Dict[str, Any]:
    """
    Process supervisor feedback and update application
    """
    try:
        feedback = SupervisorFeedback.objects.get(id=feedback_id)
        application = feedback.application
        
        # Calculate average rating
        avg_rating = feedback.average_detailed_rating
        
        # Update application based on feedback
        if avg_rating >= 4.0:
            # High rating - potentially move to accepted
            if application.status == 'under_review':
                process_application_status_change.delay(
                    application.id, 'reviewed', feedback.supervisor_id
                )
        elif avg_rating <= 2.0:
            # Low rating - potentially reject
            if application.status == 'under_review':
                process_application_status_change.delay(
                    application.id, 'rejected', feedback.supervisor_id
                )
        
        # Publish feedback event
        publish_service_event(
            EventType.APPLICATION_FEEDBACK_RECEIVED,
            'application_service',
            {
                'application_id': application.id,
                'feedback_id': feedback_id,
                'supervisor_id': feedback.supervisor_id,
                'overall_rating': feedback.overall_rating,
                'average_rating': avg_rating,
                'recommendation': feedback.recommendation,
                'created_at': feedback.created_at.isoformat()
            }
        )
        
        logger.info(f"Processed supervisor feedback {feedback_id} for application {application.id}")
        
        return {
            'feedback_id': feedback_id,
            'application_id': application.id,
            'average_rating': avg_rating,
            'recommendation': feedback.recommendation,
            'processed_at': timezone.now().isoformat()
        }
        
    except SupervisorFeedback.DoesNotExist:
        logger.error(f"Supervisor feedback {feedback_id} not found")
        raise self.retry(countdown=60, max_retries=3)
    except Exception as exc:
        logger.error(f"Error processing supervisor feedback {feedback_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(bind=True, queue='application_queue')
def generate_application_report(self, report_type: str, filters: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Generate various types of application reports
    """
    try:
        filters = filters or {}
        queryset = Application.objects.all()
        
        # Apply filters
        if 'internship_id' in filters:
            queryset = queryset.filter(internship_id=filters['internship_id'])
        if 'student_id' in filters:
            queryset = queryset.filter(student_id=filters['student_id'])
        if 'status' in filters:
            queryset = queryset.filter(status=filters['status'])
        if 'date_from' in filters:
            queryset = queryset.filter(applied_at__gte=filters['date_from'])
        if 'date_to' in filters:
            queryset = queryset.filter(applied_at__lte=filters['date_to'])
        
        if report_type == 'summary':
            from django.db import models
            report_data = {
                'total_applications': queryset.count(),
                'by_status': list(queryset.values('status').annotate(
                    count=models.Count('id')
                ).order_by('-count')),
                'avg_priority_score': queryset.aggregate(
                    avg_score=models.Avg('priority_score')
                )['avg_score'] or 0,
                'applications_by_month': list(queryset.extra(
                    select={'month': 'EXTRACT(month FROM applied_at)'}
                ).values('month').annotate(
                    count=models.Count('id')
                ).order_by('month'))
            }
        elif report_type == 'detailed':
            report_data = {
                'applications': list(queryset.values(
                    'id', 'student_id', 'internship_id', 'status',
                    'priority_score', 'applied_at', 'interview_date'
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
        
        logger.info(f"Generated {report_type} application report")
        
        return result
        
    except Exception as exc:
        logger.error(f"Error generating application report: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(bind=True, queue='application_queue')
def sync_internship_data(self, internship_id: int) -> Dict[str, Any]:
    """
    Sync internship data from internship service
    """
    try:
        # Get updated internship data
        internship_client = InternshipServiceClient()
        internship_data = internship_client.get_internship(internship_id)
        
        # Update applications with any cached internship data
        applications = Application.objects.filter(internship_id=internship_id)
        
        updated_count = 0
        for application in applications:
            # Update any internship-related cached data
            # application.internship_title = internship_data['title']
            # application.save()
            updated_count += 1
        
        result = {
            'internship_id': internship_id,
            'updated_applications': updated_count,
            'synced_at': timezone.now().isoformat()
        }
        
        logger.info(f"Synced internship data for internship {internship_id}")
        
        return result
        
    except Exception as exc:
        logger.error(f"Error syncing internship data for {internship_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)