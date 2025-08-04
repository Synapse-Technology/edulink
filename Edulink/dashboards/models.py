
# Create your models here.

from django.db import models
from django.contrib.auth import get_user_model
from users.models.student_profile import StudentProfile
from application.models import Application
from internship.models import Internship
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import json

User = get_user_model()


class InternshipProgress(models.Model):
    """Track student's internship journey progress"""
    student = models.OneToOneField(StudentProfile, on_delete=models.CASCADE, related_name='internship_progress')
    
    # Profile completion
    profile_completion = models.PositiveIntegerField(
        default=0, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Profile completion percentage"
    )
    
    # Application milestones
    first_application_date = models.DateTimeField(null=True, blank=True)
    total_applications = models.PositiveIntegerField(default=0)
    applications_this_month = models.PositiveIntegerField(default=0)
    
    # Interview tracking
    total_interviews = models.PositiveIntegerField(default=0)
    interviews_this_month = models.PositiveIntegerField(default=0)
    interview_success_rate = models.FloatField(default=0.0)
    
    # Acceptance tracking
    total_acceptances = models.PositiveIntegerField(default=0)
    first_acceptance_date = models.DateTimeField(null=True, blank=True)
    
    # Skills development
    skills_developed = models.JSONField(default=list, blank=True)
    skills_targeted = models.JSONField(default=list, blank=True)
    
    # Activity streak
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    
    # Goals and targets
    monthly_application_goal = models.PositiveIntegerField(default=10)
    target_industries = models.JSONField(default=list, blank=True)
    target_companies = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Internship Progress"
    
    def __str__(self):
        return f"Progress for {self.student.user.first_name} {self.student.user.last_name}"
    
    def calculate_profile_completion(self):
        """Calculate profile completion percentage based on filled fields"""
        profile = self.student
        total_fields = 0
        filled_fields = 0
        
        # Basic info fields
        basic_fields = ['bio', 'phone_number', 'date_of_birth', 'gender', 'address']
        for field in basic_fields:
            total_fields += 1
            if getattr(profile, field):
                filled_fields += 1
        
        # Education fields
        if profile.education_level:
            filled_fields += 1
        total_fields += 1
        
        if profile.institution:
            filled_fields += 1
        total_fields += 1
        
        # Skills and interests
        if profile.skills:
            filled_fields += 1
        total_fields += 1
        
        if profile.interests:
            filled_fields += 1
        total_fields += 1
        
        # Profile picture
        if profile.profile_picture:
            filled_fields += 1
        total_fields += 1
        
        self.profile_completion = int((filled_fields / total_fields) * 100) if total_fields > 0 else 0
        self.save()
        return self.profile_completion

    @property
    def current_internship(self):
        from application.models import Application
        from django.utils import timezone
        # Find the most recent accepted application with a future or current end_date
        accepted_apps = Application.objects.filter(
            student=self.student,
            status='accepted',
            internship__end_date__gte=timezone.now().date()
        ).order_by('-internship__end_date')
        if accepted_apps.exists():
            return accepted_apps.first().internship
        return None

    @property
    def onboarded(self):
        return self.current_internship is not None

    @property
    def internship_start_date(self):
        internship = self.current_internship
        return internship.start_date if internship else None

    @property
    def internship_end_date(self):
        internship = self.current_internship
        return internship.end_date if internship else None


class Achievement(models.Model):
    """Achievement badges and milestones"""
    ACHIEVEMENT_TYPES = [
        ('profile', 'Profile Completion'),
        ('application', 'Application Milestone'),
        ('interview', 'Interview Milestone'),
        ('acceptance', 'Acceptance Milestone'),
        ('streak', 'Activity Streak'),
        ('skill', 'Skill Development'),
        ('social', 'Social Engagement'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    achievement_type = models.CharField(max_length=20, choices=ACHIEVEMENT_TYPES)
    icon = models.CharField(max_length=50, help_text="Bootstrap icon class or emoji")
    points = models.PositiveIntegerField(default=10)
    criteria = models.JSONField(help_text="Criteria for earning this achievement")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['points', 'name']
    
    def __str__(self):
        return self.name


class StudentAchievement(models.Model):
    """Track which achievements students have earned"""
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name='student_achievements')
    earned_at = models.DateTimeField(auto_now_add=True)
    progress_data = models.JSONField(default=dict, blank=True, help_text="Data about progress towards achievement")
    
    class Meta:
        unique_together = ('student', 'achievement')
        ordering = ['-earned_at']
    
    def __str__(self):
        return f"{self.student.user.first_name} earned {self.achievement.name}"


class AnalyticsEvent(models.Model):
    """Track analytics events for dashboard insights"""
    EVENT_TYPES = [
        ('application_submitted', 'Application Submitted'),
        ('application_viewed', 'Application Viewed'),
        ('interview_scheduled', 'Interview Scheduled'),
        ('interview_completed', 'Interview Completed'),
        ('offer_received', 'Offer Received'),
        ('offer_accepted', 'Offer Accepted'),
        ('profile_updated', 'Profile Updated'),
        ('skill_added', 'Skill Added'),
        ('internship_viewed', 'Internship Viewed'),
        ('search_performed', 'Search Performed'),
    ]
    
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='analytics_events')
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    event_data = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    session_id = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['student', 'event_type', 'timestamp']),
            models.Index(fields=['event_type', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.student.user.first_name} - {self.event_type} at {self.timestamp}"


class CalendarEvent(models.Model):
    """Smart calendar events and reminders"""
    EVENT_TYPES = [
        ('application_deadline', 'Application Deadline'),
        ('interview', 'Interview'),
        ('follow_up', 'Follow Up'),
        ('career_fair', 'Career Fair'),
        ('workshop', 'Workshop'),
        ('deadline_reminder', 'Deadline Reminder'),
        ('goal_reminder', 'Goal Reminder'),
        ('custom', 'Custom Event'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='calendar_events')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    
    # Timing
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    is_all_day = models.BooleanField(default=False)
    
    # Reminders
    reminder_sent = models.BooleanField(default=False)
    reminder_time = models.DateTimeField(null=True, blank=True)
    
    # Related objects
    related_internship = models.ForeignKey(Internship, on_delete=models.CASCADE, null=True, blank=True)
    related_application = models.ForeignKey(Application, on_delete=models.CASCADE, null=True, blank=True)
    
    # Status
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    location = models.CharField(max_length=200, blank=True)
    color = models.CharField(max_length=7, default='#14b8a6', help_text="Hex color code")
    tags = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['start_date', 'priority']
        indexes = [
            models.Index(fields=['student', 'start_date']),
            models.Index(fields=['event_type', 'start_date']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.student.user.first_name}"
    
    @property
    def is_overdue(self):
        """Check if the event is overdue"""
        return not self.is_completed and timezone.now() > self.start_date
    
    @property
    def is_upcoming(self):
        """Check if the event is upcoming (within 7 days)"""
        from datetime import timedelta
        return (self.start_date > timezone.now() and 
                self.start_date <= timezone.now() + timedelta(days=7))


class DashboardInsight(models.Model):
    """AI-powered insights and recommendations for students"""
    INSIGHT_TYPES = [
        ('profile', 'Profile Improvement'),
        ('application', 'Application Strategy'),
        ('skill', 'Skill Development'),
        ('market', 'Market Trends'),
        ('timing', 'Timing Optimization'),
        ('networking', 'Networking'),
    ]
    
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='insights')
    insight_type = models.CharField(max_length=20, choices=INSIGHT_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    action_items = models.JSONField(default=list, blank=True)
    priority = models.CharField(max_length=10, choices=CalendarEvent.PRIORITY_LEVELS, default='medium')
    is_read = models.BooleanField(default=False)
    is_actioned = models.BooleanField(default=False)
    
    # Analytics
    relevance_score = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    generated_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-relevance_score', '-generated_at']
    
    def __str__(self):
        return f"{self.title} for {self.student.user.first_name}"
    
    @property
    def is_expired(self):
        """Check if the insight has expired"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at


class StudentActivityLog(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='activity_logs')
    activity_date = models.DateField()
    activity_type = models.CharField(max_length=32)

    class Meta:
        unique_together = ('student', 'activity_date', 'activity_type')
        ordering = ['-activity_date']

    def __str__(self):
        return f"{self.student} - {self.activity_type} on {self.activity_date}"
