"""API Gateway Contract.

Defines the interface for API Gateway routing and middleware.
"""

from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class HTTPMethod(Enum):
    """HTTP methods."""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"
    DELETE = "DELETE"
    OPTIONS = "OPTIONS"
    HEAD = "HEAD"


class AuthenticationLevel(Enum):
    """Authentication levels for routes."""
    NONE = "none"  # No authentication required
    OPTIONAL = "optional"  # Authentication optional
    REQUIRED = "required"  # Authentication required
    ADMIN = "admin"  # Admin authentication required


class RateLimitType(Enum):
    """Rate limiting types."""
    PER_IP = "per_ip"
    PER_USER = "per_user"
    PER_API_KEY = "per_api_key"
    GLOBAL = "global"


@dataclass
class RouteConfig:
    """Route configuration for API Gateway."""
    path: str
    method: HTTPMethod
    target_service: str
    target_path: str
    authentication: AuthenticationLevel
    required_permissions: List[str]
    rate_limit: Optional['RateLimitConfig'] = None
    timeout: int = 30
    retries: int = 3
    circuit_breaker: bool = True
    cache_ttl: Optional[int] = None  # Cache TTL in seconds
    request_size_limit: Optional[int] = None  # Max request size in bytes
    response_transform: Optional[str] = None  # Response transformation function
    request_transform: Optional[str] = None  # Request transformation function
    middleware: List[str] = None  # Custom middleware to apply
    tags: List[str] = None  # Route tags for documentation/grouping
    description: Optional[str] = None
    deprecated: bool = False
    version: str = "v1"


@dataclass
class RateLimitConfig:
    """Rate limiting configuration."""
    type: RateLimitType
    requests_per_minute: int
    requests_per_hour: int
    requests_per_day: int
    burst_limit: Optional[int] = None
    whitelist: List[str] = None  # IPs or user IDs to whitelist
    blacklist: List[str] = None  # IPs or user IDs to blacklist


@dataclass
class GatewayRequest:
    """Gateway request structure."""
    request_id: str
    path: str
    method: HTTPMethod
    headers: Dict[str, str]
    query_params: Dict[str, str]
    body: Optional[bytes] = None
    ip_address: str = ""
    user_agent: str = ""
    timestamp: datetime = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    api_key: Optional[str] = None
    correlation_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class GatewayResponse:
    """Gateway response structure."""
    request_id: str
    status_code: int
    headers: Dict[str, str]
    body: Optional[bytes] = None
    processing_time: float = 0.0
    target_service: Optional[str] = None
    cache_hit: bool = False
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class MiddlewareConfig:
    """Middleware configuration."""
    name: str
    enabled: bool
    priority: int  # Lower numbers execute first
    config: Dict[str, Any]
    routes: Optional[List[str]] = None  # Specific routes to apply to
    exclude_routes: Optional[List[str]] = None  # Routes to exclude


@dataclass
class LoadBalancerConfig:
    """Load balancer configuration."""
    algorithm: str  # 'round_robin', 'least_connections', 'weighted', 'ip_hash'
    health_check_interval: int = 30  # seconds
    health_check_timeout: int = 5  # seconds
    health_check_path: str = "/health"
    max_failures: int = 3
    recovery_time: int = 60  # seconds


@dataclass
class ServiceInstance:
    """Service instance information."""
    service_name: str
    instance_id: str
    host: str
    port: int
    weight: int = 1
    healthy: bool = True
    last_health_check: Optional[datetime] = None
    failure_count: int = 0
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class CacheConfig:
    """Cache configuration."""
    enabled: bool
    default_ttl: int = 300  # seconds
    max_size: int = 1000  # number of entries
    cache_key_strategy: str = "path_query"  # 'path', 'path_query', 'custom'
    cache_headers: List[str] = None  # Headers to include in cache key
    vary_headers: List[str] = None  # Headers that affect caching
    exclude_paths: List[str] = None  # Paths to exclude from caching


@dataclass
class SecurityConfig:
    """Security configuration."""
    cors_enabled: bool = True
    cors_origins: List[str] = None
    cors_methods: List[str] = None
    cors_headers: List[str] = None
    csrf_protection: bool = True
    xss_protection: bool = True
    content_type_validation: bool = True
    request_id_header: str = "X-Request-ID"
    max_request_size: int = 10485760  # 10MB
    allowed_content_types: List[str] = None
    blocked_user_agents: List[str] = None
    ip_whitelist: List[str] = None
    ip_blacklist: List[str] = None


@dataclass
class MonitoringConfig:
    """Monitoring and observability configuration."""
    metrics_enabled: bool = True
    tracing_enabled: bool = True
    logging_enabled: bool = True
    log_level: str = "INFO"
    log_requests: bool = True
    log_responses: bool = False
    log_headers: bool = False
    log_body: bool = False
    metrics_path: str = "/metrics"
    health_path: str = "/health"
    sample_rate: float = 1.0  # Tracing sample rate


@dataclass
class GatewayConfig:
    """Complete gateway configuration."""
    routes: List[RouteConfig]
    middleware: List[MiddlewareConfig]
    load_balancer: LoadBalancerConfig
    cache: CacheConfig
    security: SecurityConfig
    monitoring: MonitoringConfig
    service_discovery_url: str
    default_timeout: int = 30
    default_retries: int = 3
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout: int = 60


@dataclass
class RequestMetrics:
    """Request metrics for monitoring."""
    request_id: str
    path: str
    method: str
    status_code: int
    processing_time: float
    target_service: Optional[str]
    user_id: Optional[str]
    ip_address: str
    timestamp: datetime
    cache_hit: bool = False
    error: Optional[str] = None


@dataclass
class ServiceMetrics:
    """Service-level metrics."""
    service_name: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_response_time: float
    p95_response_time: float
    p99_response_time: float
    error_rate: float
    last_updated: datetime


class APIGatewayContract:
    """API Gateway Contract Interface.
    
    This defines the methods that the API Gateway must implement.
    """
    
    async def route_request(self, request: GatewayRequest) -> GatewayResponse:
        """Route a request to the appropriate service."""
        raise NotImplementedError
    
    async def authenticate_request(self, request: GatewayRequest) -> Optional[Dict[str, Any]]:
        """Authenticate a request and return user context."""
        raise NotImplementedError
    
    async def authorize_request(self, request: GatewayRequest, 
                              user_context: Dict[str, Any], 
                              required_permissions: List[str]) -> bool:
        """Authorize a request based on user context and required permissions."""
        raise NotImplementedError
    
    async def apply_rate_limiting(self, request: GatewayRequest, 
                                config: RateLimitConfig) -> bool:
        """Apply rate limiting to a request."""
        raise NotImplementedError
    
    async def cache_response(self, request: GatewayRequest, 
                           response: GatewayResponse, ttl: int) -> bool:
        """Cache a response."""
        raise NotImplementedError
    
    async def get_cached_response(self, request: GatewayRequest) -> Optional[GatewayResponse]:
        """Get a cached response if available."""
        raise NotImplementedError
    
    async def discover_service_instances(self, service_name: str) -> List[ServiceInstance]:
        """Discover available instances of a service."""
        raise NotImplementedError
    
    async def select_service_instance(self, service_name: str, 
                                    request: GatewayRequest) -> Optional[ServiceInstance]:
        """Select a service instance using load balancing."""
        raise NotImplementedError
    
    async def health_check_service(self, instance: ServiceInstance) -> bool:
        """Perform health check on a service instance."""
        raise NotImplementedError
    
    async def transform_request(self, request: GatewayRequest, 
                              transform_func: str) -> GatewayRequest:
        """Transform a request before forwarding."""
        raise NotImplementedError
    
    async def transform_response(self, response: GatewayResponse, 
                               transform_func: str) -> GatewayResponse:
        """Transform a response before returning."""
        raise NotImplementedError
    
    async def log_request(self, request: GatewayRequest, 
                        response: GatewayResponse, 
                        processing_time: float) -> None:
        """Log request and response details."""
        raise NotImplementedError
    
    async def record_metrics(self, metrics: RequestMetrics) -> None:
        """Record request metrics."""
        raise NotImplementedError
    
    async def get_service_metrics(self, service_name: str) -> ServiceMetrics:
        """Get metrics for a specific service."""
        raise NotImplementedError
    
    async def reload_configuration(self, config: GatewayConfig) -> bool:
        """Reload gateway configuration."""
        raise NotImplementedError


# Standard middleware types
class MiddlewareTypes:
    """Standard middleware types."""
    
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    RATE_LIMITING = "rate_limiting"
    CORS = "cors"
    LOGGING = "logging"
    METRICS = "metrics"
    CACHING = "caching"
    REQUEST_VALIDATION = "request_validation"
    RESPONSE_TRANSFORMATION = "response_transformation"
    CIRCUIT_BREAKER = "circuit_breaker"
    RETRY = "retry"
    TIMEOUT = "timeout"
    COMPRESSION = "compression"
    SECURITY_HEADERS = "security_headers"


# Gateway error codes
class GatewayErrorCodes:
    """Standard error codes for API Gateway."""
    
    # Routing errors
    ROUTE_NOT_FOUND = "GATEWAY_001"
    SERVICE_UNAVAILABLE = "GATEWAY_002"
    SERVICE_TIMEOUT = "GATEWAY_003"
    CIRCUIT_BREAKER_OPEN = "GATEWAY_004"
    
    # Authentication/Authorization errors
    AUTHENTICATION_REQUIRED = "AUTH_001"
    AUTHENTICATION_FAILED = "AUTH_002"
    AUTHORIZATION_FAILED = "AUTH_003"
    INVALID_API_KEY = "AUTH_004"
    
    # Rate limiting errors
    RATE_LIMIT_EXCEEDED = "RATE_001"
    QUOTA_EXCEEDED = "RATE_002"
    
    # Request validation errors
    INVALID_REQUEST_FORMAT = "REQ_001"
    REQUEST_TOO_LARGE = "REQ_002"
    UNSUPPORTED_CONTENT_TYPE = "REQ_003"
    MISSING_REQUIRED_HEADER = "REQ_004"
    
    # Cache errors
    CACHE_ERROR = "CACHE_001"
    
    # General errors
    INTERNAL_ERROR = "GEN_001"
    CONFIGURATION_ERROR = "GEN_002"
    UPSTREAM_ERROR = "GEN_003"


# Standard response headers
class StandardHeaders:
    """Standard HTTP headers used by the gateway."""
    
    REQUEST_ID = "X-Request-ID"
    CORRELATION_ID = "X-Correlation-ID"
    RATE_LIMIT_REMAINING = "X-RateLimit-Remaining"
    RATE_LIMIT_RESET = "X-RateLimit-Reset"
    CACHE_STATUS = "X-Cache-Status"
    PROCESSING_TIME = "X-Processing-Time"
    SERVICE_VERSION = "X-Service-Version"
    API_VERSION = "X-API-Version"
    CONTENT_TYPE = "Content-Type"
    AUTHORIZATION = "Authorization"
    USER_AGENT = "User-Agent"
    FORWARDED_FOR = "X-Forwarded-For"
    REAL_IP = "X-Real-IP"