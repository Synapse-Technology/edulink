import uuid
import time
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from .helpers import get_client_ip

logger = logging.getLogger(__name__)


class RequestIDMiddleware(MiddlewareMixin):
    """
    Middleware to add unique request ID to each request.
    """
    
    def process_request(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID') or str(uuid.uuid4())
        request.META['HTTP_X_REQUEST_ID'] = request_id
        request.request_id = request_id
        return None
    
    def process_response(self, request, response):
        if hasattr(request, 'request_id'):
            response['X-Request-ID'] = request.request_id
        return response


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log request and response details.
    """
    
    def process_request(self, request):
        request.start_time = time.time()
        
        # Log request details
        logger.info(
            f"Request started: {request.method} {request.get_full_path()} "
            f"from {get_client_ip(request)} "
            f"[{getattr(request, 'request_id', 'unknown')}]"
        )
        return None
    
    def process_response(self, request, response):
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            # Log response details
            logger.info(
                f"Request completed: {request.method} {request.get_full_path()} "
                f"-> {response.status_code} in {duration:.3f}s "
                f"[{getattr(request, 'request_id', 'unknown')}]"
            )
        
        return response
    
    def process_exception(self, request, exception):
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            # Log exception details
            logger.error(
                f"Request failed: {request.method} {request.get_full_path()} "
                f"-> {exception.__class__.__name__}: {str(exception)} "
                f"in {duration:.3f}s [{getattr(request, 'request_id', 'unknown')}]",
                exc_info=True
            )
        
        return None


class RateLimitMiddleware(MiddlewareMixin):
    """
    Middleware to implement rate limiting.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limit = getattr(settings, 'API_RATE_LIMIT', 100)  # requests per minute
        self.rate_limit_window = getattr(settings, 'API_RATE_LIMIT_WINDOW', 60)  # seconds
        super().__init__(get_response)
    
    def process_request(self, request):
        # Skip rate limiting for certain paths
        skip_paths = ['/health/', '/admin/', '/static/', '/media/']
        if any(request.path.startswith(path) for path in skip_paths):
            return None
        
        # Get client identifier
        client_ip = get_client_ip(request)
        user_id = getattr(request.user, 'id', None) if hasattr(request, 'user') and request.user.is_authenticated else None
        client_key = f"rate_limit:{user_id or client_ip}"
        
        # Check current request count
        current_requests = cache.get(client_key, 0)
        
        if current_requests >= self.rate_limit:
            return JsonResponse({
                'error': {
                    'code': 'rate_limit_exceeded',
                    'message': 'Rate limit exceeded. Please try again later.',
                    'details': {
                        'limit': self.rate_limit,
                        'window': self.rate_limit_window,
                        'retry_after': self.rate_limit_window
                    }
                },
                'success': False,
                'timestamp': timezone.now().isoformat()
            }, status=429)
        
        # Increment request count
        cache.set(client_key, current_requests + 1, self.rate_limit_window)
        
        return None


class ServiceAuthMiddleware(MiddlewareMixin):
    """
    Middleware to handle service-to-service authentication.
    """
    
    def process_request(self, request):
        # Check for service token in headers
        service_token = request.META.get('HTTP_X_SERVICE_TOKEN')
        
        if service_token:
            # Validate service token
            expected_token = getattr(settings, 'SERVICE_SECRET_KEY', None)
            
            if service_token == expected_token:
                # Mark request as service-to-service
                request.is_service_request = True
                request.service_name = request.META.get('HTTP_X_SERVICE_NAME', 'unknown')
                
                logger.info(
                    f"Service request from {request.service_name} "
                    f"[{getattr(request, 'request_id', 'unknown')}]"
                )
            else:
                logger.warning(
                    f"Invalid service token from {get_client_ip(request)} "
                    f"[{getattr(request, 'request_id', 'unknown')}]"
                )
                
                return JsonResponse({
                    'error': {
                        'code': 'invalid_service_token',
                        'message': 'Invalid service authentication token.',
                        'details': {}
                    },
                    'success': False,
                    'timestamp': timezone.now().isoformat()
                }, status=401)
        else:
            request.is_service_request = False
        
        return None


class CORSMiddleware(MiddlewareMixin):
    """
    Custom CORS middleware for fine-grained control.
    """
    
    def process_response(self, request, response):
        # Get allowed origins from settings
        allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        origin = request.META.get('HTTP_ORIGIN')
        
        if origin in allowed_origins or '*' in allowed_origins:
            response['Access-Control-Allow-Origin'] = origin
        
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = (
            'Accept, Accept-Language, Content-Language, Content-Type, '
            'Authorization, X-Request-ID, X-Service-Token, X-Service-Name'
        )
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Max-Age'] = '86400'
        
        return response
    
    def process_request(self, request):
        if request.method == 'OPTIONS':
            response = JsonResponse({'status': 'ok'})
            return self.process_response(request, response)
        return None


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Middleware to add security headers.
    """
    
    def process_response(self, request, response):
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Add CSP header for API responses
        if request.path.startswith('/api/'):
            response['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none';"
        
        # Add HSTS header in production
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response


class HealthCheckMiddleware(MiddlewareMixin):
    """
    Middleware to handle health check requests.
    """
    
    def process_request(self, request):
        if request.path == '/health/' and request.method == 'GET':
            from .helpers import health_check
            
            try:
                health_data = health_check()
                status_code = 200 if health_data['status'] == 'healthy' else 503
                
                return JsonResponse(health_data, status=status_code)
            except Exception as e:
                logger.error(f"Health check failed: {e}", exc_info=True)
                
                return JsonResponse({
                    'status': 'unhealthy',
                    'timestamp': timezone.now().isoformat(),
                    'service': 'user_service',
                    'error': str(e)
                }, status=503)
        
        return None


class UserContextMiddleware(MiddlewareMixin):
    """
    Middleware to add user context to requests.
    """
    
    def process_request(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Add user roles to request
            if hasattr(request.user, 'roles'):
                request.user_roles = list(
                    request.user.roles.filter(is_active=True).values_list('role', flat=True)
                )
            else:
                request.user_roles = []
            
            # Add user permissions to request
            request.user_permissions = []
            if hasattr(request.user, 'roles'):
                for role in request.user.roles.filter(is_active=True):
                    permissions = role.permissions.filter(is_active=True).values_list('name', flat=True)
                    request.user_permissions.extend(permissions)
            
            # Remove duplicates
            request.user_permissions = list(set(request.user_permissions))
            
            # Add user institution context
            request.user_institutions = []
            if 'INSTITUTION_ADMIN' in request.user_roles:
                institution_roles = request.user.roles.filter(
                    role='INSTITUTION_ADMIN',
                    is_active=True
                )
                request.user_institutions = [
                    role.organization_id for role in institution_roles if role.organization_id
                ]
        
        return None


class APIVersionMiddleware(MiddlewareMixin):
    """
    Middleware to handle API versioning.
    """
    
    def process_request(self, request):
        # Get API version from header or URL
        api_version = (
            request.META.get('HTTP_API_VERSION') or
            request.GET.get('version') or
            'v1'  # default version
        )
        
        request.api_version = api_version
        
        # Validate API version
        supported_versions = getattr(settings, 'SUPPORTED_API_VERSIONS', ['v1'])
        if api_version not in supported_versions:
            return JsonResponse({
                'error': {
                    'code': 'unsupported_api_version',
                    'message': f'API version {api_version} is not supported.',
                    'details': {
                        'supported_versions': supported_versions
                    }
                },
                'success': False,
                'timestamp': timezone.now().isoformat()
            }, status=400)
        
        return None
    
    def process_response(self, request, response):
        if hasattr(request, 'api_version'):
            response['API-Version'] = request.api_version
        return response


class MaintenanceModeMiddleware(MiddlewareMixin):
    """
    Middleware to handle maintenance mode.
    """
    
    def process_request(self, request):
        # Check if maintenance mode is enabled
        maintenance_mode = getattr(settings, 'MAINTENANCE_MODE', False)
        
        if maintenance_mode:
            # Allow access to admin and health check
            allowed_paths = ['/admin/', '/health/']
            if any(request.path.startswith(path) for path in allowed_paths):
                return None
            
            # Allow access for superusers
            if hasattr(request, 'user') and request.user.is_authenticated and request.user.is_superuser:
                return None
            
            # Return maintenance response
            maintenance_message = getattr(
                settings, 
                'MAINTENANCE_MESSAGE', 
                'Service is currently under maintenance. Please try again later.'
            )
            
            return JsonResponse({
                'error': {
                    'code': 'maintenance_mode',
                    'message': maintenance_message,
                    'details': {}
                },
                'success': False,
                'timestamp': timezone.now().isoformat()
            }, status=503)
        
        return None