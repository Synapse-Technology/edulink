"""Compliance and attribution management for external opportunities."""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from urllib.parse import urlparse

from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction

from ..models import ExternalOpportunitySource, ExternalOpportunity, Internship

logger = logging.getLogger(__name__)


class ComplianceManager:
    """Manages compliance and attribution for external opportunity sources."""
    
    # Required attribution fields for different source types
    REQUIRED_ATTRIBUTION = {
        'api': ['source_name', 'source_url', 'data_provider'],
        'rss': ['source_name', 'source_url', 'feed_url'],
        'scraper': ['source_name', 'source_url', 'scraping_policy_url']
    }
    
    # Compliance requirements by region/jurisdiction
    COMPLIANCE_REQUIREMENTS = {
        'EU': {
            'gdpr_compliant': True,
            'data_retention_days': 90,
            'user_consent_required': True,
            'right_to_deletion': True,
            'data_portability': True
        },
        'US': {
            'ccpa_compliant': True,
            'data_retention_days': 365,
            'user_consent_required': False,
            'right_to_deletion': True,
            'data_portability': False
        },
        'GLOBAL': {
            'data_retention_days': 180,
            'user_consent_required': False,
            'right_to_deletion': False,
            'data_portability': False
        }
    }
    
    def __init__(self):
        self.require_attribution = getattr(settings, 'REQUIRE_SOURCE_ATTRIBUTION', True)
        self.enable_tracking = getattr(settings, 'ENABLE_EXTERNAL_TRACKING', True)
        self.link_tracking = getattr(settings, 'EXTERNAL_LINK_TRACKING', True)
    
    def validate_source_compliance(self, source: ExternalOpportunitySource) -> Dict[str, Any]:
        """Validate that a source meets compliance requirements."""
        validation_results = {
            'is_compliant': True,
            'issues': [],
            'warnings': [],
            'recommendations': []
        }
        
        try:
            # Check attribution requirements
            attribution_check = self._validate_attribution(source)
            if not attribution_check['valid']:
                validation_results['is_compliant'] = False
                validation_results['issues'].extend(attribution_check['issues'])
            
            # Check terms of service compliance
            tos_check = self._validate_terms_of_service(source)
            if not tos_check['valid']:
                validation_results['warnings'].extend(tos_check['warnings'])
            
            # Check data retention compliance
            retention_check = self._validate_data_retention(source)
            if not retention_check['valid']:
                validation_results['issues'].extend(retention_check['issues'])
            
            # Check rate limiting compliance
            rate_limit_check = self._validate_rate_limits(source)
            if not rate_limit_check['valid']:
                validation_results['warnings'].extend(rate_limit_check['warnings'])
            
            # Check privacy compliance
            privacy_check = self._validate_privacy_compliance(source)
            if not privacy_check['valid']:
                validation_results['issues'].extend(privacy_check['issues'])
            
            # Generate recommendations
            validation_results['recommendations'] = self._generate_compliance_recommendations(source)
            
        except Exception as e:
            logger.error(f"Compliance validation failed for source {source.id}: {e}")
            validation_results['is_compliant'] = False
            validation_results['issues'].append(f"Validation error: {str(e)}")
        
        return validation_results
    
    def validate_source_attribution(self, source: ExternalOpportunitySource) -> bool:
        """Validate that a source has proper attribution configured."""
        try:
            # Check if attribution is required for this source
            if not source.attribution_required:
                return True
            
            # Check if attribution text is provided
            if not source.attribution_text or source.attribution_text.strip() == '':
                logger.warning(f"Source {source.name} requires attribution but has no attribution text")
                return False
            
            # Check if source has proper URLs for attribution
            if not source.base_url:
                logger.warning(f"Source {source.name} missing base URL for attribution")
                return False
            
            # Validate attribution text contains required elements
            attribution_lower = source.attribution_text.lower()
            source_name_lower = source.name.lower()
            
            # Attribution should mention the source name
            if source_name_lower not in attribution_lower:
                logger.warning(f"Attribution text for {source.name} does not mention source name")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Attribution validation failed for source {source.name}: {e}")
            return False
    
    def _validate_attribution(self, source: ExternalOpportunitySource) -> Dict[str, Any]:
        """Validate source attribution requirements."""
        if not self.require_attribution:
            return {'valid': True, 'issues': []}
        
        issues = []
        required_fields = self.REQUIRED_ATTRIBUTION.get(source.source_type, [])
        
        # Check required attribution fields
        attribution_data = source.attribution_data or {}
        
        for field in required_fields:
            if not attribution_data.get(field):
                issues.append(f"Missing required attribution field: {field}")
        
        # Validate source URL
        if attribution_data.get('source_url'):
            if not self._is_valid_url(attribution_data['source_url']):
                issues.append("Invalid source URL format")
        
        # Check attribution display requirements
        if not attribution_data.get('attribution_text'):
            issues.append("Missing attribution display text")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues
        }
    
    def _validate_terms_of_service(self, source: ExternalOpportunitySource) -> Dict[str, Any]:
        """Validate terms of service compliance."""
        warnings = []
        
        # Check if ToS URL is provided
        if not source.terms_of_service_url:
            warnings.append("No terms of service URL provided")
        
        # Check ToS acceptance date
        if not source.terms_accepted_date:
            warnings.append("Terms of service acceptance not recorded")
        
        # Check if ToS is recent (within last year)
        if source.terms_accepted_date:
            one_year_ago = timezone.now() - timedelta(days=365)
            if source.terms_accepted_date < one_year_ago:
                warnings.append("Terms of service acceptance is over 1 year old")
        
        return {
            'valid': len(warnings) == 0,
            'warnings': warnings
        }
    
    def _validate_data_retention(self, source: ExternalOpportunitySource) -> Dict[str, Any]:
        """Validate data retention compliance."""
        issues = []
        
        # Get applicable compliance requirements
        jurisdiction = source.jurisdiction or 'GLOBAL'
        requirements = self.COMPLIANCE_REQUIREMENTS.get(jurisdiction, 
                                                      self.COMPLIANCE_REQUIREMENTS['GLOBAL'])
        
        # Check data retention period
        max_retention_days = requirements.get('data_retention_days', 180)
        
        # Count old opportunities from this source
        cutoff_date = timezone.now() - timedelta(days=max_retention_days)
        old_opportunities = ExternalOpportunity.objects.filter(
            source=source,
            created_at__lt=cutoff_date
        ).count()
        
        if old_opportunities > 0:
            issues.append(
                f"{old_opportunities} opportunities exceed {max_retention_days} day retention limit"
            )
        
        return {
            'valid': len(issues) == 0,
            'issues': issues
        }
    
    def _validate_rate_limits(self, source: ExternalOpportunitySource) -> Dict[str, Any]:
        """Validate rate limiting compliance."""
        warnings = []
        
        # Check if rate limits are configured
        if not source.rate_limit_per_hour:
            warnings.append("No rate limit configured")
        
        # Check if rate limit is reasonable
        max_reasonable_rate = getattr(settings, 'EXTERNAL_SOURCE_RATE_LIMIT', 60)
        if source.rate_limit_per_hour and source.rate_limit_per_hour > max_reasonable_rate:
            warnings.append(f"Rate limit ({source.rate_limit_per_hour}/hour) exceeds recommended maximum")
        
        # Check recent request patterns
        if source.last_sync and source.last_sync_attempt:
            time_diff = (source.last_sync_attempt - source.last_sync).total_seconds()
            if time_diff < 60:  # Less than 1 minute between requests
                warnings.append("Requests may be too frequent")
        
        return {
            'valid': len(warnings) == 0,
            'warnings': warnings
        }
    
    def _validate_privacy_compliance(self, source: ExternalOpportunitySource) -> Dict[str, Any]:
        """Validate privacy compliance requirements."""
        issues = []
        
        # Get applicable compliance requirements
        jurisdiction = source.jurisdiction or 'GLOBAL'
        requirements = self.COMPLIANCE_REQUIREMENTS.get(jurisdiction, 
                                                      self.COMPLIANCE_REQUIREMENTS['GLOBAL'])
        
        # Check GDPR compliance if required
        if requirements.get('gdpr_compliant') and not source.gdpr_compliant:
            issues.append("GDPR compliance required but not confirmed")
        
        # Check user consent requirements
        if requirements.get('user_consent_required') and not source.user_consent_obtained:
            issues.append("User consent required but not obtained")
        
        # Check privacy policy
        if not source.privacy_policy_url:
            issues.append("Privacy policy URL not provided")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues
        }
    
    def _generate_compliance_recommendations(self, source: ExternalOpportunitySource) -> List[str]:
        """Generate compliance recommendations for a source."""
        recommendations = []
        
        # Attribution recommendations
        if self.require_attribution and not source.attribution_data:
            recommendations.append("Add comprehensive attribution data")
        
        # Rate limiting recommendations
        if not source.rate_limit_per_hour:
            recommendations.append("Configure appropriate rate limiting")
        
        # Documentation recommendations
        if not source.terms_of_service_url:
            recommendations.append("Provide terms of service URL")
        
        if not source.privacy_policy_url:
            recommendations.append("Provide privacy policy URL")
        
        # Monitoring recommendations
        if not source.health_check_url:
            recommendations.append("Configure health check endpoint")
        
        return recommendations
    
    def generate_attribution_text(self, opportunity: ExternalOpportunity) -> str:
        """Generate attribution text for an external opportunity."""
        if not self.require_attribution:
            return ""
        
        source = opportunity.source
        attribution_data = source.attribution_data or {}
        
        # Use custom attribution text if provided
        if attribution_data.get('attribution_text'):
            return attribution_data['attribution_text']
        
        # Generate default attribution text
        source_name = attribution_data.get('source_name', source.name)
        source_url = attribution_data.get('source_url', source.base_url)
        
        if source_url:
            return f"Source: {source_name} ({source_url})"
        else:
            return f"Source: {source_name}"
    
    def generate_attribution_html(self, opportunity: ExternalOpportunity) -> str:
        """Generate HTML attribution for an external opportunity."""
        if not self.require_attribution:
            return ""
        
        source = opportunity.source
        attribution_data = source.attribution_data or {}
        
        # Use custom HTML if provided
        if attribution_data.get('attribution_html'):
            return attribution_data['attribution_html']
        
        # Generate default HTML attribution
        source_name = attribution_data.get('source_name', source.name)
        source_url = attribution_data.get('source_url', source.base_url)
        
        if source_url:
            return f'<p class="attribution">Source: <a href="{source_url}" target="_blank" rel="noopener">{source_name}</a></p>'
        else:
            return f'<p class="attribution">Source: {source_name}</p>'
    
    def track_external_click(self, opportunity: ExternalOpportunity, 
                           user_id: Optional[int] = None, 
                           ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Track clicks on external opportunities for analytics and compliance."""
        if not self.link_tracking:
            return {'tracked': False, 'reason': 'Tracking disabled'}
        
        try:
            # Create tracking record
            tracking_data = {
                'opportunity_id': opportunity.id,
                'source_id': opportunity.source.id,
                'external_url': opportunity.external_url,
                'timestamp': timezone.now().isoformat(),
                'user_id': user_id,
                'anonymized_ip': self._anonymize_ip(ip_address) if ip_address else None
            }
            
            # Store tracking data (implement based on your tracking system)
            # This could be stored in a separate tracking model or sent to analytics
            
            logger.info(f"External click tracked: opportunity {opportunity.id}")
            
            return {
                'tracked': True,
                'tracking_id': f"ext_{opportunity.id}_{int(timezone.now().timestamp())}"
            }
            
        except Exception as e:
            logger.error(f"Failed to track external click: {e}")
            return {'tracked': False, 'reason': str(e)}
    
    def cleanup_expired_data(self, source: ExternalOpportunitySource) -> Dict[str, int]:
        """Clean up expired data according to compliance requirements."""
        # Get applicable compliance requirements
        jurisdiction = source.jurisdiction or 'GLOBAL'
        requirements = self.COMPLIANCE_REQUIREMENTS.get(jurisdiction, 
                                                      self.COMPLIANCE_REQUIREMENTS['GLOBAL'])
        
        max_retention_days = requirements.get('data_retention_days', 180)
        cutoff_date = timezone.now() - timedelta(days=max_retention_days)
        
        # Find expired opportunities
        expired_opportunities = ExternalOpportunity.objects.filter(
            source=source,
            created_at__lt=cutoff_date
        )
        
        expired_count = expired_opportunities.count()
        
        if expired_count > 0:
            # Delete expired opportunities
            with transaction.atomic():
                expired_opportunities.delete()
            
            logger.info(f"Cleaned up {expired_count} expired opportunities from source {source.name}")
        
        return {
            'cleaned_count': expired_count,
            'retention_days': max_retention_days
        }
    
    def generate_compliance_report(self, source: ExternalOpportunitySource) -> Dict[str, Any]:
        """Generate a comprehensive compliance report for a source."""
        validation_results = self.validate_source_compliance(source)
        
        # Get data statistics
        total_opportunities = ExternalOpportunity.objects.filter(source=source).count()
        recent_opportunities = ExternalOpportunity.objects.filter(
            source=source,
            created_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        # Get jurisdiction requirements
        jurisdiction = source.jurisdiction or 'GLOBAL'
        requirements = self.COMPLIANCE_REQUIREMENTS.get(jurisdiction, 
                                                      self.COMPLIANCE_REQUIREMENTS['GLOBAL'])
        
        return {
            'source_info': {
                'id': source.id,
                'name': source.name,
                'source_type': source.source_type,
                'jurisdiction': jurisdiction,
                'is_active': source.is_active
            },
            'compliance_status': {
                'is_compliant': validation_results['is_compliant'],
                'issues_count': len(validation_results['issues']),
                'warnings_count': len(validation_results['warnings'])
            },
            'validation_results': validation_results,
            'data_statistics': {
                'total_opportunities': total_opportunities,
                'recent_opportunities': recent_opportunities,
                'last_sync': source.last_sync.isoformat() if source.last_sync else None
            },
            'requirements': requirements,
            'generated_at': timezone.now().isoformat()
        }
    
    def _is_valid_url(self, url: str) -> bool:
        """Validate URL format."""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False
    
    def _anonymize_ip(self, ip_address: str) -> str:
        """Anonymize IP address for privacy compliance."""
        if not ip_address:
            return ""
        
        try:
            # Simple IPv4 anonymization (mask last octet)
            if '.' in ip_address and ip_address.count('.') == 3:
                parts = ip_address.split('.')
                return f"{parts[0]}.{parts[1]}.{parts[2]}.0"
            
            # Simple IPv6 anonymization (mask last 64 bits)
            if ':' in ip_address:
                parts = ip_address.split(':')
                if len(parts) >= 4:
                    return ':'.join(parts[:4]) + '::'
            
            return "anonymized"
            
        except Exception:
            return "anonymized"
    
    def update_source_compliance_status(self, source: ExternalOpportunitySource) -> bool:
        """Update the compliance status of a source."""
        try:
            validation_results = self.validate_source_compliance(source)
            
            # Update source compliance fields
            source.is_compliant = validation_results['is_compliant']
            source.compliance_issues = validation_results['issues']
            source.compliance_last_checked = timezone.now()
            source.save(update_fields=[
                'is_compliant', 'compliance_issues', 'compliance_last_checked'
            ])
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update compliance status for source {source.id}: {e}")
            return False