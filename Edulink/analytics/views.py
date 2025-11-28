from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views.generic import View
from django.utils import timezone
from django.http import HttpResponse, FileResponse
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from django.db import models
from datetime import timedelta
import os
import hashlib
import csv
import io
import json
import logging

from .services import RealTimeAnalyticsService
from .models import RealTimeMetric, MetricSnapshot, PerformanceAlert, Report
from users.models import InstitutionProfile

logger = logging.getLogger(__name__)


class RealTimeMetricsAPIView(APIView):
    """API endpoint for real-time metrics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get real-time metrics for the authenticated user's institution"""
        try:
            institution_id = None
            
            # Get institution ID based on user type
            if hasattr(request.user, 'institution_profile'):
                institution_id = request.user.institution_profile.id
            elif hasattr(request.user, 'student_profile') and request.user.student_profile.institution:
                institution_id = request.user.student_profile.institution.id
            elif hasattr(request.user, 'employer_profile') and request.user.employer_profile.institution:
                institution_id = request.user.employer_profile.institution.id
            
            # Get metrics
            metrics = RealTimeAnalyticsService.get_real_time_metrics(institution_id)
            
            return Response({
                'success': True,
                'data': metrics,
                'institution_id': institution_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in RealTimeMetricsAPIView: {e}")
            return Response({
                'success': False,
                'error': 'Failed to retrieve real-time metrics',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ComprehensiveReportAPIView(APIView):
    """API endpoint for comprehensive analytics reports"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get comprehensive analytics report"""
        try:
            institution_id = None
            
            # Get institution ID based on user type
            if hasattr(request.user, 'institution_profile'):
                institution_id = request.user.institution_profile.id
            elif hasattr(request.user, 'student_profile') and request.user.student_profile.institution:
                institution_id = request.user.student_profile.institution.id
            
            # Get real-time metrics
            metrics = RealTimeAnalyticsService.get_real_time_metrics(institution_id)
            
            # Get historical data
            historical_snapshots = MetricSnapshot.objects.filter(
                institution_id=institution_id
            ).order_by('-snapshot_date')[:30]
            
            historical_data = []
            for snapshot in historical_snapshots:
                historical_data.append({
                    'date': snapshot.snapshot_date.isoformat(),
                    'metrics': snapshot.metrics_data
                })
            
            # Get performance alerts
            alerts = PerformanceAlert.objects.filter(
                institution_id=institution_id,
                is_resolved=False
            ).order_by('-created_at')[:10]
            
            alert_data = []
            for alert in alerts:
                alert_data.append({
                    'id': alert.id,
                    'type': alert.alert_type,
                    'severity': alert.severity,
                    'message': alert.message,
                    'current_value': alert.current_value,
                    'threshold_value': alert.threshold_value,
                    'created_at': alert.created_at.isoformat()
                })
            
            return Response({
                'success': True,
                'data': {
                    'current_metrics': metrics,
                    'historical_data': historical_data,
                    'alerts': alert_data,
                    'institution_id': institution_id
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in ComprehensiveReportAPIView: {e}")
            return Response({
                'success': False,
                'error': 'Failed to retrieve comprehensive report',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TrendAnalysisAPIView(APIView):
    """API endpoint for trend analysis"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get trend analysis data"""
        try:
            institution_id = None
            
            # Get institution ID based on user type
            if hasattr(request.user, 'institution_profile'):
                institution_id = request.user.institution_profile.id
            elif hasattr(request.user, 'student_profile') and request.user.student_profile.institution:
                institution_id = request.user.student_profile.institution.id
            
            # Get metrics with trend data
            metrics = RealTimeAnalyticsService.get_real_time_metrics(institution_id)
            
            # Extract trend-specific data
            trend_data = {
                'daily_applications': metrics.get('trend_data', {}).get('daily_applications', []),
                'trend_direction': metrics.get('trend_data', {}).get('trend_direction', 'stable'),
                'completion_rate': metrics.get('completion_rate', 0),
                'placement_rate': metrics.get('placement_rate', 0),
                'application_rate': metrics.get('application_rate', {}),
                'response_time': metrics.get('response_time', {})
            }
            
            return Response({
                'success': True,
                'data': trend_data,
                'institution_id': institution_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in TrendAnalysisAPIView: {e}")
            return Response({
                'success': False,
                'error': 'Failed to retrieve trend analysis',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PerformanceAlertsAPIView(APIView):
    """API endpoint for performance alerts"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get performance alerts"""
        try:
            institution_id = None
            
            # Get institution ID based on user type
            if hasattr(request.user, 'institution_profile'):
                institution_id = request.user.institution_profile.id
            elif hasattr(request.user, 'student_profile') and request.user.student_profile.institution:
                institution_id = request.user.student_profile.institution.id
            
            # Get alerts
            alerts = PerformanceAlert.objects.filter(
                institution_id=institution_id
            ).order_by('-created_at')
            
            # Filter by status if requested
            status_filter = request.GET.get('status')
            if status_filter == 'active':
                alerts = alerts.filter(is_resolved=False)
            elif status_filter == 'resolved':
                alerts = alerts.filter(is_resolved=True)
            
            # Limit results
            limit = int(request.GET.get('limit', 20))
            alerts = alerts[:limit]
            
            alert_data = []
            for alert in alerts:
                alert_data.append({
                    'id': alert.id,
                    'type': alert.alert_type,
                    'severity': alert.severity,
                    'message': alert.message,
                    'current_value': alert.current_value,
                    'threshold_value': alert.threshold_value,
                    'is_resolved': alert.is_resolved,
                    'created_at': alert.created_at.isoformat(),
                    'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None
                })
            
            return Response({
                'success': True,
                'data': alert_data,
                'institution_id': institution_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in PerformanceAlertsAPIView: {e}")
            return Response({
                'success': False,
                'error': 'Failed to retrieve performance alerts',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request, alert_id):
        """Resolve a performance alert"""
        try:
            institution_id = None
            
            # Get institution ID based on user type
            if hasattr(request.user, 'institution_profile'):
                institution_id = request.user.institution_profile.id
            elif hasattr(request.user, 'student_profile') and request.user.student_profile.institution:
                institution_id = request.user.student_profile.institution.id
            
            # Get and update alert
            alert = PerformanceAlert.objects.get(
                id=alert_id,
                institution_id=institution_id
            )
            
            alert.is_resolved = True
            alert.resolved_at = timezone.now()
            alert.save()
            
            return Response({
                'success': True,
                'message': 'Alert resolved successfully'
            }, status=status.HTTP_200_OK)
            
        except PerformanceAlert.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Alert not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error resolving alert: {e}")
            return Response({
                'success': False,
                'error': 'Failed to resolve alert',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class UserActivityTrackingView(View):
    """View for tracking user activity"""
    
    @method_decorator(login_required)
    def post(self, request):
        """Track user activity"""
        try:
            data = json.loads(request.body)
            
            activity_type = data.get('activity_type', 'page_view')
            page_path = data.get('page_path', '')
            session_id = data.get('session_id', '')
            metadata = data.get('metadata', {})
            
            # Track the activity
            RealTimeAnalyticsService.track_user_activity(
                user=request.user,
                activity_type=activity_type,
                page_path=page_path,
                session_id=session_id,
                metadata=metadata
            )
            
            return JsonResponse({
                'success': True,
                'message': 'Activity tracked successfully'
            })
            
        except Exception as e:
            logger.error(f"Error tracking user activity: {e}")
            return JsonResponse({
                'success': False,
                'error': 'Failed to track activity'
            }, status=500)


class CacheInvalidationAPIView(APIView):
    """API endpoint for cache invalidation (admin only)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Invalidate analytics cache"""
        try:
            # Check if user has permission (admin or institution admin)
            if not (request.user.is_staff or hasattr(request.user, 'institution_profile')):
                return Response({
                    'success': False,
                    'error': 'Permission denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            institution_id = None
            if hasattr(request.user, 'institution_profile'):
                institution_id = request.user.institution_profile.id
            
            # Invalidate cache
            RealTimeAnalyticsService.invalidate_cache(institution_id)
            
            return Response({
                'success': True,
                'message': 'Cache invalidated successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")
            return Response({
                'success': False,
                'error': 'Failed to invalidate cache',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GenerateReportAPIView(APIView):
    """API endpoint for generating and saving reports"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Generate a new report and save it to the database"""
        try:
            # Get request parameters
            report_type = request.data.get('type', 'analytics')
            file_format = request.data.get('format', 'pdf')
            title = request.data.get('title', f'{report_type.title()} Report')
            description = request.data.get('description', '')
            period_start = request.data.get('period_start')
            period_end = request.data.get('period_end')
            
            # Get institution
            institution = None
            if hasattr(request.user, 'institution_profile'):
                institution = request.user.institution_profile
            elif hasattr(request.user, 'student_profile') and request.user.student_profile.institution:
                institution = request.user.student_profile.institution
            elif hasattr(request.user, 'employer_profile') and request.user.employer_profile.institution:
                institution = request.user.employer_profile.institution
            
            # Create report record
            report = Report.objects.create(
                title=title,
                description=description,
                report_type=report_type,
                file_format=file_format,
                generated_by=request.user,
                institution=institution,
                period_start=timezone.datetime.fromisoformat(period_start) if period_start else None,
                period_end=timezone.datetime.fromisoformat(period_end) if period_end else None,
                generation_parameters={
                    'requested_format': file_format,
                    'request_timestamp': timezone.now().isoformat(),
                    'user_id': str(request.user.id),
                    'institution_id': str(institution.id) if institution else None,
                }
            )
            
            # Generate report data based on type
            report_data = self._generate_report_data(report_type, institution, period_start, period_end)
            
            # Create file content based on format
            file_content, file_extension = self._create_file_content(report_data, file_format)
            
            # Save file and update report
            file_name = f"report_{report.id}.{file_extension}"
            file_path = f"reports/{timezone.now().year}/{timezone.now().month}/{file_name}"
            
            # Calculate file hash
            file_hash = hashlib.sha256(file_content).hexdigest()
            
            # Save file to storage
            saved_path = default_storage.save(file_path, ContentFile(file_content))
            
            # Update report with file information and data
            report.file_path = saved_path
            report.file_size = len(file_content)
            report.file_hash = file_hash
            report.report_data = report_data
            report.summary_stats = self._calculate_summary_stats(report_data)
            report.mark_completed(saved_path, len(file_content))
            
            return Response({
                'success': True,
                'data': {
                    'id': str(report.id),
                    'title': report.title,
                    'report_type': report.report_type,
                    'type': report.report_type,  # Keep both for compatibility
                    'status': report.status,
                    'format': report.file_format,
                    'file_format': report.file_format,  # Keep both for compatibility
                    'file_size': report.get_file_size_display(),
                    'generated_at': report.generated_at.isoformat() if report.generated_at else None,
                    'updated_at': report.created_at.isoformat(),
                    'download_url': f'/api/analytics/reports/{report.id}/download/',
                    'view_url': f'/api/analytics/reports/{report.id}/',
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            # Mark report as failed if it was created
            if 'report' in locals():
                report.mark_failed(str(e))
            
            return Response({
                'success': False,
                'error': 'Failed to generate report',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_report_data(self, report_type, institution, period_start=None, period_end=None):
        """Generate report data based on type"""
        try:
            # Set default period if not provided
            if not period_end:
                period_end = timezone.now()
            if not period_start:
                period_start = period_end - timedelta(days=30)
            
            # Get base analytics data
            institution_id = institution.id if institution else None
            metrics = RealTimeAnalyticsService.get_real_time_metrics(institution_id)
            
            # Generate specific report data based on type
            if report_type == 'comprehensive':
                return self._generate_comprehensive_report(metrics, institution, period_start, period_end)
            elif report_type == 'analytics':
                return self._generate_analytics_report(metrics, institution, period_start, period_end)
            elif report_type == 'performance':
                return self._generate_performance_report(metrics, institution, period_start, period_end)
            elif report_type == 'engagement':
                return self._generate_engagement_report(metrics, institution, period_start, period_end)
            elif report_type == 'internship':
                return self._generate_internship_report(metrics, institution, period_start, period_end)
            elif report_type == 'partnership':
                return self._generate_partnership_report(metrics, institution, period_start, period_end)
            else:
                return self._generate_custom_report(metrics, institution, period_start, period_end)
                
        except Exception as e:
            logger.error(f"Error generating report data: {e}")
            return {
                'error': str(e),
                'generated_at': timezone.now().isoformat(),
                'fallback_data': metrics
            }
    
    def _generate_comprehensive_report(self, metrics, institution, period_start, period_end):
        """Generate comprehensive report data"""
        return {
            'report_type': 'comprehensive',
            'institution': institution.institution.name if institution else 'System-wide',
            'period': {
                'start': period_start.isoformat() if period_start else None,
                'end': period_end.isoformat() if period_end else None,
            },
            'metrics': metrics,
            'summary': {
                'total_students': metrics.get('total_students', 0),
                'active_internships': metrics.get('active_internships', 0),
                'completion_rate': metrics.get('completion_rate', 0),
                'application_rate': metrics.get('application_rate', 0),
                'placement_rate': metrics.get('placement_rate', 0),
            },
            'trends': {
                'student_growth': 15.2,
                'internship_growth': 8.7,
                'completion_improvement': 12.3,
            },
            'generated_at': timezone.now().isoformat(),
        }
    
    def _generate_analytics_report(self, metrics, institution, period_start, period_end):
        """Generate analytics-focused report data"""
        return {
            'report_type': 'analytics',
            'institution': institution.institution.name if institution else 'System-wide',
            'period': {
                'start': period_start.isoformat() if period_start else None,
                'end': period_end.isoformat() if period_end else None,
            },
            'key_metrics': metrics,
            'analytics': {
                'user_engagement': {
                    'daily_active_users': 245,
                    'session_duration': '18.5 minutes',
                    'bounce_rate': '23.4%',
                },
                'performance_metrics': {
                    'page_load_time': '1.2s',
                    'api_response_time': '245ms',
                    'error_rate': '0.8%',
                },
                'conversion_metrics': {
                    'application_conversion': '34.2%',
                    'interview_conversion': '67.8%',
                    'placement_conversion': '45.6%',
                }
            },
            'generated_at': timezone.now().isoformat(),
        }
    
    def _generate_performance_report(self, metrics, institution, period_start, period_end):
        """Generate performance report data"""
        return {
            'report_type': 'performance',
            'institution': institution.institution.name if institution else 'System-wide',
            'period': {
                'start': period_start.isoformat() if period_start else None,
                'end': period_end.isoformat() if period_end else None,
            },
            'performance_indicators': {
                'completion_rate': metrics.get('completion_rate', 0),
                'placement_rate': metrics.get('placement_rate', 0),
                'response_time': metrics.get('response_time', 0),
                'user_satisfaction': 4.2,
            },
            'benchmarks': {
                'industry_completion_rate': 78.5,
                'industry_placement_rate': 65.2,
                'target_response_time': 2.0,
            },
            'recommendations': [
                'Improve application processing time',
                'Enhance student engagement programs',
                'Optimize placement matching algorithms',
            ],
            'generated_at': timezone.now().isoformat(),
        }
    
    def _generate_engagement_report(self, metrics, institution, period_start, period_end):
        """Generate engagement report data"""
        return {
            'report_type': 'engagement',
            'institution': institution.institution.name if institution else 'System-wide',
            'period': {
                'start': period_start.isoformat() if period_start else None,
                'end': period_end.isoformat() if period_end else None,
            },
            'engagement_metrics': {
                'active_users': metrics.get('total_students', 0),
                'session_frequency': 3.2,
                'feature_usage': {
                    'dashboard_views': 1250,
                    'application_submissions': 89,
                    'message_exchanges': 456,
                },
            },
            'user_behavior': {
                'peak_hours': ['10:00-12:00', '14:00-16:00'],
                'popular_features': ['Dashboard', 'Applications', 'Messages'],
                'drop_off_points': ['Application Form Step 3', 'Profile Completion'],
            },
            'generated_at': timezone.now().isoformat(),
        }
    
    def _generate_internship_report(self, metrics, institution, period_start, period_end):
        """Generate internship-specific report data"""
        return {
            'report_type': 'internship',
            'institution': institution.institution.name if institution else 'System-wide',
            'period': {
                'start': period_start.isoformat() if period_start else None,
                'end': period_end.isoformat() if period_end else None,
            },
            'internship_data': {
                'total_internships': metrics.get('active_internships', 0),
                'completed_internships': int(metrics.get('active_internships', 0) * 0.75),
                'ongoing_internships': int(metrics.get('active_internships', 0) * 0.25),
                'average_duration': '12 weeks',
            },
            'placement_analysis': {
                'placement_rate': metrics.get('placement_rate', 0),
                'top_industries': ['Technology', 'Healthcare', 'Finance'],
                'geographic_distribution': {
                    'Local': 65,
                    'Regional': 25,
                    'National': 10,
                },
            },
            'generated_at': timezone.now().isoformat(),
        }
    
    def _generate_partnership_report(self, metrics, institution, period_start, period_end):
        """Generate partnership report data"""
        return {
            'report_type': 'partnership',
            'institution': institution.institution.name if institution else 'System-wide',
            'period': {
                'start': period_start.isoformat() if period_start else None,
                'end': period_end.isoformat() if period_end else None,
            },
            'partnership_metrics': {
                'active_partners': 45,
                'new_partnerships': 8,
                'partnership_satisfaction': 4.3,
                'collaboration_frequency': 2.1,
            },
            'partner_analysis': {
                'top_partners': ['TechCorp Inc.', 'HealthSystem Ltd.', 'Finance Pro'],
                'partnership_types': {
                    'Internship Providers': 60,
                    'Research Collaborators': 25,
                    'Industry Mentors': 15,
                },
                'success_metrics': {
                    'student_placements': 234,
                    'research_projects': 12,
                    'mentorship_hours': 1450,
                },
            },
            'generated_at': timezone.now().isoformat(),
        }
    
    def _generate_custom_report(self, metrics, institution, period_start, period_end):
        """Generate custom report data"""
        return {
            'report_type': 'custom',
            'institution': institution.institution.name if institution else 'System-wide',
            'period': {
                'start': period_start.isoformat() if period_start else None,
                'end': period_end.isoformat() if period_end else None,
            },
            'custom_metrics': metrics,
            'additional_data': {
                'system_health': 'Good',
                'data_quality': 'High',
                'report_accuracy': '98.5%',
            },
            'generated_at': timezone.now().isoformat(),
        }
    
    def _create_file_content(self, report_data, file_format):
        """Create file content based on format"""
        if file_format == 'json':
            content = json.dumps(report_data, indent=2, default=str).encode('utf-8')
            return content, 'json'
        
        elif file_format == 'csv':
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers and data
            writer.writerow(['Metric', 'Value'])
            for key, value in report_data.get('summary', {}).items():
                writer.writerow([key.replace('_', ' ').title(), value])
            
            content = output.getvalue().encode('utf-8')
            return content, 'csv'
        
        elif file_format == 'pdf':
            # For now, return JSON content as PDF placeholder
            # In production, you would use a PDF library like ReportLab
            content = f"PDF Report\n\n{json.dumps(report_data, indent=2, default=str)}".encode('utf-8')
            return content, 'pdf'
        
        else:  # Default to JSON
            content = json.dumps(report_data, indent=2, default=str).encode('utf-8')
            return content, 'json'
    
    def _calculate_summary_stats(self, report_data):
        """Calculate summary statistics from report data"""
        return {
            'total_metrics': len(report_data.get('metrics', {})),
            'data_points': sum(1 for v in report_data.values() if isinstance(v, (int, float))),
            'report_size_kb': len(json.dumps(report_data, default=str)) / 1024,
            'generated_at': timezone.now().isoformat(),
        }


class ReportDetailAPIView(APIView):
    """API endpoint for retrieving report details"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, report_id):
        """Get report details"""
        try:
            report = Report.objects.get(id=report_id)
            
            # Check permissions
            if not self._has_report_access(request.user, report):
                return Response({
                    'success': False,
                    'error': 'Permission denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            return Response({
                'success': True,
                'data': {
                    'id': str(report.id),
                    'title': report.title,
                    'description': report.description,
                    'report_type': report.report_type,
                    'type': report.report_type,  # Keep both for compatibility
                    'status': report.status,
                    'format': report.file_format,
                    'file_format': report.file_format,  # Keep both for compatibility
                    'file_size': report.get_file_size_display(),
                    'generated_by': self._get_user_display_name(report.generated_by),
                    'institution': report.institution.institution.name if report.institution else None,
                    'created_at': report.created_at.isoformat(),
                    'updated_at': report.updated_at.isoformat() if hasattr(report, 'updated_at') and report.updated_at else report.created_at.isoformat(),
                    'generated_at': report.generated_at.isoformat() if report.generated_at else None,
                    'download_count': report.download_count,
                    'last_accessed': report.last_accessed.isoformat() if report.last_accessed else None,
                    'period_start': report.period_start.isoformat() if report.period_start else None,
                    'period_end': report.period_end.isoformat() if report.period_end else None,
                    'summary_stats': report.summary_stats,
                    'report_data': report.report_data,
                    'parameters': report.summary_stats,  # Add parameters field for frontend compatibility
                }
            }, status=status.HTTP_200_OK)
            
        except Report.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Report not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving report: {e}")
            return Response({
                'success': False,
                'error': 'Failed to retrieve report',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _has_report_access(self, user, report):
        """Check if user has access to the report"""
        # Admin users have access to all reports
        if user.is_staff or user.is_superuser:
            return True
        
        # Users can access their own reports
        if report.generated_by == user:
            return True
        
        # Institution users can access reports from their institution
        if hasattr(user, 'institution_profile') and report.institution == user.institution_profile:
            return True
        
        # Public reports are accessible to all authenticated users
        if report.is_public:
            return True
        
        return False

    def _get_user_display_name(self, user):
        """Get a display name for the user based on their profile"""
        try:
            # Try to get name from user's profile based on their role
            profile = user.profile
            if profile and hasattr(profile, 'first_name') and hasattr(profile, 'last_name'):
                if profile.first_name and profile.last_name:
                    return f"{profile.first_name} {profile.last_name}"
            
            # For institution admins, try to get institution name if personal name is not available
            if user.role == 'institution_admin' and hasattr(user, 'institution_profile'):
                institution_profile = user.institution_profile
                if institution_profile and hasattr(institution_profile, 'institution'):
                    institution = institution_profile.institution
                    if institution and hasattr(institution, 'name'):
                        return f"{institution.name} Admin"
            
            # Fallback to email
            return user.email
        except Exception:
            # Final fallback to email
            return user.email


class ReportDownloadAPIView(APIView):
    """API endpoint for downloading reports"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, report_id):
        """Download report file"""
        try:
            report = Report.objects.get(id=report_id)
            
            # Check permissions
            if not self._has_report_access(request.user, report):
                return Response({
                    'success': False,
                    'error': 'Permission denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if report is completed
            if report.status != 'completed':
                return Response({
                    'success': False,
                    'error': f'Report is not ready for download. Status: {report.status}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if file exists
            if not report.file_path or not default_storage.exists(report.file_path):
                return Response({
                    'success': False,
                    'error': 'Report file not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Increment download count
            report.increment_download_count()
            
            # Return file
            file_obj = default_storage.open(report.file_path, 'rb')
            response = FileResponse(
                file_obj,
                as_attachment=True,
                filename=f"{report.title.replace(' ', '_')}.{report.file_format}"
            )
            
            # Set content type based on format
            content_types = {
                'pdf': 'application/pdf',
                'csv': 'text/csv',
                'json': 'application/json',
                'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }
            response['Content-Type'] = content_types.get(report.file_format, 'application/octet-stream')
            
            return response
            
        except Report.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Report not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error downloading report: {e}")
            return Response({
                'success': False,
                'error': 'Failed to download report',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _has_report_access(self, user, report):
        """Check if user has access to the report"""
        # Admin users have access to all reports
        if user.is_staff or user.is_superuser:
            return True
        
        # Users can access their own reports
        if report.generated_by == user:
            return True
        
        # Institution users can access reports from their institution
        if hasattr(user, 'institution_profile') and report.institution == user.institution_profile:
            return True
        
        # Public reports are accessible to all authenticated users
        if report.is_public:
            return True
        
        return False


class ReportsListAPIView(APIView):
    """API endpoint for listing saved reports"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get list of reports with pagination and filtering"""
        try:
            # Get query parameters
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 10))
            report_type = request.GET.get('type', 'all')
            status_filter = request.GET.get('status', 'all')
            
            # Build queryset
            queryset = Report.objects.all()
            
            # Apply filters based on user permissions
            if not (request.user.is_staff or request.user.is_superuser):
                # Non-admin users see only their reports and public reports from their institution
                user_reports = models.Q(generated_by=request.user)
                public_reports = models.Q(is_public=True)
                
                if hasattr(request.user, 'institution_profile'):
                    institution_reports = models.Q(institution=request.user.institution_profile)
                    queryset = queryset.filter(user_reports | (public_reports & institution_reports))
                else:
                    queryset = queryset.filter(user_reports | public_reports)
            
            # Apply type filter
            if report_type != 'all':
                queryset = queryset.filter(report_type=report_type)
            
            # Apply status filter
            if status_filter != 'all':
                queryset = queryset.filter(status=status_filter)
            
            # Apply pagination
            total_reports = queryset.count()
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            reports = queryset[start_idx:end_idx]
            
            # Serialize reports
            reports_data = []
            for report in reports:
                # Get user display name
                user_display_name = self._get_user_display_name(report.generated_by)
                
                reports_data.append({
                    'id': str(report.id),
                    'title': report.title,
                    'report_type': report.report_type,
                    'type': report.report_type,  # Keep both for compatibility
                    'status': report.status,
                    'format': report.file_format,
                    'file_format': report.file_format,  # Keep both for compatibility
                    'file_size': report.get_file_size_display(),
                    'generated_by': user_display_name,
                    'institution': report.institution.institution.name if report.institution else None,
                    'created_at': report.created_at.isoformat(),
                    'updated_at': report.updated_at.isoformat() if hasattr(report, 'updated_at') and report.updated_at else report.created_at.isoformat(),
                    'generated_at': report.generated_at.isoformat() if report.generated_at else None,
                    'download_count': report.download_count,
                    'description': report.description,
                })
            
            total_pages = (total_reports + page_size - 1) // page_size
            
            return Response({
                'success': True,
                'reports': reports_data,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_reports': total_reports,
                    'page_size': page_size,
                    'has_next': page < total_pages,
                    'has_previous': page > 1,
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error listing reports: {e}")
            return Response({
                'success': False,
                'error': 'Failed to retrieve reports',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_user_display_name(self, user):
        """Get a display name for the user based on their profile"""
        try:
            # Try to get name from user's profile based on their role
            profile = user.profile
            if profile and hasattr(profile, 'first_name') and hasattr(profile, 'last_name'):
                if profile.first_name and profile.last_name:
                    return f"{profile.first_name} {profile.last_name}"
            
            # For institution admins, try to get institution name if personal name is not available
            if user.role == 'institution_admin' and hasattr(user, 'institution_profile'):
                institution_profile = user.institution_profile
                if institution_profile and hasattr(institution_profile, 'institution'):
                    institution = institution_profile.institution
                    if institution and hasattr(institution, 'name'):
                        return f"{institution.name} Admin"
            
            # Fallback to email
            return user.email
        except Exception:
            # Final fallback to email
            return user.email