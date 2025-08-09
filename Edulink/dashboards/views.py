from rest_framework import status, generics, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Avg
from datetime import datetime, timedelta
import json
from django.db.models.functions import TruncMonth

from .models import (
    InternshipProgress, Achievement, StudentAchievement, 
    AnalyticsEvent, CalendarEvent, DashboardInsight, StudentActivityLog
)
from .serializers import (
    InternshipProgressSerializer, AchievementSerializer, StudentAchievementSerializer,
    AnalyticsEventSerializer, CalendarEventSerializer, DashboardInsightSerializer,
    DashboardOverviewSerializer, ProgressUpdateSerializer, CalendarEventCreateSerializer,
    AchievementProgressSerializer, StudentDashboardSerializer
)
from users.models.student_profile import StudentProfile
from application.models import Application
from internship.models import Internship


class StudentDashboardAPIView(generics.RetrieveAPIView):
    """Original student dashboard API view"""
    permission_classes = [IsAuthenticated]
    serializer_class = StudentDashboardSerializer
    
    def get_object(self):
        """Get dashboard data for current student"""
        # Check if user has student_profile
        if not hasattr(self.request.user, 'student_profile') or not self.request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        student = self.request.user.student_profile
        
        # Get applications
        applications = Application.objects.filter(student=student.user)
        
        # Get recent applications
        recent_applications = applications.order_by('-application_date')[:5]
        
        # Get application status counts
        status_counts = applications.values('status').annotate(count=Count('id'))
        application_status_counts = {item['status']: item['count'] for item in status_counts}
        
        # Get recommended internships (placeholder)
        recommended_internships = Internship.objects.filter(is_active=True, is_verified=True)[:3]
        
        # Get unread notifications count (placeholder)
        unread_notifications = 0
        
        return {
            'first_name': student.first_name,
            'last_name': student.last_name,
            'total_applications': applications.count(),
            'application_status_counts': application_status_counts,
            'recent_applications': [
                {
                    'internship_title': app.internship.title,
                    'status': app.status,
                    'applied_on': app.application_date.isoformat() if app.application_date else None
                }
                for app in recent_applications
            ],
            'recommended_internships': [
                {
                    'title': internship.title,
                    'company_name': internship.employer.company_name,
                    'location': internship.location
                }
                for internship in recommended_internships
            ],
            'unread_notifications': unread_notifications,
            'profile_picture': student.profile_picture.url if student.profile_picture else None
        }


class DashboardOverviewView(generics.RetrieveAPIView):
    """Get comprehensive dashboard overview for student"""
    permission_classes = [IsAuthenticated]
    serializer_class = DashboardOverviewSerializer
    
    def get_object(self):
        """Get or create progress object for current student"""
        # Check if user has student_profile
        if not hasattr(self.request.user, 'student_profile') or not self.request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        student = self.request.user.student_profile
        today = timezone.now().date()
        # Log dashboard view activity
        StudentActivityLog.objects.get_or_create(student=student, activity_date=today, activity_type='dashboard_view')
        # Applications (single source of truth)
        # Safety assertion to catch type mismatches early
        from authentication.models import User
        assert isinstance(student.user, User), f"Expected student.user to be a User instance, got {type(student.user)}"
        applications = Application.objects.filter(student=student.user)
        total_applications = applications.count()
        recent_applications_qs = applications.order_by('-application_date')[:5]
        recent_applications = [
            {
                'id': app.id,
                'internship_title': app.internship.title if app.internship else '',
                'status': app.status,
                'applied_on': app.application_date,
                'company': app.internship.employer.company_name if app.internship and app.internship.employer else '',
                'location': app.internship.location if app.internship else '',
            }
            for app in recent_applications_qs
        ]
        # Application trends (last 6 months)
        six_months_ago = timezone.now() - timedelta(days=180)
        monthly_counts = (
            applications.filter(application_date__gte=six_months_ago)
            .annotate(month=TruncMonth('application_date'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        application_trends = [
            {'month': mc['month'].strftime('%b %Y'), 'count': mc['count']} for mc in monthly_counts
        ]
        # Activity streaks
        logs = student.activity_logs.order_by('activity_date').values_list('activity_date', flat=True)
        streaks = self._calculate_streaks(list(logs))
        current_streak = streaks['current']
        longest_streak = streaks['longest']
        # Status counts
        status_counts = applications.values('status').annotate(count=Count('id'))
        application_status_counts = {item['status']: item['count'] for item in status_counts}
        print('DEBUG application_status_counts:', application_status_counts)
        # Recommended internships
        recommended_internships = Internship.objects.filter(is_active=True, is_verified=True)[:3]
        # Progress object
        progress, created = InternshipProgress.objects.get_or_create(student=student)
        # Sync progress.total_applications with actual count
        if progress.total_applications != total_applications:
            progress.total_applications = total_applications
            progress.save(update_fields=['total_applications'])
        # Analytics summary
        analytics_summary = {
            'total_applications': total_applications,
            'pending_applications': application_status_counts.get('pending', 0),
            'accepted_applications': application_status_counts.get('accepted', 0),
            'rejected_applications': application_status_counts.get('rejected', 0),
            'success_rate': round((application_status_counts.get('accepted', 0) / total_applications * 100) if total_applications > 0 else 0, 1),
            'this_month_applications': applications.filter(application_date__month=timezone.now().month).count(),
            'average_response_time': self._calculate_average_response_time(applications)
        }
        print('DEBUG analytics_summary:', analytics_summary)
        return {
            'first_name': student.first_name,
            'last_name': student.last_name,
            'total_applications': total_applications,
            'application_status_counts': application_status_counts,
            'recent_applications': recent_applications,
            'recommended_internships': [
                {
                    'title': internship.title,
                    'company_name': internship.employer.company_name,
                    'location': internship.location
                }
                for internship in recommended_internships
            ],
            'unread_notifications': 0,
            'profile_picture': student.profile_picture.url if student.profile_picture else None,
            'progress': progress,
            'recent_achievements': student.achievements.all()[:5],
            'upcoming_events': student.calendar_events.filter(start_date__gte=timezone.now(), is_completed=False).order_by('start_date')[:5],
            'recent_insights': student.insights.filter(expires_at__gt=timezone.now()).order_by('-relevance_score')[:3],
            'analytics_summary': analytics_summary,
            'application_trends': application_trends,
            'current_streak': current_streak,
            'longest_streak': longest_streak,
        }

    def _update_progress_from_applications(self, progress):
        """Update progress data from existing applications"""
        applications = Application.objects.filter(student=progress.student.user)  
        
        if applications.exists():
            progress.total_applications = applications.count()
            progress.first_application_date = applications.order_by('application_date').first().application_date
            
            # Count applications this month
            current_month = timezone.now().month
            progress.applications_this_month = applications.filter(
                application_date__month=current_month
            ).count()
            
            # Count acceptances
            accepted_apps = applications.filter(status='accepted')
            progress.total_acceptances = accepted_apps.count()
            if accepted_apps.exists():
                progress.first_acceptance_date = accepted_apps.order_by('application_date').first().application_date
            
            progress.save()

    def _calculate_average_response_time(self, applications):
        """Calculate average response time for applications"""
        reviewed_apps = applications.filter(
            reviewed_at__isnull=False,
            application_date__isnull=False
        )
        
        if not reviewed_apps.exists():
            return None
        
        total_days = 0
        count = 0
        
        for app in reviewed_apps:
            if app.application_date and app.reviewed_at:
                days = (app.reviewed_at - app.application_date).days
                total_days += days
                count += 1
        
        return round(total_days / count, 1) if count > 0 else None

    def _calculate_streaks(self, date_list):
        if not date_list:
            return {'current': 0, 'longest': 0}
        from datetime import timedelta as td
        date_set = set(date_list)
        sorted_dates = sorted(date_set)
        longest = current = 1
        max_streak = 1
        for i in range(1, len(sorted_dates)):
            if (sorted_dates[i] - sorted_dates[i-1]) == td(days=1):
                current += 1
                max_streak = max(max_streak, current)
            else:
                current = 1
        # Current streak: consecutive up to today
        today = timezone.now().date()
        streak = 0
        for i in range(len(sorted_dates)-1, -1, -1):
            if (today - sorted_dates[i]).days == streak:
                streak += 1
            else:
                break
        return {'current': streak, 'longest': max_streak}


class InternshipProgressView(generics.RetrieveUpdateAPIView):
    """Get and update internship progress"""
    permission_classes = [IsAuthenticated]
    serializer_class = InternshipProgressSerializer
    
    def get_object(self):
        """Get or create progress object for current student"""
        # Check if user has student_profile
        if not hasattr(self.request.user, 'student_profile') or not self.request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        student = self.request.user.student_profile
        progress, created = InternshipProgress.objects.get_or_create(student=student)
        
        if created:
            self._update_progress_from_applications(progress)
        
        return progress
    
    def _update_progress_from_applications(self, progress):
        """Update progress data from existing applications"""
        applications = Application.objects.filter(student=progress.student.user)
        
        if applications.exists():
            progress.total_applications = applications.count()
            progress.first_application_date = applications.order_by('application_date').first().application_date
            
            # Count applications this month
            current_month = timezone.now().month
            progress.applications_this_month = applications.filter(
                application_date__month=current_month
            ).count()
            
            # Count acceptances
            accepted_apps = applications.filter(status='accepted')
            progress.total_acceptances = accepted_apps.count()
            if accepted_apps.exists():
                progress.first_acceptance_date = accepted_apps.order_by('application_date').first().application_date
            
            progress.save()


class ProgressUpdateView(generics.UpdateAPIView):
    """Update progress goals and targets"""
    permission_classes = [IsAuthenticated]
    serializer_class = ProgressUpdateSerializer
    
    def get_object(self):
        """Get progress object for current student"""
        # Check if user has student_profile
        if not hasattr(self.request.user, 'student_profile') or not self.request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        student = self.request.user.student_profile
        progress, created = InternshipProgress.objects.get_or_create(student=student)
        return progress


class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for achievements"""
    permission_classes = [IsAuthenticated]
    serializer_class = AchievementSerializer
    
    def get_queryset(self):
        """Get achievements with earned status for current student"""
        return Achievement.objects.filter(is_active=True)
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Get progress towards specific achievement"""
        achievement = self.get_object()
        # Check if user has student_profile
        if not hasattr(request.user, 'student_profile') or not request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        student = request.user.student_profile
        
        # Check if already earned
        try:
            student_achievement = StudentAchievement.objects.get(
                student=student, achievement=achievement
            )
            return Response({
                'achievement_id': achievement.id,
                'progress_percentage': 100,
                'current_value': 1,
                'target_value': 1,
                'is_earned': True,
                'earned_date': student_achievement.earned_at
            })
        except StudentAchievement.DoesNotExist:
            # Calculate progress based on achievement criteria
            progress_data = self._calculate_achievement_progress(achievement, student)
            return Response(progress_data)
    
    def _calculate_achievement_progress(self, achievement, student):
        """Calculate progress towards achievement"""
        criteria = achievement.criteria
        
        if achievement.achievement_type == 'profile':
            progress = InternshipProgress.objects.get(student=student)
            current_value = progress.profile_completion
            target_value = 100
            progress_percentage = current_value
        
        elif achievement.achievement_type == 'application':
            applications = Application.objects.filter(student=student.user)
            current_value = applications.count()
            target_value = criteria.get('target_applications', 5)
            progress_percentage = min((current_value / target_value) * 100, 100)
        
        elif achievement.achievement_type == 'interview':
            # Count applications with interview status
            applications = Application.objects.filter(student=student.user)
            current_value = applications.filter(status='reviewed').count()
            target_value = criteria.get('target_interviews', 1)
            progress_percentage = min((current_value / target_value) * 100, 100)
        
        elif achievement.achievement_type == 'acceptance':
            applications = Application.objects.filter(student=student.user, status='accepted')
            current_value = applications.count()
            target_value = criteria.get('target_acceptances', 1)
            progress_percentage = min((current_value / target_value) * 100, 100)
        
        else:
            current_value = 0
            target_value = 1
            progress_percentage = 0
        
        return {
            'achievement_id': achievement.id,
            'progress_percentage': round(progress_percentage, 1),
            'current_value': current_value,
            'target_value': target_value,
            'is_earned': progress_percentage >= 100,
            'earned_date': None
        }


class StudentAchievementView(generics.ListAPIView):
    """Get student's earned achievements"""
    permission_classes = [IsAuthenticated]
    serializer_class = StudentAchievementSerializer
    
    def get_queryset(self):
        """Get achievements for current student"""
        # Check if user has student_profile
        if not hasattr(self.request.user, 'student_profile') or not self.request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        student = self.request.user.student_profile
        return StudentAchievement.objects.filter(student=student)


class AnalyticsEventView(generics.CreateAPIView):
    """Create analytics events"""
    permission_classes = [IsAuthenticated]
    serializer_class = AnalyticsEventSerializer
    
    def perform_create(self, serializer):
        """Create analytics event for current student"""
        # Check if user has student_profile
        if not hasattr(self.request.user, 'student_profile') or not self.request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        serializer.save(student=self.request.user.student_profile)


class CalendarEventViewSet(viewsets.ModelViewSet):
    """ViewSet for calendar events"""
    permission_classes = [IsAuthenticated]
    serializer_class = CalendarEventSerializer
    
    def get_queryset(self):
        """Get calendar events for current student"""
        # Check if user has student_profile
        if not hasattr(self.request.user, 'student_profile') or not self.request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        student = self.request.user.student_profile
        return CalendarEvent.objects.filter(student=student)
    
    def get_serializer_class(self):
        """Use different serializer for create/update"""
        if self.action in ['create', 'update', 'partial_update']:
            return CalendarEventCreateSerializer
        return CalendarEventSerializer
    
    def perform_create(self, serializer):
        """Create calendar event for current student"""
        # Check if user has student_profile
        if not hasattr(self.request.user, 'student_profile') or not self.request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        serializer.save(student=self.request.user.student_profile)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming events"""
        # Check if user has student_profile
        if not hasattr(request.user, 'student_profile') or not request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        student = request.user.student_profile
        events = CalendarEvent.objects.filter(
            student=student,
            start_date__gte=timezone.now(),
            is_completed=False
        ).order_by('start_date')[:10]
        
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue events"""
        # Check if user has student_profile
        if not hasattr(request.user, 'student_profile') or not request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        student = request.user.student_profile
        events = CalendarEvent.objects.filter(
            student=student,
            start_date__lt=timezone.now(),
            is_completed=False
        ).order_by('start_date')
        
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark event as completed"""
        event = self.get_object()
        event.is_completed = True
        event.completed_at = timezone.now()
        event.save()
        
        serializer = self.get_serializer(event)
        return Response(serializer.data)


class DashboardInsightView(generics.ListAPIView):
    """Get dashboard insights for student"""
    permission_classes = [IsAuthenticated]
    serializer_class = DashboardInsightSerializer
    
    def get_queryset(self):
        """Get insights for current student"""
        # Check if user has student_profile
        if not hasattr(self.request.user, 'student_profile') or not self.request.user.student_profile:
            raise ValidationError("User does not have a student profile")
        
        student = self.request.user.student_profile
        return DashboardInsight.objects.filter(
            student=student,
            is_expired=False
        ).order_by('-relevance_score')
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark insight as read"""
        insight = self.get_object()
        insight.is_read = True
        insight.save()
        
        serializer = self.get_serializer(insight)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_actioned(self, request, pk=None):
        """Mark insight as actioned"""
        insight = self.get_object()
        insight.is_actioned = True
        insight.save()
        
        serializer = self.get_serializer(insight)
        return Response(serializer.data)


class AnalyticsDashboardView(generics.RetrieveAPIView):
    """Get analytics dashboard data"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """Get comprehensive analytics data"""
        try:
            student = request.user.student_profile
            
            # Get date range (last 6 months by default)
            end_date = timezone.now()
            start_date = end_date - timedelta(days=180)
            
            # Application analytics
            applications = Application.objects.filter(
                student=student.user,
                application_date__range=[start_date, end_date]
            )
            
            # Monthly application trends
            monthly_applications = self._get_monthly_trends(applications, 'application_date')
            
            # Status distribution
            status_distribution = applications.values('status').annotate(
                count=Count('id')
            ).order_by('status')
            
            # Industry preferences (from internships)
            industry_preferences = self._get_industry_preferences(student)
            
            # Response time analytics
            response_time_data = self._get_response_time_analytics(applications)
            
            # Skills development tracking
            skills_data = self._get_skills_development(student)
            
            analytics_data = {
                'application_trends': monthly_applications,
                'status_distribution': list(status_distribution),
                'industry_preferences': industry_preferences,
                'response_time_data': response_time_data,
                'skills_data': skills_data,
                'summary': {
                    'total_applications': applications.count(),
                    'pending_applications': applications.filter(status='pending').count(),
                    'accepted_applications': applications.filter(status='accepted').count(),
                    'rejected_applications': applications.filter(status='rejected').count(),
                    'success_rate': self._calculate_success_rate(applications),
                    'this_month_applications': applications.filter(
                        application_date__month=timezone.now().month
                    ).count(),
                    'average_response_time': response_time_data.get('average_days')
                }
            }
            
            return Response(analytics_data)
        except Exception as e:
            # Return safe default data instead of 500 error
            return Response({
                'application_trends': [],
                'status_distribution': [],
                'industry_preferences': [],
                'response_time_data': {'average_days': None},
                'skills_data': {'developed_skills': [], 'targeted_skills': [], 'total_skills': 0},
                'summary': {
                    'total_applications': 0,
                    'pending_applications': 0,
                    'accepted_applications': 0,
                    'rejected_applications': 0,
                    'success_rate': 0,
                    'this_month_applications': 0,
                    'average_response_time': None
                }
            }, status=200)
    
    def _get_monthly_trends(self, queryset, date_field):
        """Get monthly trends for a queryset"""
        from django.db.models.functions import TruncMonth
        
        monthly_data = queryset.annotate(
            month=TruncMonth(date_field)
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')
        
        return list(monthly_data)
    
    def _get_industry_preferences(self, student):
        """Get industry preferences from applications"""
        applications = Application.objects.filter(student=student.user)
        internships = Internship.objects.filter(applications__in=applications)
        
        # Group by category (industry)
        industry_counts = internships.values('category').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        return list(industry_counts)
    
    def _get_response_time_analytics(self, applications):
        """Get response time analytics"""
        reviewed_apps = applications.filter(
            reviewed_at__isnull=False,
            application_date__isnull=False
        )
        
        if not reviewed_apps.exists():
            return {'average_days': None, 'response_times': []}
        
        response_times = []
        total_days = 0
        
        for app in reviewed_apps:
            days = (app.reviewed_at - app.application_date).days
            response_times.append(days)
            total_days += days
        
        return {
            'average_days': round(total_days / reviewed_apps.count(), 1),
            'response_times': response_times
        }
    
    def _get_skills_development(self, student):
        """Get skills development data"""
        try:
            progress = InternshipProgress.objects.get(student=student)
            return {
                'developed_skills': progress.skills_developed,
                'targeted_skills': progress.skills_targeted,
                'total_skills': len(progress.skills_developed) + len(progress.skills_targeted)
            }
        except InternshipProgress.DoesNotExist:
            return {
                'developed_skills': [],
                'targeted_skills': [],
                'total_skills': 0
            }
    
    def _calculate_success_rate(self, applications):
        """Calculate success rate from applications"""
        if not applications.exists():
            return 0
        
        accepted_count = applications.filter(status='accepted').count()
        return round((accepted_count / applications.count()) * 100, 1)
