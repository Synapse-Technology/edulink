"""
Resilience Patterns for EduLink

Provides:
- Retry decorator with exponential backoff
- Circuit breaker pattern
- Idempotency utilities
- Graceful degradation strategies
"""

import logging
import time
from functools import wraps
from typing import Callable, Optional, Type, Tuple, Any, List
from enum import Enum

from .error_handling import TransientError, EduLinkError, RateLimitError

__all__ = [
    "RetryStrategy",
    "CircuitBreakerState",
    "CircuitBreaker",
    "retry",
    "with_circuit_breaker",
    "IdempotencyKey",
    "idempotent",
]

logger = logging.getLogger(__name__)


class RetryStrategy:
    """
    Configuration for retry behavior.
    
    Attributes:
        max_attempts: Maximum number of attempts
        initial_delay: Delay in seconds for first retry
        max_delay: Maximum delay between retries (capped exponential backoff)
        backoff_multiplier: Multiplier for exponential backoff
        retryable_exceptions: Tuple of exception types to retry on
        retryable_http_status: Set of HTTP statuses to retry on
    """
    
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 0.1,
        max_delay: float = 30.0,
        backoff_multiplier: float = 2.0,
        retryable_exceptions: Tuple[Type[Exception], ...] = (TransientError,),
        retryable_http_status: Optional[set] = None,
    ):
        """Initialize retry strategy."""
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.backoff_multiplier = backoff_multiplier
        self.retryable_exceptions = retryable_exceptions
        self.retryable_http_status = retryable_http_status or {429, 503}
    
    def should_retry(self, attempt: int, error: Exception) -> bool:
        """Determine if error should be retried."""
        if attempt >= self.max_attempts:
            return False
        
        if isinstance(error, self.retryable_exceptions):
            return True
        
        if isinstance(error, EduLinkError):
            return error.http_status in self.retryable_http_status
        
        return False
    
    def get_delay(self, attempt: int, error: Optional[Exception] = None) -> float:
        """Calculate delay before next attempt (exponential backoff)."""
        if isinstance(error, RateLimitError) and error.retry_after:
            return float(error.retry_after)
        
        delay = self.initial_delay * (self.backoff_multiplier ** attempt)
        return min(delay, self.max_delay)


def retry(strategy: Optional[RetryStrategy] = None) -> Callable:
    """
    Decorator to retry function on transient errors.
    
    Usage:
        @retry()
        def call_external_api():
            ...
        
        @retry(RetryStrategy(max_attempts=5, initial_delay=0.5))
        def flaky_operation():
            ...
    
    Args:
        strategy: RetryStrategy to use (default: exponential backoff, 3 attempts)
    
    Returns:
        Decorated function that retries on transient errors
    """
    if strategy is None:
        strategy = RetryStrategy()
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempt = 0
            last_error = None
            
            while True:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    
                    if not strategy.should_retry(attempt, e):
                        logger.error(
                            f"Giving up on {func.__name__} after {attempt} attempts",
                            extra={
                                "function": func.__name__,
                                "attempt": attempt,
                                "error": str(e),
                            },
                            exc_info=True,
                        )
                        raise
                    
                    attempt += 1
                    delay = strategy.get_delay(attempt - 1, e)
                    
                    logger.warning(
                        f"Attempt {attempt} of {strategy.max_attempts} for {func.__name__} failed: {str(e)}. "
                        f"Retrying in {delay}s...",
                        extra={
                            "function": func.__name__,
                            "attempt": attempt,
                            "delay": delay,
                            "error": str(e),
                        },
                    )
                    
                    time.sleep(delay)
        
        return wrapper
    
    return decorator


class CircuitBreakerState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing - reject requests
    HALF_OPEN = "half_open"  # Testing - allow one request


class CircuitBreaker:
    """
    Circuit breaker pattern - fail fast when service is failing.
    
    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Service failing, requests rejected immediately
    - HALF_OPEN: Recovery period, one request allowed to test service
    
    Transitions:
    - CLOSED -> OPEN: When failure threshold exceeded
    - OPEN -> HALF_OPEN: After timeout period
    - HALF_OPEN -> CLOSED: If test request succeeds
    - HALF_OPEN -> OPEN: If test request fails
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        timeout: float = 60.0,
    ):
        """
        Initialize circuit breaker.
        
        Args:
            name: Circuit breaker name (for logging)
            failure_threshold: Failure count to open circuit
            timeout: Seconds in OPEN state before trying HALF_OPEN
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function through circuit breaker.
        
        Args:
            func: Function to execute
            *args: Positional arguments
            **kwargs: Keyword arguments
        
        Returns:
            Function result
        
        Raises:
            TransientError: If circuit is OPEN
        """
        if self.state == CircuitBreakerState.OPEN:
            if self._should_attempt_recovery():
                self.state = CircuitBreakerState.HALF_OPEN
                self.success_count = 0
                logger.info(
                    f"Circuit breaker '{self.name}' transitioning to HALF_OPEN"
                )
            else:
                raise TransientError(
                    user_message=f"Service '{self.name}' is temporarily unavailable",
                    developer_message=f"Circuit breaker '{self.name}' is OPEN",
                )
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self) -> None:
        """Record successful call."""
        if self.state == CircuitBreakerState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= 2:
                self.state = CircuitBreakerState.CLOSED
                self.failure_count = 0
                logger.info(
                    f"Circuit breaker '{self.name}' recovered, transitioning to CLOSED"
                )
        else:
            self.failure_count = max(0, self.failure_count - 1)
    
    def _on_failure(self) -> None:
        """Record failed call."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.state == CircuitBreakerState.HALF_OPEN:
            self.state = CircuitBreakerState.OPEN
            logger.warning(
                f"Circuit breaker '{self.name}' test failed, returning to OPEN"
            )
        elif self.failure_count >= self.failure_threshold:
            self.state = CircuitBreakerState.OPEN
            logger.warning(
                f"Circuit breaker '{self.name}' opened after {self.failure_count} failures"
            )
    
    def _should_attempt_recovery(self) -> bool:
        """Check if timeout has elapsed to attempt recovery."""
        if self.last_failure_time is None:
            return True
        
        return time.time() - self.last_failure_time >= self.timeout
    
    def reset(self) -> None:
        """Manually reset circuit breaker to CLOSED state."""
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        logger.info(f"Circuit breaker '{self.name}' manually reset")


# Global circuit breakers registry
_circuit_breakers: dict[str, CircuitBreaker] = {}


def with_circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    timeout: float = 60.0,
) -> Callable:
    """
    Decorator to protect function with circuit breaker.
    
    Usage:
        @with_circuit_breaker("email_service", failure_threshold=3)
        def send_email(to, subject, body):
            ...
    
    Args:
        name: Circuit breaker name
        failure_threshold: Failures to open circuit
        timeout: Timeout before attempting recovery
    
    Returns:
        Decorated function protected by circuit breaker
    """
    def decorator(func: Callable) -> Callable:
        if name not in _circuit_breakers:
            _circuit_breakers[name] = CircuitBreaker(
                name=name,
                failure_threshold=failure_threshold,
                timeout=timeout,
            )
        
        breaker = _circuit_breakers[name]
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            return breaker.call(func, *args, **kwargs)
        
        return wrapper
    
    return decorator


class IdempotencyKey:
    """
    Utility for generating idempotency keys.
    
    Prevents duplicate processing if request is retried.
    """
    
    def __init__(self, key: str):
        """Initialize with unique key."""
        self.key = key
    
    @staticmethod
    def from_request_id(request_id: str) -> "IdempotencyKey":
        """Create from request ID."""
        return IdempotencyKey(f"req-{request_id}")
    
    @staticmethod
    def from_operation(actor_id: str, operation: str, resource_id: str) -> "IdempotencyKey":
        """Create from operation details."""
        return IdempotencyKey(f"{actor_id}:{operation}:{resource_id}")


def idempotent(key_func: Callable[..., str]) -> Callable:
    """
    Decorator to make function idempotent using key-value cache.
    
    Results are cached per idempotency key. Retried requests with same key
    return cached result instead of re-executing.
    
    Usage:
        @idempotent(key_func=lambda actor_id, assignment_id: f"{actor_id}:{assignment_id}")
        def accept_assignment(actor_id, assignment_id):
            ...
    
    Args:
        key_func: Function to generate idempotency key from arguments
    
    Returns:
        Decorated function with idempotency
    """
    # In-memory cache (in production, use Redis)
    cache: dict[str, Any] = {}
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                key = key_func(*args, **kwargs)
            except Exception as e:
                logger.warning(f"Failed to generate idempotency key: {e}")
                return func(*args, **kwargs)
            
            if key in cache:
                logger.info(f"Idempotent call cache hit for key: {key}")
                return cache[key]
            
            result = func(*args, **kwargs)
            cache[key] = result
            logger.debug(f"Cached idempotent result for key: {key}")
            
            return result
        
        return wrapper
    
    return decorator
