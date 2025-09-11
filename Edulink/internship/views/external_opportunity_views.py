"""API views for external opportunities with compliance and attribution."""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from django.utils import timezone
from django.conf import settings
from django.db.models import Q, Count, Avg
from django.core.cache import cache
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from ..models import ExternalOpportunity, ExternalOpportunitySource
from ..serializers.external_opportunity_serializers import (
    ExternalOpportunitySerializer,
    ExternalOpportunitySourceSerializer,
    ExternalOpportunitySearchSerializer
)
from ..services.compliance_manager import ComplianceManager
from ..services.cache_manager import OpportunityCacheManager
from ..templates.attribution import attribution_manager
from ..permissions.role_permissions import CanViewInternship

logger = logging.getLogger(__name__)


class ExternalOpportunityPagination(PageNumberPagination):
    """Custom pagination for external opportunities."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ExternalOpportunityListView(generics.ListAPIView):
    """List external opportunities with filtering and attribution."""
    
    serializer_class = ExternalOpportunitySerializer
    pagination_class = ExternalOpportunityPagination
    permission_classes = [AllowAny]  # Public access for opportunities
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.compliance_manager = ComplianceManager()
        self.cache_manager = OpportunityCacheManager()
    
    def get_queryset(self):
        """Get filtered queryset with compliance checks."""
        queryset = ExternalOpportunity.objects.filter(
            sync_status__in=['synced', 'outdated'],  # Only synced opportunities
            content_appropriate=True,
            compliance_checked=True,
            is_duplicate=False,
            source__is_active=True,
            source__is_verified=True  # Only verified sources
        ).select_related('source').order_by('-created_at')
        
        # Apply filters
        queryset = self._apply_filters(queryset)
        
        return queryset
    
    def _apply_filters(self, queryset):
        """Apply search and filter parameters."""
        # Search query
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(company__icontains=search) |
                Q(location__icontains=search)
            )
        
        # Category filter
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__iexact=category)
        
        # Location filter
        location = self.request.query_params.get('location')
        if location:
            queryset = queryset.filter(location__icontains=location)
        
        # Source filter
        source = self.request.query_params.get('source')
        if source:
            queryset = queryset.filter(source__name__icontains=source)
        
        # Quality filter
        min_quality = self.request.query_params.get('min_quality')
        if min_quality:
            try:
                min_quality_float = float(min_quality)
                queryset = queryset.filter(quality_score__gte=min_quality_float)
            except ValueError:
                pass
        
        # Date range filter
        days_back = self.request.query_params.get('days_back')
        if days_back:
            try:
                days = int(days_back)
                cutoff_date = timezone.now() - timedelta(days=days)
                queryset = queryset.filter(created_at__gte=cutoff_date)
            except ValueError:
                pass
        
        # Sorting
        sort_by = self.request.query_params.get('sort', '-created_at')
        valid_sorts = ['-created_at', 'created_at', '-quality_score', 'quality_score', 'title', '-title']
        if sort_by in valid_sorts:
            queryset = queryset.order_by(sort_by)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Enhanced list response with attribution and metadata."""
        # Try to get from cache first
        cache_key = self._generate_cache_key(request)
        cached_response = self.cache_manager.get_search_results(cache_key)
        
        if cached_response:
            return Response(cached_response)
        
        # Get paginated response
        response = super().list(request, *args, **kwargs)
        
        # Add attribution to each opportunity
        if response.data and 'results' in response.data:
            for opportunity_data in response.data['results']:
                self._add_attribution(opportunity_data)
        
        # Add metadata
        response.data['metadata'] = self._get_metadata()
        
        # Cache the response
        self.cache_manager.set_search_results(cache_key, response.data, timeout=300)  # 5 minutes
        
        return response
    
    def _add_attribution(self, opportunity_data: Dict[str, Any]):
        """Add attribution information to opportunity data."""
        try:
            source_id = opportunity_data.get('source', {}).get('id')
            if source_id:
                source = ExternalOpportunitySource.objects.get(id=source_id)
                
                # Generate attribution
                source_data = {
                    'source_name': source.name,
                    'source_url': source.base_url,
                    'data_provider': source.attribution_data.get('data_provider', '') if source.attribution_data else '',
                    'terms_of_service_url': source.terms_of_service_url,
                    'privacy_policy_url': source.privacy_policy_url,
                    'last_updated': opportunity_data.get('updated_at', ''),
                    'quality_score': opportunity_data.get('quality_score', 0)
                }
                
                # Add different attribution formats
                opportunity_data['attribution'] = {
                    'text': attribution_manager.render_attribution(source_data, 'minimal', 'text'),
                    'html': attribution_manager.render_attribution(source_data, 'standard', 'html'),
                    'card': attribution_manager.render_attribution(source_data, 'card', 'html')
                }
                
        except Exception as e:
            logger.error(f"Failed to add attribution: {e}")
            opportunity_data['attribution'] = {
                'text': 'External Source',
                'html': '<span class="attribution-fallback">External Source</span>',
                'card': '<div class="attribution-card">External Source</div>'
            }
    
    def _get_metadata(self) -> Dict[str, Any]:
        """Get metadata about external opportunities."""
        try:
            # Get cached stats
            stats = self.cache_manager.get_statistics()
            if stats:
                return stats
            
            # Calculate fresh stats
            total_opportunities = ExternalOpportunity.objects.filter(
                is_active=True,
                source__is_active=True,
                source__is_compliant=True
            ).count()
            
            active_sources = ExternalOpportunitySource.objects.filter(
                is_active=True,
                is_compliant=True
            ).count()
            
            recent_opportunities = ExternalOpportunity.objects.filter(
                is_active=True,
                source__is_active=True,
                source__is_compliant=True,
                created_at__gte=timezone.now() - timedelta(days=7)
            ).count()
            
            avg_quality = ExternalOpportunity.objects.filter(
                is_active=True,
                source__is_active=True,
                source__is_compliant=True,
                quality_score__gt=0
            ).aggregate(avg_quality=Avg('quality_score'))['avg_quality'] or 0
            
            metadata = {
                'total_opportunities': total_opportunities,
                'active_sources': active_sources,
                'recent_opportunities': recent_opportunities,
                'average_quality': round(avg_quality, 2),
                'last_updated': timezone.now().isoformat()
            }
            
            # Cache the stats
            self.cache_manager.cache_statistics(metadata, timeout=600)  # 10 minutes
            
            return metadata
            
        except Exception as e:
            logger.error(f"Failed to get metadata: {e}")
            return {
                'total_opportunities': 0,
                'active_sources': 0,
                'recent_opportunities': 0,
                'average_quality': 0,
                'last_updated': timezone.now().isoformat()
            }
    
    def _generate_cache_key(self, request) -> str:
        """Generate cache key for request parameters."""
        params = [
            request.query_params.get('search', ''),
            request.query_params.get('category', ''),
            request.query_params.get('location', ''),
            request.query_params.get('source', ''),
            request.query_params.get('min_quality', ''),
            request.query_params.get('days_back', ''),
            request.query_params.get('sort', ''),
            request.query_params.get('page', '1')
        ]
        return f"external_opportunities:{'_'.join(params)}"


class ExternalOpportunityDetailView(generics.RetrieveAPIView):
    """Detailed view of external opportunity with full attribution."""
    
    serializer_class = ExternalOpportunitySerializer
    permission_classes = [AllowAny]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.compliance_manager = ComplianceManager()
    
    def get_queryset(self):
        return ExternalOpportunity.objects.filter(
            is_active=True,
            source__is_active=True,
            source__is_compliant=True
        ).select_related('source')
    
    def retrieve(self, request, *args, **kwargs):
        """Enhanced retrieve with full attribution and tracking."""
        response = super().retrieve(request, *args, **kwargs)
        
        # Add full attribution
        opportunity = self.get_object()
        self._add_full_attribution(response.data, opportunity)
        
        # Track view (if enabled)
        self._track_view(opportunity, request)
        
        return response
    
    def _add_full_attribution(self, opportunity_data: Dict[str, Any], opportunity: ExternalOpportunity):
        """Add comprehensive attribution information."""
        try:
            source = opportunity.source
            
            source_data = {
                'source_name': source.name,
                'source_url': source.base_url,
                'data_provider': source.attribution_data.get('data_provider', '') if source.attribution_data else '',
                'terms_of_service_url': source.terms_of_service_url,
                'privacy_policy_url': source.privacy_policy_url,
                'last_updated': opportunity_data.get('updated_at', ''),
                'quality_score': opportunity_data.get('quality_score', 0)
            }
            
            # Add all attribution formats
            opportunity_data['attribution'] = {
                'minimal': {
                    'text': attribution_manager.render_attribution(source_data, 'minimal', 'text'),
                    'html': attribution_manager.render_attribution(source_data, 'minimal', 'html')
                },
                'standard': {
                    'text': attribution_manager.render_attribution(source_data, 'standard', 'text'),
                    'html': attribution_manager.render_attribution(source_data, 'standard', 'html')
                },
                'detailed': {
                    'text': attribution_manager.render_attribution(source_data, 'detailed', 'text'),
                    'html': attribution_manager.render_attribution(source_data, 'detailed', 'html')
                },
                'card': {
                    'html': attribution_manager.render_attribution(source_data, 'card', 'html')
                },
                'footer': {
                    'html': attribution_manager.render_attribution(source_data, 'footer', 'html')
                }
            }
            
            # Add compliance information
            opportunity_data['compliance'] = {
                'source_compliant': source.is_compliant,
                'gdpr_compliant': source.gdpr_compliant,
                'terms_accepted': source.terms_accepted_date is not None,
                'privacy_policy_available': bool(source.privacy_policy_url)
            }
            
        except Exception as e:
            logger.error(f"Failed to add full attribution: {e}")
    
    def _track_view(self, opportunity: ExternalOpportunity, request):
        """Track opportunity view for analytics."""
        try:
            user_id = request.user.id if request.user.is_authenticated else None
            ip_address = self._get_client_ip(request)
            
            self.compliance_manager.track_external_click(
                opportunity=opportunity,
                user_id=user_id,
                ip_address=ip_address
            )
            
        except Exception as e:
            logger.error(f"Failed to track view: {e}")
    
    def _get_client_ip(self, request) -> Optional[str]:
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


@api_view(['POST'])
@permission_classes([AllowAny])
def track_external_click(request):
    """Track clicks on external opportunity links."""
    try:
        opportunity_id = request.data.get('opportunity_id')
        if not opportunity_id:
            return Response(
                {'error': 'opportunity_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        opportunity = ExternalOpportunity.objects.get(
            id=opportunity_id,
            is_active=True,
            source__is_active=True,
            source__is_compliant=True
        )
        
        compliance_manager = ComplianceManager()
        user_id = request.user.id if request.user.is_authenticated else None
        ip_address = request.META.get('REMOTE_ADDR')
        
        tracking_result = compliance_manager.track_external_click(
            opportunity=opportunity,
            user_id=user_id,
            ip_address=ip_address
        )
        
        return Response({
            'success': True,
            'tracking_result': tracking_result,
            'redirect_url': opportunity.external_url
        })
        
    except ExternalOpportunity.DoesNotExist:
        return Response(
            {'error': 'Opportunity not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to track external click: {e}")
        return Response(
            {'error': 'Tracking failed'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class ExternalSourceListView(generics.ListAPIView):
    """List external opportunity sources with compliance status."""
    
    serializer_class = ExternalOpportunitySourceSerializer
    permission_classes = [IsAuthenticated, CanViewInternship]
    
    def get_queryset(self):
        return ExternalOpportunitySource.objects.filter(
            is_active=True
        ).annotate(
            opportunity_count=Count('external_opportunities')
        ).order_by('name')
    
    def list(self, request, *args, **kwargs):
        """Enhanced list with compliance information."""
        response = super().list(request, *args, **kwargs)
        
        # Add compliance status to each source
        compliance_manager = ComplianceManager()
        
        for source_data in response.data:
            try:
                source = ExternalOpportunitySource.objects.get(id=source_data['id'])
                compliance_status = compliance_manager.validate_source_compliance(source)
                
                source_data['compliance_status'] = {
                    'is_compliant': compliance_status['is_compliant'],
                    'issues_count': len(compliance_status['issues']),
                    'warnings_count': len(compliance_status['warnings'])
                }
                
            except Exception as e:
                logger.error(f"Failed to get compliance status for source {source_data['id']}: {e}")
                source_data['compliance_status'] = {
                    'is_compliant': False,
                    'issues_count': 1,
                    'warnings_count': 0
                }
        
        return response


class AttributionStylesView(APIView):
    """Get available attribution styles and CSS."""
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Return available attribution styles and CSS."""
        try:
            return Response({
                'styles': attribution_manager.get_available_styles(),
                'css': attribution_manager.get_attribution_css(),
                'default_style': attribution_manager.default_style
            })
            
        except Exception as e:
            logger.error(f"Failed to get attribution styles: {e}")
            return Response(
                {'error': 'Failed to get attribution styles'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ComplianceReportView(APIView):
    """Generate compliance reports for external sources."""
    
    permission_classes = [IsAuthenticated, CanViewInternship]
    
    def get(self, request, source_id=None):
        """Generate compliance report for a source or all sources."""
        try:
            compliance_manager = ComplianceManager()
            
            if source_id:
                # Single source report
                source = ExternalOpportunitySource.objects.get(id=source_id)
                report = compliance_manager.generate_compliance_report(source)
                return Response(report)
            else:
                # All sources summary
                sources = ExternalOpportunitySource.objects.filter(is_active=True)
                reports = []
                
                for source in sources:
                    report = compliance_manager.generate_compliance_report(source)
                    reports.append({
                        'source_id': source.id,
                        'source_name': source.name,
                        'is_compliant': report['compliance_status']['is_compliant'],
                        'issues_count': report['compliance_status']['issues_count'],
                        'warnings_count': report['compliance_status']['warnings_count']
                    })
                
                return Response({
                    'summary': {
                        'total_sources': len(reports),
                        'compliant_sources': len([r for r in reports if r['is_compliant']]),
                        'sources_with_issues': len([r for r in reports if r['issues_count'] > 0])
                    },
                    'sources': reports,
                    'generated_at': timezone.now().isoformat()
                })
                
        except ExternalOpportunitySource.DoesNotExist:
            return Response(
                {'error': 'Source not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Failed to generate compliance report: {e}")
            return Response(
                {'error': 'Failed to generate compliance report'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )