from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.http import JsonResponse, HttpResponse
from django.views import View
from django.utils import timezone
from django.db.models import Count, Avg, Q
from django.db import connection
from django.core.cache import cache
from django.conf import settings
from datetime import datetime, timedelta
import json
import time
import psutil
import os
from Edulink.utils.error_handlers import APIErrorHandler, APIResponseMixin

from .models import SystemHealthCheck, APIMetrics, SystemAlert, MonitoringConfiguration
from .serializers import (
    SystemHealthCheckSerializer, APIMetricsSerializer, 
    SystemAlertSerializer, MonitoringConfigurationSerializer
)
from .metrics import MetricsCollector
from .performance_monitoring import PerformanceMonitor
from .error_tracking import ErrorTracker


class HealthCheckView(View):
    """Simple health check endpoint for load balancers"""
    
    def get(self, request):
        """Basic health check"""
        try:
            # Quick database check
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            
            # Quick cache check
            cache.set('health_check', 'ok', 10)
            cache.get('health_check')
            
            return HttpResponse('OK', status=200, content_type='text/plain')
        except Exception as e:
            return HttpResponse(f'ERROR: {str(e)}', status=503, content_type='text/plain')


class DetailedHealthCheckView(APIView, APIResponseMixin):
    """Detailed health check with comprehensive system status"""
    
    def get(self, request):
        """Comprehensive health check"""
        start_time = time.time()
        health_data = {
            'timestamp': timezone.now().isoformat(),
            'overall_status': 'healthy',
            'checks': {},
            'system_metrics': {},
            'response_time_ms': 0
        }
        
        try:
            # Database health check
            db_start = time.time()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT COUNT(*) FROM django_migrations")
                    result = cursor.fetchone()
                health_data['checks']['database'] = {
                    'status': 'healthy',
                    'response_time_ms': round((time.time() - db_start) * 1000, 2),
                    'details': {'migrations_count': result[0] if result else 0}
                }
            except Exception as e:
                health_data['checks']['database'] = {
                    'status': 'critical',
                    'error': str(e),
                    'response_time_ms': round((time.time() - db_start) * 1000, 2)
                }
                health_data['overall_status'] = 'critical'
            
            # Cache health check
            cache_start = time.time()
            try:
                test_key = f'health_check_{int(time.time())}'
                cache.set(test_key, 'test_value', 10)
                cached_value = cache.get(test_key)
                cache.delete(test_key)
                
                if cached_value == 'test_value':
                    health_data['checks']['cache'] = {
                        'status': 'healthy',
                        'response_time_ms': round((time.time() - cache_start) * 1000, 2)
                    }
                else:
                    health_data['checks']['cache'] = {
                        'status': 'warning',
                        'message': 'Cache not working properly',
                        'response_time_ms': round((time.time() - cache_start) * 1000, 2)
                    }
                    if health_data['overall_status'] == 'healthy':
                        health_data['overall_status'] = 'warning'
            except Exception as e:
                health_data['checks']['cache'] = {
                    'status': 'critical',
                    'error': str(e),
                    'response_time_ms': round((time.time() - cache_start) * 1000, 2)
                }
                health_data['overall_status'] = 'critical'
            
            # System metrics
            try:
                if psutil:
                    cpu_percent = psutil.cpu_percent(interval=0.1)
                    memory = psutil.virtual_memory()
                    disk = psutil.disk_usage('/')
                    
                    health_data['system_metrics'] = {
                        'cpu_usage_percent': round(cpu_percent, 2),
                        'memory_usage_percent': round(memory.percent, 2),
                        'disk_usage_percent': round(disk.percent, 2),
                        'available_memory_mb': round(memory.available / 1024 / 1024, 2)
                    }
                    
                    # Check thresholds
                    config = MonitoringConfiguration.get_current()
                    if cpu_percent > config.cpu_critical_threshold:
                        health_data['overall_status'] = 'critical'
                    elif cpu_percent > config.cpu_warning_threshold and health_data['overall_status'] == 'healthy':
                        health_data['overall_status'] = 'warning'
                    
                    if memory.percent > config.memory_critical_threshold:
                        health_data['overall_status'] = 'critical'
                    elif memory.percent > config.memory_warning_threshold and health_data['overall_status'] == 'healthy':
                        health_data['overall_status'] = 'warning'
                        
                    if disk.percent > config.disk_critical_threshold:
                        health_data['overall_status'] = 'critical'
                    elif disk.percent > config.disk_warning_threshold and health_data['overall_status'] == 'healthy':
                        health_data['overall_status'] = 'warning'
                        
            except Exception as e:
                health_data['system_metrics'] = {'error': str(e)}
            
            # Storage check
            try:
                if hasattr(settings, 'MEDIA_ROOT') and os.path.exists(settings.MEDIA_ROOT):
                    health_data['checks']['storage'] = {
                        'status': 'healthy',
                        'media_root_accessible': True
                    }
                else:
                    health_data['checks']['storage'] = {
                        'status': 'warning',
                        'media_root_accessible': False
                    }
                    if health_data['overall_status'] == 'healthy':
                        health_data['overall_status'] = 'warning'
            except Exception as e:
                health_data['checks']['storage'] = {
                    'status': 'critical',
                    'error': str(e)
                }
                health_data['overall_status'] = 'critical'
            
            # Calculate total response time
            health_data['response_time_ms'] = round((time.time() - start_time) * 1000, 2)
            
            # Store health check result
            try:
                SystemHealthCheck.objects.create(
                    overall_status=health_data['overall_status'],
                    database_status=health_data['checks'].get('database', {}).get('status', 'unknown'),
                    cache_status=health_data['checks'].get('cache', {}).get('status', 'unknown'),
                    storage_status=health_data['checks'].get('storage', {}).get('status', 'unknown'),
                    cpu_usage=health_data['system_metrics'].get('cpu_usage_percent'),
                    memory_usage=health_data['system_metrics'].get('memory_usage_percent'),
                    disk_usage=health_data['system_metrics'].get('disk_usage_percent'),
                    database_response_time=health_data['checks'].get('database', {}).get('response_time_ms'),
                    cache_response_time=health_data['checks'].get('cache', {}).get('response_time_ms'),
                    details=health_data
                )
            except Exception:
                pass  # Don't fail health check if we can't store the result
            
            # Return appropriate status code
            if health_data['overall_status'] == 'critical':
                return self.success_response(
                    data=health_data,
                    message='Health check completed - critical issues detected',
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            elif health_data['overall_status'] == 'warning':
                return self.success_response(
                    data=health_data,
                    message='Health check completed - warnings detected'
                )
            else:
                return self.success_response(
                    data=health_data,
                    message='Health check completed - all systems healthy'
                )
                
        except Exception as e:
            return APIErrorHandler.handle_server_error(
                f'Health check failed: {str(e)}',
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class SystemMetricsView(APIView, APIResponseMixin):
    """View for retrieving system metrics and performance data"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get system metrics for the specified time range"""
        # Get query parameters
        hours = int(request.GET.get('hours', 24))
        metric_type = request.GET.get('type', 'all')
        
        end_time = timezone.now()
        start_time = end_time - timedelta(hours=hours)
        
        response_data = {
            'time_range': {
                'start': start_time.isoformat(),
                'end': end_time.isoformat(),
                'hours': hours
            },
            'metrics': {}
        }
        
        if metric_type in ['all', 'health']:
            # Health check metrics
            health_checks = SystemHealthCheck.objects.filter(
                timestamp__gte=start_time
            ).order_by('-timestamp')[:100]
            
            response_data['metrics']['health_checks'] = {
                'total_checks': health_checks.count(),
                'latest': SystemHealthCheckSerializer(health_checks.first()).data if health_checks else None,
                'status_distribution': dict(
                    health_checks.values('overall_status').annotate(count=Count('id'))
                    .values_list('overall_status', 'count')
                ),
                'average_response_time': health_checks.aggregate(
                    avg_db_time=Avg('database_response_time'),
                    avg_cache_time=Avg('cache_response_time')
                )
            }
        
        if metric_type in ['all', 'api']:
            # API metrics
            api_metrics = APIMetrics.objects.filter(
                timestamp__gte=start_time
            )
            
            response_data['metrics']['api_performance'] = {
                'total_requests': api_metrics.count(),
                'average_response_time': api_metrics.aggregate(avg=Avg('response_time'))['avg'],
                'error_rate': api_metrics.filter(status_code__gte=400).count() / max(api_metrics.count(), 1) * 100,
                'slow_requests': api_metrics.filter(response_time__gt=1000).count(),
                'top_endpoints': list(
                    api_metrics.values('endpoint', 'method')
                    .annotate(
                        count=Count('id'),
                        avg_response_time=Avg('response_time')
                    )
                    .order_by('-count')[:10]
                ),
                'status_codes': dict(
                    api_metrics.values('status_code')
                    .annotate(count=Count('id'))
                    .values_list('status_code', 'count')
                )
            }
        
        if metric_type in ['all', 'alerts']:
            # Alert metrics
            alerts = SystemAlert.objects.filter(
                timestamp__gte=start_time
            )
            
            response_data['metrics']['alerts'] = {
                'total_alerts': alerts.count(),
                'active_alerts': alerts.filter(status='active').count(),
                'critical_alerts': alerts.filter(severity='critical').count(),
                'alert_types': dict(
                    alerts.values('alert_type')
                    .annotate(count=Count('id'))
                    .values_list('alert_type', 'count')
                ),
                'recent_alerts': SystemAlertSerializer(
                    alerts.order_by('-timestamp')[:10], many=True
                ).data
            }
        
        try:
            return self.success_response(
                data=response_data,
                message='System metrics retrieved successfully'
            )
        except Exception as e:
            return APIErrorHandler.handle_server_error('Failed to retrieve system metrics')


class AlertsView(generics.ListCreateAPIView):
    """View for managing system alerts"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SystemAlertSerializer
    
    def get_queryset(self):
        queryset = SystemAlert.objects.all()
        
        # Filter by status
        status_filter = self.request.GET.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by severity
        severity_filter = self.request.GET.get('severity')
        if severity_filter:
            queryset = queryset.filter(severity=severity_filter)
        
        # Filter by type
        type_filter = self.request.GET.get('type')
        if type_filter:
            queryset = queryset.filter(alert_type=type_filter)
        
        return queryset.order_by('-timestamp')


class AlertDetailView(generics.RetrieveUpdateAPIView):
    """View for managing individual alerts"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SystemAlertSerializer
    queryset = SystemAlert.objects.all()
    
    def patch(self, request, *args, **kwargs):
        """Handle alert acknowledgment and resolution"""
        alert = self.get_object()
        action = request.data.get('action')
        
        if action == 'acknowledge':
            alert.acknowledge(request.user)
            return Response({'message': 'Alert acknowledged'})
        elif action == 'resolve':
            notes = request.data.get('notes', '')
            alert.resolve(request.user, notes)
            return Response({'message': 'Alert resolved'})
        
        return super().patch(request, *args, **kwargs)


class MonitoringConfigurationView(generics.RetrieveUpdateAPIView):
    """View for managing monitoring configuration"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = MonitoringConfigurationSerializer
    
    def get_object(self):
        return MonitoringConfiguration.get_current()


class MonitoringDashboardView(APIView):
    """Main monitoring dashboard view"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get comprehensive monitoring dashboard data"""
        # Get recent health status
        latest_health = SystemHealthCheck.objects.first()
        
        # Get active alerts
        active_alerts = SystemAlert.objects.filter(status='active').order_by('-timestamp')[:10]
        
        # Get recent API metrics
        recent_api_metrics = APIMetrics.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=1)
        )
        
        # Calculate key metrics
        dashboard_data = {
            'system_status': {
                'overall_health': latest_health.overall_status if latest_health else 'unknown',
                'last_check': latest_health.timestamp.isoformat() if latest_health else None,
                'cpu_usage': latest_health.cpu_usage if latest_health else None,
                'memory_usage': latest_health.memory_usage if latest_health else None,
                'disk_usage': latest_health.disk_usage if latest_health else None,
            },
            'alerts': {
                'active_count': active_alerts.count(),
                'critical_count': active_alerts.filter(severity='critical').count(),
                'recent_alerts': SystemAlertSerializer(active_alerts, many=True).data
            },
            'api_performance': {
                'total_requests_last_hour': recent_api_metrics.count(),
                'average_response_time': recent_api_metrics.aggregate(avg=Avg('response_time'))['avg'] or 0,
                'error_rate': (
                    recent_api_metrics.filter(status_code__gte=400).count() / 
                    max(recent_api_metrics.count(), 1) * 100
                ),
                'slow_requests': recent_api_metrics.filter(response_time__gt=1000).count()
            },
            'configuration': MonitoringConfigurationSerializer(
                MonitoringConfiguration.get_current()
            ).data
        }
        
        return Response(dashboard_data)