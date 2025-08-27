"""Session Management Middleware.

Provides middleware for automatic session management and token validation
across microservices.
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.core.cache import cache

from .manager import SessionManagerInterface, create_session_manager, SessionData, TokenData


logger = logging.getLogger(__name__)


class SessionManagementMiddleware(MiddlewareMixin):
    """Middleware for distributed session management."""
    
    def __init__(self, get_response=None):
        """Initialize middleware."""
        super().__init__(get_response)
        self.session_manager: SessionManagerInterface = create_session_manager(
            redis_url=getattr(settings, 'REDIS_URL', None),
            jwt_secret=getattr(settings, 'JWT_SECRET', None)
        )
        self.excluded_paths = getattr(settings, 'SESSION_EXCLUDED_PATHS', [
            '/health/',
            '/metrics/',
            '/static/',
            '/media/'
        ])
        self.session_timeout = getattr(settings, 'SESSION_TIMEOUT', timedelta(hours=24))
        self.token_timeout = getattr(settings, 'TOKEN_TIMEOUT', timedelta(hours=1))
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """Process incoming request for session validation."""
        # Skip excluded paths
        if any(request.path.startswith(path) for path in self.excluded_paths):
            return None
        
        # Initialize session attributes
        request.session_data = None
        request.token_data = None
        request.user_id = None
        
        # Extract token from Authorization header or cookies
        token = self._extract_token(request)
        if not token:
            return None
        
        try:
            # Validate token
            token_data = self.session_manager.validate_token(token)
            if not token_data:
                return self._unauthorized_response("Invalid or expired token")
            
            request.token_data = token_data
            request.user_id = token_data.user_id
            
            # Get session data if token has session_id
            if token_data.session_id:
                session_data = self.session_manager.get_session(token_data.session_id)
                if not session_data or not session_data.is_active():
                    return self._unauthorized_response("Invalid or expired session")
                
                request.session_data = session_data
                
                # Update session activity
                self.session_manager.update_session(
                    session_data.session_id,
                    last_activity=datetime.utcnow(),
                    metadata={
                        'last_request_path': request.path,
                        'last_request_method': request.method
                    }
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Session validation error: {e}")
            return self._unauthorized_response("Session validation failed")
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """Process response to update session information."""
        # Skip if no session data
        if not hasattr(request, 'session_data') or not request.session_data:
            return response
        
        try:
            # Add session info to response headers (for debugging)
            if getattr(settings, 'DEBUG', False):
                response['X-Session-ID'] = request.session_data.session_id
                response['X-User-ID'] = request.session_data.user_id
            
            # Cache user session info for quick access
            cache_key = f"user_session:{request.user_id}"
            cache.set(cache_key, {
                'session_id': request.session_data.session_id,
                'last_activity': request.session_data.last_activity.isoformat(),
                'device_type': request.session_data.device_type
            }, timeout=300)  # 5 minutes cache
            
        except Exception as e:
            logger.error(f"Session response processing error: {e}")
        
        return response
    
    def _extract_token(self, request: HttpRequest) -> Optional[str]:
        """Extract token from request."""
        # Try Authorization header first
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if auth_header and auth_header.startswith('Bearer '):
            return auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Try cookies
        return request.COOKIES.get('access_token')
    
    def _unauthorized_response(self, message: str) -> JsonResponse:
        """Return unauthorized response."""
        return JsonResponse(
            {'error': message, 'code': 'UNAUTHORIZED'},
            status=401
        )


class TokenRefreshMiddleware(MiddlewareMixin):
    """Middleware for automatic token refresh."""
    
    def __init__(self, get_response=None):
        """Initialize middleware."""
        super().__init__(get_response)
        self.session_manager: SessionManagerInterface = create_session_manager(
            redis_url=getattr(settings, 'REDIS_URL', None),
            jwt_secret=getattr(settings, 'JWT_SECRET', None)
        )
        self.refresh_threshold = getattr(settings, 'TOKEN_REFRESH_THRESHOLD', timedelta(minutes=15))
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """Check if token needs refresh and add new token to response."""
        if not hasattr(request, 'token_data') or not request.token_data:
            return response
        
        try:
            token_data = request.token_data
            
            # Check if token is close to expiration
            time_until_expiry = token_data.expires_at - datetime.utcnow()
            if time_until_expiry <= self.refresh_threshold:
                # Generate new token
                new_token = self.session_manager.generate_token(
                    user_id=token_data.user_id,
                    session_id=token_data.session_id,
                    token_type=token_data.token_type,
                    scopes=token_data.scopes
                )
                
                # Add new token to response headers
                response['X-New-Token'] = new_token.token
                response['X-Token-Expires'] = new_token.expires_at.isoformat()
                
                # Optionally set as cookie
                if getattr(settings, 'SET_TOKEN_COOKIE', False):
                    response.set_cookie(
                        'access_token',
                        new_token.token,
                        max_age=int(self.session_manager.default_token_duration.total_seconds()),
                        httponly=True,
                        secure=not getattr(settings, 'DEBUG', False),
                        samesite='Lax'
                    )
        
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
        
        return response


class SessionCleanupMiddleware(MiddlewareMixin):
    """Middleware for periodic session cleanup."""
    
    def __init__(self, get_response=None):
        """Initialize middleware."""
        super().__init__(get_response)
        self.session_manager: SessionManagerInterface = create_session_manager(
            redis_url=getattr(settings, 'REDIS_URL', None),
            jwt_secret=getattr(settings, 'JWT_SECRET', None)
        )
        self.cleanup_interval = getattr(settings, 'SESSION_CLEANUP_INTERVAL', 3600)  # 1 hour
        self.last_cleanup = cache.get('last_session_cleanup', 0)
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """Perform periodic session cleanup."""
        current_time = datetime.utcnow().timestamp()
        
        # Check if cleanup is needed
        if current_time - self.last_cleanup > self.cleanup_interval:
            try:
                # Perform cleanup in background (non-blocking)
                from threading import Thread
                cleanup_thread = Thread(target=self._cleanup_sessions)
                cleanup_thread.daemon = True
                cleanup_thread.start()
                
                # Update last cleanup time
                cache.set('last_session_cleanup', current_time, timeout=None)
                self.last_cleanup = current_time
                
            except Exception as e:
                logger.error(f"Session cleanup error: {e}")
        
        return None
    
    def _cleanup_sessions(self):
        """Perform session cleanup."""
        try:
            cleaned_count = self.session_manager.cleanup_expired_sessions()
            logger.info(f"Cleaned up {cleaned_count} expired sessions")
        except Exception as e:
            logger.error(f"Session cleanup failed: {e}")


class RateLimitMiddleware(MiddlewareMixin):
    """Rate limiting middleware based on session/user."""
    
    def __init__(self, get_response=None):
        """Initialize middleware."""
        super().__init__(get_response)
        self.rate_limits = getattr(settings, 'RATE_LIMITS', {
            'default': {'requests': 100, 'window': 3600},  # 100 requests per hour
            'authenticated': {'requests': 1000, 'window': 3600},  # 1000 requests per hour
        })
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """Check rate limits."""
        # Determine rate limit key
        if hasattr(request, 'user_id') and request.user_id:
            rate_key = f"rate_limit:user:{request.user_id}"
            limit_config = self.rate_limits.get('authenticated', self.rate_limits['default'])
        else:
            # Use IP address for unauthenticated requests
            ip_address = self._get_client_ip(request)
            rate_key = f"rate_limit:ip:{ip_address}"
            limit_config = self.rate_limits['default']
        
        # Check current request count
        current_count = cache.get(rate_key, 0)
        
        if current_count >= limit_config['requests']:
            return JsonResponse(
                {
                    'error': 'Rate limit exceeded',
                    'code': 'RATE_LIMIT_EXCEEDED',
                    'retry_after': limit_config['window']
                },
                status=429
            )
        
        # Increment counter
        cache.set(rate_key, current_count + 1, timeout=limit_config['window'])
        
        return None
    
    def _get_client_ip(self, request: HttpRequest) -> str:
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '127.0.0.1')


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Add security headers to responses."""
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """Add security headers."""
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # HSTS header for HTTPS
        if request.is_secure():
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # CSP header
        if not getattr(settings, 'DEBUG', False):
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' https:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none';"
            )
        
        return response