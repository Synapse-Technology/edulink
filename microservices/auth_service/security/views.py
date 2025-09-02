from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, Avg
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from datetime import timedelta, datetime
import logging

from .models import (
    SecurityEvent,
    AuditLog,
    UserSession,
    FailedLoginAttempt,
    SecurityConfiguration,
    SecurityEventType,
    SeverityLevel
)
from .serializers import (
    SecurityEventSerializer,
    SecurityEventCreateSerializer,
    SecurityEventUpdateSerializer,
    AuditLogSerializer,
    AuditLogCreateSerializer,
    UserSessionSerializer,
    FailedLoginAttemptSerializer,
    SecurityConfigurationSerializer,
    SecurityConfigurationUpdateSerializer,
    SecurityDashboardSerializer,
    SecurityReportSerializer,
    BulkSecurityEventActionSerializer
)
from authentication.permissions import IsSuperAdmin, IsAdminUser, IsServiceAccount

User = get_user_model()
logger = logging.getLogger(__name__)


class SecurityEventPagination(PageNumberPagination):
    """Pagination for security events."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class SecurityEventListCreateView(generics.ListCreateAPIView):
    """List and create security events."""
    
    queryset = SecurityEvent.objects.all()
    pagination_class = SecurityEventPagination
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SecurityEventCreateSerializer
        return SecurityEventSerializer
    
    def get_queryset(self):
        """Filter security events based on query parameters."""
        queryset = SecurityEvent.objects.select_related('user', 'resolved_by')
        
        # Filter by event type
        event_type = self.request.query_params.get('event_type')
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        # Filter by severity
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by IP address
        ip_address = self.request.query_params.get('ip_address')
        if ip_address:
            queryset = queryset.filter(ip_address=ip_address)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            try:
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                queryset = queryset.filter(timestamp__gte=start_date)
            except ValueError:
                pass
        if end_date:
            try:
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                queryset = queryset.filter(timestamp__lte=end_date)
            except ValueError:
                pass
        
        # Filter by risk score
        min_risk = self.request.query_params.get('min_risk')
        max_risk = self.request.query_params.get('max_risk')
        if min_risk:
            try:
                queryset = queryset.filter(risk_score__gte=int(min_risk))
            except ValueError:
                pass
        if max_risk:
            try:
                queryset = queryset.filter(risk_score__lte=int(max_risk))
            except ValueError:
                pass
        
        # Search in description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search) |
                Q(user_email__icontains=search) |
                Q(ip_address__icontains=search)
            )
        
        return queryset.order_by('-timestamp')
    
    def perform_create(self, serializer):
        """Create security event with additional context."""
        # Add request context if available
        extra_data = {}
        if hasattr(self.request, 'META'):
            extra_data['ip_address'] = self.request.META.get('REMOTE_ADDR')
            extra_data['user_agent'] = self.request.META.get('HTTP_USER_AGENT', '')
        
        if self.request.user.is_authenticated:
            extra_data['user'] = self.request.user
        
        serializer.save(**extra_data)


class SecurityEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a security event."""
    
    queryset = SecurityEvent.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SecurityEventUpdateSerializer
        return SecurityEventSerializer
    
    def perform_update(self, serializer):
        """Update security event with resolver information."""
        if 'status' in serializer.validated_data:
            serializer.save(resolved_by=self.request.user)
        else:
            serializer.save()


class AuditLogListCreateView(generics.ListCreateAPIView):
    """List and create audit logs."""
    
    queryset = AuditLog.objects.all()
    pagination_class = SecurityEventPagination
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AuditLogCreateSerializer
        return AuditLogSerializer
    
    def get_queryset(self):
        """Filter audit logs based on query parameters."""
        queryset = AuditLog.objects.select_related('user')
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by resource type
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            try:
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                queryset = queryset.filter(timestamp__gte=start_date)
            except ValueError:
                pass
        if end_date:
            try:
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                queryset = queryset.filter(timestamp__lte=end_date)
            except ValueError:
                pass
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search) |
                Q(user_email__icontains=search) |
                Q(resource_type__icontains=search) |
                Q(resource_id__icontains=search)
            )
        
        return queryset.order_by('-timestamp')


class AuditLogDetailView(generics.RetrieveAPIView):
    """Retrieve an audit log entry."""
    
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]


class UserSessionListView(generics.ListAPIView):
    """List user sessions."""
    
    queryset = UserSession.objects.all()
    serializer_class = UserSessionSerializer
    pagination_class = SecurityEventPagination
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        """Filter user sessions."""
        queryset = UserSession.objects.select_related('user')
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by IP address
        ip_address = self.request.query_params.get('ip_address')
        if ip_address:
            queryset = queryset.filter(ip_address=ip_address)
        
        return queryset.order_by('-created_at')


class UserSessionDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or terminate a user session."""
    
    queryset = UserSession.objects.all()
    serializer_class = UserSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def patch(self, request, *args, **kwargs):
        """Terminate a session."""
        session = self.get_object()
        action = request.data.get('action')
        
        if action == 'terminate':
            reason = request.data.get('reason', 'forced')
            session.terminate(reason=reason)
            
            # Log the action
            AuditLog.objects.create(
                action='session_terminate',
                resource_type='UserSession',
                resource_id=str(session.id),
                user=request.user,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                description=f"Terminated session for {session.user.email}",
                metadata={'reason': reason, 'terminated_session_user': session.user.email}
            )
            
            return Response({'message': 'Session terminated successfully'})
        
        return Response(
            {'error': 'Invalid action'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class FailedLoginAttemptListView(generics.ListAPIView):
    """List failed login attempts."""
    
    queryset = FailedLoginAttempt.objects.all()
    serializer_class = FailedLoginAttemptSerializer
    pagination_class = SecurityEventPagination
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        """Filter failed login attempts."""
        queryset = FailedLoginAttempt.objects.all()
        
        # Filter by email
        email = self.request.query_params.get('email')
        if email:
            queryset = queryset.filter(email__icontains=email)
        
        # Filter by IP address
        ip_address = self.request.query_params.get('ip_address')
        if ip_address:
            queryset = queryset.filter(ip_address=ip_address)
        
        # Filter by reason
        reason = self.request.query_params.get('reason')
        if reason:
            queryset = queryset.filter(reason=reason)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            try:
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                queryset = queryset.filter(timestamp__gte=start_date)
            except ValueError:
                pass
        if end_date:
            try:
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                queryset = queryset.filter(timestamp__lte=end_date)
            except ValueError:
                pass
        
        return queryset.order_by('-timestamp')


class SecurityConfigurationListView(generics.ListCreateAPIView):
    """List and create security configurations."""
    
    queryset = SecurityConfiguration.objects.all()
    serializer_class = SecurityConfigurationSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
    
    def perform_create(self, serializer):
        """Create configuration with user tracking."""
        serializer.save(updated_by=self.request.user)


class SecurityConfigurationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete security configuration."""
    
    queryset = SecurityConfiguration.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SecurityConfigurationUpdateSerializer
        return SecurityConfigurationSerializer
    
    def perform_update(self, serializer):
        """Update configuration with user tracking."""
        serializer.save(updated_by=self.request.user)


class SecurityDashboardView(APIView):
    """Security dashboard with key metrics."""
    
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get security dashboard data."""
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Basic counts
        total_events = SecurityEvent.objects.count()
        critical_events = SecurityEvent.objects.filter(
            severity=SeverityLevel.CRITICAL,
            status='open'
        ).count()
        high_risk_events = SecurityEvent.objects.filter(
            risk_score__gte=70,
            status='open'
        ).count()
        
        # Failed logins today
        failed_logins_today = FailedLoginAttempt.objects.filter(
            timestamp__date=today
        ).count()
        
        # Active sessions
        active_sessions = UserSession.objects.filter(
            is_active=True,
            expires_at__gt=now
        ).count()
        
        # Locked accounts
        locked_accounts = User.objects.filter(
            is_locked=True
        ).count()
        
        # Recent events (last 10)
        recent_events = SecurityEvent.objects.select_related(
            'user', 'resolved_by'
        ).order_by('-timestamp')[:10]
        
        # Event trends (last 7 days)
        event_trends = {}
        for i in range(7):
            date = (now - timedelta(days=i)).date()
            count = SecurityEvent.objects.filter(
                timestamp__date=date
            ).count()
            event_trends[date.isoformat()] = count
        
        # Risk distribution
        risk_distribution = {
            'low': SecurityEvent.objects.filter(risk_score__lt=30).count(),
            'medium': SecurityEvent.objects.filter(
                risk_score__gte=30, risk_score__lt=70
            ).count(),
            'high': SecurityEvent.objects.filter(risk_score__gte=70).count(),
        }
        
        # Top risk IPs (last 30 days)
        top_risk_ips = list(
            SecurityEvent.objects.filter(
                timestamp__gte=month_ago,
                ip_address__isnull=False
            ).values('ip_address')
            .annotate(
                event_count=Count('id'),
                avg_risk=Avg('risk_score')
            )
            .order_by('-avg_risk', '-event_count')[:10]
        )
        
        dashboard_data = {
            'total_events': total_events,
            'critical_events': critical_events,
            'high_risk_events': high_risk_events,
            'failed_logins_today': failed_logins_today,
            'active_sessions': active_sessions,
            'locked_accounts': locked_accounts,
            'recent_events': SecurityEventSerializer(recent_events, many=True).data,
            'event_trends': event_trends,
            'risk_distribution': risk_distribution,
            'top_risk_ips': top_risk_ips,
        }
        
        serializer = SecurityDashboardSerializer(dashboard_data)
        return Response(serializer.data)


class SecurityReportView(APIView):
    """Generate security reports."""
    
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        """Generate a security report."""
        serializer = SecurityReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        start_date = data['start_date']
        end_date = data['end_date']
        include_resolved = data.get('include_resolved', True)
        severity_filter = data.get('severity_filter', [])
        event_type_filter = data.get('event_type_filter', [])
        
        # Build query
        queryset = SecurityEvent.objects.filter(
            timestamp__gte=start_date,
            timestamp__lte=end_date
        )
        
        if not include_resolved:
            queryset = queryset.exclude(status='resolved')
        
        if severity_filter:
            queryset = queryset.filter(severity__in=severity_filter)
        
        if event_type_filter:
            queryset = queryset.filter(event_type__in=event_type_filter)
        
        # Generate report data
        events = queryset.order_by('-timestamp')
        
        # Summary statistics
        summary = {
            'total_events': events.count(),
            'by_severity': dict(
                events.values('severity').annotate(count=Count('id')).values_list('severity', 'count')
            ),
            'by_type': dict(
                events.values('event_type').annotate(count=Count('id')).values_list('event_type', 'count')
            ),
            'by_status': dict(
                events.values('status').annotate(count=Count('id')).values_list('status', 'count')
            ),
            'avg_risk_score': events.aggregate(avg_risk=Avg('risk_score'))['avg_risk'] or 0,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        }
        
        # Serialize events
        events_data = SecurityEventSerializer(events, many=True).data
        
        report_data = {
            'summary': summary,
            'events': events_data,
            'generated_at': timezone.now().isoformat(),
            'generated_by': request.user.email
        }
        
        return Response(report_data)


class BulkSecurityEventActionView(APIView):
    """Perform bulk actions on security events."""
    
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        """Perform bulk action on security events."""
        serializer = BulkSecurityEventActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        event_ids = data['event_ids']
        action = data['action']
        notes = data.get('notes', '')
        
        events = SecurityEvent.objects.filter(id__in=event_ids)
        updated_count = 0
        
        if action == 'resolve':
            updated_count = events.update(
                status='resolved',
                resolved_at=timezone.now(),
                resolved_by=request.user,
                resolution_notes=notes
            )
        elif action == 'investigate':
            updated_count = events.update(status='investigating')
        elif action == 'false_positive':
            updated_count = events.update(
                status='false_positive',
                resolved_at=timezone.now(),
                resolved_by=request.user,
                resolution_notes=notes
            )
        elif action == 'delete':
            updated_count = events.count()
            events.delete()
        
        # Log the bulk action
        AuditLog.objects.create(
            action='bulk_security_event_action',
            resource_type='SecurityEvent',
            resource_id=f"bulk_{len(event_ids)}_events",
            user=request.user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            description=f"Performed bulk {action} on {updated_count} security events",
            metadata={
                'action': action,
                'event_count': updated_count,
                'notes': notes,
                'event_ids': [str(id) for id in event_ids]
            }
        )
        
        return Response({
            'message': f'Successfully performed {action} on {updated_count} events',
            'updated_count': updated_count
        })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def security_health_check(request):
    """Security service health check."""
    try:
        # Check database connectivity
        SecurityEvent.objects.count()
        
        # Check recent activity
        recent_events = SecurityEvent.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=1)
        ).count()
        
        return JsonResponse({
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'recent_events': recent_events,
            'service': 'security'
        })
    except Exception as e:
        logger.error(f"Security health check failed: {e}")
        return JsonResponse({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': timezone.now().isoformat(),
            'service': 'security'
        }, status=500)


@api_view(['POST'])
@permission_classes([IsServiceAccount])
def log_security_event(request):
    """Endpoint for other services to log security events."""
    serializer = SecurityEventCreateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsServiceAccount])
def log_audit_event(request):
    """Endpoint for other services to log audit events."""
    serializer = AuditLogCreateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)