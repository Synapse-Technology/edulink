from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid


class RealTimeMetric(models.Model):
    """Store real-time metrics for dashboard analytics"""
    METRIC_TYPES = [
        ('total_students', 'Total Students'),
        ('active_internships', 'Active Internships'),
        ('completion_rate', 'Completion Rate'),
        ('application_rate', 'Application Rate'),
        ('placement_rate', 'Placement Rate'),
        ('response_time', 'Average Response Time'),
        ('user_activity', 'User Activity'),
        ('system_performance', 'System Performance'),
    ]
    
    metric_type = models.CharField(max_length=50, choices=METRIC_TYPES)
    value = models.FloatField()
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    institution = models.ForeignKey(
        'users.InstitutionProfile', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['metric_type', 'timestamp']),
            models.Index(fields=['institution', 'metric_type', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.metric_type}: {self.value} at {self.timestamp}"


class MetricSnapshot(models.Model):
    """Store periodic snapshots of aggregated metrics"""
    SNAPSHOT_TYPES = [
        ('hourly', 'Hourly'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]
    
    snapshot_type = models.CharField(max_length=20, choices=SNAPSHOT_TYPES)
    snapshot_date = models.DateTimeField()
    metrics_data = models.JSONField(default=dict)
    institution = models.ForeignKey(
        'users.InstitutionProfile', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['snapshot_type', 'snapshot_date', 'institution']
        ordering = ['-snapshot_date']
        indexes = [
            models.Index(fields=['snapshot_type', 'snapshot_date']),
            models.Index(fields=['institution', 'snapshot_type', 'snapshot_date']),
        ]
    
    def __str__(self):
        return f"{self.snapshot_type} snapshot for {self.snapshot_date}"


class PerformanceAlert(models.Model):
    """Track performance alerts and thresholds"""
    ALERT_TYPES = [
        ('low_completion_rate', 'Low Completion Rate'),
        ('high_response_time', 'High Response Time'),
        ('low_application_rate', 'Low Application Rate'),
        ('system_performance', 'System Performance Issue'),
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    message = models.TextField()
    threshold_value = models.FloatField()
    current_value = models.FloatField()
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    institution = models.ForeignKey(
        'users.InstitutionProfile', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['alert_type', 'is_resolved', 'created_at']),
            models.Index(fields=['institution', 'is_resolved', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.alert_type} - {self.severity} ({self.current_value})"
    
    def resolve(self):
        """Mark alert as resolved"""
        self.is_resolved = True
        self.resolved_at = timezone.now()
        self.save()


class UserActivityMetric(models.Model):
    """Track user activity for real-time analytics"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=50)
    page_path = models.CharField(max_length=255)
    session_id = models.CharField(max_length=100)
    duration_seconds = models.IntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['activity_type', 'timestamp']),
            models.Index(fields=['session_id', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.activity_type} at {self.timestamp}"


class Report(models.Model):
    """Store generated reports for admin reference"""
    REPORT_TYPES = [
        ('comprehensive', 'Comprehensive Report'),
        ('analytics', 'Analytics Report'),
        ('performance', 'Performance Report'),
        ('engagement', 'Engagement Report'),
        ('internship', 'Internship Report'),
        ('partnership', 'Partnership Report'),
        ('custom', 'Custom Report'),
    ]
    
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('archived', 'Archived'),
    ]
    
    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
    ]
    
    # Basic report information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    
    # Report metadata
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='generated_reports')
    institution = models.ForeignKey(
        'users.InstitutionProfile', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='reports'
    )
    
    # File information
    file_format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')
    file_path = models.CharField(max_length=500, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True, help_text="File size in bytes")
    file_hash = models.CharField(max_length=64, blank=True, help_text="SHA-256 hash for integrity")
    
    # Report data and parameters
    report_data = models.JSONField(default=dict, help_text="Actual report data/content")
    generation_parameters = models.JSONField(default=dict, help_text="Parameters used to generate the report")
    summary_stats = models.JSONField(default=dict, help_text="Summary statistics from the report")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    generated_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When the report expires")
    
    # Usage tracking
    download_count = models.PositiveIntegerField(default=0)
    last_accessed = models.DateTimeField(null=True, blank=True)
    
    # Report period (for time-based reports)
    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True)
    
    # Additional metadata
    tags = models.JSONField(default=list, blank=True, help_text="Tags for categorization")
    is_public = models.BooleanField(default=False, help_text="Whether report is publicly accessible")
    is_scheduled = models.BooleanField(default=False, help_text="Whether this is a scheduled report")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['report_type', 'status', 'created_at']),
            models.Index(fields=['institution', 'report_type', 'created_at']),
            models.Index(fields=['generated_by', 'created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['period_start', 'period_end']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.report_type}) - {self.status}"
    
    def mark_completed(self, file_path=None, file_size=None):
        """Mark report as completed"""
        self.status = 'completed'
        self.generated_at = timezone.now()
        if file_path:
            self.file_path = file_path
        if file_size:
            self.file_size = file_size
        self.save()
    
    def mark_failed(self, error_message=None):
        """Mark report as failed"""
        self.status = 'failed'
        if error_message:
            if 'error_details' not in self.generation_parameters:
                self.generation_parameters['error_details'] = []
            self.generation_parameters['error_details'].append({
                'timestamp': timezone.now().isoformat(),
                'error': error_message
            })
        self.save()
    
    def increment_download_count(self):
        """Increment download count and update last accessed"""
        self.download_count += 1
        self.last_accessed = timezone.now()
        self.save(update_fields=['download_count', 'last_accessed'])
    
    def is_expired(self):
        """Check if report has expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def get_file_size_display(self):
        """Get human-readable file size"""
        if not self.file_size:
            return "Unknown"
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if self.file_size < 1024.0:
                return f"{self.file_size:.1f} {unit}"
            self.file_size /= 1024.0
        return f"{self.file_size:.1f} TB"