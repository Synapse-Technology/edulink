"""Optional session diagnostics middleware."""
import logging
import os

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class SessionDebugMiddleware(MiddlewareMixin):
    """Log session details for debugging authentication issues"""

    @staticmethod
    def enabled():
        return os.getenv("EDULINK_LOG_SESSION_DEBUG", "False").lower() in {"1", "true", "yes"}
    
    def process_request(self, request):
        """Log incoming request session info"""
        if not self.enabled():
            return None

        cookies = request.COOKIES
        session_key = cookies.get('sessionid', 'NOT_FOUND')
        user = request.user
        
        logger.info(
            f"[REQUEST] path={request.path} method={request.method} "
            f"sessionid_cookie={session_key[:8]}... if present "
            f"authenticated={user.is_authenticated} user={user.email if user.is_authenticated else 'anonymous'}"
        )
        
        return None
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """Log after DRF permission checks"""
        return None
    
    def process_response(self, request, response):
        """Log response info"""
        if not self.enabled():
            return response

        if response.status_code >= 400:
            cookies = request.COOKIES
            session_key = cookies.get('sessionid', 'NOT_FOUND')
            user = request.user
            
            logger.info(
                f"[RESPONSE] path={request.path} method={request.method} "
                f"status={response.status_code} "
                f"sessionid_cookie={session_key[:8]}... if present "
                f"authenticated={user.is_authenticated}"
            )
        
        return response
