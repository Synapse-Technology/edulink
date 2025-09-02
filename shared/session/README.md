# Session Management Module

A comprehensive distributed session management system for the Edulink microservices platform. This module provides secure, scalable session handling with JWT token support, Redis-based storage, and extensive middleware capabilities.

## Features

- **Distributed Sessions**: Redis-based session storage for microservices scalability
- **JWT Token Management**: Secure token generation, validation, and revocation
- **Session Security**: IP tracking, device fingerprinting, and location awareness
- **Automatic Cleanup**: Expired session removal and maintenance
- **Rate Limiting**: Built-in rate limiting with configurable rules
- **Middleware Support**: Django middleware for automatic session handling
- **Caching**: Intelligent caching for performance optimization
- **Security Headers**: Comprehensive security header management
- **Activity Logging**: User activity tracking and monitoring

## Components

### Core Components

1. **SessionManager** (`manager.py`)
   - `SessionManagerInterface`: Abstract interface for session management
   - `RedisSessionManager`: Production Redis-based implementation
   - `InMemorySessionManager`: Development/testing implementation

2. **Middleware** (`middleware.py`)
   - `SessionManagementMiddleware`: Automatic session validation
   - `TokenRefreshMiddleware`: Automatic token refresh
   - `RateLimitMiddleware`: Request rate limiting
   - `SecurityHeadersMiddleware`: Security header injection

3. **Utilities** (`utils.py`)
   - Session creation and management utilities
   - Authentication decorators
   - Caching helpers
   - Activity logging

4. **Configuration** (`config.py`)
   - `SessionConfig`: Session management settings
   - `SecurityConfig`: Security-related settings
   - `MonitoringConfig`: Logging and monitoring settings

## Installation

### Dependencies

Add these to your `requirements.txt`:

```txt
redis>=4.0.0
PyJWT>=2.0.0
cryptography>=3.0.0
django>=3.2.0
```

### Environment Variables

Set up the following environment variables:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=your_redis_password

# JWT Configuration
JWT_SECRET=your-very-secure-jwt-secret-key-at-least-32-characters

# Session Settings
SESSION_DURATION_HOURS=24
TOKEN_DURATION_HOURS=1
TOKEN_REFRESH_THRESHOLD_MINUTES=15

# Security Settings
REQUIRE_HTTPS=true
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# Monitoring
LOG_LEVEL=INFO
ENABLE_METRICS=true
```

## Usage

### Basic Setup

1. **Add to Django Settings**:

```python
# settings.py
from shared.session.config import get_session_settings

# Get session management settings
session_settings = get_session_settings()
django_settings = session_settings.get_django_settings()

# Update your Django settings
locals().update(django_settings)

# Add middleware
MIDDLEWARE = [
    'shared.session.middleware.SecurityHeadersMiddleware',
    'shared.session.middleware.SessionManagementMiddleware',
    'shared.session.middleware.TokenRefreshMiddleware',
    'shared.session.middleware.RateLimitMiddleware',
    # ... your other middleware
]
```

2. **Initialize Session Manager**:

```python
from shared.session.manager import create_session_manager

# Create session manager
session_manager = create_session_manager(
    redis_url='redis://localhost:6379/0',
    jwt_secret='your-jwt-secret'
)
```

### Creating Sessions

```python
from shared.session.utils import create_user_session, generate_access_token

# Create a new session
session_data = create_user_session(
    request=request,
    user_id='user123',
    duration=timedelta(hours=24)
)

# Generate access token
access_token = generate_access_token(
    user_id='user123',
    session_id=session_data.session_id,
    scopes=['read', 'write']
)
```

### Using Decorators

```python
from shared.session.utils import (
    require_authentication,
    require_session,
    require_scopes,
    rate_limit,
    log_activity
)

@require_authentication
@require_scopes('read', 'write')
@rate_limit(requests=100, window=3600)
@log_activity('profile_view', 'User viewed profile')
def get_user_profile(request):
    user_id = request.user_id
    # Your view logic here
    return JsonResponse({'user_id': user_id})
```

### Session Context Manager

```python
from shared.session.utils import SessionContext

with SessionContext(user_id='user123', request=request) as ctx:
    token = ctx.get_token()
    session_id = ctx.get_session_id()
    # Session is automatically cleaned up on exit
```

### Login/Logout Helpers

```python
from shared.session.utils import create_login_response, create_logout_response

# Login
def login_view(request):
    # Authenticate user...
    user_id = 'user123'
    
    response_data = create_login_response(
        user_id=user_id,
        request=request,
        additional_data={'username': 'john_doe'}
    )
    
    return JsonResponse(response_data)

# Logout
def logout_view(request):
    response_data = create_logout_response(request)
    return JsonResponse(response_data)
```

## API Reference

### SessionManagerInterface

```python
class SessionManagerInterface(ABC):
    async def create_session(self, user_id: str, ip_address: str, 
                           user_agent: str, **kwargs) -> SessionData
    async def get_session(self, session_id: str) -> Optional[SessionData]
    async def update_session(self, session_id: str, **kwargs) -> bool
    async def terminate_session(self, session_id: str) -> bool
    async def generate_token(self, user_id: str, **kwargs) -> TokenData
    async def validate_token(self, token: str) -> Optional[TokenData]
    async def revoke_token(self, token: str) -> bool
```

### SessionData

```python
@dataclass
class SessionData:
    session_id: str
    user_id: str
    ip_address: str
    user_agent: str
    device_type: str
    location: Optional[str]
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    status: SessionStatus
    metadata: Dict[str, Any]
```

### TokenData

```python
@dataclass
class TokenData:
    token: str
    token_type: str
    user_id: str
    session_id: Optional[str]
    scopes: List[str]
    issued_at: datetime
    expires_at: datetime
    metadata: Dict[str, Any]
```

## Configuration

### Session Configuration

```python
from shared.session.config import SessionConfig

config = SessionConfig(
    redis_url='redis://localhost:6379/0',
    jwt_secret='your-secret-key',
    default_session_duration=timedelta(hours=24),
    default_token_duration=timedelta(hours=1),
    rate_limits={
        'default': {'requests': 100, 'window': 3600},
        'authenticated': {'requests': 1000, 'window': 3600}
    }
)
```

### Security Configuration

```python
from shared.session.config import SecurityConfig

security = SecurityConfig(
    min_password_length=8,
    max_login_attempts=5,
    lockout_duration=timedelta(minutes=30),
    require_2fa=False,
    force_logout_on_password_change=True
)
```

## Middleware Configuration

### Session Management Middleware

Automatically validates sessions and tokens for incoming requests:

- Extracts tokens from Authorization header or cookies
- Validates token signature and expiration
- Checks session status and activity
- Updates session last activity
- Adds user information to request object

### Token Refresh Middleware

Automatically refreshes tokens that are close to expiration:

- Checks token expiration time
- Generates new token if within refresh threshold
- Adds new token to response headers
- Optionally sets new token as cookie

### Rate Limit Middleware

Implements rate limiting based on user or IP:

- Configurable rate limits per endpoint
- Different limits for authenticated vs anonymous users
- Redis-based counter storage
- Automatic cleanup of expired counters

## Security Features

### Token Security

- JWT tokens with configurable expiration
- Token blacklisting for immediate revocation
- Scope-based access control
- Automatic token refresh

### Session Security

- IP address tracking and validation
- Device fingerprinting
- Location awareness
- Concurrent session detection
- Automatic session cleanup

### Security Headers

- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy

## Monitoring and Logging

### Session Metrics

- Active session count
- Session duration statistics
- Token usage patterns
- Login/logout events
- Failed authentication attempts

### Activity Logging

- User activity tracking
- Security event logging
- Performance monitoring
- Error tracking

### Health Checks

```python
# Health check endpoint
def health_check():
    session_manager = get_session_manager()
    # Check Redis connectivity
    # Check session manager status
    return {'status': 'healthy'}
```

## Testing

### Unit Tests

```python
from shared.session.manager import InMemorySessionManager

# Use in-memory manager for testing
session_manager = InMemorySessionManager('test-secret')

# Test session creation
session = await session_manager.create_session(
    user_id='test_user',
    ip_address='127.0.0.1',
    user_agent='test-agent'
)

assert session.user_id == 'test_user'
assert session.is_active()
```

### Integration Tests

```python
from django.test import TestCase
from shared.session.utils import create_user_session

class SessionIntegrationTest(TestCase):
    def test_session_creation(self):
        # Test with real Redis (if available)
        session = create_user_session(
            request=self.request,
            user_id='test_user'
        )
        self.assertIsNotNone(session.session_id)
```

## Performance Considerations

### Redis Optimization

- Use Redis clustering for high availability
- Configure appropriate memory policies
- Monitor Redis memory usage
- Use connection pooling

### Caching Strategy

- Cache frequently accessed user data
- Use appropriate cache timeouts
- Implement cache invalidation strategies
- Monitor cache hit rates

### Session Cleanup

- Regular cleanup of expired sessions
- Batch processing for large datasets
- Background task scheduling
- Monitor cleanup performance

## Troubleshooting

### Common Issues

1. **Redis Connection Errors**
   - Check Redis server status
   - Verify connection string
   - Check network connectivity

2. **JWT Token Errors**
   - Verify JWT secret configuration
   - Check token expiration
   - Validate token format

3. **Session Validation Failures**
   - Check session expiration
   - Verify session data integrity
   - Check Redis data persistence

### Debug Mode

Enable debug mode for additional logging:

```python
# settings.py
DEBUG = True
LOG_LEVEL = 'DEBUG'
```

### Monitoring

Monitor key metrics:

- Session creation/termination rates
- Token validation success/failure rates
- Redis performance metrics
- Middleware processing times

## Migration Guide

### From Django Sessions

1. Replace Django session middleware with session management middleware
2. Update authentication views to use session utilities
3. Migrate existing session data to Redis
4. Update frontend to handle JWT tokens

### From Custom Session Management

1. Implement SessionManagerInterface for existing system
2. Gradually migrate to new session format
3. Update middleware configuration
4. Test thoroughly before full deployment

## Best Practices

1. **Security**
   - Use strong JWT secrets (32+ characters)
   - Enable HTTPS in production
   - Implement proper rate limiting
   - Monitor for suspicious activity

2. **Performance**
   - Use Redis clustering for scalability
   - Implement proper caching strategies
   - Monitor session cleanup performance
   - Optimize token refresh logic

3. **Monitoring**
   - Log security events
   - Monitor session metrics
   - Set up alerting for anomalies
   - Regular security audits

4. **Maintenance**
   - Regular Redis maintenance
   - Monitor memory usage
   - Update dependencies regularly
   - Test disaster recovery procedures