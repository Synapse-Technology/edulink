# Performance Monitoring
# Comprehensive performance tracking and monitoring for the Edulink application

import time
import psutil
import threading
from functools import wraps
from django.db import connection
from django.core.cache import cache
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from .logging_config import get_logger
import json
from datetime import datetime, timedelta
from collections import defaultdict, deque


class PerformanceMonitor:
    """Central performance monitoring class"""
    
    def __init__(self):
        self.logger = get_logger('performance')
        self.metrics = defaultdict(list)
        self.slow_queries = deque(maxlen=100)
        self.api_metrics = defaultdict(lambda: {'count': 0, 'total_time': 0, 'errors': 0})
        self.lock = threading.Lock()
    
    def record_api_call(self, endpoint, method, response_time, status_code, user_id=None):
        """Record API call metrics"""
        with self.lock:
            key = f"{method}:{endpoint}"
            self.api_metrics[key]['count'] += 1
            self.api_metrics[key]['total_time'] += response_time
            
            if status_code >= 400:
                self.api_metrics[key]['errors'] += 1
            
            # Log slow API calls
            if response_time > 1.0:  # Slower than 1 second
                self.logger.warning(
                    "Slow API call detected",
                    extra={
                        'endpoint': endpoint,
                        'method': method,
                        'response_time': response_time,
                        'status_code': status_code,
                        'user_id': user_id,
                        'type': 'slow_api_call'
                    }
                )
    
    def record_database_query(self, query, execution_time, table=None):
        """Record database query metrics"""
        with self.lock:
            if execution_time > 0.1:  # Slower than 100ms
                self.slow_queries.append({
                    'query': str(query)[:500],
                    'execution_time': execution_time,
                    'table': table,
                    'timestamp': datetime.now().isoformat()
                })
                
                self.logger.warning(
                    "Slow database query detected",
                    extra={
                        'query': str(query)[:500],
                        'execution_time': execution_time,
                        'table': table,
                        'type': 'slow_database_query'
                    }
                )
    
    def get_api_metrics(self):
        """Get API performance metrics"""
        with self.lock:
            metrics = {}
            for endpoint, data in self.api_metrics.items():
                if data['count'] > 0:
                    metrics[endpoint] = {
                        'count': data['count'],
                        'avg_response_time': data['total_time'] / data['count'],
                        'total_time': data['total_time'],
                        'error_rate': data['errors'] / data['count'] * 100,
                        'errors': data['errors']
                    }
            return metrics
    
    def get_slow_queries(self):
        """Get recent slow queries"""
        with self.lock:
            return list(self.slow_queries)
    
    def reset_metrics(self):
        """Reset all metrics"""
        with self.lock:
            self.api_metrics.clear()
            self.slow_queries.clear()
            self.metrics.clear()
    
    def get_system_metrics(self):
        """Get current system metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available': memory.available,
                'memory_total': memory.total,
                'disk_percent': disk.percent,
                'disk_free': disk.free,
                'disk_total': disk.total,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Error getting system metrics: {e}")
            return {}


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


def track_performance(func_name=None):
    """Decorator to track function performance"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                performance_monitor.logger.error(
                    f"Error in {func_name or func.__name__}: {e}",
                    extra={
                        'function': func_name or func.__name__,
                        'error': str(e),
                        'type': 'function_error'
                    }
                )
                raise
            finally:
                execution_time = time.time() - start_time
                if execution_time > 0.5:  # Log slow functions
                    performance_monitor.logger.warning(
                        f"Slow function execution: {func_name or func.__name__}",
                        extra={
                            'function': func_name or func.__name__,
                            'execution_time': execution_time,
                            'type': 'slow_function'
                        }
                    )
        return wrapper
    return decorator


class DatabaseQueryMonitor:
    """Monitor database query performance"""
    
    def __init__(self):
        self.logger = get_logger('performance')
        self.query_count = 0
        self.total_time = 0
    
    def __enter__(self):
        self.initial_queries = len(connection.queries)
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.time()
        self.execution_time = self.end_time - self.start_time
        
        # Count new queries
        new_queries = connection.queries[self.initial_queries:]
        self.query_count = len(new_queries)
        
        # Log query performance
        if self.query_count > 10:  # Too many queries
            self.logger.warning(
                f"High query count detected: {self.query_count} queries",
                extra={
                    'query_count': self.query_count,
                    'execution_time': self.execution_time,
                    'type': 'high_query_count'
                }
            )
        
        # Record individual slow queries
        for query in new_queries:
            query_time = float(query['time'])
            if query_time > 0.1:  # Slow query threshold
                performance_monitor.record_database_query(
                    query['sql'], query_time
                )


class APIPerformanceMiddleware(MiddlewareMixin):
    """Middleware to monitor API performance"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = get_logger('performance')
        super().__init__(get_response)
    
    def process_request(self, request):
        request._performance_start_time = time.time()
        request._performance_initial_queries = len(connection.queries)
    
    def process_response(self, request, response):
        if hasattr(request, '_performance_start_time'):
            response_time = time.time() - request._performance_start_time
            
            # Count database queries for this request
            query_count = len(connection.queries) - getattr(request, '_performance_initial_queries', 0)
            
            # Record API performance
            user_id = getattr(request.user, 'id', None) if hasattr(request, 'user') and request.user.is_authenticated else None
            
            performance_monitor.record_api_call(
                request.path,
                request.method,
                response_time,
                response.status_code,
                user_id
            )
            
            # Add performance headers
            response['X-Response-Time'] = f"{response_time:.3f}s"
            response['X-Query-Count'] = str(query_count)
            
            # Log detailed performance info for slow requests
            if response_time > 1.0 or query_count > 10:
                self.logger.warning(
                    "Performance issue detected",
                    extra={
                        'endpoint': request.path,
                        'method': request.method,
                        'response_time': response_time,
                        'query_count': query_count,
                        'status_code': response.status_code,
                        'user_id': user_id,
                        'type': 'performance_issue'
                    }
                )
        
        return response


class CacheMonitor:
    """Monitor cache performance"""
    
    def __init__(self):
        self.logger = get_logger('performance')
        self.hits = 0
        self.misses = 0
    
    def record_hit(self, key):
        """Record cache hit"""
        self.hits += 1
        self.logger.debug(
            "Cache hit",
            extra={
                'cache_key': key,
                'type': 'cache_hit'
            }
        )
    
    def record_miss(self, key):
        """Record cache miss"""
        self.misses += 1
        self.logger.debug(
            "Cache miss",
            extra={
                'cache_key': key,
                'type': 'cache_miss'
            }
        )
    
    def get_hit_rate(self):
        """Get cache hit rate"""
        total = self.hits + self.misses
        if total == 0:
            return 0
        return (self.hits / total) * 100
    
    def reset(self):
        """Reset cache statistics"""
        self.hits = 0
        self.misses = 0


# Global cache monitor instance
cache_monitor = CacheMonitor()


class PerformanceProfiler:
    """Context manager for profiling code blocks"""
    
    def __init__(self, name, threshold=0.1):
        self.name = name
        self.threshold = threshold
        self.logger = get_logger('performance')
    
    def __enter__(self):
        self.start_time = time.time()
        self.initial_queries = len(connection.queries)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        execution_time = time.time() - self.start_time
        query_count = len(connection.queries) - self.initial_queries
        
        if execution_time > self.threshold:
            self.logger.warning(
                f"Slow operation: {self.name}",
                extra={
                    'operation': self.name,
                    'execution_time': execution_time,
                    'query_count': query_count,
                    'type': 'slow_operation'
                }
            )


def get_performance_report():
    """Generate comprehensive performance report"""
    report = {
        'timestamp': datetime.now().isoformat(),
        'api_metrics': performance_monitor.get_api_metrics(),
        'slow_queries': performance_monitor.get_slow_queries(),
        'system_metrics': performance_monitor.get_system_metrics(),
        'cache_hit_rate': cache_monitor.get_hit_rate(),
        'cache_stats': {
            'hits': cache_monitor.hits,
            'misses': cache_monitor.misses
        }
    }
    
    return report


def save_performance_report():
    """Save performance report to cache"""
    report = get_performance_report()
    cache.set('performance_report', report, timeout=3600)  # Cache for 1 hour
    return report


class MemoryProfiler:
    """Profile memory usage"""
    
    def __init__(self, name):
        self.name = name
        self.logger = get_logger('performance')
    
    def __enter__(self):
        import tracemalloc
        tracemalloc.start()
        self.start_memory = psutil.Process().memory_info().rss
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        import tracemalloc
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        end_memory = psutil.Process().memory_info().rss
        memory_diff = end_memory - self.start_memory
        
        if memory_diff > 10 * 1024 * 1024:  # More than 10MB
            self.logger.warning(
                f"High memory usage: {self.name}",
                extra={
                    'operation': self.name,
                    'memory_diff': memory_diff,
                    'peak_memory': peak,
                    'current_memory': current,
                    'type': 'high_memory_usage'
                }
            )


# Performance monitoring utilities
def monitor_slow_queries(threshold=0.1):
    """Decorator to monitor slow database queries"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            with DatabaseQueryMonitor():
                return func(*args, **kwargs)
        return wrapper
    return decorator


def profile_memory(name):
    """Decorator to profile memory usage"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            with MemoryProfiler(name or func.__name__):
                return func(*args, **kwargs)
        return wrapper
    return decorator


# Performance alerts
class PerformanceAlert:
    """Send alerts for performance issues"""
    
    def __init__(self):
        self.logger = get_logger('performance')
        self.alert_thresholds = {
            'api_response_time': 2.0,  # seconds
            'database_query_time': 0.5,  # seconds
            'memory_usage': 80,  # percentage
            'cpu_usage': 80,  # percentage
            'error_rate': 5,  # percentage
        }
    
    def check_api_performance(self):
        """Check API performance and send alerts"""
        metrics = performance_monitor.get_api_metrics()
        
        for endpoint, data in metrics.items():
            if data['avg_response_time'] > self.alert_thresholds['api_response_time']:
                self.send_alert(
                    'slow_api',
                    f"Slow API endpoint: {endpoint}",
                    {
                        'endpoint': endpoint,
                        'avg_response_time': data['avg_response_time'],
                        'threshold': self.alert_thresholds['api_response_time']
                    }
                )
            
            if data['error_rate'] > self.alert_thresholds['error_rate']:
                self.send_alert(
                    'high_error_rate',
                    f"High error rate for endpoint: {endpoint}",
                    {
                        'endpoint': endpoint,
                        'error_rate': data['error_rate'],
                        'threshold': self.alert_thresholds['error_rate']
                    }
                )
    
    def check_system_performance(self):
        """Check system performance and send alerts"""
        metrics = performance_monitor.get_system_metrics()
        
        if metrics.get('cpu_percent', 0) > self.alert_thresholds['cpu_usage']:
            self.send_alert(
                'high_cpu',
                "High CPU usage detected",
                {
                    'cpu_percent': metrics['cpu_percent'],
                    'threshold': self.alert_thresholds['cpu_usage']
                }
            )
        
        if metrics.get('memory_percent', 0) > self.alert_thresholds['memory_usage']:
            self.send_alert(
                'high_memory',
                "High memory usage detected",
                {
                    'memory_percent': metrics['memory_percent'],
                    'threshold': self.alert_thresholds['memory_usage']
                }
            )
    
    def send_alert(self, alert_type, message, data):
        """Send performance alert"""
        self.logger.critical(
            message,
            extra={
                'alert_type': alert_type,
                'alert_data': data,
                'type': 'performance_alert'
            }
        )
        
        # Here you could integrate with external alerting systems
        # like Slack, email, PagerDuty, etc.


# Global performance alert instance
performance_alert = PerformanceAlert()

print("Performance monitoring system loaded successfully!")
print("Use @track_performance decorator to monitor function performance.")
print("Use DatabaseQueryMonitor context manager to monitor database queries.")
print("Add APIPerformanceMiddleware to MIDDLEWARE in settings.py.")