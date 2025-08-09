from rest_framework import serializers
from .models import (
    InternshipProgress, Achievement, StudentAchievement, 
    AnalyticsEvent, CalendarEvent, DashboardInsight
)
from users.serializers.student_serializer import StudentProfileSerializer
from application.models import Application
from internship.models import Internship
from django.utils import timezone


class RecentApplicationSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    internship_title = serializers.CharField()
    status = serializers.CharField()
    applied_on = serializers.DateTimeField()
    company = serializers.CharField()
    location = serializers.CharField()


class StudentDashboardSerializer(serializers.Serializer):
    total_applications = serializers.IntegerField()
    application_status_counts = serializers.DictField(child=serializers.IntegerField())
    recent_applications = RecentApplicationSerializer(many=True)
    unread_notifications = serializers.IntegerField()
    profile_complete = serializers.BooleanField()
    incomplete_fields = serializers.ListField(child=serializers.CharField())
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)


class InternshipProgressSerializer(serializers.ModelSerializer):
    """Serializer for internship progress tracking"""
    student = StudentProfileSerializer(read_only=True)
    profile_completion_percentage = serializers.SerializerMethodField()
    progress_summary = serializers.SerializerMethodField()
    next_milestones = serializers.SerializerMethodField()
    onboarded = serializers.SerializerMethodField()
    internship_start_date = serializers.SerializerMethodField()
    internship_end_date = serializers.SerializerMethodField()
    
    class Meta:
        model = InternshipProgress
        fields = [
            'id', 'student', 'profile_completion', 'profile_completion_percentage',
            'first_application_date', 'total_applications', 'applications_this_month',
            'total_interviews', 'interviews_this_month', 'interview_success_rate',
            'total_acceptances', 'first_acceptance_date', 'skills_developed',
            'skills_targeted', 'current_streak', 'longest_streak', 'last_activity_date',
            'monthly_application_goal', 'target_industries', 'target_companies',
            'progress_summary', 'next_milestones', 'created_at', 'updated_at',
            'onboarded', 'internship_start_date', 'internship_end_date'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_profile_completion_percentage(self, obj):
        """Get profile completion as a formatted percentage"""
        return f"{obj.student.profile_completion}%"
    
    def get_progress_summary(self, obj):
        """Get a summary of the student's progress"""
        return {
            'total_applications': obj.total_applications,
            'success_rate': round((obj.total_acceptances / obj.total_applications * 100) if obj.total_applications > 0 else 0, 1),
            'current_streak': obj.current_streak,
            'monthly_goal_progress': round((obj.applications_this_month / obj.monthly_application_goal * 100) if obj.monthly_application_goal > 0 else 0, 1),
            'profile_completion': obj.student.profile_completion
        }
    
    def get_next_milestones(self, obj):
        """Get next milestones for the student"""
        milestones = []
        
        # Profile completion milestone
        if obj.student.profile_completion < 100:
            milestones.append({
                'type': 'profile',
                'title': 'Complete Your Profile',
                'description': f'You\'re {obj.student.profile_completion}% complete. Add more details to stand out!',
                'progress': obj.student.profile_completion,
                'target': 100
            })
        
        # Application milestones
        if obj.total_applications < 5:
            milestones.append({
                'type': 'application',
                'title': 'First 5 Applications',
                'description': 'Submit your first 5 internship applications',
                'progress': obj.total_applications,
                'target': 5
            })
        elif obj.total_applications < 10:
            milestones.append({
                'type': 'application',
                'title': '10 Applications Milestone',
                'description': 'Submit 10 internship applications',
                'progress': obj.total_applications,
                'target': 10
            })
        
        # Interview milestone
        if obj.total_interviews == 0:
            milestones.append({
                'type': 'interview',
                'title': 'First Interview',
                'description': 'Get your first interview invitation',
                'progress': 0,
                'target': 1
            })
        
        # Acceptance milestone
        if obj.total_acceptances == 0:
            milestones.append({
                'type': 'acceptance',
                'title': 'First Acceptance',
                'description': 'Get your first internship offer',
                'progress': 0,
                'target': 1
            })
        
        return milestones

    def get_onboarded(self, obj):
        return obj.onboarded
    def get_internship_start_date(self, obj):
        return obj.internship_start_date
    def get_internship_end_date(self, obj):
        return obj.internship_end_date


class AchievementSerializer(serializers.ModelSerializer):
    """Serializer for achievements"""
    earned_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Achievement
        fields = [
            'id', 'name', 'description', 'achievement_type', 'icon', 'points',
            'criteria', 'is_active', 'earned_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_earned_count(self, obj):
        """Get count of students who have earned this achievement"""
        return obj.student_achievements.count()


class StudentAchievementSerializer(serializers.ModelSerializer):
    """Serializer for student achievements"""
    achievement = AchievementSerializer(read_only=True)
    student = StudentProfileSerializer(read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentAchievement
        fields = [
            'id', 'student', 'achievement', 'earned_at', 'progress_data',
            'progress_percentage'
        ]
        read_only_fields = ['id', 'earned_at']
    
    def get_progress_percentage(self, obj):
        """Calculate progress percentage towards achievement"""
        if not obj.progress_data:
            return 100  # Already earned
        
        # This would be calculated based on the achievement criteria
        # For now, return 100 if earned, 0 if not
        return 100 if obj.earned_at else 0


class AnalyticsEventSerializer(serializers.ModelSerializer):
    """Serializer for analytics events"""
    student = StudentProfileSerializer(read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    
    class Meta:
        model = AnalyticsEvent
        fields = [
            'id', 'student', 'event_type', 'event_type_display', 'event_data',
            'timestamp', 'session_id'
        ]
        read_only_fields = ['id', 'timestamp']


class CalendarEventSerializer(serializers.ModelSerializer):
    """Serializer for calendar events"""
    student = StudentProfileSerializer(read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    related_internship_title = serializers.CharField(source='related_internship.title', read_only=True)
    
    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'student', 'title', 'description', 'event_type', 'event_type_display',
            'priority', 'priority_display', 'start_date', 'end_date', 'is_all_day',
            'reminder_sent', 'reminder_time', 'related_internship', 'related_internship_title',
            'related_application', 'is_completed', 'completed_at', 'location', 'color',
            'tags', 'is_overdue', 'is_upcoming', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DashboardInsightSerializer(serializers.ModelSerializer):
    """Serializer for dashboard insights"""
    student = StudentProfileSerializer(read_only=True)
    insight_type_display = serializers.CharField(source='get_insight_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = DashboardInsight
        fields = [
            'id', 'student', 'insight_type', 'insight_type_display', 'title',
            'description', 'action_items', 'priority', 'priority_display',
            'is_read', 'is_actioned', 'relevance_score', 'is_expired',
            'generated_at', 'expires_at'
        ]
        read_only_fields = ['id', 'generated_at']


class DashboardOverviewSerializer(serializers.Serializer):
    """Comprehensive dashboard overview serializer"""
    progress = InternshipProgressSerializer()
    recent_achievements = StudentAchievementSerializer(many=True)
    upcoming_events = CalendarEventSerializer(many=True)
    recent_insights = DashboardInsightSerializer(many=True)
    analytics_summary = serializers.DictField()
    application_trends = serializers.ListField(child=serializers.DictField())
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    recent_applications = RecentApplicationSerializer(many=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # analytics_summary is already provided by the view
        return data


class ProgressUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating progress data"""
    class Meta:
        model = InternshipProgress
        fields = [
            'monthly_application_goal', 'target_industries', 'target_companies',
            'skills_targeted'
        ]
    
    def update(self, instance, validated_data):
        """Update progress and recalculate completion"""
        instance = super().update(instance, validated_data)
        instance.calculate_profile_completion()
        return instance


class CalendarEventCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating calendar events"""
    class Meta:
        model = CalendarEvent
        fields = [
            'title', 'description', 'event_type', 'priority', 'start_date',
            'end_date', 'is_all_day', 'reminder_time', 'related_internship',
            'related_application', 'location', 'color', 'tags'
        ]
    
    def create(self, validated_data):
        """Create calendar event for the current student"""
        validated_data['student'] = self.context['request'].user.student_profile
        return super().create(validated_data)


class AchievementProgressSerializer(serializers.Serializer):
    """Serializer for achievement progress tracking"""
    achievement_id = serializers.IntegerField()
    progress_percentage = serializers.FloatField()
    current_value = serializers.IntegerField()
    target_value = serializers.IntegerField()
    is_earned = serializers.BooleanField()
    earned_date = serializers.DateTimeField(allow_null=True)
