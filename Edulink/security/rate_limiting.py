# API Rate Limiting and Security Configuration
# This module provides rate limiting and security enhancements for the Edulink API

from django_ratelimit.decorators import ratelimit
from django.http import JsonResponse
from django.core.cache import cache
from functools import wraps
import time
import hashlib
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status


# Rate limiting configurations
RATE_LIMITS = {
    # Authentication endpoints
    'auth_login': '5/m',  # 5 attempts per minute
    'auth_register': '3/m',  # 3 registrations per minute
    'auth_password_reset': '3/h',  # 3 password resets per hour
    
    # Application endpoints
    'application_create': '10/h',  # 10 applications per hour
    'application_list': '100/h',  # 100 requests per hour
    
    # Internship endpoints
    'internship_list': '200/h',  # 200 requests per hour
    'internship_create': '5/h',  # 5 internship posts per hour
    
    # Logbook endpoints
    'logbook_create': '20/d',  # 20 logbook entries per day
    'logbook_list': '100/h',  # 100 requests per hour
    
    # General API
    'api_general': '1000/h',  # 1000 requests per hour for general endpoints
    'api_strict': '100/h',  # 100 requests per hour for sensitive endpoints
}


def get_client_ip(request):
    """Get the real client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def rate_limit_key(group, request):
    """Generate a unique key for rate limiting"""
    ip = get_client_ip(request)
    user_id = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
    return f"rate_limit:{group}:{ip}:{user_id}"


def custom_rate_limit(group, rate, method='ALL', block=True):
    """Custom rate limiting decorator with enhanced features"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            # Check if rate limiting is enabled
            if not getattr(settings, 'ENABLE_RATE_LIMITING', True):
                return view_func(request, *args, **kwargs)
            
            # Generate rate limit key
            key = rate_limit_key(group, request)
            
            # Parse rate (e.g., '5/m' -> 5 requests per minute)
            count, period = rate.split('/')
            count = int(count)
            
            period_seconds = {
                's': 1,
                'm': 60,
                'h': 3600,
                'd': 86400
            }.get(period, 60)
            
            # Check current usage
            current_usage = cache.get(key, 0)
            
            if current_usage >= count:
                if block:
                    return JsonResponse({
                        'error': 'Rate limit exceeded',
                        'detail': f'Maximum {count} requests per {period} allowed',
                        'retry_after': period_seconds
                    }, status=429)
                else:
                    # Log but don't block
                    pass
            
            # Increment usage
            cache.set(key, current_usage + 1, period_seconds)
            
            return view_func(request, *args, **kwargs)
        
        return wrapped_view
    return decorator


class RateLimitMiddleware:
    """Middleware for global rate limiting"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Apply global rate limiting
        if self.is_rate_limited(request):
            return JsonResponse({
                'error': 'Global rate limit exceeded',
                'detail': 'Too many requests from this IP address'
            }, status=429)
        
        response = self.get_response(request)
        return response
    
    def is_rate_limited(self, request):
        """Check if request should be rate limited"""
        ip = get_client_ip(request)
        key = f"global_rate_limit:{ip}"
        
        # Global limit: 2000 requests per hour per IP
        current_usage = cache.get(key, 0)
        if current_usage >= 2000:
            return True
        
        cache.set(key, current_usage + 1, 3600)  # 1 hour
        return False


# Security headers middleware
class SecurityHeadersMiddleware:
    """Middleware to add security headers"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # Content Security Policy
        if not settings.DEBUG:
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self';"
            )
        
        return response


# Input validation and sanitization
def validate_file_upload(file):
    """Validate uploaded files for security"""
    # Check file size (max 10MB)
    if file.size > 10 * 1024 * 1024:
        raise ValueError("File size exceeds 10MB limit")
    
    # Check file extension
    allowed_extensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
    file_extension = file.name.lower().split('.')[-1]
    if f'.{file_extension}' not in allowed_extensions:
        raise ValueError(f"File type .{file_extension} not allowed")
    
    # Check MIME type
    allowed_mime_types = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
    ]
    
    if hasattr(file, 'content_type') and file.content_type not in allowed_mime_types:
        raise ValueError(f"MIME type {file.content_type} not allowed")
    
    return True


def sanitize_input(data):
    """Sanitize user input to prevent XSS and injection attacks"""
    import html
    import re
    
    if isinstance(data, str):
        # Remove potentially dangerous characters
        data = html.escape(data)
        # Remove script tags
        data = re.sub(r'<script[^>]*>.*?</script>', '', data, flags=re.IGNORECASE | re.DOTALL)
        # Remove javascript: URLs
        data = re.sub(r'javascript:', '', data, flags=re.IGNORECASE)
        return data
    elif isinstance(data, dict):
        return {key: sanitize_input(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    else:
        return data


# API key authentication for external integrations
class APIKeyAuthentication:
    """Simple API key authentication for external services"""
    
    def authenticate(self, request):
        api_key = request.META.get('HTTP_X_API_KEY')
        if not api_key:
            return None
        
        # Hash the API key for comparison
        hashed_key = hashlib.sha256(api_key.encode()).hexdigest()
        
        # Check against stored API keys (should be in database)
        valid_keys = getattr(settings, 'VALID_API_KEYS', [])
        
        if hashed_key in valid_keys:
            # Return a special user object for API access
            return (None, api_key)
        
        return None


# Suspicious activity detection
class SuspiciousActivityDetector:
    """Detect and log suspicious activities"""
    
    @staticmethod
    def detect_brute_force(request, failed_attempts_key):
        """Detect brute force attacks"""
        attempts = cache.get(failed_attempts_key, 0)
        if attempts >= 5:  # 5 failed attempts
            # Log suspicious activity
            import logging
            logger = logging.getLogger('security')
            logger.warning(f"Potential brute force attack from {get_client_ip(request)}")
            return True
        return False
    
    @staticmethod
    def detect_unusual_patterns(request):
        """Detect unusual request patterns"""
        ip = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Check for suspicious user agents
        suspicious_agents = ['bot', 'crawler', 'spider', 'scraper']
        if any(agent in user_agent.lower() for agent in suspicious_agents):
            return True
        
        # Check for rapid requests from same IP
        rapid_requests_key = f"rapid_requests:{ip}"
        request_count = cache.get(rapid_requests_key, 0)
        if request_count > 100:  # More than 100 requests in last minute
            return True
        
        cache.set(rapid_requests_key, request_count + 1, 60)
        return False


# Rate limiting decorators for specific endpoints
def auth_rate_limit(view_func):
    """Rate limiting for authentication endpoints"""
    return custom_rate_limit('auth', RATE_LIMITS['auth_login'])(view_func)


def application_rate_limit(view_func):
    """Rate limiting for application endpoints"""
    return custom_rate_limit('application', RATE_LIMITS['application_create'])(view_func)


def api_rate_limit(view_func):
    """General API rate limiting"""
    return custom_rate_limit('api', RATE_LIMITS['api_general'])(view_func)


# Security configuration for settings
SECURITY_SETTINGS = {
    'ENABLE_RATE_LIMITING': True,
    'ENABLE_SECURITY_HEADERS': True,
    'ENABLE_FILE_VALIDATION': True,
    'ENABLE_INPUT_SANITIZATION': True,
    'ENABLE_SUSPICIOUS_ACTIVITY_DETECTION': True,
    
    # Rate limiting settings
    'RATE_LIMIT_CACHE': 'default',
    'RATE_LIMIT_SKIP_TIMEOUT': False,
    
    # File upload settings
    'MAX_FILE_SIZE': 10 * 1024 * 1024,  # 10MB
    'ALLOWED_FILE_EXTENSIONS': ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    
    # Security logging
    'LOG_SECURITY_EVENTS': True,
    'SECURITY_LOG_LEVEL': 'WARNING',
}


# Usage examples and documentation
USAGE_EXAMPLES = """
Security and Rate Limiting Usage Examples:

1. Apply rate limiting to a view:

@auth_rate_limit
def login_view(request):
    # Login logic here
    pass

2. Custom rate limiting:

@custom_rate_limit('custom_group', '10/h')
def my_view(request):
    # View logic here
    pass

3. File upload validation:

def upload_view(request):
    if request.FILES:
        for file in request.FILES.values():
            try:
                validate_file_upload(file)
            except ValueError as e:
                return JsonResponse({'error': str(e)}, status=400)
    # Process upload

4. Input sanitization:

def create_view(request):
    data = sanitize_input(request.POST.dict())
    # Process sanitized data

5. Add to settings.py:

MIDDLEWARE = [
    'security.rate_limiting.RateLimitMiddleware',
    'security.rate_limiting.SecurityHeadersMiddleware',
    # ... other middleware
]

# Enable security features
ENABLE_RATE_LIMITING = True
ENABLE_SECURITY_HEADERS = True
"""

print("Security and rate limiting module loaded successfully!")
print("Remember to add the middleware to your settings.py file.")
print("Configure rate limits according to your application needs.")