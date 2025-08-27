import time
import logging
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from .config import SecurityLogger, PerformanceLogger

class RequestLoggingMiddleware(MiddlewareMixin):
    """Middleware for logging HTTP requests and performance metrics."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger('django.request')
        service_name = getattr(settings, 'SERVICE_NAME', 'unknown')
        self.security_logger = SecurityLogger(service_name)
        self.performance_logger = PerformanceLogger(service_name)
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process incoming request."""
        request._start_time = time.time()
        
        # Log request details
        self.logger.info(
            f"Request started: {request.method} {request.path}",
            extra={
                'method': request.method,
                'path': request.path,
                'ip_address': self.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'user': str(request.user) if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
            }
        )
    
    def process_response(self, request, response):
        """Process outgoing response."""
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
            
            # Log response details
            self.logger.info(
                f"Request completed: {request.method} {request.path} - {response.status_code}",
                extra={
                    'method': request.method,
                    'path': request.path,
                    'status_code': response.status_code,
                    'duration_ms': duration * 1000,
                    'ip_address': self.get_client_ip(request),
                    'user': str(request.user) if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
                }
            )
            
            # Log performance metrics
            self.performance_logger.log_request_duration(
                endpoint=request.path,
                method=request.method,
                duration=duration,
                status_code=response.status_code
            )
            
            # Log slow requests
            if duration > 2.0:  # Log requests taking more than 2 seconds
                self.logger.warning(
                    f"Slow request detected: {request.method} {request.path} took {duration:.2f}s",
                    extra={
                        'event_type': 'slow_request',
                        'method': request.method,
                        'path': request.path,
                        'duration_ms': duration * 1000,
                        'threshold_ms': 2000
                    }
                )
        
        return response
    
    def process_exception(self, request, exception):
        """Process exceptions."""
        self.logger.error(
            f"Request exception: {request.method} {request.path} - {str(exception)}",
            extra={
                'method': request.method,
                'path': request.path,
                'exception_type': type(exception).__name__,
                'exception_message': str(exception),
                'ip_address': self.get_client_ip(request),
                'user': str(request.user) if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
            },
            exc_info=True
        )
    
    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class SecurityLoggingMiddleware(MiddlewareMixin):
    """Middleware for security event logging."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        service_name = getattr(settings, 'SERVICE_NAME', 'unknown')
        self.security_logger = SecurityLogger(service_name)
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process security-related request events."""
        # Log authentication attempts
        if request.path.endswith('/login/') or request.path.endswith('/token/'):
            if request.method == 'POST':
                username = self.extract_username(request)
                self.security_logger.log_login_attempt(
                    username=username or 'unknown',
                    ip_address=self.get_client_ip(request),
                    success=False,  # Will be updated in process_response
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
        
        # Log logout attempts
        if request.path.endswith('/logout/'):
            if hasattr(request, 'user') and request.user.is_authenticated:
                self.security_logger.log_logout(
                    username=str(request.user),
                    ip_address=self.get_client_ip(request)
                )
    
    def process_response(self, request, response):
        """Process security-related response events."""
        # Update login attempt status
        if (request.path.endswith('/login/') or request.path.endswith('/token/')) and request.method == 'POST':
            username = self.extract_username(request)
            success = response.status_code in [200, 201]
            self.security_logger.log_login_attempt(
                username=username or 'unknown',
                ip_address=self.get_client_ip(request),
                success=success,
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
        
        # Log permission denied events
        if response.status_code == 403:
            self.security_logger.log_permission_denied(
                username=str(request.user) if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous',
                resource=request.path,
                action=request.method,
                ip_address=self.get_client_ip(request)
            )
        
        return response
    
    def extract_username(self, request):
        """Extract username from request data."""
        try:
            if hasattr(request, 'data') and 'username' in request.data:
                return request.data['username']
            elif hasattr(request, 'POST') and 'username' in request.POST:
                return request.POST['username']
            elif hasattr(request, 'user') and request.user.is_authenticated:
                return str(request.user)
        except Exception:
            pass
        return None
    
    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip