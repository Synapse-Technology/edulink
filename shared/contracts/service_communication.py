"""Service Communication Contract.

Defines the interface for inter-service communication patterns.
"""

from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class ServiceType(Enum):
    """Types of services in the system."""
    AUTH_SERVICE = "auth_service"
    USER_SERVICE = "user_service"
    INSTITUTION_SERVICE = "institution_service"
    INTERNSHIP_SERVICE = "internship_service"
    NOTIFICATION_SERVICE = "notification_service"
    ANALYTICS_SERVICE = "analytics_service"
    FILE_SERVICE = "file_service"
    SEARCH_SERVICE = "search_service"


class EventType(Enum):
    """Types of events that can be published between services."""
    # User events
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    USER_ACTIVATED = "user.activated"
    USER_DEACTIVATED = "user.deactivated"
    USER_VERIFIED = "user.verified"
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    
    # Authentication events
    AUTH_SUCCESS = "auth.success"
    AUTH_FAILED = "auth.failed"
    AUTH_LOCKED = "auth.locked"
    PASSWORD_CHANGED = "auth.password_changed"
    EMAIL_VERIFIED = "auth.email_verified"
    
    # Profile events
    PROFILE_CREATED = "profile.created"
    PROFILE_UPDATED = "profile.updated"
    PROFILE_COMPLETED = "profile.completed"
    PROFILE_VERIFIED = "profile.verified"
    
    # Institution events
    INSTITUTION_CREATED = "institution.created"
    INSTITUTION_UPDATED = "institution.updated"
    STUDENT_ENROLLED = "institution.student_enrolled"
    STUDENT_GRADUATED = "institution.student_graduated"
    
    # Internship events
    INTERNSHIP_POSTED = "internship.posted"
    INTERNSHIP_APPLIED = "internship.applied"
    INTERNSHIP_ACCEPTED = "internship.accepted"
    INTERNSHIP_COMPLETED = "internship.completed"
    
    # System events
    SERVICE_STARTED = "system.service_started"
    SERVICE_STOPPED = "system.service_stopped"
    HEALTH_CHECK = "system.health_check"


class MessagePriority(Enum):
    """Message priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ServiceInfo:
    """Service information structure."""
    service_type: ServiceType
    service_id: str
    version: str
    host: str
    port: int
    health_endpoint: str
    api_base_path: str
    status: str  # 'healthy', 'unhealthy', 'starting', 'stopping'
    last_heartbeat: datetime
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ServiceEvent:
    """Service event structure for pub/sub messaging."""
    event_id: str
    event_type: EventType
    source_service: ServiceType
    timestamp: datetime
    data: Dict[str, Any]
    correlation_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    priority: MessagePriority = MessagePriority.NORMAL
    retry_count: int = 0
    max_retries: int = 3
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ServiceRequest:
    """Service-to-service request structure."""
    request_id: str
    source_service: ServiceType
    target_service: ServiceType
    endpoint: str
    method: str  # GET, POST, PUT, DELETE
    headers: Dict[str, str]
    data: Optional[Dict[str, Any]] = None
    timeout: int = 30
    retry_count: int = 0
    max_retries: int = 3
    correlation_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ServiceResponse:
    """Service-to-service response structure."""
    request_id: str
    status_code: int
    success: bool
    data: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    processing_time: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class HealthCheckRequest:
    """Health check request structure."""
    service_type: ServiceType
    check_dependencies: bool = True
    detailed: bool = False


@dataclass
class HealthCheckResponse:
    """Health check response structure."""
    service_type: ServiceType
    status: str  # 'healthy', 'unhealthy', 'degraded'
    timestamp: datetime
    version: str
    uptime: float
    dependencies: Optional[Dict[str, str]] = None  # dependency_name -> status
    metrics: Optional[Dict[str, Any]] = None
    details: Optional[Dict[str, Any]] = None


@dataclass
class ServiceDiscoveryRequest:
    """Service discovery request structure."""
    service_type: ServiceType
    version: Optional[str] = None
    region: Optional[str] = None
    environment: Optional[str] = None


@dataclass
class ServiceDiscoveryResponse:
    """Service discovery response structure."""
    services: List[ServiceInfo]
    total_count: int
    healthy_count: int


@dataclass
class CircuitBreakerState:
    """Circuit breaker state for service calls."""
    service_type: ServiceType
    endpoint: str
    state: str  # 'closed', 'open', 'half_open'
    failure_count: int
    last_failure_time: Optional[datetime]
    next_attempt_time: Optional[datetime]
    success_threshold: int = 5
    failure_threshold: int = 10
    timeout: int = 60


class ServiceCommunicationContract:
    """Service Communication Contract Interface.
    
    This defines the methods for inter-service communication.
    """
    
    async def publish_event(self, event: ServiceEvent) -> bool:
        """Publish an event to the message bus."""
        raise NotImplementedError
    
    async def subscribe_to_events(self, event_types: List[EventType], 
                                callback) -> bool:
        """Subscribe to specific event types."""
        raise NotImplementedError
    
    async def make_service_request(self, request: ServiceRequest) -> ServiceResponse:
        """Make a request to another service."""
        raise NotImplementedError
    
    async def register_service(self, service_info: ServiceInfo) -> bool:
        """Register a service with the service registry."""
        raise NotImplementedError
    
    async def deregister_service(self, service_type: ServiceType, service_id: str) -> bool:
        """Deregister a service from the service registry."""
        raise NotImplementedError
    
    async def discover_services(self, request: ServiceDiscoveryRequest) -> ServiceDiscoveryResponse:
        """Discover available services."""
        raise NotImplementedError
    
    async def health_check(self, request: HealthCheckRequest) -> HealthCheckResponse:
        """Perform health check on a service."""
        raise NotImplementedError
    
    async def get_circuit_breaker_state(self, service_type: ServiceType, 
                                      endpoint: str) -> CircuitBreakerState:
        """Get circuit breaker state for a service endpoint."""
        raise NotImplementedError
    
    async def update_circuit_breaker_state(self, state: CircuitBreakerState) -> bool:
        """Update circuit breaker state."""
        raise NotImplementedError


# Standard event data structures for common events

@dataclass
class UserEventData:
    """Standard data structure for user events."""
    user_id: str
    email: str
    username: str
    first_name: str
    last_name: str
    roles: List[str]
    is_active: bool
    is_verified: bool
    institution_id: Optional[str] = None
    profile_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class AuthEventData:
    """Standard data structure for authentication events."""
    user_id: str
    session_id: Optional[str] = None
    ip_address: str
    user_agent: str
    success: bool
    method: str  # 'email_password', 'social', '2fa'
    failure_reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ProfileEventData:
    """Standard data structure for profile events."""
    profile_id: str
    user_id: str
    profile_type: str
    completion_score: int
    is_verified: bool
    institution_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class InstitutionEventData:
    """Standard data structure for institution events."""
    institution_id: str
    name: str
    type: str
    country: str
    is_verified: bool
    student_id: Optional[str] = None  # For student-related events
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class InternshipEventData:
    """Standard data structure for internship events."""
    internship_id: str
    title: str
    company_id: str
    student_id: Optional[str] = None  # For application-related events
    status: str
    application_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Service communication error codes
class ServiceCommErrorCodes:
    """Standard error codes for service communication."""
    
    # Service discovery errors
    SERVICE_NOT_FOUND = "DISC_001"
    SERVICE_UNAVAILABLE = "DISC_002"
    SERVICE_UNHEALTHY = "DISC_003"
    
    # Communication errors
    REQUEST_TIMEOUT = "COMM_001"
    CONNECTION_FAILED = "COMM_002"
    CIRCUIT_BREAKER_OPEN = "COMM_003"
    RATE_LIMITED = "COMM_004"
    
    # Message bus errors
    PUBLISH_FAILED = "MSG_001"
    SUBSCRIPTION_FAILED = "MSG_002"
    MESSAGE_PROCESSING_FAILED = "MSG_003"
    
    # Authentication/Authorization errors
    UNAUTHORIZED = "AUTH_001"
    FORBIDDEN = "AUTH_002"
    INVALID_TOKEN = "AUTH_003"
    
    # General errors
    INTERNAL_ERROR = "GEN_001"
    INVALID_REQUEST = "GEN_002"
    SERIALIZATION_ERROR = "GEN_003"


# Service endpoints configuration
class ServiceEndpoints:
    """Standard endpoints for each service."""
    
    AUTH_SERVICE = {
        'base_path': '/api/v1/auth',
        'endpoints': {
            'authenticate': '/authenticate',
            'validate_token': '/validate-token',
            'refresh_token': '/refresh-token',
            'logout': '/logout',
            'password_reset': '/password-reset',
            'password_change': '/password-change',
            'two_factor_setup': '/2fa/setup',
            'two_factor_verify': '/2fa/verify',
            'health': '/health'
        }
    }
    
    USER_SERVICE = {
        'base_path': '/api/v1/users',
        'endpoints': {
            'register': '/register',
            'profile': '/profile',
            'search': '/search',
            'sessions': '/sessions',
            'activities': '/activities',
            'preferences': '/preferences',
            'bulk_actions': '/bulk-actions',
            'email_change': '/email-change',
            'email_verify': '/email-verify',
            'stats': '/stats',
            'health': '/health'
        }
    }
    
    INSTITUTION_SERVICE = {
        'base_path': '/api/v1/institutions',
        'endpoints': {
            'list': '/',
            'detail': '/{institution_id}',
            'students': '/{institution_id}/students',
            'courses': '/{institution_id}/courses',
            'departments': '/{institution_id}/departments',
            'verify_student': '/{institution_id}/verify-student',
            'health': '/health'
        }
    }
    
    INTERNSHIP_SERVICE = {
        'base_path': '/api/v1/internships',
        'endpoints': {
            'list': '/',
            'detail': '/{internship_id}',
            'apply': '/{internship_id}/apply',
            'applications': '/applications',
            'company_internships': '/company/{company_id}',
            'student_applications': '/student/{student_id}',
            'health': '/health'
        }
    }
    
    NOTIFICATION_SERVICE = {
        'base_path': '/api/v1/notifications',
        'endpoints': {
            'send': '/send',
            'list': '/list',
            'mark_read': '/mark-read',
            'preferences': '/preferences',
            'templates': '/templates',
            'health': '/health'
        }
    }