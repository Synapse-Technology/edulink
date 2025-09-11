"""Serializers for external opportunities with compliance and attribution support."""

from rest_framework import serializers
from django.utils import timezone
from typing import Dict, Any

from ..models import ExternalOpportunity, ExternalOpportunitySource
from ..templates.attribution import attribution_manager


class ExternalOpportunitySourceSerializer(serializers.ModelSerializer):
    """Serializer for external opportunity sources."""
    
    opportunity_count = serializers.IntegerField(read_only=True)
    last_sync_status = serializers.SerializerMethodField()
    compliance_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = ExternalOpportunitySource
        fields = [
            'id', 'name', 'source_type', 'base_url', 'is_active',
            'last_sync', 'last_sync_attempt', 'sync_frequency_hours',
            'rate_limit_per_hour', 'opportunity_count', 'last_sync_status',
            'compliance_summary', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_last_sync_status(self, obj) -> str:
        """Get human-readable sync status."""
        if not obj.last_sync_attempt:
            return 'never'
        
        if not obj.last_sync:
            return 'failed'
        
        # Check if sync is recent
        expected_interval = timezone.timedelta(hours=obj.sync_frequency_hours or 24)
        if timezone.now() - obj.last_sync > expected_interval:
            return 'overdue'
        
        return 'current'
    
    def get_compliance_summary(self, obj) -> Dict[str, Any]:
        """Get basic compliance information."""
        return {
            'is_compliant': getattr(obj, 'is_compliant', False),
            'gdpr_compliant': getattr(obj, 'gdpr_compliant', False),
            'has_terms': bool(getattr(obj, 'terms_of_service_url', None)),
            'has_privacy_policy': bool(getattr(obj, 'privacy_policy_url', None)),
            'last_checked': getattr(obj, 'compliance_last_checked', None)
        }


class ExternalOpportunitySerializer(serializers.ModelSerializer):
    """Serializer for external opportunities with attribution."""
    
    source = ExternalOpportunitySourceSerializer(read_only=True)
    source_id = serializers.IntegerField(write_only=True, required=False)
    
    # Computed fields
    is_recent = serializers.SerializerMethodField()
    quality_rating = serializers.SerializerMethodField()
    attribution_text = serializers.SerializerMethodField()
    
    class Meta:
        model = ExternalOpportunity
        fields = [
            'id', 'external_id', 'title', 'description', 'company',
            'location', 'category', 'external_url', 'application_url',
            'salary_min', 'salary_max', 'currency', 'employment_type',
            'experience_level', 'skills_required', 'application_deadline',
            'quality_score', 'is_active', 'source', 'source_id',
            'created_at', 'updated_at', 'is_recent', 'quality_rating',
            'attribution_text'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'is_recent', 
            'quality_rating', 'attribution_text'
        ]
    
    def get_is_recent(self, obj) -> bool:
        """Check if opportunity was posted recently (within 7 days)."""
        if not obj.created_at:
            return False
        
        seven_days_ago = timezone.now() - timezone.timedelta(days=7)
        return obj.created_at >= seven_days_ago
    
    def get_quality_rating(self, obj) -> str:
        """Get human-readable quality rating."""
        score = obj.quality_score or 0
        
        if score >= 4.5:
            return 'excellent'
        elif score >= 3.5:
            return 'good'
        elif score >= 2.5:
            return 'fair'
        elif score >= 1.5:
            return 'poor'
        else:
            return 'unrated'
    
    def get_attribution_text(self, obj) -> str:
        """Get basic attribution text for the opportunity."""
        try:
            if not obj.source:
                return 'External Source'
            
            source_data = {
                'source_name': obj.source.name,
                'source_url': obj.source.base_url
            }
            
            return attribution_manager.render_attribution(
                source_data, 'minimal', 'text'
            )
            
        except Exception:
            return 'External Source'
    
    def validate_external_url(self, value):
        """Validate external URL format."""
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError(
                "External URL must start with http:// or https://"
            )
        return value
    
    def validate_application_url(self, value):
        """Validate application URL format."""
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError(
                "Application URL must start with http:// or https://"
            )
        return value
    
    def validate_quality_score(self, value):
        """Validate quality score range."""
        if value is not None and (value < 0 or value > 5):
            raise serializers.ValidationError(
                "Quality score must be between 0 and 5"
            )
        return value


class ExternalOpportunitySearchSerializer(serializers.Serializer):
    """Serializer for external opportunity search parameters."""
    
    search = serializers.CharField(required=False, max_length=200)
    category = serializers.CharField(required=False, max_length=100)
    location = serializers.CharField(required=False, max_length=200)
    source = serializers.CharField(required=False, max_length=100)
    min_quality = serializers.FloatField(required=False, min_value=0, max_value=5)
    days_back = serializers.IntegerField(required=False, min_value=1, max_value=365)
    sort = serializers.ChoiceField(
        required=False,
        choices=[
            ('-created_at', 'Newest First'),
            ('created_at', 'Oldest First'),
            ('-quality_score', 'Highest Quality'),
            ('quality_score', 'Lowest Quality'),
            ('title', 'Title A-Z'),
            ('-title', 'Title Z-A')
        ],
        default='-created_at'
    )
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)


class ExternalOpportunityDetailSerializer(ExternalOpportunitySerializer):
    """Extended serializer for detailed opportunity view."""
    
    # Additional fields for detailed view
    source_details = serializers.SerializerMethodField()
    related_opportunities = serializers.SerializerMethodField()
    
    class Meta(ExternalOpportunitySerializer.Meta):
        fields = ExternalOpportunitySerializer.Meta.fields + [
            'source_details', 'related_opportunities'
        ]
    
    def get_source_details(self, obj) -> Dict[str, Any]:
        """Get detailed source information."""
        if not obj.source:
            return {}
        
        source = obj.source
        return {
            'name': source.name,
            'type': source.source_type,
            'base_url': source.base_url,
            'terms_url': source.terms_of_service_url,
            'privacy_url': source.privacy_policy_url,
            'last_sync': source.last_sync,
            'sync_frequency': source.sync_frequency_hours,
            'is_compliant': getattr(source, 'is_compliant', False),
            'attribution_data': source.attribution_data or {}
        }
    
    def get_related_opportunities(self, obj) -> list:
        """Get related opportunities from the same source."""
        try:
            if not obj.source:
                return []
            
            # Get 3 other opportunities from same source
            related = ExternalOpportunity.objects.filter(
                source=obj.source,
                is_active=True
            ).exclude(
                id=obj.id
            ).order_by('-quality_score', '-created_at')[:3]
            
            return [{
                'id': opp.id,
                'title': opp.title,
                'company': opp.company,
                'location': opp.location,
                'quality_score': opp.quality_score
            } for opp in related]
            
        except Exception:
            return []


class ExternalOpportunityCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating external opportunities."""
    
    class Meta:
        model = ExternalOpportunity
        fields = [
            'external_id', 'title', 'description', 'company',
            'location', 'category', 'external_url', 'application_url',
            'salary_min', 'salary_max', 'currency', 'employment_type',
            'experience_level', 'skills_required', 'application_deadline',
            'quality_score', 'source'
        ]
    
    def validate(self, data):
        """Validate opportunity data."""
        # Check for required fields
        required_fields = ['title', 'external_url', 'source']
        for field in required_fields:
            if not data.get(field):
                raise serializers.ValidationError(
                    f"{field} is required"
                )
        
        # Validate salary range
        salary_min = data.get('salary_min')
        salary_max = data.get('salary_max')
        
        if salary_min and salary_max and salary_min > salary_max:
            raise serializers.ValidationError(
                "Minimum salary cannot be greater than maximum salary"
            )
        
        # Check for duplicate external_id within source
        external_id = data.get('external_id')
        source = data.get('source')
        
        if external_id and source:
            existing = ExternalOpportunity.objects.filter(
                external_id=external_id,
                source=source
            ).exists()
            
            if existing:
                raise serializers.ValidationError(
                    "Opportunity with this external_id already exists for this source"
                )
        
        return data


class ExternalOpportunityUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating external opportunities."""
    
    class Meta:
        model = ExternalOpportunity
        fields = [
            'title', 'description', 'company', 'location', 'category',
            'external_url', 'application_url', 'salary_min', 'salary_max',
            'currency', 'employment_type', 'experience_level',
            'skills_required', 'application_deadline', 'quality_score',
            'is_active'
        ]
    
    def validate(self, data):
        """Validate update data."""
        # Validate salary range
        salary_min = data.get('salary_min')
        salary_max = data.get('salary_max')
        
        # Get current values if not provided in update
        if salary_min is None and hasattr(self.instance, 'salary_min'):
            salary_min = self.instance.salary_min
        if salary_max is None and hasattr(self.instance, 'salary_max'):
            salary_max = self.instance.salary_max
        
        if salary_min and salary_max and salary_min > salary_max:
            raise serializers.ValidationError(
                "Minimum salary cannot be greater than maximum salary"
            )
        
        return data


class ExternalOpportunityBulkSerializer(serializers.Serializer):
    """Serializer for bulk operations on external opportunities."""
    
    opportunity_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=100
    )
    action = serializers.ChoiceField(
        choices=[
            ('activate', 'Activate'),
            ('deactivate', 'Deactivate'),
            ('delete', 'Delete'),
            ('update_quality', 'Update Quality')
        ]
    )
    
    # Optional parameters for specific actions
    quality_score = serializers.FloatField(
        required=False,
        min_value=0,
        max_value=5
    )
    
    def validate(self, data):
        """Validate bulk operation data."""
        action = data.get('action')
        
        # Check if quality_score is provided for update_quality action
        if action == 'update_quality' and 'quality_score' not in data:
            raise serializers.ValidationError(
                "quality_score is required for update_quality action"
            )
        
        return data


class AttributionPreviewSerializer(serializers.Serializer):
    """Serializer for attribution preview requests."""
    
    source_name = serializers.CharField(max_length=200)
    source_url = serializers.URLField(required=False)
    data_provider = serializers.CharField(max_length=200, required=False)
    terms_url = serializers.URLField(required=False)
    privacy_url = serializers.URLField(required=False)
    quality_score = serializers.FloatField(min_value=0, max_value=5, required=False)
    
    style = serializers.ChoiceField(
        choices=[
            ('minimal', 'Minimal'),
            ('standard', 'Standard'),
            ('detailed', 'Detailed'),
            ('card', 'Card'),
            ('footer', 'Footer')
        ],
        default='standard'
    )
    
    format_type = serializers.ChoiceField(
        choices=[('text', 'Text'), ('html', 'HTML')],
        default='html'
    )