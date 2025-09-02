import time
import logging
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from .metrics import metrics_collector

class MetricsMiddleware(MiddlewareMixin):
    """Middleware to collect request metrics for Django services."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.service_name = getattr(settings, 'SERVICE_NAME', 'unknown-service')
        self.logger = logging.getLogger('metrics')
        super().__init__(get_response)
    
    def process_request(self, request):
        """Mark the start time of the request."""
        request._metrics_start_time = time.time()
        
        # Record active connection
        metrics_collector.record_metric(
            f'{self.service_name}.active_connections',
            1,
            {'method': request.method, 'path': request.path}
        )
    
    def process_response(self, request, response):
        """Record request metrics after response is generated."""
        if hasattr(request, '_metrics_start_time'):
            response_time = time.time() - request._metrics_start_time
            
            # Record the request with metrics collector
            metrics_collector.record_request(
                self.service_name,
                response_time,
                response.status_code
            )
            
            # Record additional detailed metrics
            metrics_collector.record_metric(
                f'{self.service_name}.request_duration',
                response_time,
                {
                    'method': request.method,
                    'path': request.path,
                    'status_code': str(response.status_code)
                }
            )
            
            # Record response size if available
            if hasattr(response, 'content'):
                content_length = len(response.content) if response.content else 0
                metrics_collector.record_metric(
                    f'{self.service_name}.response_size_bytes',
                    content_length,
                    {
                        'method': request.method,
                        'path': request.path
                    }
                )
            
            # Log slow requests
            if response_time > 2.0:  # Log requests slower than 2 seconds
                self.logger.warning(
                    f"Slow request detected: {request.method} {request.path} "
                    f"took {response_time:.2f}s (status: {response.status_code})"
                )
        
        return response
    
    def process_exception(self, request, exception):
        """Record exception metrics."""
        if hasattr(request, '_metrics_start_time'):
            response_time = time.time() - request._metrics_start_time
            
            # Record as error (status code 500)
            metrics_collector.record_request(
                self.service_name,
                response_time,
                500
            )
            
            # Record exception details
            metrics_collector.record_metric(
                f'{self.service_name}.exceptions',
                1,
                {
                    'exception_type': exception.__class__.__name__,
                    'method': request.method,
                    'path': request.path
                }
            )
            
            self.logger.error(
                f"Exception in request: {request.method} {request.path} "
                f"- {exception.__class__.__name__}: {str(exception)}"
            )
        
        return None  # Let Django handle the exception normally

class HealthCheckMetricsMiddleware(MiddlewareMixin):
    """Middleware specifically for health check endpoints."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.service_name = getattr(settings, 'SERVICE_NAME', 'unknown-service')
        self.health_endpoints = ['/health/', '/ready/', '/health', '/ready']
        super().__init__(get_response)
    
    def process_response(self, request, response):
        """Update health status based on health check responses."""
        if request.path in self.health_endpoints:
            # Determine health status based on response
            if response.status_code == 200:
                status = 'healthy'
            elif response.status_code in [503, 500]:
                status = 'unhealthy'
            else:
                status = 'degraded'
            
            # Update health status in metrics
            metrics_collector.update_health_status(self.service_name, status)
        
        return response