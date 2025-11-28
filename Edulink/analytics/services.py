import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from django.core.cache import cache
from django.db.models import Count, Avg, Q
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()
from celery import shared_task

from .models import RealTimeMetric, MetricSnapshot, PerformanceAlert, UserActivityMetric
from users.models import StudentProfile, EmployerProfile, InstitutionProfile
from internship.models import Internship
from application.models import Application
from dashboards.models import AnalyticsEvent

logger = logging.getLogger(__name__)


class RealTimeAnalyticsService:
    """Service for real-time analytics calculation and caching"""
    
    CACHE_TIMEOUT = 300  # 5 minutes
    CACHE_PREFIX = 'analytics_'
    
    @classmethod
    def initialize(cls):
        """Initialize the analytics service"""
        logger.info("Initializing Real-Time Analytics Service")
        
    @classmethod
    def get_cache_key(cls, metric_type: str, institution_id: Optional[int] = None) -> str:
        """Generate cache key for metrics"""
        if institution_id:
            return f"{cls.CACHE_PREFIX}{metric_type}_{institution_id}"
        return f"{cls.CACHE_PREFIX}{metric_type}_global"
    
    @classmethod
    def get_real_time_metrics(cls, institution_id: Optional[int] = None) -> Dict[str, Any]:
        """Get comprehensive real-time metrics"""
        cache_key = cls.get_cache_key('comprehensive', institution_id)
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data
        
        try:
            # Calculate fresh metrics
            metrics = {
                'total_students': cls._get_total_students(institution_id),
                'active_internships': cls._get_active_internships(institution_id),
                'completion_rate': cls._get_completion_rate(institution_id),
                'application_rate': cls._get_application_rate(institution_id),
                'placement_rate': cls._get_placement_rate(institution_id),
                'response_time': cls._get_average_response_time(institution_id),
                'user_activity': cls._get_user_activity_metrics(institution_id),
                'trend_data': cls._get_trend_analysis(institution_id),
                'alerts': cls._get_active_alerts(institution_id),
                'last_updated': timezone.now().isoformat()
            }
            
            # Cache the results
            cache.set(cache_key, metrics, cls.CACHE_TIMEOUT)
            
            # Store in database for historical tracking
            cls._store_metric_snapshot(metrics, institution_id)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating real-time metrics: {e}")
            return cls._get_fallback_metrics()
    
    @classmethod
    def _get_total_students(cls, institution_id: Optional[int] = None) -> int:
        """Get total number of students"""
        queryset = StudentProfile.objects.all()
        if institution_id:
            queryset = queryset.filter(institution_id=institution_id)
        return queryset.count()
    
    @classmethod
    def _get_active_internships(cls, institution_id: Optional[int] = None) -> int:
        """Get number of active internships"""
        queryset = Internship.objects.filter(is_active=True)
        if institution_id:
            queryset = queryset.filter(institution_id=institution_id)
        return queryset.count()
    
    @classmethod
    def _get_completion_rate(cls, institution_id: Optional[int] = None) -> float:
        """Calculate internship completion rate"""
        try:
            # Get applications from the last 6 months
            six_months_ago = timezone.now() - timedelta(days=180)
            
            queryset = Application.objects.filter(
                application_date__gte=six_months_ago
            )
            
            if institution_id:
                queryset = queryset.filter(
                    student__student_profile__institution_id=institution_id
                )
            
            total_applications = queryset.count()
            if total_applications == 0:
                return 0.0
            
            completed_applications = queryset.filter(
                status__in=['accepted', 'completed']
            ).count()
            
            return round((completed_applications / total_applications) * 100, 2)
            
        except Exception as e:
            logger.error(f"Error calculating completion rate: {e}")
            return 0.0
    
    @classmethod
    def _get_application_rate(cls, institution_id: Optional[int] = None) -> Dict[str, Any]:
        """Get application rate metrics"""
        try:
            now = timezone.now()
            last_week = now - timedelta(days=7)
            last_month = now - timedelta(days=30)
            
            queryset = Application.objects.all()
            if institution_id:
                queryset = queryset.filter(
                    student__student_profile__institution_id=institution_id
                )
            
            weekly_applications = queryset.filter(
                application_date__gte=last_week
            ).count()
            
            monthly_applications = queryset.filter(
                application_date__gte=last_month
            ).count()
            
            return {
                'weekly': weekly_applications,
                'monthly': monthly_applications,
                'daily_average': round(weekly_applications / 7, 1)
            }
            
        except Exception as e:
            logger.error(f"Error calculating application rate: {e}")
            return {'weekly': 0, 'monthly': 0, 'daily_average': 0}
    
    @classmethod
    def _get_placement_rate(cls, institution_id: Optional[int] = None) -> float:
        """Calculate student placement rate"""
        try:
            queryset = StudentProfile.objects.all()
            if institution_id:
                queryset = queryset.filter(institution_id=institution_id)
            
            total_students = queryset.count()
            if total_students == 0:
                return 0.0
            
            placed_students = queryset.filter(
                user__applications__status='accepted'
            ).distinct().count()
            
            return round((placed_students / total_students) * 100, 2)
            
        except Exception as e:
            logger.error(f"Error calculating placement rate: {e}")
            return 0.0
    
    @classmethod
    def _get_average_response_time(cls, institution_id: Optional[int] = None) -> Dict[str, Any]:
        """Calculate average response time for applications"""
        try:
            queryset = Application.objects.filter(
                response_date__isnull=False,
                application_date__isnull=False
            )
            
            if institution_id:
                queryset = queryset.filter(
                    student__student_profile__institution_id=institution_id
                )
            
            response_times = []
            for app in queryset:
                if app.response_date and app.application_date:
                    delta = app.response_date - app.application_date
                    response_times.append(delta.days)
            
            if not response_times:
                return {'average_days': 0, 'median_days': 0}
            
            avg_days = sum(response_times) / len(response_times)
            median_days = sorted(response_times)[len(response_times) // 2]
            
            return {
                'average_days': round(avg_days, 1),
                'median_days': median_days
            }
            
        except Exception as e:
            logger.error(f"Error calculating response time: {e}")
            return {'average_days': 0, 'median_days': 0}
    
    @classmethod
    def _get_user_activity_metrics(cls, institution_id: Optional[int] = None) -> Dict[str, Any]:
        """Get user activity metrics"""
        try:
            now = timezone.now()
            last_hour = now - timedelta(hours=1)
            last_day = now - timedelta(days=1)
            
            queryset = UserActivityMetric.objects.all()
            if institution_id:
                queryset = queryset.filter(
                    user__student_profile__institution_id=institution_id
                )
            
            active_users_hour = queryset.filter(
                timestamp__gte=last_hour
            ).values('user').distinct().count()
            
            active_users_day = queryset.filter(
                timestamp__gte=last_day
            ).values('user').distinct().count()
            
            page_views_hour = queryset.filter(
                timestamp__gte=last_hour
            ).count()
            
            return {
                'active_users_last_hour': active_users_hour,
                'active_users_last_day': active_users_day,
                'page_views_last_hour': page_views_hour
            }
            
        except Exception as e:
            logger.error(f"Error calculating user activity: {e}")
            return {
                'active_users_last_hour': 0,
                'active_users_last_day': 0,
                'page_views_last_hour': 0
            }
    
    @classmethod
    def _get_trend_analysis(cls, institution_id: Optional[int] = None) -> Dict[str, Any]:
        """Get trend analysis for the last 30 days"""
        try:
            now = timezone.now()
            thirty_days_ago = now - timedelta(days=30)
            
            # Get daily application counts
            queryset = Application.objects.filter(
                application_date__gte=thirty_days_ago
            )
            
            if institution_id:
                queryset = queryset.filter(
                    student__student_profile__institution_id=institution_id
                )
            
            daily_applications = []
            for i in range(30):
                day = thirty_days_ago + timedelta(days=i)
                day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                
                count = queryset.filter(
                    application_date__gte=day_start,
                    application_date__lt=day_end
                ).count()
                
                daily_applications.append({
                    'date': day.strftime('%Y-%m-%d'),
                    'applications': count
                })
            
            return {
                'daily_applications': daily_applications,
                'trend_direction': cls._calculate_trend_direction(daily_applications)
            }
            
        except Exception as e:
            logger.error(f"Error calculating trend analysis: {e}")
            return {'daily_applications': [], 'trend_direction': 'stable'}
    
    @classmethod
    def _calculate_trend_direction(cls, daily_data: List[Dict]) -> str:
        """Calculate if trend is increasing, decreasing, or stable"""
        if len(daily_data) < 7:
            return 'stable'
        
        recent_avg = sum(d['applications'] for d in daily_data[-7:]) / 7
        previous_avg = sum(d['applications'] for d in daily_data[-14:-7]) / 7
        
        if recent_avg > previous_avg * 1.1:
            return 'increasing'
        elif recent_avg < previous_avg * 0.9:
            return 'decreasing'
        else:
            return 'stable'
    
    @classmethod
    def _get_active_alerts(cls, institution_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get active performance alerts"""
        try:
            queryset = PerformanceAlert.objects.filter(is_resolved=False)
            if institution_id:
                queryset = queryset.filter(institution_id=institution_id)
            
            alerts = []
            for alert in queryset.order_by('-created_at')[:5]:
                alerts.append({
                    'id': alert.id,
                    'type': alert.alert_type,
                    'severity': alert.severity,
                    'message': alert.message,
                    'current_value': alert.current_value,
                    'threshold_value': alert.threshold_value,
                    'created_at': alert.created_at.isoformat()
                })
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error getting active alerts: {e}")
            return []
    
    @classmethod
    def _store_metric_snapshot(cls, metrics: Dict[str, Any], institution_id: Optional[int] = None):
        """Store metrics snapshot for historical tracking"""
        try:
            MetricSnapshot.objects.create(
                snapshot_type='hourly',
                snapshot_date=timezone.now().replace(minute=0, second=0, microsecond=0),
                metrics_data=metrics,
                institution_id=institution_id
            )
        except Exception as e:
            logger.error(f"Error storing metric snapshot: {e}")
    
    @classmethod
    def _get_fallback_metrics(cls) -> Dict[str, Any]:
        """Return fallback metrics when calculation fails"""
        return {
            'total_students': 0,
            'active_internships': 0,
            'completion_rate': 0.0,
            'application_rate': {'weekly': 0, 'monthly': 0, 'daily_average': 0},
            'placement_rate': 0.0,
            'response_time': {'average_days': 0, 'median_days': 0},
            'user_activity': {
                'active_users_last_hour': 0,
                'active_users_last_day': 0,
                'page_views_last_hour': 0
            },
            'trend_data': {'daily_applications': [], 'trend_direction': 'stable'},
            'alerts': [],
            'last_updated': timezone.now().isoformat(),
            'error': 'Failed to calculate metrics'
        }
    
    @classmethod
    def invalidate_cache(cls, institution_id: Optional[int] = None):
        """Invalidate cached metrics"""
        cache_key = cls.get_cache_key('comprehensive', institution_id)
        cache.delete(cache_key)
        logger.info(f"Invalidated cache for institution {institution_id}")
    
    @classmethod
    def track_user_activity(cls, user: User, activity_type: str, page_path: str, 
                          session_id: str, metadata: Dict = None):
        """Track user activity for analytics"""
        try:
            UserActivityMetric.objects.create(
                user=user,
                activity_type=activity_type,
                page_path=page_path,
                session_id=session_id,
                metadata=metadata or {}
            )
        except Exception as e:
            logger.error(f"Error tracking user activity: {e}")


# Celery tasks for background processing
@shared_task
def update_real_time_metrics():
    """Celery task to update real-time metrics"""
    try:
        logger.info("Starting real-time metrics update")
        
        # Update global metrics
        RealTimeAnalyticsService.get_real_time_metrics()
        
        # Update metrics for each institution
        institutions = InstitutionProfile.objects.all()
        for institution in institutions:
            RealTimeAnalyticsService.get_real_time_metrics(institution.id)
        
        logger.info("Completed real-time metrics update")
        
    except Exception as e:
        logger.error(f"Error in update_real_time_metrics task: {e}")


@shared_task
def cleanup_old_metrics():
    """Celery task to cleanup old metrics data"""
    try:
        # Delete metrics older than 30 days
        cutoff_date = timezone.now() - timedelta(days=30)
        
        deleted_metrics = RealTimeMetric.objects.filter(
            timestamp__lt=cutoff_date
        ).delete()
        
        deleted_activities = UserActivityMetric.objects.filter(
            timestamp__lt=cutoff_date
        ).delete()
        
        logger.info(f"Cleaned up {deleted_metrics[0]} old metrics and {deleted_activities[0]} activity records")
        
    except Exception as e:
        logger.error(f"Error in cleanup_old_metrics task: {e}")


@shared_task
def check_performance_alerts():
    """Celery task to check and create performance alerts"""
    try:
        institutions = InstitutionProfile.objects.all()
        
        for institution in institutions:
            metrics = RealTimeAnalyticsService.get_real_time_metrics(institution.id)
            
            # Check completion rate
            if metrics['completion_rate'] < 50:
                PerformanceAlert.objects.get_or_create(
                    alert_type='low_completion_rate',
                    institution=institution,
                    is_resolved=False,
                    defaults={
                        'severity': 'high' if metrics['completion_rate'] < 30 else 'medium',
                        'message': f"Completion rate is {metrics['completion_rate']}%, below expected threshold",
                        'threshold_value': 50,
                        'current_value': metrics['completion_rate']
                    }
                )
            
            # Check response time
            avg_response_time = metrics['response_time']['average_days']
            if avg_response_time > 14:
                PerformanceAlert.objects.get_or_create(
                    alert_type='high_response_time',
                    institution=institution,
                    is_resolved=False,
                    defaults={
                        'severity': 'high' if avg_response_time > 21 else 'medium',
                        'message': f"Average response time is {avg_response_time} days, above expected threshold",
                        'threshold_value': 14,
                        'current_value': avg_response_time
                    }
                )
        
        logger.info("Completed performance alerts check")
        
    except Exception as e:
        logger.error(f"Error in check_performance_alerts task: {e}")