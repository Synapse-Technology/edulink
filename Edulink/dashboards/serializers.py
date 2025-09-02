from rest_framework import serializers
from .models import (
    InternshipProgress, Achievement, StudentAchievement, 
    AnalyticsEvent, CalendarEvent, DashboardInsight,
    Workflow, WorkflowTemplate, WorkflowExecution, WorkflowAnalytics
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


# Workflow Management Serializers

class WorkflowTemplateSerializer(serializers.ModelSerializer):
    """Serializer for workflow templates"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    usage_count = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'description', 'category', 'category_display',
            'icon', 'color', 'steps', 'trigger_conditions', 'default_settings',
            'estimated_time', 'steps_count', 'popularity_score', 'tags',
            'is_active', 'is_public', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'usage_count'
        ]
        read_only_fields = ['id', 'popularity_score', 'created_at', 'updated_at']
    
    def get_usage_count(self, obj):
        """Get the number of workflows created from this template"""
        return obj.workflow_instances.count()
    
    def create(self, validated_data):
        """Set created_by to current user if authenticated"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class WorkflowTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for template listings"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    usage_count = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'description', 'category', 'category_display',
            'icon', 'color', 'estimated_time', 'steps_count', 
            'popularity_score', 'tags', 'usage_count'
        ]
    
    def get_usage_count(self, obj):
        return obj.workflow_instances.count()


class WorkflowSerializer(serializers.ModelSerializer):
    """Serializer for workflow instances"""
    workflow_type_display = serializers.CharField(source='get_workflow_type_display', read_only=True)
    trigger_event_display = serializers.CharField(source='get_trigger_event_display', read_only=True)
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    delay_unit_display = serializers.CharField(source='get_delay_unit_display', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    employer_name = serializers.CharField(source='employer.company_name', read_only=True)
    execution_count = serializers.SerializerMethodField()
    last_execution_status = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = Workflow
        fields = [
            'id', 'employer', 'employer_name', 'template', 'template_name',
            'name', 'description', 'workflow_type', 'workflow_type_display',
            'trigger_event', 'trigger_event_display', 'trigger_conditions',
            'action_type', 'action_type_display', 'action_config',
            'delay_amount', 'delay_unit', 'delay_unit_display',
            'is_active', 'is_paused', 'created_at', 'updated_at',
            'last_executed', 'execution_count', 'last_execution_status', 'success_rate'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_executed']
    
    def get_execution_count(self, obj):
        """Get total number of executions"""
        return obj.executions.count()
    
    def get_last_execution_status(self, obj):
        """Get status of the most recent execution"""
        last_execution = obj.executions.first()
        return last_execution.status if last_execution else None
    
    def get_success_rate(self, obj):
        """Calculate success rate of workflow executions"""
        total = obj.executions.count()
        if total == 0:
            return 0.0
        successful = obj.executions.filter(status='completed').count()
        return round((successful / total) * 100, 1)
    
    def create(self, validated_data):
        """Set employer from request context"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'employer_profile'):
            validated_data['employer'] = request.user.employer_profile
        return super().create(validated_data)


class WorkflowListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for workflow listings"""
    workflow_type_display = serializers.CharField(source='get_workflow_type_display', read_only=True)
    trigger_event_display = serializers.CharField(source='get_trigger_event_display', read_only=True)
    execution_count = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = Workflow
        fields = [
            'id', 'name', 'workflow_type', 'workflow_type_display',
            'trigger_event', 'trigger_event_display', 'is_active', 'is_paused',
            'created_at', 'last_executed', 'execution_count', 'success_rate'
        ]
    
    def get_execution_count(self, obj):
        return obj.executions.count()
    
    def get_success_rate(self, obj):
        total = obj.executions.count()
        if total == 0:
            return 0.0
        successful = obj.executions.filter(status='completed').count()
        return round((successful / total) * 100, 1)


class WorkflowExecutionSerializer(serializers.ModelSerializer):
    """Serializer for workflow execution tracking"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    duration_seconds = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowExecution
        fields = [
            'id', 'workflow', 'workflow_name', 'status', 'status_display',
            'triggered_by', 'trigger_data', 'scheduled_at', 'started_at',
            'completed_at', 'duration', 'duration_seconds', 'result_data',
            'error_message', 'logs', 'created_at'
        ]
        read_only_fields = [
            'id', 'duration', 'created_at', 'started_at', 'completed_at'
        ]
    
    def get_duration_seconds(self, obj):
        """Get duration in seconds for easier frontend handling"""
        if obj.duration:
            return obj.duration.total_seconds()
        return None


class WorkflowAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for workflow analytics data"""
    period_type_display = serializers.CharField(source='get_period_type_display', read_only=True)
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    employer_name = serializers.CharField(source='employer.company_name', read_only=True)
    average_duration_seconds = serializers.SerializerMethodField()
    time_saved_seconds = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowAnalytics
        fields = [
            'id', 'employer', 'employer_name', 'workflow', 'workflow_name',
            'date', 'period_type', 'period_type_display', 'total_executions',
            'successful_executions', 'failed_executions', 'cancelled_executions',
            'average_duration', 'average_duration_seconds', 'total_time_saved',
            'time_saved_seconds', 'tasks_automated', 'success_rate',
            'metrics_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'success_rate', 'created_at', 'updated_at']
    
    def get_average_duration_seconds(self, obj):
        """Get average duration in seconds"""
        if obj.average_duration:
            return obj.average_duration.total_seconds()
        return None
    
    def get_time_saved_seconds(self, obj):
        """Get time saved in seconds"""
        return obj.total_time_saved.total_seconds()


class WorkflowAnalyticsSummarySerializer(serializers.Serializer):
    """Serializer for workflow analytics summary data"""
    total_workflows = serializers.IntegerField()
    active_workflows = serializers.IntegerField()
    total_executions = serializers.IntegerField()
    successful_executions = serializers.IntegerField()
    failed_executions = serializers.IntegerField()
    overall_success_rate = serializers.FloatField()
    total_time_saved_hours = serializers.FloatField()
    tasks_automated_today = serializers.IntegerField()
    most_used_workflow = serializers.CharField(allow_null=True)
    recent_executions = WorkflowExecutionSerializer(many=True)


class WorkflowToggleSerializer(serializers.Serializer):
    """Serializer for toggling workflow status"""
    is_active = serializers.BooleanField()
    is_paused = serializers.BooleanField(required=False)


class WorkflowExecuteSerializer(serializers.Serializer):
    """Serializer for manually executing workflows"""
    trigger_data = serializers.JSONField(required=False, default=dict)
    scheduled_at = serializers.DateTimeField(required=False)
