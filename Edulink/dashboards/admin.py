from django.contrib import admin
from .models import (
    InternshipProgress, Achievement, StudentAchievement, 
    AnalyticsEvent, CalendarEvent, DashboardInsight
)


@admin.register(InternshipProgress)
class InternshipProgressAdmin(admin.ModelAdmin):
    list_display = [
        'student_name', 'profile_completion', 'total_applications', 
        'total_interviews', 'total_acceptances', 'current_streak', 
        'monthly_application_goal', 'created_at'
    ]
    list_filter = [
        'profile_completion', 'total_applications', 'total_interviews',
        'total_acceptances', 'current_streak', 'created_at'
    ]
    search_fields = [
        'student__user__first_name', 'student__user__last_name', 
        'student__user__email'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    def student_name(self, obj):
        return f"{obj.student.user.first_name} {obj.student.user.last_name}"
    student_name.short_description = 'Student Name'


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'achievement_type', 'points', 'is_active', 
        'earned_count', 'created_at'
    ]
    list_filter = ['achievement_type', 'is_active', 'points', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']
    
    def earned_count(self, obj):
        return obj.student_achievements.count()
    earned_count.short_description = 'Times Earned'


@admin.register(StudentAchievement)
class StudentAchievementAdmin(admin.ModelAdmin):
    list_display = [
        'student_name', 'achievement_name', 'achievement_type', 
        'points', 'earned_at'
    ]
    list_filter = [
        'achievement__achievement_type', 'achievement__points', 
        'earned_at'
    ]
    search_fields = [
        'student__user__first_name', 'student__user__last_name',
        'achievement__name'
    ]
    readonly_fields = ['earned_at']
    
    def student_name(self, obj):
        return f"{obj.student.user.first_name} {obj.student.user.last_name}"
    student_name.short_description = 'Student Name'
    
    def achievement_name(self, obj):
        return obj.achievement.name
    achievement_name.short_description = 'Achievement'
    
    def achievement_type(self, obj):
        return obj.achievement.get_achievement_type_display()
    achievement_type.short_description = 'Type'
    
    def points(self, obj):
        return obj.achievement.points
    points.short_description = 'Points'


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = [
        'student_name', 'event_type', 'timestamp', 'session_id'
    ]
    list_filter = ['event_type', 'timestamp']
    search_fields = [
        'student__user__first_name', 'student__user__last_name',
        'event_type', 'session_id'
    ]
    readonly_fields = ['timestamp']
    
    def student_name(self, obj):
        return f"{obj.student.user.first_name} {obj.student.user.last_name}"
    student_name.short_description = 'Student Name'


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = [
        'student_name', 'title', 'event_type', 'priority', 
        'start_date', 'is_completed', 'is_overdue'
    ]
    list_filter = [
        'event_type', 'priority', 'is_completed', 'is_all_day',
        'start_date', 'created_at'
    ]
    search_fields = [
        'student__user__first_name', 'student__user__last_name',
        'title', 'description'
    ]
    readonly_fields = ['created_at', 'updated_at', 'is_overdue', 'is_upcoming']
    
    def student_name(self, obj):
        return f"{obj.student.user.first_name} {obj.student.user.last_name}"
    student_name.short_description = 'Student Name'
    
    def is_overdue(self, obj):
        return obj.is_overdue
    is_overdue.boolean = True
    is_overdue.short_description = 'Overdue'


@admin.register(DashboardInsight)
class DashboardInsightAdmin(admin.ModelAdmin):
    list_display = [
        'student_name', 'title', 'insight_type', 'priority', 
        'relevance_score', 'is_read', 'is_actioned', 'is_expired'
    ]
    list_filter = [
        'insight_type', 'priority', 'is_read', 'is_actioned',
        'relevance_score', 'generated_at'
    ]
    search_fields = [
        'student__user__first_name', 'student__user__last_name',
        'title', 'description'
    ]
    readonly_fields = ['generated_at', 'is_expired']
    
    def student_name(self, obj):
        return f"{obj.student.user.first_name} {obj.student.user.last_name}"
    student_name.short_description = 'Student Name'
    
    def is_expired(self, obj):
        return obj.is_expired
    is_expired.boolean = True
    is_expired.short_description = 'Expired'
