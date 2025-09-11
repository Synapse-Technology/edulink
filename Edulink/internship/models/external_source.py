from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, URLValidator
from django.core.exceptions import ValidationError
from .base import BaseModel


class ExternalOpportunitySource(BaseModel):
    """Model representing external platforms that provide opportunity data."""
    
    SOURCE_TYPE_CHOICES = [
        ('api', 'API Integration'),
        ('scraping', 'Web Scraping'),
        ('rss', 'RSS Feed'),
        ('webhook', 'Webhook'),
    ]
    
    SYNC_FREQUENCY_CHOICES = [
        ('hourly', 'Every Hour'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('manual', 'Manual Only'),
    ]
    
    # Basic information
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Display name of the source (e.g., 'LinkedIn Jobs', 'BrighterMonday')"
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        help_text="URL-friendly identifier for the source"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of the opportunity source"
    )
    
    # Technical configuration
    source_type = models.CharField(
        max_length=20,
        choices=SOURCE_TYPE_CHOICES,
        default='scraping',
        help_text="Method used to collect data from this source"
    )
    base_url = models.URLField(
        help_text="Base URL of the source platform"
    )
    api_endpoint = models.URLField(
        blank=True,
        null=True,
        help_text="API endpoint URL (if using API integration)"
    )
    rss_feed_url = models.URLField(
        blank=True,
        null=True,
        help_text="RSS feed URL (if using RSS integration)"
    )
    
    # Authentication and access
    requires_authentication = models.BooleanField(
        default=False,
        help_text="Whether this source requires API authentication"
    )
    api_key_required = models.BooleanField(
        default=False,
        help_text="Whether an API key is required"
    )
    
    # Rate limiting and sync configuration
    rate_limit_per_hour = models.PositiveIntegerField(
        default=100,
        validators=[MinValueValidator(1), MaxValueValidator(10000)],
        help_text="Maximum requests allowed per hour"
    )
    sync_frequency = models.CharField(
        max_length=20,
        choices=SYNC_FREQUENCY_CHOICES,
        default='daily',
        help_text="How often to sync data from this source"
    )
    
    # Status and monitoring
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this source is currently active"
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether this source has been verified and approved"
    )
    
    # Sync tracking
    last_sync_attempt = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time we attempted to sync from this source"
    )
    last_successful_sync = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last successful sync from this source"
    )
    consecutive_failures = models.PositiveIntegerField(
        default=0,
        help_text="Number of consecutive sync failures"
    )
    
    # Data quality metrics
    total_opportunities_synced = models.PositiveIntegerField(
        default=0,
        help_text="Total number of opportunities synced from this source"
    )
    active_opportunities_count = models.PositiveIntegerField(
        default=0,
        help_text="Current number of active opportunities from this source"
    )
    average_data_quality_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Average data quality score (0.0 to 1.0)"
    )
    
    # Geographic and category focus
    target_countries = models.JSONField(
        default=list,
        blank=True,
        help_text="List of country codes this source focuses on (e.g., ['KE', 'UG'])"
    )
    target_categories = models.JSONField(
        default=list,
        blank=True,
        help_text="List of opportunity categories this source specializes in"
    )
    
    # Compliance and legal
    terms_of_service_url = models.URLField(
        blank=True,
        null=True,
        help_text="URL to the source's terms of service"
    )
    robots_txt_compliant = models.BooleanField(
        default=True,
        help_text="Whether our scraping respects the source's robots.txt"
    )
    attribution_required = models.BooleanField(
        default=True,
        help_text="Whether we need to provide attribution to this source"
    )
    attribution_text = models.CharField(
        max_length=255,
        blank=True,
        help_text="Required attribution text (if any)"
    )
    
    class Meta:
        ordering = ['name']
        verbose_name = 'External Opportunity Source'
        verbose_name_plural = 'External Opportunity Sources'
        indexes = [
            models.Index(fields=['is_active', 'is_verified']),
            models.Index(fields=['sync_frequency', 'last_sync_attempt']),
            models.Index(fields=['source_type']),
        ]
    
    def clean(self):
        """Validate model data and relationships."""
        # Validate URL fields
        if self.source_type == 'api' and not self.api_endpoint:
            raise ValidationError("API endpoint is required for API integration sources")
        
        if self.source_type == 'rss' and not self.rss_feed_url:
            raise ValidationError("RSS feed URL is required for RSS integration sources")
        
        # Validate rate limiting
        if self.rate_limit_per_hour < 1:
            raise ValidationError("Rate limit must be at least 1 request per hour")
        
        # Validate authentication requirements
        if self.api_key_required and not self.requires_authentication:
            raise ValidationError("API key required implies authentication is required")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.name} ({self.source_type})"
    
    @property
    def is_healthy(self):
        """Check if the source is in a healthy state."""
        return (
            self.is_active and 
            self.consecutive_failures < 5 and
            self.average_data_quality_score > 0.5
        )
    
    @property
    def sync_status(self):
        """Get current sync status."""
        if not self.is_active:
            return 'inactive'
        elif self.consecutive_failures >= 5:
            return 'failed'
        elif self.last_successful_sync is None:
            return 'never_synced'
        else:
            return 'healthy'
    
    def increment_failure_count(self):
        """Increment consecutive failure count."""
        self.consecutive_failures += 1
        self.save(update_fields=['consecutive_failures'])
    
    def reset_failure_count(self):
        """Reset consecutive failure count after successful sync."""
        self.consecutive_failures = 0
        self.save(update_fields=['consecutive_failures'])
    
    def update_sync_metrics(self, opportunities_count, avg_quality_score):
        """Update sync metrics after successful sync."""
        from django.utils import timezone
        
        self.last_successful_sync = timezone.now()
        self.total_opportunities_synced += opportunities_count
        self.average_data_quality_score = avg_quality_score
        self.reset_failure_count()
        
        self.save(update_fields=[
            'last_successful_sync',
            'total_opportunities_synced', 
            'average_data_quality_score',
            'consecutive_failures'
        ])