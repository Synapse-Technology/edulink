from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.urls import resolve
import time
import logging

logger = logging.getLogger(__name__)

class MetricsMiddleware(MiddlewareMixin):
    """
    Middleware to collect metrics for requests.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        request.start_time = time.time()
        return None
    
    def process_response(self, request, response):
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            logger.info(
                f"Request to {request.path} took {duration:.3f}s "
                f"- Status: {response.status_code}"
            )
        return response

class HealthCheckMetricsMiddleware(MiddlewareMixin):
    """
    Middleware to handle health check metrics and monitoring.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        # Skip processing for health check endpoints
        if request.path.startswith('/health'):
            return None
        return None
    
    def process_response(self, request, response):
        # Log health check related metrics
        if request.path.startswith('/health'):
            logger.debug(f"Health check endpoint {request.path} - Status: {response.status_code}")
        return response