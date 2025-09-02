"""
Middleware for tracking page views and user activity
"""

import re
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
from .models import PageView


class PageViewTrackingMiddleware(MiddlewareMixin):
    """
    Middleware to automatically track page views for analytics
    """
    
    # Paths to exclude from tracking
    EXCLUDED_PATHS = [
        r'^/admin/',
        r'^/static/',
        r'^/media/',
        r'^/favicon\.ico$',
        r'^/robots\.txt$',
        r'^/sitemap\.xml$',
        r'.*\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$',
    ]
    
    # API paths that should be tracked
    TRACKED_API_PATHS = [
        r'^/api/dashboards/',
        r'^/api/internships/',
        r'^/api/applications/',
        r'^/api/employers/',
        r'^/api/students/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process the request and track page view if applicable"""
        
        # Skip tracking for excluded paths
        if self._should_exclude_path(request.path):
            return None
        
        # Skip non-GET requests unless it's a tracked API endpoint
        if request.method != 'GET' and not self._is_tracked_api_path(request.path):
            return None
        
        # Get user information
        user = request.user if not isinstance(request.user, AnonymousUser) else None
        session_key = request.session.session_key if hasattr(request, 'session') else None
        
        # Get client information
        ip_address = self._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        referrer = request.META.get('HTTP_REFERER', '')
        
        # Determine device type
        device_type = self._get_device_type(user_agent)
        
        # Create page view record
        try:
            PageView.objects.create(
                user=user,
                session_key=session_key,
                ip_address=ip_address,
                user_agent=user_agent,
                path=request.path,
                full_url=request.build_absolute_uri(),
                referrer=referrer if referrer else None,
                is_authenticated=user is not None,
                device_type=device_type,
            )
        except Exception as e:
            # Log error but don't break the request
            print(f"Error tracking page view: {e}")
        
        return None
    
    def _should_exclude_path(self, path):
        """Check if the path should be excluded from tracking"""
        for pattern in self.EXCLUDED_PATHS:
            if re.match(pattern, path, re.IGNORECASE):
                return True
        return False
    
    def _is_tracked_api_path(self, path):
        """Check if the API path should be tracked"""
        for pattern in self.TRACKED_API_PATHS:
            if re.match(pattern, path, re.IGNORECASE):
                return True
        return False
    
    def _get_client_ip(self, request):
        """Get the client's IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _get_device_type(self, user_agent):
        """Determine device type from user agent"""
        user_agent_lower = user_agent.lower()
        
        if any(mobile in user_agent_lower for mobile in ['mobile', 'android', 'iphone']):
            return 'mobile'
        elif any(tablet in user_agent_lower for tablet in ['tablet', 'ipad']):
            return 'tablet'
        elif any(desktop in user_agent_lower for desktop in ['windows', 'macintosh', 'linux']):
            return 'desktop'
        else:
            return 'unknown'


class ApplicationCountTrackingMiddleware(MiddlewareMixin):
    """
    Middleware to track application-related activities for real-time counts
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_response(self, request, response):
        """Process response to track application activities"""
        
        # Track successful application submissions
        if (request.method == 'POST' and 
            '/api/applications/' in request.path and 
            response.status_code in [200, 201]):
            
            try:
                # Update application counts in real-time
                self._update_application_metrics(request)
            except Exception as e:
                print(f"Error updating application metrics: {e}")
        
        return response
    
    def _update_application_metrics(self, request):
        """Update real-time application metrics"""
        # This could be expanded to update cached metrics
        # or trigger real-time updates to connected clients
        pass