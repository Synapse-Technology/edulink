import logging
import time
import json
import hashlib
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponseForbidden, JsonResponse
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from django.urls import resolve
from django.core.exceptions import PermissionDenied
from security.models import SecurityEvent, FailedLoginAttempt, UserSession
from security.utils import ThreatDetector
import re

User = get_user_model()
logger = logging.getLogger('security')


class SecurityMiddleware(MiddlewareMixin):
    """Comprehensive security middleware for request/response processing."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.threat_detector = ThreatDetector()
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process incoming requests for security threats."""
        # Record request start time
        request._security_start_time = time.time()
        
        # Get client IP
        client_ip = self.get_client_ip(request)
        request._client_ip = client_ip
        
        # Skip security checks for localhost in development mode
        if getattr(settings, 'SKIP_SECURITY_FOR_LOCALHOST', False):
            localhost_ips = getattr(settings, 'LOCALHOST_ALLOWED_IPS', ['127.0.0.1', '::1'])
            if client_ip in localhost_ips or client_ip == 'localhost':
                return None
        
        # Skip security checks for admin paths
        if request.path.startswith('/admin/'):
            return None
        
        # Check for blocked IPs
        if self.is_ip_blocked(client_ip):
            logger.warning(f"Blocked request from IP: {client_ip}")
            return HttpResponseForbidden("Access denied")
        
        # Rate limiting
        if self.is_rate_limited(request):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return JsonResponse(
                {'error': 'Rate limit exceeded'}, 
                status=429
            )
        
        # Threat detection
        threats = self.detect_threats(request)
        if threats:
            self.handle_threats(request, threats)
        
        # Session security
        if hasattr(request, 'user') and request.user.is_authenticated:
            self.validate_session_security(request)
        
        return None
    
    def process_response(self, request, response):
        """Process outgoing responses for security headers."""
        # Add security headers
        response = self.add_security_headers(response)
        
        # Log security events
        self.log_request(request, response)
        
        return response
    
    def process_exception(self, request, exception):
        """Handle security-related exceptions."""
        if isinstance(exception, PermissionDenied):
            self.log_security_event(
                request,
                'permission_denied',
                'medium',
                f"Permission denied: {str(exception)}"
            )
        
        return None
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def is_ip_blocked(self, ip_address):
        """Check if IP address is blocked."""
        # Check cache for blocked IPs
        blocked_ips = cache.get('blocked_ips', set())
        return ip_address in blocked_ips
    
    def is_rate_limited(self, request):
        """Check if request should be rate limited."""
        client_ip = request._client_ip
        
        # Different limits for different endpoints
        path = request.path
        
        if '/api/auth/' in path:
            # Stricter limits for authentication endpoints
            limit = getattr(settings, 'AUTH_RATE_LIMIT', 10)
            window = getattr(settings, 'AUTH_RATE_WINDOW', 300)  # 5 minutes
        else:
            # General API limits
            limit = getattr(settings, 'API_RATE_LIMIT', 100)
            window = getattr(settings, 'API_RATE_WINDOW', 3600)  # 1 hour
        
        # Create cache key
        cache_key = f"rate_limit:{client_ip}:{path[:50]}"
        
        # Get current count
        current_count = cache.get(cache_key, 0)
        
        if current_count >= limit:
            return True
        
        # Increment counter
        cache.set(cache_key, current_count + 1, window)
        return False
    
    def detect_threats(self, request):
        """Detect potential security threats in request."""
        threats = []
        
        # SQL injection detection
        if self.threat_detector.detect_sql_injection(request):
            threats.append('sql_injection')
        
        # XSS detection
        if self.threat_detector.detect_xss(request):
            threats.append('xss')
        
        # Path traversal detection
        if self.threat_detector.detect_path_traversal(request):
            threats.append('path_traversal')
        
        # Suspicious user agent
        if self.detect_suspicious_user_agent(request):
            threats.append('suspicious_user_agent')
        
        # Large payload detection
        if self.detect_large_payload(request):
            threats.append('large_payload')
        
        return threats
    
    def detect_suspicious_user_agent(self, request):
        """Detect suspicious user agents."""
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        suspicious_patterns = [
            r'sqlmap',
            r'nikto',
            r'nmap',
            r'masscan',
            r'zap',
            r'burp',
            r'scanner',
            r'bot.*attack',
            r'hack.*tool'
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, user_agent, re.IGNORECASE):
                return True
        
        return False
    
    def detect_large_payload(self, request):
        """Detect unusually large request payloads."""
        max_size = getattr(settings, 'MAX_REQUEST_SIZE', 10 * 1024 * 1024)  # 10MB
        
        content_length = request.META.get('CONTENT_LENGTH')
        if content_length:
            try:
                size = int(content_length)
                return size > max_size
            except ValueError:
                pass
        
        return False
    
    def handle_threats(self, request, threats):
        """Handle detected security threats."""
        client_ip = request._client_ip
        
        for threat in threats:
            # Log security event
            self.log_security_event(
                request,
                f'threat_detected_{threat}',
                'high',
                f"Security threat detected: {threat}"
            )
            
            # Increment threat counter for IP
            threat_key = f"threats:{client_ip}"
            threat_count = cache.get(threat_key, 0) + 1
            cache.set(threat_key, threat_count, 3600)  # 1 hour
            
            # Block IP if too many threats
            if threat_count >= getattr(settings, 'THREAT_BLOCK_THRESHOLD', 5):
                self.block_ip(client_ip, f"Multiple threats detected: {threats}")
    
    def block_ip(self, ip_address, reason):
        """Block an IP address."""
        # Add to blocked IPs cache
        blocked_ips = cache.get('blocked_ips', set())
        blocked_ips.add(ip_address)
        cache.set('blocked_ips', blocked_ips, 86400)  # 24 hours
        
        logger.critical(f"Blocked IP {ip_address}: {reason}")
        
        # Create security event
        SecurityEvent.objects.create(
            event_type='ip_blocked',
            severity='critical',
            description=f"IP address blocked: {reason}",
            ip_address=ip_address,
            metadata={'reason': reason}
        )
    
    def validate_session_security(self, request):
        """Validate session security and handle concurrent sessions with privacy controls."""
        user = request.user
        session_key = request.session.session_key
        
        if not session_key:
            return
        
        try:
            # Prepare session data based on privacy settings
            session_defaults = {
                'last_activity': timezone.now()
            }
            
            # Only store IP if session tracking is enabled
            if getattr(settings, 'SECURITY_TRACK_SESSION_IPS', False):
                session_defaults['ip_address'] = request._client_ip
            
            # Only store user agent if enabled
            if getattr(settings, 'SECURITY_TRACK_USER_AGENTS', False):
                session_defaults['user_agent'] = request.META.get('HTTP_USER_AGENT', '')
            
            # Update or create session record
            user_session, created = UserSession.objects.get_or_create(
                user=user,
                session_key=session_key,
                defaults=session_defaults
            )
            
            if not created:
                # Check for session hijacking only if IP tracking is enabled
                if getattr(settings, 'SECURITY_TRACK_SESSION_IPS', False) and hasattr(user_session, 'ip_address'):
                    current_ip = request._client_ip
                    if user_session.ip_address and user_session.ip_address != current_ip:
                        self.handle_session_hijacking(request, user_session)
                        return
                
                # Update last activity
                user_session.last_activity = timezone.now()
                user_session.save()
            
            # Check for concurrent sessions (optional enforcement)
            max_sessions = getattr(settings, 'MAX_CONCURRENT_SESSIONS', 5)
            active_sessions = UserSession.objects.filter(
                user=user,
                is_active=True
            ).count()
            
            if active_sessions > max_sessions:
                # Deactivate oldest sessions
                oldest_sessions = UserSession.objects.filter(
                    user=user,
                    is_active=True
                ).order_by('last_activity')[:-max_sessions]
                
                for session in oldest_sessions:
                    session.is_active = False
                    session.logout_reason = 'forced'
                    session.save()
                    
                    # Log security event
                    self.log_security_event(
                        request,
                        'forced_logout',
                        'medium',
                        'Session terminated due to concurrent session limit'
                    )
        
        except Exception as e:
            logger.error(f"Session validation error: {e}")
    
    def handle_session_hijacking(self, request, user_session):
        """Handle potential session hijacking."""
        # Log security event
        self.log_security_event(
            request,
            'session_hijacking_attempt',
            'critical',
            f"Potential session hijacking detected for user {request.user.username if hasattr(request, 'user') and request.user.is_authenticated else 'unknown'}"
        )
        
        # Invalidate session
        user_session.is_active = False
        user_session.save()
        
        # Force logout
        from django.contrib.auth import logout
        logout(request)
    
    def add_security_headers(self, response):
        """Add security headers to response."""
        # Content Security Policy
        if not response.get('Content-Security-Policy'):
            if hasattr(settings, 'CONTENT_SECURITY_POLICY'):
                csp_setting = getattr(settings, 'CONTENT_SECURITY_POLICY')
                if isinstance(csp_setting, dict):
                    csp_parts = []
                    for directive, sources in csp_setting.items():
                        if isinstance(sources, str):
                            csp_parts.append(f"{directive} {sources}")
                        elif isinstance(sources, list):
                            csp_parts.append(f"{directive} {' '.join(sources)}")
                    response['Content-Security-Policy'] = '; '.join(csp_parts)
                else:
                    response['Content-Security-Policy'] = csp_setting
            else:
                response['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        
        # X-Frame-Options
        if not response.get('X-Frame-Options'):
            response['X-Frame-Options'] = 'DENY'
        
        # X-Content-Type-Options
        if not response.get('X-Content-Type-Options'):
            response['X-Content-Type-Options'] = 'nosniff'
        
        # X-XSS-Protection
        if not response.get('X-XSS-Protection'):
            response['X-XSS-Protection'] = '1; mode=block'
        
        # Referrer Policy
        if not response.get('Referrer-Policy'):
            response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy
        if not response.get('Permissions-Policy'):
            if hasattr(settings, 'SECURE_PERMISSIONS_POLICY'):
                policy_parts = []
                for directive, sources in settings.SECURE_PERMISSIONS_POLICY.items():
                    if isinstance(sources, list):
                        if sources:
                            sources_str = ' '.join(f'"{source}"' if source != 'self' else 'self' for source in sources)
                            policy_parts.append(f"{directive}=({sources_str})")
                        else:
                            policy_parts.append(f"{directive}=()")
                response['Permissions-Policy'] = ', '.join(policy_parts)
            else:
                response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        return response
    
    def log_request(self, request, response):
        """Log request for security monitoring."""
        # Calculate request duration
        duration = time.time() - getattr(request, '_security_start_time', time.time())
        
        # Log suspicious requests
        if self.is_suspicious_request(request, response, duration):
            self.log_security_event(
                request,
                'suspicious_request',
                'medium',
                f"Suspicious request detected: {request.method} {request.path}"
            )
    
    def is_suspicious_request(self, request, response, duration):
        """Determine if request is suspicious."""
        # Very slow requests
        if duration > 30:
            return True
        
        # Requests to non-existent endpoints
        if response.status_code == 404 and request.path.endswith(('.php', '.asp', '.jsp')):
            return True
        
        # Skip suspicious parameter check for legitimate API endpoints
        if request.path.startswith('/api/institutions/search/'):
            return False
        
        # Requests with suspicious parameters
        suspicious_params = ['union', 'script', 'alert', '../', '..\\', 'eval(']
        query_string = request.META.get('QUERY_STRING', '')
        
        for param in suspicious_params:
            if param.lower() in query_string.lower():
                return True
        
        return False
    
    def log_security_event(self, request, event_type, severity, description):
        """Log a security event with privacy-first data minimization."""
        try:
            # Apply data minimization based on settings
            ip_address = None
            user_agent = None
            metadata = {}
            
            # Only collect IP if explicitly enabled
            if getattr(settings, 'SECURITY_LOG_IP_ADDRESSES', False):
                ip_address = request._client_ip
            
            # Only collect user agent if explicitly enabled
            if getattr(settings, 'SECURITY_LOG_USER_AGENTS', False):
                user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            # Only collect detailed metadata if enabled
            if getattr(settings, 'SECURITY_LOG_DETAILED_METADATA', False):
                metadata = {
                    'path': request.path,
                    'method': request.method,
                    'query_string': request.META.get('QUERY_STRING', ''),
                    'referer': request.META.get('HTTP_REFERER', '')
                }
            else:
                # Minimal metadata for security purposes
                metadata = {
                    'path': request.path,
                    'method': request.method
                }
            
            SecurityEvent.objects.create(
                event_type=event_type,
                severity=severity,
                description=description,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"Failed to log security event: {str(e)}")


class RateLimitMiddleware(MiddlewareMixin):
    """Advanced rate limiting middleware."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """Apply rate limiting to requests."""
        # Skip rate limiting for certain paths
        if self.should_skip_rate_limiting(request):
            return None
        
        # Get rate limit configuration
        limit_config = self.get_rate_limit_config(request)
        
        if not limit_config:
            return None
        
        # Check rate limit
        if self.is_rate_limited(request, limit_config):
            return self.rate_limit_response(request)
        
        return None
    
    def should_skip_rate_limiting(self, request):
        """Determine if rate limiting should be skipped."""
        # Skip rate limiting for localhost in development mode
        if getattr(settings, 'SKIP_SECURITY_FOR_LOCALHOST', False):
            client_ip = self.get_client_ip(request)
            localhost_ips = getattr(settings, 'LOCALHOST_ALLOWED_IPS', ['127.0.0.1', '::1'])
            if client_ip in localhost_ips or client_ip == 'localhost':
                return True
        
        # Always skip rate limiting for admin paths
        if request.path.startswith('/admin/'):
            return True
            
        skip_paths = getattr(settings, 'RATE_LIMIT_SKIP_PATHS', [])
        
        for path in skip_paths:
            if request.path.startswith(path):
                return True
        
        return False
    
    def get_rate_limit_config(self, request):
        """Get rate limit configuration for request."""
        # Default configuration
        config = {
            'requests': 100,
            'window': 3600,  # 1 hour
            'key_func': self.default_key_func
        }
        
        # Path-specific configurations
        path_configs = getattr(settings, 'RATE_LIMIT_CONFIGS', {})
        
        for path_pattern, path_config in path_configs.items():
            if re.match(path_pattern, request.path):
                config.update(path_config)
                break
        
        return config
    
    def default_key_func(self, request):
        """Default function to generate rate limit key."""
        if hasattr(request, 'user') and request.user.is_authenticated:
            return f"user:{request.user.pk}"
        else:
            client_ip = self.get_client_ip(request)
            return f"ip:{client_ip}"
    
    def get_client_ip(self, request):
        """Extract client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def is_rate_limited(self, request, config):
        """Check if request exceeds rate limit."""
        # Generate cache key
        key_func = config.get('key_func', self.default_key_func)
        base_key = key_func(request)
        cache_key = f"rate_limit:{base_key}:{request.path[:50]}"
        
        # Get current count
        current_count = cache.get(cache_key, 0)
        
        # Check limit
        if current_count >= config['requests']:
            return True
        
        # Increment counter
        cache.set(cache_key, current_count + 1, config['window'])
        return False
    
    def rate_limit_response(self, request):
        """Return rate limit exceeded response."""
        # Log rate limit event with privacy controls
        try:
            # Apply data minimization
            ip_address = None
            user_agent = None
            
            if getattr(settings, 'SECURITY_LOG_IP_ADDRESSES', False):
                ip_address = self.get_client_ip(request)
            
            if getattr(settings, 'SECURITY_LOG_USER_AGENTS', False):
                user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            SecurityEvent.objects.create(
                event_type='rate_limit_exceeded',
                severity='medium',
                description=f"Rate limit exceeded for {request.path}",
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    'path': request.path,
                    'method': request.method
                }
            )
        except Exception:
            pass
        
        return JsonResponse(
            {
                'error': 'Rate limit exceeded',
                'message': 'Too many requests. Please try again later.'
            },
            status=429
        )


class CSRFSecurityMiddleware(MiddlewareMixin):
    """Enhanced CSRF protection middleware."""
    
    def process_request(self, request):
        """Enhanced CSRF validation."""
        # Skip for safe methods
        if request.method in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            return None
        
        # Check for CSRF token in AJAX requests
        if request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            csrf_token = request.META.get('HTTP_X_CSRFTOKEN')
            if not csrf_token:
                return JsonResponse(
                    {'error': 'CSRF token missing'}, 
                    status=403
                )
        
        return None


class SessionSecurityMiddleware(MiddlewareMixin):
    """Enhanced session security middleware."""
    
    def process_request(self, request):
        """Validate session security."""
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        
        session = request.session
        
        # Check session age
        max_age = getattr(settings, 'SESSION_MAX_AGE', 86400)  # 24 hours
        session_age = time.time() - session.get('_session_start_time', time.time())
        
        if session_age > max_age:
            # Session too old, force logout
            from django.contrib.auth import logout
            logout(request)
            return JsonResponse(
                {'error': 'Session expired'}, 
                status=401
            )
        
        # Check for session fixation
        if not session.get('_session_validated'):
            # Regenerate session key
            session.cycle_key()
            session['_session_validated'] = True
            session['_session_start_time'] = time.time()
        
        return None


class IPWhitelistMiddleware(MiddlewareMixin):
    """IP whitelist middleware for admin access."""
    
    def process_request(self, request):
        """Check IP whitelist for admin access."""
        # Only apply to admin paths
        if not request.path.startswith('/admin/'):
            return None
        
        # Get client IP
        client_ip = self.get_client_ip(request)
        
        # Allow localhost access in development mode
        if getattr(settings, 'SKIP_SECURITY_FOR_LOCALHOST', False):
            localhost_ips = getattr(settings, 'LOCALHOST_ALLOWED_IPS', ['127.0.0.1', '::1'])
            if client_ip in localhost_ips or client_ip == 'localhost':
                return None
        
        # Get allowed IPs
        allowed_ips = getattr(settings, 'ADMIN_ALLOWED_IPS', [])
        
        if not allowed_ips:
            return None  # No restrictions
        
        # Check if IP is allowed
        if client_ip not in allowed_ips:
            logger.warning(f"Admin access denied for IP: {client_ip}")
            return HttpResponseForbidden("Access denied")
        
        return None
    
    def get_client_ip(self, request):
        """Extract client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip