"""
Performance Optimization Utilities for EduLink

Provides:
- Query optimization helpers (select_related, prefetch_related)
- Caching decorators and utilities
- Database index recommendations
- Bulk operation helpers
- Performance monitoring
"""

import logging
from functools import lru_cache, wraps
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, TypeVar, Generic
from datetime import timedelta
from django.core.cache import cache
from django.db.models import QuerySet, Prefetch
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
import time

__all__ = [
    "cache_result",
    "cache_per_user",
    "CacheConfig",
    "QueryOptimizer",
    "PerformanceMetrics",
    "bulk_create_optimized",
    "bulk_update_optimized",
]

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CacheConfig:
    """Configuration for caching behavior."""
    
    # Cache duration in seconds
    DURATION_SHORT = 300  # 5 minutes
    DURATION_MEDIUM = 3600  # 1 hour
    DURATION_LONG = 86400  # 24 hours
    
    # Cache keys
    USER_PERMISSIONS = "user_perms:{}"  # Format with user_id
    ADMIN_ROLES = "admin_roles"
    NOTIFICATION_TYPES = "notif_types"
    INSTITUTION_SETTINGS = "inst_settings:{}"  # Format with institution_id
    
    @staticmethod
    def build_key(prefix: str, *parts: Any) -> str:
        """Build cache key from prefix and parts."""
        return f"{prefix}:{':'.join(str(p) for p in parts)}"


def cache_result(
    duration: int = CacheConfig.DURATION_SHORT,
    key_func: Optional[Callable] = None,
) -> Callable:
    """
    Decorator to cache function result by arguments.
    
    Usage:
        @cache_result(duration=CacheConfig.DURATION_LONG)
        def get_user_permissions(user_id):
            return expensive_query()
        
        @cache_result(
            duration=CacheConfig.DURATION_MEDIUM,
            key_func=lambda user_id, role: f"perms:{user_id}:{role}"
        )
        def get_role_permissions(user_id, role):
            pass
    
    Args:
        duration: Cache duration in seconds
        key_func: Optional function to generate cache key from arguments
                 Defaults to function name + argument str representation
    
    Returns:
        Decorated function with caching
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                try:
                    cache_key = key_func(*args, **kwargs)
                except Exception as e:
                    logger.warning(f"Failed to generate cache key: {e}")
                    return func(*args, **kwargs)
            else:
                # Default key generation
                args_str = "_".join(str(arg) for arg in args if arg is not None)
                kwargs_str = "_".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
                parts = [s for s in [func.__name__, args_str, kwargs_str] if s]
                cache_key = ":".join(parts)
            
            # Try cache
            result = cache.get(cache_key)
            if result is not None:
                logger.debug(f"Cache hit for: {cache_key}")
                return result
            
            # Compute and cache
            result = func(*args, **kwargs)
            cache.set(cache_key, result, duration)
            logger.debug(f"Cached result for: {cache_key} (duration: {duration}s)")
            
            return result
        
        # Add cache invalidation method
        def invalidate(*args, **kwargs):
            """Manually invalidate cache for given arguments."""
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                args_str = "_".join(str(arg) for arg in args if arg is not None)
                kwargs_str = "_".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
                parts = [s for s in [func.__name__, args_str, kwargs_str] if s]
                cache_key = ":".join(parts)
            cache.delete(cache_key)
            logger.debug(f"Invalidated cache for: {cache_key}")
        
        wrapper.invalidate = invalidate
        wrapper.invalidate_all = lambda: cache.delete(func.__name__)
        
        return wrapper
    
    return decorator


def cache_per_user(duration: int = CacheConfig.DURATION_MEDIUM) -> Callable:
    """
    Decorator to cache function result per user.
    
    First argument must be user object or user_id.
    
    Usage:
        @cache_per_user()
        def get_user_permissions(user):
            return expensive_query()
    
    Args:
        duration: Cache duration in seconds
    
    Returns:
        Decorated function with per-user caching
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(user_or_id, *args, **kwargs):
            # Extract user ID
            if hasattr(user_or_id, "id"):
                user_id = user_or_id.id
            else:
                user_id = user_or_id
            
            # Generate cache key
            args_str = "_".join(str(arg) for arg in args if arg is not None)
            kwargs_str = "_".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
            parts = [s for s in [func.__name__, str(user_id), args_str, kwargs_str] if s]
            cache_key = ":".join(parts)
            
            # Try cache
            result = cache.get(cache_key)
            if result is not None:
                logger.debug(f"Cache hit for: {cache_key}")
                return result
            
            # Compute and cache
            result = func(user_or_id, *args, **kwargs)
            cache.set(cache_key, result, duration)
            logger.debug(f"Cached result for: {cache_key}")
            
            return result
        
        def invalidate_for_user(user_or_id):
            """Invalidate all cached results for specific user."""
            if hasattr(user_or_id, "id"):
                user_id = user_or_id.id
            else:
                user_id = user_or_id
            
            # Get all keys with this user_id and delete them
            # Note: This is simplified - real implementation would iterate pattern
            keys_to_delete = cache.keys(f"{func.__name__}:{user_id}:*")
            for key in keys_to_delete:
                cache.delete(key)
            logger.debug(f"Invalidated cache for user: {user_id}")
        
        wrapper.invalidate_for_user = invalidate_for_user
        
        return wrapper
    
    return decorator


class QueryOptimizer:
    """
    Helper for query optimization patterns.
    
    Provides utilities for:
    - select_related() configuration
    - prefetch_related() configuration
    - N+1 query prevention
    """
    
    @staticmethod
    def optimize_incident_queryset(queryset: QuerySet) -> QuerySet:
        """Optimize Incident queryset to prevent N+1."""
        return queryset.select_related(
            "application__student__user",
            "application__opportunity__institution",
            "investigator__user",
        ).prefetch_related(
            "supervisor_assignments__supervisor__user",
            "incident_updates",
            "evidence_items",
        )
    
    @staticmethod
    def optimize_evidence_queryset(queryset: QuerySet) -> QuerySet:
        """Optimize Evidence queryset to prevent N+1."""
        return queryset.select_related(
            "submitted_by__user",
            "reviewed_by__user",
            "application__student__user",
        ).prefetch_related(
            "evidence_updates",
            "review_notes",
        )
    
    @staticmethod
    def optimize_application_queryset(queryset: QuerySet) -> QuerySet:
        """Optimize Application queryset to prevent N+1."""
        return queryset.select_related(
            "student__user",
            "opportunity__institution",
            "assigned_supervisor__user",
        ).prefetch_related(
            "supervisor_assignments",
            "incident_records",
            "evidence_items",
        )
    
    @staticmethod
    def optimize_evidence_review_queryset(queryset: QuerySet) -> QuerySet:
        """Optimize EvidenceReview queryset to prevent N+1."""
        return queryset.select_related(
            "evidence__submitted_by__user",
            "evidence__application__student__user",
            "reviewed_by__user",
        ).prefetch_related(
            "review_notes",
        )
    
    @staticmethod
    def optimize_supervisor_assignment_queryset(queryset: QuerySet) -> QuerySet:
        """Optimize SupervisorAssignment queryset to prevent N+1."""
        return queryset.select_related(
            "supervisor__user",
            "assigned_by__user",
            "application__student__user",
        ).prefetch_related(
            "assignment_updates",
        )


class PerformanceMetrics:
    """
    Monitor and track performance metrics.
    
    Usage:
        metrics = PerformanceMetrics("operation_name")
        with metrics.timer("database_query"):
            result = Model.objects.all()
        metrics.report()
    """
    
    def __init__(self, name: str):
        """Initialize metrics tracker."""
        self.name = name
        self.timers: Dict[str, List[float]] = {}
        self.counters: Dict[str, int] = {}
    
    def timer(self, operation: str):
        """Context manager to time an operation."""
        return _TimerContext(self, operation)
    
    def increment_counter(self, name: str, amount: int = 1) -> None:
        """Increment a counter."""
        if name not in self.counters:
            self.counters[name] = 0
        self.counters[name] += amount
    
    def record_time(self, operation: str, elapsed: float) -> None:
        """Record time for an operation."""
        if operation not in self.timers:
            self.timers[operation] = []
        self.timers[operation].append(elapsed)
    
    def report(self) -> Dict[str, Any]:
        """Generate performance report."""
        report = {
            "operation": self.name,
            "timers": {},
            "counters": self.counters,
        }
        
        for op, times in self.timers.items():
            report["timers"][op] = {
                "count": len(times),
                "total_ms": sum(times) * 1000,
                "avg_ms": (sum(times) / len(times)) * 1000 if times else 0,
                "min_ms": min(times) * 1000 if times else 0,
                "max_ms": max(times) * 1000 if times else 0,
            }
        
        logger.info(f"Performance metrics for {self.name}: {report}")
        return report


class _TimerContext:
    """Context manager for timing operations."""
    
    def __init__(self, metrics: PerformanceMetrics, operation: str):
        self.metrics = metrics
        self.operation = operation
        self.start_time: Optional[float] = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.time() - self.start_time
        self.metrics.record_time(self.operation, elapsed)


def bulk_create_optimized(
    model,
    objects: List[Any],
    batch_size: int = 1000,
    **kwargs
) -> List[Any]:
    """
    Create multiple objects efficiently using bulk_create.
    
    Usage:
        users = [User(name=f"user{i}") for i in range(10000)]
        created = bulk_create_optimized(User, users, batch_size=2000)
    
    Args:
        model: Django model class
        objects: List of model instances to create
        batch_size: Number of objects per batch
        **kwargs: Additional arguments for bulk_create()
    
    Returns:
        List of created objects
    """
    created = []
    total = len(objects)
    batches = (total + batch_size - 1) // batch_size
    
    logger.info(f"Bulk creating {total} {model.__name__} objects in {batches} batches")
    
    for i in range(0, total, batch_size):
        batch = objects[i : i + batch_size]
        batch_created = model.objects.bulk_create(batch, batch_size=batch_size, **kwargs)
        created.extend(batch_created)
        logger.debug(f"Batch {i // batch_size + 1} of {batches} created")
    
    logger.info(f"Bulk create complete: {total} objects created")
    return created


def bulk_update_optimized(
    model,
    objects: List[Any],
    fields: List[str],
    batch_size: int = 1000,
) -> int:
    """
    Update multiple objects efficiently using bulk_update.
    
    Usage:
        incidents = Incident.objects.filter(status="OPEN")
        for incident in incidents:
            incident.status = "CLOSED"
        bulk_update_optimized(Incident, incidents, ["status"], batch_size=2000)
    
    Args:
        model: Django model class
        objects: List of model instances to update
        fields: List of field names to update
        batch_size: Number of objects per batch
    
    Returns:
        Number of objects updated
    """
    total = len(objects)
    batches = (total + batch_size - 1) // batch_size
    
    logger.info(f"Bulk updating {total} {model.__name__} objects in {batches} batches")
    
    updated = 0
    for i in range(0, total, batch_size):
        batch = objects[i : i + batch_size]
        model.objects.bulk_update(batch, fields, batch_size=batch_size)
        updated += len(batch)
        logger.debug(f"Batch {i // batch_size + 1} of {batches} updated")
    
    logger.info(f"Bulk update complete: {updated} objects updated")
    return updated


# Cache warming utilities

def warm_cache(
    cache_functions: List[Tuple[Callable, Tuple, Dict]],
    duration: int = CacheConfig.DURATION_LONG,
) -> Dict[str, Any]:
    """
    Pre-warm cache with commonly used data.
    
    Usage:
        warm_cache([
            (get_notifiation_types, (), {}),
            (get_admin_roles, (), {}),
            (get_user_permissions, (user_id,), {}),
        ])
    
    Args:
        cache_functions: List of (function, args, kwargs) tuples
        duration: Cache duration
    
    Returns:
        Dictionary with results
    """
    results = {}
    
    for func, args, kwargs in cache_functions:
        try:
            result = func(*args, **kwargs)
            results[func.__name__] = {"status": "success", "items": len(result) if hasattr(result, "__len__") else 1}
            logger.info(f"Cache warmed for {func.__name__}")
        except Exception as e:
            results[func.__name__] = {"status": "error", "error": str(e)}
            logger.warning(f"Failed to warm cache for {func.__name__}: {e}")
    
    return results


# Database index recommendations

INDEX_RECOMMENDATIONS = {
    "Incident": [
        ("status", "Common status lookups"),
        ("application_id", "Filter by application"),
        ("created_at", "Date range queries"),
        ("status", "created_at", "Combined status + date filtering"),
    ],
    "Evidence": [
        ("application_id", "Filter by application"),
        ("status", "Status lookups"),
        ("submitted_at", "Recent evidence queries"),
    ],
    "SupervisorAssignment": [
        ("supervisor_id", "Assignments for supervisor"),
        ("status", "Filter by status"),
        ("created_at", "Pagination by date"),
    ],
    "Application": [
        ("student_id", "Applications for student"),
        ("opportunity_id", "Applications for opportunity"),
        ("status", "Status lookups"),
        ("created_at", "Recent applications"),
    ],
}
