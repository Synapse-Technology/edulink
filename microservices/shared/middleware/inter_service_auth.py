"""Middleware for inter-service authentication and request validation."""

import logging
import json
import uuid
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.core.cache import cache
import jwt
import requests


logger = logging.getLogger(__name__)


class InterServiceAuthMiddleware(MiddlewareMixin):
    """Middleware for handling inter-service authentication."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.service_token_cache_timeout = 300  # 5 minutes
        self.user_token_cache_timeout = 900  # 15 minutes
        
        # Service endpoints that don't require authentication
        self.public_endpoints = [
            '/health/',
            '/api/v1/auth/login',
            '/api/v1/auth/register',
            '/api/v1/auth/refresh',
            '/api/v1/institutions',
            '/api/v1/institutions/search',
            '/api/v1/internships',
        ]
        
        # Internal service endpoints that require system tokens
        self.system_endpoints = [
            '/api/v1/auth/validate',
            '/api/v1/notifications',
            '/api/v1/notifications/email',
        ]
        
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process incoming request for authentication."""
        # Skip authentication for public endpoints
        if self._is_public_endpoint(request.path):
            return None
        
        # Add correlation ID if not present
        correlation_id = request.META.get('HTTP_X_CORRELATION_ID')
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
            request.META['HTTP_X_CORRELATION_ID'] = correlation_id
        
        # Check for authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return self._unauthorized_response("Missing authorization header")
        
        # Extract token
        try:
            token_type, token = auth_header.split(' ', 1)
            if token_type.lower() != 'bearer':
                return self._unauthorized_response("Invalid token type")
        except ValueError:
            return self._unauthorized_response("Invalid authorization header format")
        
        # Validate token
        if self._is_system_endpoint(request.path):
            # System endpoint - validate service token
            validation_result = self._validate_service_token(token)
        else:
            # Regular endpoint - validate user token
            validation_result = self._validate_user_token(token)
        
        if not validation_result['valid']:
            return self._unauthorized_response(validation_result['error'])
        
        # Add user/service info to request
        request.auth_info = validation_result
        request.correlation_id = correlation_id
        
        return None
    
    def process_response(self, request, response):
        """Process outgoing response."""
        # Add correlation ID to response headers
        correlation_id = getattr(request, 'correlation_id', None)
        if correlation_id:
            response['X-Correlation-ID'] = correlation_id
        
        # Add service identification
        service_name = getattr(settings, 'SERVICE_NAME', 'unknown')
        response['X-Service'] = service_name
        
        return response
    
    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public."""
        return any(path.startswith(endpoint) for endpoint in self.public_endpoints)
    
    def _is_system_endpoint(self, path: str) -> bool:
        """Check if endpoint requires system authentication."""
        return any(path.startswith(endpoint) for endpoint in self.system_endpoints)
    
    def _validate_service_token(self, token: str) -> Dict[str, Any]:
        """Validate service-to-service token."""
        cache_key = f"service_token:{hash(token)}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            return cached_result
        
        try:
            # Decode JWT token
            secret_key = getattr(settings, 'SERVICE_JWT_SECRET', 'default-secret')
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            
            # Validate token claims
            if payload.get('type') != 'service':
                return {'valid': False, 'error': 'Invalid token type'}
            
            if payload.get('exp', 0) < datetime.utcnow().timestamp():
                return {'valid': False, 'error': 'Token expired'}
            
            result = {
                'valid': True,
                'type': 'service',
                'service_name': payload.get('service_name'),
                'permissions': payload.get('permissions', []),
                'issued_at': payload.get('iat'),
                'expires_at': payload.get('exp')
            }
            
            # Cache the result
            cache.set(cache_key, result, self.service_token_cache_timeout)
            
            return result
            
        except jwt.ExpiredSignatureError:
            return {'valid': False, 'error': 'Token expired'}
        except jwt.InvalidTokenError:
            return {'valid': False, 'error': 'Invalid token'}
        except Exception as e:
            logger.error(f"Error validating service token: {str(e)}")
            return {'valid': False, 'error': 'Token validation failed'}
    
    def _validate_user_token(self, token: str) -> Dict[str, Any]:
        """Validate user authentication token."""
        cache_key = f"user_token:{hash(token)}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            return cached_result
        
        # Call auth service to validate token
        try:
            auth_service_url = getattr(settings, 'AUTH_SERVICE_URL', 'http://localhost:8001')
            validation_url = f"{auth_service_url}/api/v1/auth/validate"
            
            # Create service token for internal call
            service_token = self._create_service_token()
            
            response = requests.post(
                validation_url,
                json={'token': token},
                headers={
                    'Authorization': f'Bearer {service_token}',
                    'Content-Type': 'application/json'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                validation_data = response.json()
                
                if validation_data.get('valid'):
                    result = {
                        'valid': True,
                        'type': 'user',
                        'user_id': validation_data.get('user_id'),
                        'role': validation_data.get('role'),
                        'email': validation_data.get('email'),
                        'is_active': validation_data.get('is_active', True)
                    }
                    
                    # Cache the result
                    cache.set(cache_key, result, self.user_token_cache_timeout)
                    
                    return result
                else:
                    return {'valid': False, 'error': 'Invalid token'}
            else:
                return {'valid': False, 'error': 'Token validation service unavailable'}
                
        except requests.exceptions.Timeout:
            logger.error("Timeout validating user token with auth service")
            return {'valid': False, 'error': 'Validation timeout'}
        except requests.exceptions.ConnectionError:
            logger.error("Connection error validating user token with auth service")
            return {'valid': False, 'error': 'Validation service unavailable'}
        except Exception as e:
            logger.error(f"Error validating user token: {str(e)}")
            return {'valid': False, 'error': 'Token validation failed'}
    
    def _create_service_token(self) -> str:
        """Create a service token for internal API calls."""
        secret_key = getattr(settings, 'SERVICE_JWT_SECRET', 'default-secret')
        service_name = getattr(settings, 'SERVICE_NAME', 'unknown')
        
        payload = {
            'type': 'service',
            'service_name': service_name,
            'permissions': ['validate_tokens'],
            'iat': datetime.utcnow().timestamp(),
            'exp': (datetime.utcnow() + timedelta(minutes=5)).timestamp()
        }
        
        return jwt.encode(payload, secret_key, algorithm='HS256')
    
    def _unauthorized_response(self, message: str) -> JsonResponse:
        """Return unauthorized response."""
        return JsonResponse(
            {
                'error': 'Unauthorized',
                'message': message,
                'timestamp': datetime.utcnow().isoformat()
            },
            status=401
        )


class RequestLoggingMiddleware(MiddlewareMixin):
    """Middleware for logging inter-service requests."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """Log incoming request."""
        # Skip logging for health checks and static files
        if request.path.startswith('/health/') or request.path.startswith('/static/'):
            return None
        
        correlation_id = getattr(request, 'correlation_id', 'unknown')
        auth_info = getattr(request, 'auth_info', {})
        
        log_data = {
            'event': 'request_received',
            'correlation_id': correlation_id,
            'method': request.method,
            'path': request.path,
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'remote_addr': self._get_client_ip(request),
            'auth_type': auth_info.get('type'),
            'user_id': auth_info.get('user_id'),
            'service_name': auth_info.get('service_name'),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.info(f"Request received: {json.dumps(log_data)}")
        
        # Store start time for response logging
        request._start_time = datetime.utcnow()
        
        return None
    
    def process_response(self, request, response):
        """Log outgoing response."""
        # Skip logging for health checks and static files
        if request.path.startswith('/health/') or request.path.startswith('/static/'):
            return response
        
        start_time = getattr(request, '_start_time', datetime.utcnow())
        duration = (datetime.utcnow() - start_time).total_seconds() * 1000  # milliseconds
        
        correlation_id = getattr(request, 'correlation_id', 'unknown')
        auth_info = getattr(request, 'auth_info', {})
        
        log_data = {
            'event': 'response_sent',
            'correlation_id': correlation_id,
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(duration, 2),
            'user_id': auth_info.get('user_id'),
            'service_name': auth_info.get('service_name'),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Log level based on status code
        if response.status_code >= 500:
            logger.error(f"Response sent: {json.dumps(log_data)}")
        elif response.status_code >= 400:
            logger.warning(f"Response sent: {json.dumps(log_data)}")
        else:
            logger.info(f"Response sent: {json.dumps(log_data)}")
        
        return response
    
    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RateLimitingMiddleware(MiddlewareMixin):
    """Middleware for rate limiting inter-service requests."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Rate limits (requests per minute)
        self.rate_limits = {
            'user': 100,  # Regular users
            'service': 1000,  # Service-to-service
            'admin': 500,  # Admin users
            'anonymous': 20  # Unauthenticated requests
        }
        
        super().__init__(get_response)
    
    def process_request(self, request):
        """Check rate limits for incoming request."""
        # Skip rate limiting for health checks
        if request.path.startswith('/health/'):
            return None
        
        # Determine rate limit key
        auth_info = getattr(request, 'auth_info', {})
        
        if auth_info.get('type') == 'service':
            rate_limit_key = f"rate_limit:service:{auth_info.get('service_name')}"
            limit = self.rate_limits['service']
        elif auth_info.get('type') == 'user':
            user_role = auth_info.get('role', 'user')
            rate_limit_key = f"rate_limit:user:{auth_info.get('user_id')}"
            limit = self.rate_limits.get(user_role, self.rate_limits['user'])
        else:
            # Anonymous request
            client_ip = self._get_client_ip(request)
            rate_limit_key = f"rate_limit:ip:{client_ip}"
            limit = self.rate_limits['anonymous']
        
        # Check current request count
        current_count = cache.get(rate_limit_key, 0)
        
        if current_count >= limit:
            return JsonResponse(
                {
                    'error': 'Rate limit exceeded',
                    'message': f'Too many requests. Limit: {limit} per minute',
                    'retry_after': 60,
                    'timestamp': datetime.utcnow().isoformat()
                },
                status=429
            )
        
        # Increment request count
        cache.set(rate_limit_key, current_count + 1, 60)  # 1 minute window
        
        return None
    
    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ServiceTokenGenerator:
    """Utility class for generating service tokens."""
    
    @staticmethod
    def generate_service_token(
        service_name: str,
        permissions: list = None,
        expires_in_minutes: int = 60
    ) -> str:
        """Generate a service token."""
        secret_key = getattr(settings, 'SERVICE_JWT_SECRET', 'default-secret')
        
        payload = {
            'type': 'service',
            'service_name': service_name,
            'permissions': permissions or [],
            'iat': datetime.utcnow().timestamp(),
            'exp': (datetime.utcnow() + timedelta(minutes=expires_in_minutes)).timestamp()
        }
        
        return jwt.encode(payload, secret_key, algorithm='HS256')
    
    @staticmethod
    def validate_service_token(token: str) -> Dict[str, Any]:
        """Validate a service token."""
        try:
            secret_key = getattr(settings, 'SERVICE_JWT_SECRET', 'default-secret')
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            
            if payload.get('type') != 'service':
                return {'valid': False, 'error': 'Invalid token type'}
            
            return {
                'valid': True,
                'service_name': payload.get('service_name'),
                'permissions': payload.get('permissions', []),
                'issued_at': payload.get('iat'),
                'expires_at': payload.get('exp')
            }
            
        except jwt.ExpiredSignatureError:
            return {'valid': False, 'error': 'Token expired'}
        except jwt.InvalidTokenError:
            return {'valid': False, 'error': 'Invalid token'}
        except Exception as e:
            return {'valid': False, 'error': f'Validation failed: {str(e)}'}