from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from .base import BaseModel
from .internship import Internship
from .external_source import ExternalOpportunitySource


class ExternalOpportunity(BaseModel):
    """Model linking external opportunities to the main Internship model."""
    
    SYNC_STATUS_CHOICES = [
        ('pending', 'Pending Sync'),
        ('synced', 'Successfully Synced'),
        ('failed', 'Sync Failed'),
        ('outdated', 'Needs Update'),
        ('removed', 'Removed from Source'),
    ]
    
    DATA_QUALITY_LEVELS = [
        ('excellent', 'Excellent (0.9-1.0)'),
        ('good', 'Good (0.7-0.89)'),
        ('fair', 'Fair (0.5-0.69)'),
        ('poor', 'Poor (0.3-0.49)'),
        ('very_poor', 'Very Poor (0.0-0.29)'),
    ]
    
    # Core relationships
    internship = models.OneToOneField(
        Internship,
        on_delete=models.CASCADE,
        related_name='external_opportunity',
        help_text="Link to the main internship record"
    )
    source = models.ForeignKey(
        ExternalOpportunitySource,
        on_delete=models.CASCADE,
        related_name='opportunities',
        help_text="External source this opportunity came from"
    )
    
    # External source tracking
    external_id = models.CharField(
        max_length=255,
        help_text="Original posting ID from the external source"
    )
    external_url = models.URLField(
        help_text="Direct link to the original posting"
    )
    external_company_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Company name as it appears on the external source"
    )
    
    # Data quality and validation
    data_quality_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Data quality score from 0.0 to 1.0"
    )
    data_quality_level = models.CharField(
        max_length=20,
        choices=DATA_QUALITY_LEVELS,
        default='fair',
        help_text="Human-readable data quality level"
    )
    
    # Validation flags
    is_verified_external = models.BooleanField(
        default=False,
        help_text="Whether this external opportunity has been manually verified"
    )
    compliance_checked = models.BooleanField(
        default=False,
        help_text="Whether compliance with source terms has been verified"
    )
    content_appropriate = models.BooleanField(
        default=True,
        help_text="Whether the content meets our platform standards"
    )
    
    # Sync metadata
    sync_status = models.CharField(
        max_length=20,
        choices=SYNC_STATUS_CHOICES,
        default='pending',
        help_text="Current synchronization status"
    )
    first_seen = models.DateTimeField(
        auto_now_add=True,
        help_text="When this opportunity was first discovered"
    )
    last_updated_external = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last update time from the external source"
    )
    last_sync_attempt = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time we attempted to sync this opportunity"
    )
    last_successful_sync = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last successful sync of this opportunity"
    )
    
    # Sync frequency and scheduling
    sync_frequency = models.CharField(
        max_length=20,
        choices=[
            ('hourly', 'Every Hour'),
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('manual', 'Manual Only'),
        ],
        default='daily',
        help_text="How often to sync this specific opportunity"
    )
    next_sync_due = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the next sync is scheduled"
    )
    
    # Error tracking
    sync_error_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of consecutive sync errors"
    )
    last_sync_error = models.TextField(
        blank=True,
        help_text="Last sync error message"
    )
    
    # Data mapping and transformation
    raw_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Original raw data from the external source"
    )
    transformation_log = models.JSONField(
        default=list,
        blank=True,
        help_text="Log of data transformations applied"
    )
    
    # Duplicate detection
    potential_duplicates = models.ManyToManyField(
        'self',
        blank=True,
        symmetrical=True,
        help_text="Other opportunities that might be duplicates"
    )
    is_duplicate = models.BooleanField(
        default=False,
        help_text="Whether this has been marked as a duplicate"
    )
    duplicate_of = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='duplicates',
        help_text="The original opportunity this is a duplicate of"
    )
    
    # Analytics and performance
    view_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times this opportunity has been viewed"
    )
    application_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of applications received through our platform"
    )
    click_through_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of clicks to the external source"
    )
    
    class Meta:
        ordering = ['-first_seen']
        verbose_name = 'External Opportunity'
        verbose_name_plural = 'External Opportunities'
        unique_together = [['source', 'external_id']]
        indexes = [
            models.Index(fields=['source', 'external_id']),
            models.Index(fields=['sync_status', 'next_sync_due']),
            models.Index(fields=['data_quality_score']),
            models.Index(fields=['is_verified_external', 'compliance_checked']),
            models.Index(fields=['is_duplicate', 'duplicate_of']),
            models.Index(fields=['first_seen', 'last_successful_sync']),
        ]
    
    def clean(self):
        """Validate model data and relationships."""
        # Validate data quality score and level consistency
        if self.data_quality_score is not None:
            expected_level = self.get_quality_level_from_score(self.data_quality_score)
            if self.data_quality_level != expected_level:
                self.data_quality_level = expected_level
        
        # Validate duplicate relationships
        if self.is_duplicate and not self.duplicate_of:
            raise ValidationError("Duplicate opportunities must reference the original")
        
        if self.duplicate_of and not self.is_duplicate:
            raise ValidationError("Opportunities marked with duplicate_of must be flagged as duplicates")
        
        # Validate sync scheduling
        if self.sync_frequency != 'manual' and not self.next_sync_due:
            self.schedule_next_sync()
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.internship.title} from {self.source.name}"
    
    @classmethod
    def get_quality_level_from_score(cls, score):
        """Convert numeric quality score to quality level."""
        if score >= 0.9:
            return 'excellent'
        elif score >= 0.7:
            return 'good'
        elif score >= 0.5:
            return 'fair'
        elif score >= 0.3:
            return 'poor'
        else:
            return 'very_poor'
    
    def calculate_data_quality_score(self):
        """Calculate data quality score based on completeness and accuracy."""
        score = 0.0
        max_score = 10.0
        
        # Check required fields completeness (40% of score)
        required_fields = [
            self.internship.title,
            self.internship.description,
            self.internship.category,
            self.internship.location,
        ]
        completeness_score = sum(1 for field in required_fields if field) / len(required_fields) * 4.0
        score += completeness_score
        
        # Check optional fields completeness (20% of score)
        optional_fields = [
            self.internship.stipend,
            self.internship.required_skills,
            self.internship.start_date,
            self.internship.deadline,
        ]
        optional_score = sum(1 for field in optional_fields if field) / len(optional_fields) * 2.0
        score += optional_score
        
        # Check data accuracy indicators (40% of score)
        accuracy_score = 4.0  # Default to full accuracy
        
        # Reduce score for common data quality issues
        if len(self.internship.description) < 50:
            accuracy_score -= 1.0  # Too short description
        
        if not self.external_url or not self.external_id:
            accuracy_score -= 1.0  # Missing external references
        
        if self.sync_error_count > 0:
            accuracy_score -= min(2.0, self.sync_error_count * 0.5)  # Sync issues
        
        score += max(0.0, accuracy_score)
        
        # Normalize to 0.0-1.0 range
        final_score = min(1.0, max(0.0, score / max_score))
        
        # Update the score and level
        self.data_quality_score = final_score
        self.data_quality_level = self.get_quality_level_from_score(final_score)
        
        return final_score
    
    def schedule_next_sync(self):
        """Schedule the next sync based on sync frequency."""
        from datetime import timedelta
        
        now = timezone.now()
        
        if self.sync_frequency == 'hourly':
            self.next_sync_due = now + timedelta(hours=1)
        elif self.sync_frequency == 'daily':
            self.next_sync_due = now + timedelta(days=1)
        elif self.sync_frequency == 'weekly':
            self.next_sync_due = now + timedelta(weeks=1)
        else:  # manual
            self.next_sync_due = None
    
    def mark_sync_success(self):
        """Mark a successful sync and reset error counters."""
        self.sync_status = 'synced'
        self.last_successful_sync = timezone.now()
        self.sync_error_count = 0
        self.last_sync_error = ''
        self.schedule_next_sync()
        
        self.save(update_fields=[
            'sync_status',
            'last_successful_sync',
            'sync_error_count',
            'last_sync_error',
            'next_sync_due'
        ])
    
    def mark_sync_failure(self, error_message):
        """Mark a failed sync and increment error counter."""
        self.sync_status = 'failed'
        self.last_sync_attempt = timezone.now()
        self.sync_error_count += 1
        self.last_sync_error = error_message[:1000]  # Truncate long error messages
        
        # Exponential backoff for next sync
        from datetime import timedelta
        backoff_hours = min(24, 2 ** self.sync_error_count)
        self.next_sync_due = timezone.now() + timedelta(hours=backoff_hours)
        
        self.save(update_fields=[
            'sync_status',
            'last_sync_attempt',
            'sync_error_count',
            'last_sync_error',
            'next_sync_due'
        ])
    
    def mark_as_duplicate(self, original_opportunity):
        """Mark this opportunity as a duplicate of another."""
        self.is_duplicate = True
        self.duplicate_of = original_opportunity
        self.internship.is_active = False  # Deactivate duplicate
        
        self.save(update_fields=['is_duplicate', 'duplicate_of'])
        self.internship.save(update_fields=['is_active'])
    
    def increment_view_count(self):
        """Increment the view count for analytics."""
        self.view_count += 1
        self.save(update_fields=['view_count'])
    
    def increment_click_through_count(self):
        """Increment the click-through count for analytics."""
        self.click_through_count += 1
        self.save(update_fields=['click_through_count'])
    
    @property
    def is_stale(self):
        """Check if this opportunity data is stale and needs updating."""
        if not self.last_successful_sync:
            return True
        
        from datetime import timedelta
        stale_threshold = {
            'hourly': timedelta(hours=2),
            'daily': timedelta(days=2),
            'weekly': timedelta(weeks=2),
            'manual': timedelta(days=30),  # Manual items are stale after 30 days
        }
        
        threshold = stale_threshold.get(self.sync_frequency, timedelta(days=7))
        return timezone.now() - self.last_successful_sync > threshold
    
    @property
    def needs_sync(self):
        """Check if this opportunity needs to be synced."""
        if not self.next_sync_due:
            return False
        
        return timezone.now() >= self.next_sync_due
    
    @property
    def click_through_rate(self):
        """Calculate click-through rate."""
        if self.view_count == 0:
            return 0.0
        return self.click_through_count / self.view_count
    
    @property
    def application_rate(self):
        """Calculate application rate."""
        if self.view_count == 0:
            return 0.0
        return self.application_count / self.view_count