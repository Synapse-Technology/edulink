
# Create your models here.

from django.db import models
from django.contrib.auth import get_user_model
from users.models.student_profile import StudentProfile
from application.models import Application
from internship.models import Internship
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
import json
import uuid
from datetime import datetime, timedelta
from django.utils import timezone

User = get_user_model()


class InternshipProgress(models.Model):
    """Enhanced model to track student's internship journey progress with analytics"""
    
    INTERNSHIP_STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('searching', 'Actively Searching'),
        ('applied', 'Applications Submitted'),
        ('interviewing', 'In Interview Process'),
        ('offer_received', 'Offer Received'),
        ('internship_active', 'Currently Interning'),
        ('internship_completed', 'Internship Completed'),
        ('on_hold', 'Search On Hold'),
    ]
    
    GOAL_STATUS_CHOICES = [
        ('not_set', 'Not Set'),
        ('in_progress', 'In Progress'),
        ('achieved', 'Achieved'),
        ('overdue', 'Overdue'),
        ('paused', 'Paused'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.OneToOneField(StudentProfile, on_delete=models.CASCADE, related_name='internship_progress')
    
    # Enhanced profile completion
    profile_completion = models.PositiveIntegerField(
        default=0, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Profile completion percentage",
        db_index=True
    )
    profile_completion_details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Detailed breakdown of profile completion status"
    )
    
    # Enhanced application milestones
    first_application_date = models.DateTimeField(null=True, blank=True)
    total_applications = models.PositiveIntegerField(default=0, db_index=True)
    applications_this_month = models.PositiveIntegerField(default=0)
    applications_this_week = models.PositiveIntegerField(default=0)
    applications_this_quarter = models.PositiveIntegerField(default=0)
    pending_applications = models.PositiveIntegerField(default=0)
    accepted_applications = models.PositiveIntegerField(default=0)
    rejected_applications = models.PositiveIntegerField(default=0)
    withdrawn_applications = models.PositiveIntegerField(default=0)
    
    # Enhanced interview tracking
    total_interviews = models.PositiveIntegerField(default=0)
    interviews_this_month = models.PositiveIntegerField(default=0)
    upcoming_interviews = models.PositiveIntegerField(default=0)
    completed_interviews = models.PositiveIntegerField(default=0)
    cancelled_interviews = models.PositiveIntegerField(default=0)
    interview_success_rate = models.FloatField(default=0.0)
    average_interview_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)]
    )
    
    # Enhanced acceptance tracking
    total_acceptances = models.PositiveIntegerField(default=0)
    first_acceptance_date = models.DateTimeField(null=True, blank=True)
    offers_received = models.PositiveIntegerField(default=0)
    offers_accepted = models.PositiveIntegerField(default=0)
    offers_declined = models.PositiveIntegerField(default=0)
    offers_expired = models.PositiveIntegerField(default=0)
    
    # Current internship status
    internship_status = models.CharField(
        max_length=20,
        choices=INTERNSHIP_STATUS_CHOICES,
        default='not_started',
        db_index=True
    )
    internship_completion_percentage = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Enhanced skills development
    skills_developed = models.JSONField(default=list, blank=True)
    skills_targeted = models.JSONField(default=list, blank=True)
    skills_in_progress = models.JSONField(default=list, blank=True)
    certifications_earned = models.JSONField(default=list, blank=True)
    certifications_in_progress = models.JSONField(default=list, blank=True)
    courses_completed = models.PositiveIntegerField(default=0)
    learning_hours = models.PositiveIntegerField(default=0, help_text="Total learning hours")
    projects_completed = models.PositiveIntegerField(default=0)
    
    # Enhanced activity streak
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    total_activity_days = models.PositiveIntegerField(default=0)
    total_session_time = models.DurationField(default=timedelta(0))
    
    # Enhanced goals and targets
    monthly_application_goal = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(50)]
    )
    weekly_application_goal = models.PositiveIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(20)]
    )
    goal_status = models.CharField(
        max_length=15,
        choices=GOAL_STATUS_CHOICES,
        default='not_set'
    )
    goal_deadline = models.DateField(null=True, blank=True)
    target_industries = models.JSONField(default=list, blank=True)
    target_companies = models.JSONField(default=list, blank=True)
    
    # Performance metrics
    overall_performance_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )
    
    # Networking and connections
    network_connections = models.PositiveIntegerField(default=0)
    mentor_connections = models.PositiveIntegerField(default=0)
    industry_events_attended = models.PositiveIntegerField(default=0)
    
    # Feedback and ratings
    average_employer_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)]
    )
    total_feedback_received = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_milestone_achieved = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name_plural = "Internship Progress"
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['student', 'internship_status']),
            models.Index(fields=['profile_completion']),
            models.Index(fields=['total_applications', 'accepted_applications']),
            models.Index(fields=['current_streak', 'last_activity_date']),
            models.Index(fields=['goal_status', 'goal_deadline']),
            models.Index(fields=['overall_performance_score']),
        ]
    
    def clean(self):
        """Enhanced validation for internship progress."""
        # Validate application counts
        total_processed = (self.accepted_applications + self.rejected_applications + 
                          self.withdrawn_applications)
        if total_processed > self.total_applications:
            raise ValidationError("Total processed applications cannot exceed total applications.")
        
        # Validate goal deadline
        if self.goal_deadline and self.goal_deadline < timezone.now().date():
            if self.goal_status not in ['achieved', 'overdue']:
                self.goal_status = 'overdue'
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Progress for {self.student.first_name} {self.student.last_name} - {self.get_internship_status_display()}"
    
    def calculate_profile_completion(self):
        """Enhanced profile completion calculation with detailed breakdown"""
        profile = self.student
        total_fields = 0
        filled_fields = 0
        completion_details = {
            'basic_info': {'total': 0, 'filled': 0, 'fields': []},
            'education': {'total': 0, 'filled': 0, 'fields': []},
            'skills': {'total': 0, 'filled': 0, 'fields': []},
            'media': {'total': 0, 'filled': 0, 'fields': []}
        }
        
        # Basic info fields
        basic_fields = ['bio', 'phone_number', 'date_of_birth', 'gender', 'address']
        for field in basic_fields:
            total_fields += 1
            completion_details['basic_info']['total'] += 1
            field_filled = bool(getattr(profile, field, None))
            if field_filled:
                filled_fields += 1
                completion_details['basic_info']['filled'] += 1
            completion_details['basic_info']['fields'].append({
                'name': field,
                'filled': field_filled
            })
        
        # Education fields
        education_fields = ['education_level', 'institution', 'major', 'graduation_year']
        for field in education_fields:
            total_fields += 1
            completion_details['education']['total'] += 1
            field_filled = bool(getattr(profile, field, None))
            if field_filled:
                filled_fields += 1
                completion_details['education']['filled'] += 1
            completion_details['education']['fields'].append({
                'name': field,
                'filled': field_filled
            })
        
        # Skills and interests
        skills_fields = ['skills', 'interests']
        for field in skills_fields:
            total_fields += 1
            completion_details['skills']['total'] += 1
            field_value = getattr(profile, field, None)
            field_filled = bool(field_value and (isinstance(field_value, list) and len(field_value) > 0))
            if field_filled:
                filled_fields += 1
                completion_details['skills']['filled'] += 1
            completion_details['skills']['fields'].append({
                'name': field,
                'filled': field_filled
            })
        
        # Profile picture and resume
        media_fields = ['profile_picture', 'resume']
        for field in media_fields:
            total_fields += 1
            completion_details['media']['total'] += 1
            field_filled = bool(getattr(profile, field, None))
            if field_filled:
                filled_fields += 1
                completion_details['media']['filled'] += 1
            completion_details['media']['fields'].append({
                'name': field,
                'filled': field_filled
            })
        
        self.profile_completion = int((filled_fields / total_fields) * 100) if total_fields > 0 else 0
        self.profile_completion_details = completion_details
        self.save()
        return self.profile_completion

    @property
    def current_internship(self):
        from application.models import Application
        from django.utils import timezone
        # Find the most recent accepted application with a future or current end_date
        accepted_apps = Application.objects.filter(
            student=self.student.user,
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
    
    @property
    def application_success_rate(self):
        """Calculate the success rate of applications."""
        if self.total_applications == 0:
            return 0
        return round((self.accepted_applications / self.total_applications) * 100, 2)
    
    @property
    def interview_conversion_rate(self):
        """Calculate the rate of applications that lead to interviews."""
        if self.total_applications == 0:
            return 0
        return round((self.total_interviews / self.total_applications) * 100, 2)
    
    @property
    def offer_conversion_rate(self):
        """Calculate the rate of interviews that lead to offers."""
        if self.total_interviews == 0:
            return 0
        return round((self.offers_received / self.total_interviews) * 100, 2)
    
    @property
    def is_monthly_goal_met(self):
        """Check if monthly application goal is met."""
        return self.applications_this_month >= self.monthly_application_goal
    
    @property
    def is_weekly_goal_met(self):
        """Check if weekly application goal is met."""
        return self.applications_this_week >= self.weekly_application_goal
    
    @property
    def days_since_last_application(self):
        """Calculate days since last application."""
        if not self.first_application_date:
            return None
        return (timezone.now().date() - self.first_application_date.date()).days
    
    @property
    def internship_progress_percentage(self):
        """Calculate internship progress based on dates."""
        internship = self.current_internship
        if not internship or not (internship.start_date and internship.end_date):
            return 0
        
        today = timezone.now().date()
        if today < internship.start_date:
            return 0
        elif today > internship.end_date:
            return 100
        
        total_days = (internship.end_date - internship.start_date).days
        elapsed_days = (today - internship.start_date).days
        return min(round((elapsed_days / total_days) * 100, 2), 100)
    
    def update_activity_streak(self):
        """Enhanced activity streak tracking."""
        today = timezone.now().date()
        
        if self.last_activity_date:
            if self.last_activity_date == today:
                # Already logged activity today, no change needed
                return
            elif self.last_activity_date == today - timedelta(days=1):
                # Activity yesterday, increment streak
                self.current_streak += 1
                if self.current_streak > self.longest_streak:
                    self.longest_streak = self.current_streak
            else:
                # Gap in activity, reset streak
                self.current_streak = 1
        else:
            # First activity
            self.current_streak = 1
            self.longest_streak = 1
        
        self.last_activity_date = today
        self.total_activity_days += 1
        self.save()
    
    def calculate_performance_score(self):
        """Calculate overall performance score based on various metrics."""
        score = 0
        
        # Profile completion (20%)
        score += (self.profile_completion * 0.2)
        
        # Application success rate (25%)
        if self.total_applications > 0:
            score += (self.application_success_rate * 0.25)
        
        # Activity engagement (15%)
        activity_score = min(self.current_streak * 2, 30)  # Cap at 30
        score += (activity_score * 0.15)
        
        # Goal achievement (20%)
        goal_score = 0
        if self.is_monthly_goal_met:
            goal_score += 50
        if self.is_weekly_goal_met:
            goal_score += 30
        score += (min(goal_score, 100) * 0.2)
        
        # Skills and development (20%)
        skills_score = min(len(self.skills_developed) * 5, 100)
        score += (skills_score * 0.2)
        
        self.overall_performance_score = min(round(score, 2), 100.0)
        return self.overall_performance_score
    
    def reset_weekly_metrics(self):
        """Reset weekly metrics (called by scheduled task)."""
        self.applications_this_week = 0
        self.save()
    
    def reset_monthly_metrics(self):
        """Reset monthly metrics (called by scheduled task)."""
        self.applications_this_month = 0
        self.save()
    
    def reset_quarterly_metrics(self):
        """Reset quarterly metrics (called by scheduled task)."""
        self.applications_this_quarter = 0
        self.save()


class ProgressMilestone(models.Model):
    """Model to track specific milestones in a student's internship journey."""
    
    MILESTONE_TYPES = [
        ('profile_complete', 'Profile Completed'),
        ('first_application', 'First Application Submitted'),
        ('first_interview', 'First Interview Scheduled'),
        ('first_offer', 'First Offer Received'),
        ('internship_started', 'Internship Started'),
        ('internship_completed', 'Internship Completed'),
        ('skill_acquired', 'New Skill Acquired'),
        ('certification_earned', 'Certification Earned'),
        ('goal_achieved', 'Goal Achieved'),
        ('streak_milestone', 'Activity Streak Milestone'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    progress = models.ForeignKey(
        InternshipProgress,
        on_delete=models.CASCADE,
        related_name='milestones'
    )
    milestone_type = models.CharField(max_length=30, choices=MILESTONE_TYPES, db_index=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    achieved_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-achieved_at']
        verbose_name = 'Progress Milestone'
        verbose_name_plural = 'Progress Milestones'
        indexes = [
            models.Index(fields=['progress', 'milestone_type']),
            models.Index(fields=['milestone_type', 'achieved_at']),
        ]
        unique_together = ['progress', 'milestone_type', 'achieved_at']
    
    def __str__(self):
        return f"{self.title} - {self.progress.student.user.first_name} {self.progress.student.user.last_name}"


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


class PageView(models.Model):
    """Model to track page views for analytics"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='page_views')
    session_key = models.CharField(max_length=40, null=True, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Page information
    path = models.CharField(max_length=500, db_index=True)
    full_url = models.URLField(max_length=1000, blank=True)
    referrer = models.URLField(max_length=1000, blank=True, null=True)
    
    # Timing
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    duration = models.PositiveIntegerField(null=True, blank=True, help_text="Time spent on page in seconds")
    
    # Additional metadata
    is_authenticated = models.BooleanField(default=False, db_index=True)
    device_type = models.CharField(max_length=20, blank=True, choices=[
        ('desktop', 'Desktop'),
        ('mobile', 'Mobile'),
        ('tablet', 'Tablet'),
        ('unknown', 'Unknown'),
    ])
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'path']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['session_key', 'timestamp']),
            models.Index(fields=['is_authenticated', 'timestamp']),
        ]
    
    def __str__(self):
        user_info = self.user.email if self.user else f"Anonymous ({self.session_key[:8]})"
        return f"{user_info} - {self.path} at {self.timestamp}"
    
    @classmethod
    def get_daily_views(cls, date=None):
        """Get page views for a specific date"""
        if date is None:
            date = timezone.now().date()
        return cls.objects.filter(timestamp__date=date).count()
    
    @classmethod
    def get_unique_daily_visitors(cls, date=None):
        """Get unique visitors for a specific date"""
        if date is None:
            date = timezone.now().date()
        
        # Count unique users and unique sessions for anonymous users
        authenticated_users = cls.objects.filter(
            timestamp__date=date,
            is_authenticated=True
        ).values('user').distinct().count()
        
        anonymous_sessions = cls.objects.filter(
            timestamp__date=date,
            is_authenticated=False,
            session_key__isnull=False
        ).values('session_key').distinct().count()
        
        return authenticated_users + anonymous_sessions


# Workflow Management Models

class WorkflowTemplate(models.Model):
    """Model for reusable workflow templates"""
    
    TEMPLATE_CATEGORIES = [
        ('application', 'Application Management'),
        ('communication', 'Communication'),
        ('scheduling', 'Scheduling'),
        ('analytics', 'Analytics & Reporting'),
        ('custom', 'Custom Workflow'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, db_index=True)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=TEMPLATE_CATEGORIES, default='custom')
    icon = models.CharField(max_length=50, default='fas fa-cog')
    color = models.CharField(max_length=20, default='blue')
    
    # Template configuration
    steps = models.JSONField(default=list, help_text="List of workflow steps")
    trigger_conditions = models.JSONField(default=dict, help_text="Conditions that trigger this workflow")
    default_settings = models.JSONField(default=dict, help_text="Default settings for workflows created from this template")
    
    # Metadata
    estimated_time = models.CharField(max_length=20, default='5 min')
    steps_count = models.PositiveIntegerField(default=1)
    popularity_score = models.PositiveIntegerField(default=0)
    tags = models.JSONField(default=list, blank=True)
    
    # Status and permissions
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=True, help_text="Whether this template is available to all users")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_workflow_templates', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-popularity_score', 'name']
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['is_public', 'is_active']),
            models.Index(fields=['popularity_score']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
    
    def increment_popularity(self):
        """Increment popularity score when template is used"""
        self.popularity_score += 1
        self.save(update_fields=['popularity_score'])


class Workflow(models.Model):
    """Model for individual workflow instances"""
    
    WORKFLOW_TYPES = [
        ('application_review', 'Application Review'),
        ('interview_scheduling', 'Interview Scheduling'),
        ('candidate_communication', 'Candidate Communication'),
        ('onboarding', 'Onboarding Process'),
        ('performance_tracking', 'Performance Tracking'),
        ('custom', 'Custom Workflow'),
    ]
    
    TRIGGER_EVENTS = [
        ('new_application', 'New Application Received'),
        ('application_approved', 'Application Approved'),
        ('interview_scheduled', 'Interview Scheduled'),
        ('interview_completed', 'Interview Completed'),
        ('offer_sent', 'Offer Sent'),
        ('manual', 'Manual Trigger'),
        ('scheduled', 'Scheduled Trigger'),
    ]
    
    ACTION_TYPES = [
        ('send_email', 'Send Email'),
        ('update_status', 'Update Status'),
        ('create_task', 'Create Task'),
        ('send_notification', 'Send Notification'),
        ('schedule_interview', 'Schedule Interview'),
        ('generate_report', 'Generate Report'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employer = models.ForeignKey('users.EmployerProfile', on_delete=models.CASCADE, related_name='workflows')
    template = models.ForeignKey(WorkflowTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='workflow_instances')
    
    # Basic workflow information
    name = models.CharField(max_length=200, db_index=True)
    description = models.TextField(blank=True)
    workflow_type = models.CharField(max_length=30, choices=WORKFLOW_TYPES, default='custom')
    
    # Trigger configuration
    trigger_event = models.CharField(max_length=30, choices=TRIGGER_EVENTS, default='manual')
    trigger_conditions = models.JSONField(default=dict, help_text="Specific conditions for triggering")
    
    # Action configuration
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES, default='send_email')
    action_config = models.JSONField(default=dict, help_text="Configuration for the action")
    
    # Timing and scheduling
    delay_amount = models.PositiveIntegerField(default=0, help_text="Delay before execution")
    delay_unit = models.CharField(max_length=10, choices=[
        ('minutes', 'Minutes'),
        ('hours', 'Hours'),
        ('days', 'Days'),
        ('weeks', 'Weeks'),
    ], default='minutes')
    
    # Status and control
    is_active = models.BooleanField(default=True, db_index=True)
    is_paused = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_executed = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employer', 'is_active']),
            models.Index(fields=['workflow_type', 'is_active']),
            models.Index(fields=['trigger_event']),
            models.Index(fields=['last_executed']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.employer.company_name}"
    
    def can_execute(self):
        """Check if workflow can be executed"""
        return self.is_active and not self.is_paused
    
    def get_delay_timedelta(self):
        """Convert delay amount and unit to timedelta"""
        if self.delay_amount == 0:
            return timedelta(0)
        
        unit_mapping = {
            'minutes': timedelta(minutes=self.delay_amount),
            'hours': timedelta(hours=self.delay_amount),
            'days': timedelta(days=self.delay_amount),
            'weeks': timedelta(weeks=self.delay_amount),
        }
        return unit_mapping.get(self.delay_unit, timedelta(0))


class WorkflowExecution(models.Model):
    """Model to track workflow execution history"""
    
    EXECUTION_STATUS = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('skipped', 'Skipped'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name='executions')
    
    # Execution details
    status = models.CharField(max_length=20, choices=EXECUTION_STATUS, default='pending', db_index=True)
    triggered_by = models.CharField(max_length=100, help_text="What triggered this execution")
    trigger_data = models.JSONField(default=dict, help_text="Data that triggered the workflow")
    
    # Timing
    scheduled_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration = models.DurationField(null=True, blank=True)
    
    # Results
    result_data = models.JSONField(default=dict, help_text="Results of the workflow execution")
    error_message = models.TextField(blank=True)
    logs = models.JSONField(default=list, help_text="Execution logs")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['workflow', 'status']),
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['started_at']),
        ]
    
    def __str__(self):
        return f"{self.workflow.name} - {self.get_status_display()} ({self.created_at})"
    
    def calculate_duration(self):
        """Calculate and save execution duration"""
        if self.started_at and self.completed_at:
            self.duration = self.completed_at - self.started_at
            self.save(update_fields=['duration'])
    
    def mark_completed(self, result_data=None):
        """Mark execution as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if result_data:
            self.result_data = result_data
        self.calculate_duration()
        self.save()
    
    def mark_failed(self, error_message):
        """Mark execution as failed"""
        self.status = 'failed'
        self.completed_at = timezone.now()
        self.error_message = error_message
        self.calculate_duration()
        self.save()


class WorkflowAnalytics(models.Model):
    """Model to store workflow analytics and performance metrics"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employer = models.ForeignKey('users.EmployerProfile', on_delete=models.CASCADE, related_name='workflow_analytics')
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name='analytics', null=True, blank=True)
    
    # Time period for analytics
    date = models.DateField(db_index=True)
    period_type = models.CharField(max_length=10, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ], default='daily')
    
    # Execution metrics
    total_executions = models.PositiveIntegerField(default=0)
    successful_executions = models.PositiveIntegerField(default=0)
    failed_executions = models.PositiveIntegerField(default=0)
    cancelled_executions = models.PositiveIntegerField(default=0)
    
    # Performance metrics
    average_duration = models.DurationField(null=True, blank=True)
    total_time_saved = models.DurationField(default=timedelta(0))
    tasks_automated = models.PositiveIntegerField(default=0)
    
    # Success rates
    success_rate = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)])
    
    # Additional metrics
    metrics_data = models.JSONField(default=dict, help_text="Additional custom metrics")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('employer', 'workflow', 'date', 'period_type')
        ordering = ['-date']
        indexes = [
            models.Index(fields=['employer', 'date']),
            models.Index(fields=['workflow', 'date']),
            models.Index(fields=['period_type', 'date']),
        ]
    
    def __str__(self):
        workflow_name = self.workflow.name if self.workflow else "All Workflows"
        return f"{workflow_name} - {self.date} ({self.get_period_type_display()})"
    
    def calculate_success_rate(self):
        """Calculate and update success rate"""
        if self.total_executions > 0:
            self.success_rate = (self.successful_executions / self.total_executions) * 100
        else:
            self.success_rate = 0.0
        self.save(update_fields=['success_rate'])
    
    def update_metrics(self, execution):
        """Update analytics based on a workflow execution"""
        self.total_executions += 1
        
        if execution.status == 'completed':
            self.successful_executions += 1
            if execution.duration:
                # Update average duration
                if self.average_duration:
                    total_duration = self.average_duration * (self.successful_executions - 1) + execution.duration
                    self.average_duration = total_duration / self.successful_executions
                else:
                    self.average_duration = execution.duration
        elif execution.status == 'failed':
            self.failed_executions += 1
        elif execution.status == 'cancelled':
            self.cancelled_executions += 1
        
        self.calculate_success_rate()
        self.save()
