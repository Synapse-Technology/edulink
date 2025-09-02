from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
import logging
import json

logger = logging.getLogger(__name__)
security_logger = logging.getLogger('security')

class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log incoming requests.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        # Log basic request information
        user_info = 'Anonymous'
        if hasattr(request, 'user') and not isinstance(request.user, AnonymousUser):
            user_info = f"User {request.user.id}"
        
        logger.info(
            f"Request: {request.method} {request.path} from {request.META.get('REMOTE_ADDR')} "
            f"- User: {user_info}"
        )
        return None
    
    def process_response(self, request, response):
        logger.info(
            f"Response: {request.method} {request.path} - Status: {response.status_code}"
        )
        return response

class SecurityLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log security-related events.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        # Log potentially suspicious requests
        suspicious_patterns = [
            'admin', 'login', 'auth', 'password', 'token'
        ]
        
        if any(pattern in request.path.lower() for pattern in suspicious_patterns):
            security_logger.info(
                f"Security-sensitive request: {request.method} {request.path} "
                f"from {request.META.get('REMOTE_ADDR')}"
            )
        
        return None
    
    def process_response(self, request, response):
        # Log failed authentication attempts
        if response.status_code in [401, 403]:
            security_logger.warning(
                f"Access denied: {request.method} {request.path} "
                f"from {request.META.get('REMOTE_ADDR')} - Status: {response.status_code}"
            )
        
        return response