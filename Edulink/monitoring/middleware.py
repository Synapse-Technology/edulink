import time
import logging
import json
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ObjectDoesNotExist
from monitoring.models import APIMetrics, MonitoringConfiguration

logger = logging.getLogger(__name__)

class APIMonitoringMiddleware(MiddlewareMixin):
    """
    Middleware to monitor API performance and log metrics
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """Start timing the request"""
        request._monitoring_start_time = time.time()
        return None
    
    def process_response(self, request, response):
        """Log API metrics after response"""
        try:
            # Check if monitoring is enabled
            config = MonitoringConfiguration.objects.first()
            if not config or not config.api_monitoring_enabled:
                return response
            
            # Skip monitoring for static files and admin media
            if self._should_skip_monitoring(request):
                return response
            
            # Calculate response time
            start_time = getattr(request, '_monitoring_start_time', None)
            if start_time:
                response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            else:
                response_time = 0
            
            # Get user information
            user = getattr(request, 'user', None)
            user_id = user.id if user and not isinstance(user, AnonymousUser) else None
            username = user.username if user and not isinstance(user, AnonymousUser) else 'anonymous'
            
            # Create API metrics record
            APIMetrics.objects.create(
                endpoint=request.path,
                method=request.method,
                status_code=response.status_code,
                response_time=response_time,
                user_id=user_id,
                username=username,
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                ip_address=self._get_client_ip(request),
                timestamp=timezone.now()
            )
            
            # Log slow queries if enabled
            if config.slow_query_monitoring_enabled and response_time > config.slow_query_threshold:
                logger.warning(
                    f'Slow API request detected: {request.method} {request.path} '
                    f'took {response_time:.2f}ms (user: {username})'
                )
            
        except Exception as e:
            # Don't let monitoring errors affect the actual response
            logger.error(f'Error in API monitoring middleware: {str(e)}')
        
        return response
    
    def _should_skip_monitoring(self, request):
        """Determine if this request should be skipped from monitoring"""
        skip_paths = [
            '/static/',
            '/media/',
            '/admin/jsi18n/',
            '/favicon.ico',
        ]
        
        # Skip monitoring API endpoints to avoid recursion
        monitoring_paths = [
            '/monitoring/metrics/',
            '/monitoring/dashboard/',
            '/admin/system_status_api/',
        ]
        
        path = request.path
        
        # Skip static files and admin assets
        for skip_path in skip_paths:
            if path.startswith(skip_path):
                return True
        
        # Skip monitoring endpoints to avoid recursion
        for monitoring_path in monitoring_paths:
            if path.startswith(monitoring_path):
                return True
        
        return False
    
    def _get_client_ip(self, request):
        """Get the client's IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip[:45]  # Limit to IPv6 length


class AuditLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log admin actions and monitoring activities
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """Log admin actions"""
        try:
            # Only log admin actions
            if not request.path.startswith('/admin/'):
                return None
            
            # Skip GET requests for admin (too verbose)
            if request.method == 'GET':
                return None
            
            user = getattr(request, 'user', None)
            if not user or isinstance(user, AnonymousUser):
                return None
            
            # Log the admin action
            action_data = {
                'user': user.username,
                'user_id': user.id,
                'method': request.method,
                'path': request.path,
                'ip_address': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500],
                'timestamp': timezone.now().isoformat(),
            }
            
            # Add POST data for certain actions (excluding sensitive data)
            if request.method == 'POST' and request.POST:
                filtered_post = self._filter_sensitive_data(dict(request.POST))
                if filtered_post:
                    action_data['post_data'] = filtered_post
            
            logger.info(f'Admin action: {json.dumps(action_data)}')
            
        except Exception as e:
            logger.error(f'Error in audit logging middleware: {str(e)}')
        
        return None
    
    def _filter_sensitive_data(self, post_data):
        """Filter out sensitive data from POST data"""
        sensitive_fields = [
            'password', 'password1', 'password2', 'old_password',
            'csrfmiddlewaretoken', 'api_key', 'secret', 'token'
        ]
        
        filtered_data = {}
        for key, value in post_data.items():
            if any(sensitive_field in key.lower() for sensitive_field in sensitive_fields):
                filtered_data[key] = '[FILTERED]'
            else:
                # Limit value length to prevent log bloat
                if isinstance(value, list) and len(value) > 0:
                    filtered_data[key] = str(value[0])[:200]
                else:
                    filtered_data[key] = str(value)[:200]
        
        return filtered_data
    
    def _get_client_ip(self, request):
        """Get the client's IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip[:45]  # Limit to IPv6 length


class SecurityMonitoringMiddleware(MiddlewareMixin):
    """
    Middleware to monitor security-related events
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_response(self, request, response):
        """Monitor for security events"""
        try:
            # Monitor failed login attempts
            if (request.path.startswith('/admin/login/') and 
                request.method == 'POST' and 
                response.status_code in [200, 302]):
                
                # Check if login was successful (redirect) or failed (form with errors)
                if response.status_code == 200:
                    # Login failed - log security event
                    self._log_security_event(
                        'failed_login_attempt',
                        f'Failed admin login attempt from {self._get_client_ip(request)}',
                        request
                    )
            
            # Monitor suspicious activity (multiple 403s, 404s)
            if response.status_code in [403, 404]:
                self._check_suspicious_activity(request, response.status_code)
            
        except Exception as e:
            logger.error(f'Error in security monitoring middleware: {str(e)}')
        
        return response
    
    def _log_security_event(self, event_type, message, request):
        """Log security events"""
        security_data = {
            'event_type': event_type,
            'message': message,
            'ip_address': self._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500],
            'path': request.path,
            'method': request.method,
            'timestamp': timezone.now().isoformat(),
        }
        
        user = getattr(request, 'user', None)
        if user and not isinstance(user, AnonymousUser):
            security_data['user'] = user.username
            security_data['user_id'] = user.id
        
        logger.warning(f'Security event: {json.dumps(security_data)}')
    
    def _check_suspicious_activity(self, request, status_code):
        """Check for patterns of suspicious activity"""
        # This is a simplified implementation
        # In production, you might want to use Redis or a more sophisticated system
        # to track request patterns and implement rate limiting
        
        ip_address = self._get_client_ip(request)
        
        # Log multiple 403/404 errors from same IP
        if status_code in [403, 404]:
            self._log_security_event(
                f'http_{status_code}_error',
                f'HTTP {status_code} error from {ip_address} accessing {request.path}',
                request
            )
    
    def _get_client_ip(self, request):
        """Get the client's IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip[:45]  # Limit to IPv6 length