# API Contracts Documentation

This directory contains the API contracts that define the interfaces between microservices in the Edulink platform. These contracts ensure consistent communication patterns and data structures across all services.

## Overview

The API contracts are organized into several modules:

- **auth_service.py** - Authentication service interface
- **user_service.py** - User management service interface
- **service_communication.py** - Inter-service communication patterns
- **api_gateway.py** - API Gateway routing and middleware interface

## Contract Structure

Each contract module follows a consistent structure:

1. **Data Classes** - Define request/response structures
2. **Enums** - Define standard values and types
3. **Contract Interface** - Define service methods
4. **Error Codes** - Standard error codes for the service

## Authentication Service Contract

### Purpose
Defines the interface for authentication operations including login, token validation, password management, and two-factor authentication.

### Key Components

#### Token Types
- `ACCESS` - Short-lived access tokens
- `REFRESH` - Long-lived refresh tokens
- `EMAIL_VERIFICATION` - Email verification tokens
- `PASSWORD_RESET` - Password reset tokens
- `EMAIL_CHANGE` - Email change confirmation tokens

#### Authentication Methods
- `EMAIL_PASSWORD` - Standard email/password authentication
- `USERNAME_PASSWORD` - Username/password authentication
- `SOCIAL_GOOGLE` - Google OAuth authentication
- `SOCIAL_GITHUB` - GitHub OAuth authentication
- `TWO_FACTOR` - Two-factor authentication

#### Main Operations
- `authenticate()` - Authenticate user credentials
- `validate_token()` - Validate authentication tokens
- `refresh_token()` - Refresh access tokens
- `logout()` - Logout and invalidate sessions
- `change_password()` - Change user password
- `setup_two_factor()` - Setup 2FA for user
- `verify_two_factor()` - Verify 2FA codes

### Usage Example

```python
from shared.contracts.auth_service import (
    AuthServiceContract, 
    AuthenticationRequest, 
    AuthenticationMethod
)

# Authenticate a user
auth_request = AuthenticationRequest(
    identifier="user@example.com",
    password="password123",
    method=AuthenticationMethod.EMAIL_PASSWORD,
    ip_address="192.168.1.1",
    user_agent="Mozilla/5.0..."
)

response = await auth_service.authenticate(auth_request)
if response.success:
    access_token = response.access_token
    user_id = response.user_id
```

## User Service Contract

### Purpose
Defines the interface for user management operations including registration, profile management, search, and user administration.

### Key Components

#### User Roles
- `STUDENT` - Student users
- `EMPLOYER` - Employer users
- `INSTITUTION_ADMIN` - Institution administrators
- `SYSTEM_ADMIN` - System administrators

#### Profile Types
- `STUDENT` - Student profiles
- `EMPLOYER` - Employer profiles
- `INSTITUTION` - Institution admin profiles

#### User Status
- `ACTIVE` - Active user account
- `INACTIVE` - Inactive user account
- `SUSPENDED` - Suspended user account
- `PENDING_VERIFICATION` - Pending email verification
- `LOCKED` - Locked due to security issues

#### Main Operations
- `register_user()` - Register new users
- `get_user()` - Get user by ID
- `update_user()` - Update user information
- `search_users()` - Search users with filters
- `get_user_profile()` - Get user profile by type
- `update_user_profile()` - Update user profile
- `get_user_sessions()` - Get active user sessions
- `log_user_activity()` - Log user activities
- `bulk_user_action()` - Perform bulk operations

### Usage Example

```python
from shared.contracts.user_service import (
    UserServiceContract,
    UserRegistrationRequest,
    ProfileType
)

# Register a new user
registration_request = UserRegistrationRequest(
    email="student@university.edu",
    password="securepassword",
    first_name="John",
    last_name="Doe",
    profile_type=ProfileType.STUDENT,
    institution_id="uuid-of-university"
)

response = await user_service.register_user(registration_request)
if response.success:
    user_id = response.user_id
    verification_required = response.email_verification_required
```

## Service Communication Contract

### Purpose
Defines patterns for inter-service communication including event publishing, service discovery, and health checks.

### Key Components

#### Service Types
- `AUTH_SERVICE` - Authentication service
- `USER_SERVICE` - User management service
- `INSTITUTION_SERVICE` - Institution service
- `INTERNSHIP_SERVICE` - Internship service
- `NOTIFICATION_SERVICE` - Notification service

#### Event Types
- User events: `USER_CREATED`, `USER_UPDATED`, `USER_LOGIN`
- Auth events: `AUTH_SUCCESS`, `PASSWORD_CHANGED`
- Profile events: `PROFILE_CREATED`, `PROFILE_VERIFIED`
- Institution events: `STUDENT_ENROLLED`, `STUDENT_GRADUATED`
- Internship events: `INTERNSHIP_APPLIED`, `INTERNSHIP_ACCEPTED`

#### Main Operations
- `publish_event()` - Publish events to message bus
- `subscribe_to_events()` - Subscribe to event types
- `make_service_request()` - Make inter-service requests
- `discover_services()` - Discover available services
- `health_check()` - Check service health

### Usage Example

```python
from shared.contracts.service_communication import (
    ServiceEvent,
    EventType,
    ServiceType,
    UserEventData
)

# Publish a user creation event
event_data = UserEventData(
    user_id="user-uuid",
    email="user@example.com",
    username="johndoe",
    first_name="John",
    last_name="Doe",
    roles=["student"],
    is_active=True,
    is_verified=False
)

event = ServiceEvent(
    event_id="event-uuid",
    event_type=EventType.USER_CREATED,
    source_service=ServiceType.USER_SERVICE,
    timestamp=datetime.now(),
    data=event_data.__dict__
)

await communication_service.publish_event(event)
```

## API Gateway Contract

### Purpose
Defines the interface for API Gateway operations including routing, authentication, rate limiting, and load balancing.

### Key Components

#### Authentication Levels
- `NONE` - No authentication required
- `OPTIONAL` - Authentication optional
- `REQUIRED` - Authentication required
- `ADMIN` - Admin authentication required

#### Rate Limit Types
- `PER_IP` - Rate limit per IP address
- `PER_USER` - Rate limit per user
- `PER_API_KEY` - Rate limit per API key
- `GLOBAL` - Global rate limit

#### Main Operations
- `route_request()` - Route requests to services
- `authenticate_request()` - Authenticate incoming requests
- `authorize_request()` - Authorize requests
- `apply_rate_limiting()` - Apply rate limits
- `cache_response()` - Cache responses
- `discover_service_instances()` - Discover service instances
- `health_check_service()` - Check service health

### Usage Example

```python
from shared.contracts.api_gateway import (
    RouteConfig,
    HTTPMethod,
    AuthenticationLevel,
    RateLimitConfig,
    RateLimitType
)

# Configure a route
route = RouteConfig(
    path="/api/v1/users/profile",
    method=HTTPMethod.GET,
    target_service="user_service",
    target_path="/api/v1/users/profile",
    authentication=AuthenticationLevel.REQUIRED,
    required_permissions=["user:read"],
    rate_limit=RateLimitConfig(
        type=RateLimitType.PER_USER,
        requests_per_minute=60,
        requests_per_hour=1000,
        requests_per_day=10000
    ),
    timeout=30,
    cache_ttl=300
)
```

## Error Handling

All contracts define standard error codes for consistent error handling across services:

### Authentication Service Errors
- `AUTH_001` - Invalid credentials
- `AUTH_002` - Account locked
- `TOKEN_001` - Invalid token
- `2FA_001` - Invalid 2FA code

### User Service Errors
- `USER_001` - User not found
- `EMAIL_001` - Email already exists
- `PROFILE_001` - Profile not found
- `PERM_001` - Insufficient permissions

### Service Communication Errors
- `DISC_001` - Service not found
- `COMM_001` - Request timeout
- `MSG_001` - Publish failed

### API Gateway Errors
- `GATEWAY_001` - Route not found
- `AUTH_001` - Authentication required
- `RATE_001` - Rate limit exceeded

## Implementation Guidelines

### 1. Contract Compliance

- All services must implement their respective contract interfaces
- Use the defined data structures for requests and responses
- Return appropriate error codes for different failure scenarios

### 2. Versioning
- Contracts are versioned to support backward compatibility
- New versions should be additive when possible
- Breaking changes require major version updates

### 3. Testing
- Create contract tests to verify implementation compliance
- Use the contract definitions for API documentation
- Mock services using contract interfaces for testing

### 4. Documentation
- Keep contracts well-documented with examples
- Update documentation when contracts change
- Use contracts to generate API documentation

## Service Endpoints

Standard endpoints are defined for each service:

### Authentication Service
- Base path: `/api/v1/auth`
- Endpoints: `/authenticate`, `/validate-token`, `/refresh-token`, `/logout`

### User Service
- Base path: `/api/v1/users`
- Endpoints: `/register`, `/profile`, `/search`, `/sessions`

### Institution Service
- Base path: `/api/v1/institutions`
- Endpoints: `/`, `/{id}`, `/{id}/students`, `/{id}/courses`

### Internship Service
- Base path: `/api/v1/internships`
- Endpoints: `/`, `/{id}`, `/{id}/apply`, `/applications`

## Best Practices

1. **Consistency** - Use consistent naming conventions and patterns
2. **Validation** - Validate all inputs according to contract specifications
3. **Error Handling** - Use standard error codes and provide meaningful messages
4. **Security** - Implement proper authentication and authorization
5. **Performance** - Consider caching and rate limiting requirements
6. **Monitoring** - Log requests and responses for debugging and monitoring
7. **Documentation** - Keep contracts and documentation up to date

## Migration Guide

When migrating from monolith to microservices:

1. **Identify Boundaries** - Use contracts to define service boundaries
2. **Implement Gradually** - Implement one service at a time
3. **Test Thoroughly** - Use contract tests to verify implementations
4. **Monitor Performance** - Monitor service communication performance
5. **Handle Failures** - Implement proper error handling and fallbacks

This contract system ensures that all microservices can communicate effectively while maintaining loose coupling and high cohesion.