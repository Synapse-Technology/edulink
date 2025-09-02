"""Session Management Utilities.

Provides utility functions and decorators for session management
across microservices.
"""

import functools
import logging
from typing import Optional, List, Dict, Any, Callable
from datetime import datetime, timedelta

from django.http import HttpRequest, JsonResponse
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .manager import SessionManagerInterface, create_session_manager, SessionData, TokenData


logger = logging.getLogger(__name__)


def get_session_manager() -> SessionManagerInterface:
    """Get session manager instance."""
    return create_session_manager(
        redis_url=getattr(settings, 'REDIS_URL', None),
        jwt_secret=getattr(settings, 'JWT_SECRET', None)
    )


def get_client_info(request: HttpRequest) -> Dict[str, str]:
    """Extract client information from request."""
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # Determine device type based on user agent
    device_type = 'web'
    if 'Mobile' in user_agent or 'Android' in user_agent or 'iPhone' in user_agent:
        device_type = 'mobile'
    elif 'Tablet' in user_agent or 'iPad' in user_agent:
        device_type = 'tablet'
    
    # Get IP address
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip_address = x_forwarded_for.split(',')[0].strip()
    else:
        ip_address = request.META.get('REMOTE_ADDR', '127.0.0.1')
    
    return {
        'ip_address': ip_address,
        'user_agent': user_agent,
        'device_type': device_type
    }


def create_user_session(request: HttpRequest, user_id: str, 
                       duration: timedelta = None, 
                       metadata: Dict[str, Any] = None) -> SessionData:
    """Create a new user session."""
    session_manager = get_session_manager()
    client_info = get_client_info(request)
    
    return session_manager.create_session(
        user_id=user_id,
        ip_address=client_info['ip_address'],
        user_agent=client_info['user_agent'],
        device_type=client_info['device_type'],
        duration=duration,
        metadata=metadata or {}
    )


def generate_access_token(user_id: str, session_id: str = None, 
                         scopes: List[str] = None,
                         duration: timedelta = None) -> TokenData:
    """Generate an access token."""
    session_manager = get_session_manager()
    
    return session_manager.generate_token(
        user_id=user_id,
        session_id=session_id,
        token_type='access',
        scopes=scopes or [],
        duration=duration
    )


def generate_refresh_token(user_id: str, session_id: str = None) -> TokenData:
    """Generate a refresh token."""
    session_manager = get_session_manager()
    
    return session_manager.generate_token(
        user_id=user_id,
        session_id=session_id,
        token_type='refresh',
        scopes=['refresh'],
        duration=timedelta(days=30)  # Refresh tokens last longer
    )


def validate_token(token: str) -> Optional[TokenData]:
    """Validate a token."""
    session_manager = get_session_manager()
    return session_manager.validate_token(token)


def revoke_token(token: str) -> bool:
    """Revoke a token."""
    session_manager = get_session_manager()
    return session_manager.revoke_token(token)


def get_user_sessions(user_id: str, active_only: bool = True) -> List[SessionData]:
    """Get all sessions for a user."""
    session_manager = get_session_manager()
    return session_manager.get_user_sessions(user_id, active_only)


def terminate_user_sessions(user_id: str, exclude_session: str = None) -> int:
    """Terminate all sessions for a user."""
    session_manager = get_session_manager()
    return session_manager.terminate_user_sessions(user_id, exclude_session)


def get_session_info(session_id: str) -> Optional[SessionData]:
    """Get session information."""
    session_manager = get_session_manager()
    return session_manager.get_session(session_id)


def extend_session(session_id: str, duration: timedelta) -> bool:
    """Extend session duration."""
    session_manager = get_session_manager()
    return session_manager.extend_session(session_id, duration)


def terminate_session(session_id: str) -> bool:
    """Terminate a session."""
    session_manager = get_session_manager()
    return session_manager.terminate_session(session_id)


def cache_user_data(user_id: str, data: Dict[str, Any], timeout: int = 300):
    """Cache user data for quick access."""
    cache_key = f"user_data:{user_id}"
    cache.set(cache_key, data, timeout=timeout)


def get_cached_user_data(user_id: str) -> Optional[Dict[str, Any]]:
    """Get cached user data."""
    cache_key = f"user_data:{user_id}"
    return cache.get(cache_key)


def clear_user_cache(user_id: str):
    """Clear all cached data for a user."""
    # Clear user data cache
    cache.delete(f"user_data:{user_id}")
    cache.delete(f"user_session:{user_id}")
    
    # Clear any other user-specific caches
    cache.delete(f"user_permissions:{user_id}")
    cache.delete(f"user_roles:{user_id}")


# Decorators

def require_authentication(view_func: Callable) -> Callable:
    """Decorator to require authentication for a view."""
    @functools.wraps(view_func)
    def wrapper(request: HttpRequest, *args, **kwargs):
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse(
                {'error': 'Authentication required', 'code': 'AUTHENTICATION_REQUIRED'},
                status=401
            )
        return view_func(request, *args, **kwargs)
    return wrapper


def require_session(view_func: Callable) -> Callable:
    """Decorator to require an active session for a view."""
    @functools.wraps(view_func)
    def wrapper(request: HttpRequest, *args, **kwargs):
        if not hasattr(request, 'session_data') or not request.session_data:
            return JsonResponse(
                {'error': 'Active session required', 'code': 'SESSION_REQUIRED'},
                status=401
            )
        return view_func(request, *args, **kwargs)
    return wrapper


def require_scopes(*required_scopes: str):
    """Decorator to require specific scopes for a view."""
    def decorator(view_func: Callable) -> Callable:
        @functools.wraps(view_func)
        def wrapper(request: HttpRequest, *args, **kwargs):
            if not hasattr(request, 'token_data') or not request.token_data:
                return JsonResponse(
                    {'error': 'Token required', 'code': 'TOKEN_REQUIRED'},
                    status=401
                )
            
            token_scopes = set(request.token_data.scopes)
            required_scopes_set = set(required_scopes)
            
            if not required_scopes_set.issubset(token_scopes):
                missing_scopes = required_scopes_set - token_scopes
                return JsonResponse(
                    {
                        'error': 'Insufficient permissions',
                        'code': 'INSUFFICIENT_PERMISSIONS',
                        'missing_scopes': list(missing_scopes)
                    },
                    status=403
                )
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def rate_limit(requests: int, window: int, key_func: Callable[[HttpRequest], str] = None):
    """Decorator for rate limiting views."""
    def decorator(view_func: Callable) -> Callable:
        @functools.wraps(view_func)
        def wrapper(request: HttpRequest, *args, **kwargs):
            # Determine rate limit key
            if key_func:
                rate_key = key_func(request)
            elif hasattr(request, 'user_id') and request.user_id:
                rate_key = f"rate_limit:user:{request.user_id}:{view_func.__name__}"
            else:
                client_info = get_client_info(request)
                rate_key = f"rate_limit:ip:{client_info['ip_address']}:{view_func.__name__}"
            
            # Check current request count
            current_count = cache.get(rate_key, 0)
            
            if current_count >= requests:
                return JsonResponse(
                    {
                        'error': 'Rate limit exceeded',
                        'code': 'RATE_LIMIT_EXCEEDED',
                        'retry_after': window
                    },
                    status=429
                )
            
            # Increment counter
            cache.set(rate_key, current_count + 1, timeout=window)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def log_activity(activity_type: str, description: str = None):
    """Decorator to log user activity."""
    def decorator(view_func: Callable) -> Callable:
        @functools.wraps(view_func)
        def wrapper(request: HttpRequest, *args, **kwargs):
            # Execute the view
            response = view_func(request, *args, **kwargs)
            
            # Log activity if user is authenticated
            if hasattr(request, 'user_id') and request.user_id:
                try:
                    from django.utils import timezone
                    
                    activity_data = {
                        'user_id': request.user_id,
                        'activity_type': activity_type,
                        'description': description or f"{view_func.__name__} called",
                        'timestamp': timezone.now().isoformat(),
                        'ip_address': get_client_info(request)['ip_address'],
                        'user_agent': get_client_info(request)['user_agent'],
                        'path': request.path,
                        'method': request.method,
                        'status_code': getattr(response, 'status_code', None)
                    }
                    
                    # Cache activity for batch processing
                    activities_key = f"user_activities:{request.user_id}"
                    activities = cache.get(activities_key, [])
                    activities.append(activity_data)
                    
                    # Keep only last 100 activities in cache
                    if len(activities) > 100:
                        activities = activities[-100:]
                    
                    cache.set(activities_key, activities, timeout=3600)  # 1 hour
                    
                except Exception as e:
                    logger.error(f"Activity logging error: {e}")
            
            return response
        return wrapper
    return decorator


def cache_response(timeout: int = 300, key_func: Callable[[HttpRequest], str] = None):
    """Decorator to cache view responses."""
    def decorator(view_func: Callable) -> Callable:
        @functools.wraps(view_func)
        def wrapper(request: HttpRequest, *args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(request)
            else:
                user_id = getattr(request, 'user_id', 'anonymous')
                cache_key = f"view_cache:{view_func.__name__}:{user_id}:{hash(str(args) + str(kwargs))}"
            
            # Try to get cached response
            cached_response = cache.get(cache_key)
            if cached_response:
                return cached_response
            
            # Execute view and cache response
            response = view_func(request, *args, **kwargs)
            
            # Only cache successful responses
            if hasattr(response, 'status_code') and response.status_code == 200:
                cache.set(cache_key, response, timeout=timeout)
            
            return response
        return wrapper
    return decorator


class SessionContext:
    """Context manager for session operations."""
    
    def __init__(self, user_id: str, request: HttpRequest = None):
        """Initialize session context."""
        self.user_id = user_id
        self.request = request
        self.session_manager = get_session_manager()
        self.session_data = None
        self.token_data = None
    
    def __enter__(self):
        """Enter context."""
        if self.request:
            # Create session from request
            client_info = get_client_info(self.request)
            self.session_data = self.session_manager.create_session(
                user_id=self.user_id,
                ip_address=client_info['ip_address'],
                user_agent=client_info['user_agent'],
                device_type=client_info['device_type']
            )
            
            # Generate access token
            self.token_data = self.session_manager.generate_token(
                user_id=self.user_id,
                session_id=self.session_data.session_id
            )
        
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context."""
        if self.session_data:
            # Terminate session on exit
            self.session_manager.terminate_session(self.session_data.session_id)
    
    def get_token(self) -> Optional[str]:
        """Get access token."""
        return self.token_data.token if self.token_data else None
    
    def get_session_id(self) -> Optional[str]:
        """Get session ID."""
        return self.session_data.session_id if self.session_data else None


def create_login_response(user_id: str, request: HttpRequest, 
                         additional_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Create a standardized login response."""
    # Create session
    session_data = create_user_session(request, user_id)
    
    # Generate tokens
    access_token = generate_access_token(user_id, session_data.session_id)
    refresh_token = generate_refresh_token(user_id, session_data.session_id)
    
    # Cache user session info
    cache_user_data(user_id, {
        'session_id': session_data.session_id,
        'last_login': session_data.created_at.isoformat(),
        'device_type': session_data.device_type
    })
    
    response_data = {
        'access_token': access_token.token,
        'refresh_token': refresh_token.token,
        'token_type': 'Bearer',
        'expires_in': int(access_token.expires_at.timestamp()),
        'session_id': session_data.session_id,
        'user_id': user_id
    }
    
    if additional_data:
        response_data.update(additional_data)
    
    return response_data


def create_logout_response(request: HttpRequest) -> Dict[str, Any]:
    """Create a standardized logout response."""
    user_id = getattr(request, 'user_id', None)
    session_id = getattr(request, 'session_data', {}).get('session_id') if hasattr(request, 'session_data') else None
    
    if user_id:
        # Clear user cache
        clear_user_cache(user_id)
        
        # Terminate session if exists
        if session_id:
            terminate_session(session_id)
    
    return {
        'message': 'Logged out successfully',
        'timestamp': timezone.now().isoformat()
    }