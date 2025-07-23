from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Count, Q
from django.contrib.auth import get_user_model
from django.shortcuts import render
from django.http import HttpRequest
from datetime import timedelta, datetime
from .models import SecurityEvent, UserSession, FailedLoginAttempt, SecurityConfiguration, AuditLog, LoginHistory, SecurityLog
from .serializers import (
    SecurityEventSerializer, SecurityEventCreateSerializer,
    UserSessionSerializer, FailedLoginAttemptSerializer,
    SecurityConfigurationSerializer, AuditLogSerializer,
    SecurityDashboardSerializer, SecurityReportSerializer,
    BulkSecurityEventSerializer, SecurityAlertSerializer,
    LoginHistorySerializer, SecurityLogSerializer
)
from .utils import SecurityAnalyzer, ThreatDetector
from .permissions import IsSecurityAdmin, IsSecurityAnalyst

User = get_user_model()

class SecurityDashboardView(APIView):
    """Main security dashboard with overview statistics."""
    
    permission_classes = [permissions.IsAuthenticated, IsSecurityAnalyst]
    
    def get(self, request):
        """Get security dashboard data."""
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        
        # Get statistics
        total_events = SecurityEvent.objects.count()
        critical_events = SecurityEvent.objects.filter(
            severity='critical',
            resolved=False
        ).count()
        
        failed_logins_today = FailedLoginAttempt.objects.filter(
            timestamp__date=today
        ).count()
        
        active_sessions = UserSession.objects.filter(
            is_active=True
        ).count()
        
        # Recent events
        recent_events = SecurityEvent.objects.filter(
            timestamp__gte=week_ago
        ).order_by('-timestamp')[:10]
        
        # Top threats analysis
        threat_analyzer = ThreatDetector()
        top_threats = threat_analyzer.get_top_threats(days=7)
        
        # Security score calculation
        security_analyzer = SecurityAnalyzer()
        security_score = security_analyzer.calculate_security_score()
        
        data = {
            'total_events': total_events,
            'critical_events': critical_events,
            'failed_logins_today': failed_logins_today,
            'active_sessions': active_sessions,
            'recent_events': SecurityEventSerializer(recent_events, many=True).data,
            'top_threats': top_threats,
            'security_score': security_score
        }
        
        serializer = SecurityDashboardSerializer(data)
        return Response(serializer.data)


class SecurityEventListCreateView(generics.ListCreateAPIView):
    """List and create security events."""
    
    queryset = SecurityEvent.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsSecurityAnalyst]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SecurityEventCreateSerializer
        return SecurityEventSerializer
    
    def get_queryset(self):
        queryset = SecurityEvent.objects.all()
        
        # Filter by event type
        event_type = self.request.query_params.get('event_type')
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        # Filter by severity
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        
        # Filter by resolved status
        resolved = self.request.query_params.get('resolved')
        if resolved is not None:
            queryset = queryset.filter(resolved=resolved.lower() == 'true')
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        return queryset.order_by('-timestamp')


class SecurityEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a security event."""
    
    queryset = SecurityEvent.objects.all()
    serializer_class = SecurityEventSerializer
    permission_classes = [permissions.IsAuthenticated, IsSecurityAnalyst]
    
    def perform_update(self, serializer):
        """Update security event and log the action."""
        if 'resolved' in serializer.validated_data and serializer.validated_data['resolved']:
            serializer.save(
                resolved_by=self.request.user,
                resolved_at=timezone.now()
            )
        else:
            serializer.save()


class UserSessionListView(generics.ListAPIView):
    """List active user sessions."""
    
    queryset = UserSession.objects.filter(is_active=True)
    serializer_class = UserSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsSecurityAnalyst]
    
    def get_queryset(self):
        queryset = UserSession.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('-last_activity')


class TerminateSessionView(APIView):
    """Terminate a user session."""
    
    permission_classes = [permissions.IsAuthenticated, IsSecurityAdmin]
    
    def post(self, request, session_id):
        """Terminate a specific session."""
        try:
            session = UserSession.objects.get(id=session_id, is_active=True)
            session.is_active = False
            session.logout_reason = 'forced'
            session.save()
            
            # Log the action
            SecurityEvent.objects.create(
                user=session.user,
                event_type='logout',
                severity='medium',
                ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                description=f'Session terminated by admin: {request.user.email}'
            )
            
            return Response({'message': 'Session terminated successfully'})
        except UserSession.DoesNotExist:
            return Response(
                {'error': 'Session not found or already terminated'},
                status=status.HTTP_404_NOT_FOUND
            )


class FailedLoginAttemptListView(generics.ListAPIView):
    """List failed login attempts."""
    
    queryset = FailedLoginAttempt.objects.all()
    serializer_class = FailedLoginAttemptSerializer
    permission_classes = [permissions.IsAuthenticated, IsSecurityAnalyst]
    
    def get_queryset(self):
        queryset = FailedLoginAttempt.objects.all()
        
        # Filter by email
        email = self.request.query_params.get('email')
        if email:
            queryset = queryset.filter(email__icontains=email)
        
        # Filter by IP address
        ip_address = self.request.query_params.get('ip_address')
        if ip_address:
            queryset = queryset.filter(ip_address=ip_address)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        return queryset.order_by('-timestamp')


class SecurityConfigurationListView(generics.ListCreateAPIView):
    """List and create security configurations."""
    
    queryset = SecurityConfiguration.objects.filter(is_active=True)
    serializer_class = SecurityConfigurationSerializer
    permission_classes = [permissions.IsAuthenticated, IsSecurityAdmin]
    
    def perform_create(self, serializer):
        """Create security configuration and log the action."""
        serializer.save(updated_by=self.request.user)


class SecurityConfigurationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete security configuration."""
    
    queryset = SecurityConfiguration.objects.all()
    serializer_class = SecurityConfigurationSerializer
    permission_classes = [permissions.IsAuthenticated, IsSecurityAdmin]
    
    def perform_update(self, serializer):
        """Update security configuration and log the action."""
        serializer.save(updated_by=self.request.user)


class AuditLogListView(generics.ListAPIView):
    """List audit logs."""
    
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsSecurityAnalyst]
    
    def get_queryset(self):
        queryset = AuditLog.objects.all()
        
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
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        return queryset.order_by('-timestamp')


class SecurityReportView(APIView):
    """Generate security reports."""
    
    permission_classes = [permissions.IsAuthenticated, IsSecurityAnalyst]
    
    def get(self, request):
        """Generate and return security report."""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use ISO format.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate report data
        security_analyzer = SecurityAnalyzer()
        report_data = security_analyzer.generate_report(start_date, end_date)
        
        serializer = SecurityReportSerializer(report_data)
        return Response(serializer.data)


class BulkSecurityEventActionView(APIView):
    """Perform bulk actions on security events."""
    
    permission_classes = [permissions.IsAuthenticated, IsSecurityAdmin]
    
    def post(self, request):
        """Perform bulk action on security events."""
        serializer = BulkSecurityEventSerializer(data=request.data)
        if serializer.is_valid():
            event_ids = serializer.validated_data['event_ids']
            action = serializer.validated_data['action']
            reason = serializer.validated_data.get('reason', '')
            
            events = SecurityEvent.objects.filter(id__in=event_ids)
            
            if action == 'resolve':
                events.update(
                    resolved=True,
                    resolved_at=timezone.now(),
                    resolved_by=request.user
                )
            elif action == 'escalate':
                events.update(severity='critical')
            elif action == 'delete':
                events.delete()
            
            return Response({'message': f'Bulk {action} completed successfully'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SecurityAlertView(APIView):
    """Handle security alerts."""
    
    permission_classes = [permissions.IsAuthenticated, IsSecurityAnalyst]
    
    def get(self, request):
        """Get active security alerts."""
        threat_detector = ThreatDetector()
        alerts = threat_detector.get_active_alerts()
        
        serializer = SecurityAlertSerializer(alerts, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Create a new security alert."""
        serializer = SecurityAlertSerializer(data=request.data)
        if serializer.is_valid():
            # Process the alert
            threat_detector = ThreatDetector()
            threat_detector.process_alert(serializer.validated_data)
            
            return Response({'message': 'Alert processed successfully'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsSecurityAnalyst])
def security_metrics(request):
    """Get security metrics and statistics."""
    now = timezone.now()
    
    # Event statistics by type
    event_stats = SecurityEvent.objects.values('event_type').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Failed login trends (last 30 days)
    thirty_days_ago = now - timedelta(days=30)
    failed_login_trends = []
    for i in range(30):
        date = (thirty_days_ago + timedelta(days=i)).date()
        count = FailedLoginAttempt.objects.filter(
            timestamp__date=date
        ).count()
        failed_login_trends.append({
            'date': date.isoformat(),
            'count': count
        })
    
    # Top IP addresses with failed logins
    top_failed_ips = FailedLoginAttempt.objects.filter(
        timestamp__gte=thirty_days_ago
    ).values('ip_address').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    # Security score trend
    security_analyzer = SecurityAnalyzer()
    security_score_trend = security_analyzer.get_security_score_trend(days=30)
    
    return Response({
        'event_statistics': list(event_stats),
        'failed_login_trends': failed_login_trends,
        'top_failed_ips': list(top_failed_ips),
        'security_score_trend': security_score_trend
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsSecurityAdmin])
def reset_security_settings(request):
    """Reset security settings to default values."""
    # This is a dangerous operation, so we require explicit confirmation
    confirmation = request.data.get('confirmation')
    if confirmation != 'RESET_SECURITY_SETTINGS':
        return Response(
            {'error': 'Invalid confirmation. Please provide "RESET_SECURITY_SETTINGS"'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Reset security configurations
    SecurityConfiguration.objects.all().update(is_active=False)
    
    # Create default configurations
    default_configs = [
        {'key': 'max_login_attempts', 'value': '5', 'description': 'Maximum failed login attempts before lockout'},
        {'key': 'lockout_duration', 'value': '300', 'description': 'Account lockout duration in seconds'},
        {'key': 'session_timeout', 'value': '3600', 'description': 'Session timeout in seconds'},
        {'key': 'password_min_length', 'value': '8', 'description': 'Minimum password length'},
        {'key': 'require_2fa', 'value': 'false', 'description': 'Require two-factor authentication'},
    ]
    
    for config in default_configs:
        SecurityConfiguration.objects.create(
            key=config['key'],
            value=config['value'],
            description=config['description'],
            updated_by=request.user
        )
    
    # Log the action
    SecurityEvent.objects.create(
        user=request.user,
        event_type='config_change',
        severity='high',
        ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1'),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        description='Security settings reset to default values'
    )
    
    return Response({'message': 'Security settings reset successfully'})


def get_client_ip(request: HttpRequest) -> str:
    """
    Get the client's IP address from the request.
    Handles cases where the request might be behind a proxy.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip or '0.0.0.0'


# Example view to see login history for the logged-in user
class MyLoginHistoryView(generics.ListAPIView):
    queryset = LoginHistory.objects.all()
    serializer_class = LoginHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LoginHistory.objects.filter(user=self.request.user)
