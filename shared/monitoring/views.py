import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .metrics import metrics_collector, AlertManager, setup_default_alerts

# Initialize alert manager
alert_manager = AlertManager(metrics_collector)
setup_default_alerts(alert_manager)

@require_http_methods(["GET"])
def metrics_endpoint(request):
    """Endpoint to expose service metrics in JSON format."""
    service_name = getattr(settings, 'SERVICE_NAME', 'unknown-service')
    
    # Get query parameters
    format_type = request.GET.get('format', 'json')
    since = request.GET.get('since')
    
    try:
        since_timestamp = float(since) if since else None
    except (ValueError, TypeError):
        since_timestamp = None
    
    if format_type == 'prometheus':
        # Return Prometheus format
        prometheus_data = metrics_collector.export_prometheus_format()
        return HttpResponse(prometheus_data, content_type='text/plain')
    
    # Default JSON format
    data = {
        'service': service_name,
        'timestamp': metrics_collector.metrics.get('timestamp', [])[-1].timestamp if metrics_collector.metrics.get('timestamp') else None,
        'summary': metrics_collector.get_service_summary(service_name),
        'all_services': metrics_collector.get_all_services_summary()
    }
    
    # Add specific metrics if requested
    metric_name = request.GET.get('metric')
    if metric_name:
        metric_points = metrics_collector.get_metrics(metric_name, since_timestamp)
        data['metric_data'] = [
            {
                'timestamp': point.timestamp,
                'value': point.value,
                'labels': point.labels
            }
            for point in metric_points
        ]
    
    return JsonResponse(data)

@require_http_methods(["GET"])
def alerts_endpoint(request):
    """Endpoint to check and return current alerts."""
    service_name = getattr(settings, 'SERVICE_NAME', 'unknown-service')
    
    # Check for triggered alerts
    triggered_alerts = alert_manager.check_alerts()
    
    data = {
        'service': service_name,
        'alert_count': len(triggered_alerts),
        'alerts': triggered_alerts,
        'alert_rules_count': len(alert_manager.alert_rules)
    }
    
    return JsonResponse(data)

@require_http_methods(["GET"])
def service_status_endpoint(request):
    """Endpoint to get comprehensive service status."""
    service_name = getattr(settings, 'SERVICE_NAME', 'unknown-service')
    
    # Get service summary
    summary = metrics_collector.get_service_summary(service_name)
    
    # Check alerts
    alerts = alert_manager.check_alerts()
    
    # Determine overall status
    if not summary:
        overall_status = 'unknown'
    elif summary.get('health_status') == 'healthy' and len(alerts) == 0:
        overall_status = 'healthy'
    elif summary.get('health_status') == 'healthy' and any(a['severity'] == 'warning' for a in alerts):
        overall_status = 'degraded'
    else:
        overall_status = 'unhealthy'
    
    data = {
        'service': service_name,
        'status': overall_status,
        'metrics': summary,
        'alerts': {
            'count': len(alerts),
            'critical': len([a for a in alerts if a['severity'] == 'critical']),
            'warning': len([a for a in alerts if a['severity'] == 'warning']),
            'details': alerts
        },
        'uptime_info': {
            'total_requests': summary.get('request_count', 0),
            'error_rate': summary.get('error_rate', 0),
            'avg_response_time': summary.get('average_response_time', 0)
        }
    }
    
    return JsonResponse(data)

@csrf_exempt
@require_http_methods(["POST"])
def reset_metrics_endpoint(request):
    """Endpoint to reset service metrics (admin only)."""
    service_name = getattr(settings, 'SERVICE_NAME', 'unknown-service')
    
    try:
        # Parse request body for specific service or reset all
        body = json.loads(request.body) if request.body else {}
        target_service = body.get('service', service_name)
        
        # Reset metrics
        metrics_collector.reset_metrics(target_service)
        
        return JsonResponse({
            'success': True,
            'message': f'Metrics reset for service: {target_service}'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON in request body'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@require_http_methods(["GET"])
def metrics_dashboard_data(request):
    """Endpoint to provide data for monitoring dashboard."""
    service_name = getattr(settings, 'SERVICE_NAME', 'unknown-service')
    
    # Get time range from query params
    time_range = request.GET.get('range', '1h')  # 1h, 6h, 24h, 7d
    
    # Convert time range to seconds
    range_mapping = {
        '1h': 3600,
        '6h': 21600,
        '24h': 86400,
        '7d': 604800
    }
    
    since_seconds = range_mapping.get(time_range, 3600)
    since_timestamp = metrics_collector.metrics.get('timestamp', [])[-1].timestamp - since_seconds if metrics_collector.metrics.get('timestamp') else None
    
    # Collect dashboard data
    dashboard_data = {
        'service': service_name,
        'time_range': time_range,
        'summary': metrics_collector.get_service_summary(service_name),
        'charts': {
            'request_rate': [],
            'response_time': [],
            'error_rate': [],
            'health_status': []
        }
    }
    
    # Get chart data for different metrics
    chart_metrics = [
        f'{service_name}.request_count',
        f'{service_name}.response_time', 
        f'{service_name}.error_rate',
        f'{service_name}.health'
    ]
    
    for metric_name in chart_metrics:
        points = metrics_collector.get_metrics(metric_name, since_timestamp)
        chart_key = metric_name.split('.')[-1]
        
        if chart_key in dashboard_data['charts']:
            dashboard_data['charts'][chart_key] = [
                {
                    'timestamp': point.timestamp,
                    'value': point.value
                }
                for point in points[-100:]  # Last 100 points
            ]
    
    return JsonResponse(dashboard_data)