from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
import json

User = get_user_model()


class SystemHealthCheck(models.Model):
    """Model to store system health check results"""
    
    STATUS_CHOICES = [
        ('healthy', 'Healthy'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
        ('unknown', 'Unknown'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    overall_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unknown')
    
    # Individual component statuses
    database_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unknown')
    cache_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unknown')
    storage_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unknown')
    email_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unknown')
    
    # System metrics
    cpu_usage = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    memory_usage = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    disk_usage = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Response times (in milliseconds)
    database_response_time = models.FloatField(null=True, blank=True)
    cache_response_time = models.FloatField(null=True, blank=True)
    
    # Additional details as JSON
    details = models.JSONField(default=dict, blank=True)
    
    # Error information
    errors = models.JSONField(default=list, blank=True)
    warnings = models.JSONField(default=list, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'overall_status']),
            models.Index(fields=['overall_status']),
        ]
    
    def __str__(self):
        return f"Health Check - {self.overall_status} at {self.timestamp}"
    
    @property
    def is_healthy(self):
        return self.overall_status == 'healthy'
    
    @property
    def has_warnings(self):
        return self.overall_status == 'warning' or len(self.warnings) > 0
    
    @property
    def is_critical(self):
        return self.overall_status == 'critical'


class APIMetrics(models.Model):
    """Model to track API endpoint performance metrics"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    # Request details
    endpoint = models.CharField(max_length=255, db_index=True)
    method = models.CharField(max_length=10, db_index=True)
    status_code = models.IntegerField(db_index=True)
    
    # Performance metrics
    response_time = models.FloatField(help_text="Response time in milliseconds")
    request_size = models.IntegerField(null=True, blank=True, help_text="Request size in bytes")
    response_size = models.IntegerField(null=True, blank=True, help_text="Response size in bytes")
    
    # User context
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Additional metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'endpoint']),
            models.Index(fields=['endpoint', 'method']),
            models.Index(fields=['status_code', 'timestamp']),
            models.Index(fields=['response_time']),
        ]
    
    def __str__(self):
        return f"{self.method} {self.endpoint} - {self.status_code} ({self.response_time}ms)"
    
    @property
    def is_slow(self):
        """Check if response time is considered slow (>1000ms)"""
        return self.response_time > 1000
    
    @property
    def is_error(self):
        """Check if status code indicates an error"""
        return self.status_code >= 400


class SystemAlert(models.Model):
    """Model to store system alerts and notifications"""
    
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]
    
    ALERT_TYPE_CHOICES = [
        ('performance', 'Performance'),
        ('error_rate', 'Error Rate'),
        ('system_resource', 'System Resource'),
        ('database', 'Database'),
        ('cache', 'Cache'),
        ('security', 'Security'),
        ('custom', 'Custom'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
        ('suppressed', 'Suppressed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    # Alert details
    title = models.CharField(max_length=255)
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, db_index=True)
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPE_CHOICES, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    
    # Alert context
    source = models.CharField(max_length=100, blank=True, help_text="Source component or service")
    affected_endpoints = models.JSONField(default=list, blank=True)
    metrics = models.JSONField(default=dict, blank=True)
    
    # Resolution tracking
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_alerts')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_alerts')
    resolution_notes = models.TextField(blank=True)
    
    # Notification tracking
    notification_sent = models.BooleanField(default=False)
    notification_channels = models.JSONField(default=list, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'severity']),
            models.Index(fields=['status', 'severity']),
            models.Index(fields=['alert_type', 'status']),
        ]
    
    def __str__(self):
        return f"{self.severity.upper()}: {self.title}"
    
    def acknowledge(self, user):
        """Mark alert as acknowledged"""
        self.status = 'acknowledged'
        self.acknowledged_at = timezone.now()
        self.acknowledged_by = user
        self.save()
    
    def resolve(self, user, notes=''):
        """Mark alert as resolved"""
        self.status = 'resolved'
        self.resolved_at = timezone.now()
        self.resolved_by = user
        self.resolution_notes = notes
        self.save()
    
    @property
    def is_active(self):
        return self.status == 'active'
    
    @property
    def duration(self):
        """Get alert duration"""
        end_time = self.resolved_at or timezone.now()
        return end_time - self.timestamp


class MonitoringConfiguration(models.Model):
    """Model to store monitoring configuration settings"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Health check settings
    health_check_interval = models.IntegerField(default=300, help_text="Health check interval in seconds")
    health_check_enabled = models.BooleanField(default=True)
    
    # Performance monitoring settings
    api_monitoring_enabled = models.BooleanField(default=True)
    slow_query_threshold = models.FloatField(default=1000, help_text="Slow query threshold in milliseconds")
    error_rate_threshold = models.FloatField(default=5.0, help_text="Error rate threshold percentage")
    
    # Alert settings
    alerts_enabled = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    notification_emails = models.JSONField(default=list, blank=True)
    
    # Retention settings
    metrics_retention_days = models.IntegerField(default=30)
    health_check_retention_days = models.IntegerField(default=7)
    alert_retention_days = models.IntegerField(default=90)
    
    # System resource thresholds
    cpu_warning_threshold = models.FloatField(default=80.0)
    cpu_critical_threshold = models.FloatField(default=95.0)
    memory_warning_threshold = models.FloatField(default=85.0)
    memory_critical_threshold = models.FloatField(default=95.0)
    disk_warning_threshold = models.FloatField(default=85.0)
    disk_critical_threshold = models.FloatField(default=95.0)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Monitoring Configuration - Updated {self.updated_at}"
    
    @classmethod
    def get_current(cls):
        """Get current monitoring configuration"""
        return cls.objects.first() or cls.objects.create()