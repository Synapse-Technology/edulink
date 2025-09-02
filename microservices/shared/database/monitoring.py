"""Database monitoring and metrics collection for microservices."""

import time
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
from threading import Lock
import json

from .connection_manager import connection_manager
from .config import SERVICE_SCHEMAS

logger = logging.getLogger(__name__)

@dataclass
class QueryMetrics:
    """Metrics for a database query."""
    query_hash: str
    service_name: str
    schema_name: str
    execution_time: float
    timestamp: datetime
    success: bool
    error_message: Optional[str] = None
    rows_affected: Optional[int] = None
    query_type: Optional[str] = None  # SELECT, INSERT, UPDATE, DELETE

@dataclass
class ServiceMetrics:
    """Aggregated metrics for a service."""
    service_name: str
    total_queries: int = 0
    successful_queries: int = 0
    failed_queries: int = 0
    avg_execution_time: float = 0.0
    max_execution_time: float = 0.0
    min_execution_time: float = float('inf')
    queries_per_minute: float = 0.0
    last_activity: Optional[datetime] = None
    error_rate: float = 0.0
    recent_errors: List[str] = field(default_factory=list)

@dataclass
class CrossSchemaMetrics:
    """Metrics for cross-schema operations."""
    source_service: str
    target_schemas: List[str]
    operation_count: int = 0
    avg_execution_time: float = 0.0
    success_rate: float = 0.0
    last_operation: Optional[datetime] = None

class DatabaseMonitor:
    """Monitors database operations and collects metrics."""
    
    def __init__(self, max_query_history: int = 1000):
        self.max_query_history = max_query_history
        self.query_history: deque = deque(maxlen=max_query_history)
        self.service_metrics: Dict[str, ServiceMetrics] = {}
        self.cross_schema_metrics: Dict[str, CrossSchemaMetrics] = {}
        self.slow_query_threshold = 1.0  # seconds
        self.error_threshold = 0.1  # 10% error rate
        self._lock = Lock()
        
        # Initialize service metrics
        for service_name in SERVICE_SCHEMAS.keys():
            self.service_metrics[service_name] = ServiceMetrics(service_name=service_name)
    
    def record_query(self, query_metrics: QueryMetrics) -> None:
        """Record a query execution.
        
        Args:
            query_metrics: Query execution metrics
        """
        with self._lock:
            self.query_history.append(query_metrics)
            self._update_service_metrics(query_metrics)
            
            # Log slow queries
            if query_metrics.execution_time > self.slow_query_threshold:
                logger.warning(
                    f"Slow query detected in {query_metrics.service_name}: "
                    f"{query_metrics.execution_time:.2f}s"
                )
    
    def record_cross_schema_operation(self, source_service: str, target_schemas: List[str], 
                                    execution_time: float, success: bool) -> None:
        """Record a cross-schema operation.
        
        Args:
            source_service: Service performing the operation
            target_schemas: Target schemas accessed
            execution_time: Operation execution time
            success: Whether operation succeeded
        """
        key = f"{source_service}->{",".join(sorted(target_schemas))}"
        
        with self._lock:
            if key not in self.cross_schema_metrics:
                self.cross_schema_metrics[key] = CrossSchemaMetrics(
                    source_service=source_service,
                    target_schemas=target_schemas
                )
            
            metrics = self.cross_schema_metrics[key]
            metrics.operation_count += 1
            metrics.last_operation = datetime.now()
            
            # Update average execution time
            if metrics.operation_count == 1:
                metrics.avg_execution_time = execution_time
            else:
                metrics.avg_execution_time = (
                    (metrics.avg_execution_time * (metrics.operation_count - 1) + execution_time) 
                    / metrics.operation_count
                )
            
            # Update success rate
            if success:
                success_count = int(metrics.success_rate * (metrics.operation_count - 1)) + 1
            else:
                success_count = int(metrics.success_rate * (metrics.operation_count - 1))
            
            metrics.success_rate = success_count / metrics.operation_count
    
    def _update_service_metrics(self, query_metrics: QueryMetrics) -> None:
        """Update service-level metrics.
        
        Args:
            query_metrics: Query execution metrics
        """
        service_name = query_metrics.service_name
        if service_name not in self.service_metrics:
            self.service_metrics[service_name] = ServiceMetrics(service_name=service_name)
        
        metrics = self.service_metrics[service_name]
        metrics.total_queries += 1
        metrics.last_activity = query_metrics.timestamp
        
        if query_metrics.success:
            metrics.successful_queries += 1
        else:
            metrics.failed_queries += 1
            if query_metrics.error_message:
                metrics.recent_errors.append(query_metrics.error_message)
                # Keep only last 10 errors
                metrics.recent_errors = metrics.recent_errors[-10:]
        
        # Update execution time metrics
        exec_time = query_metrics.execution_time
        metrics.max_execution_time = max(metrics.max_execution_time, exec_time)
        metrics.min_execution_time = min(metrics.min_execution_time, exec_time)
        
        # Update average execution time
        if metrics.total_queries == 1:
            metrics.avg_execution_time = exec_time
        else:
            metrics.avg_execution_time = (
                (metrics.avg_execution_time * (metrics.total_queries - 1) + exec_time) 
                / metrics.total_queries
            )
        
        # Update error rate
        metrics.error_rate = metrics.failed_queries / metrics.total_queries
        
        # Calculate queries per minute (last 60 seconds)
        one_minute_ago = datetime.now() - timedelta(minutes=1)
        recent_queries = sum(
            1 for q in self.query_history 
            if q.service_name == service_name and q.timestamp > one_minute_ago
        )
        metrics.queries_per_minute = recent_queries
    
    def get_service_metrics(self, service_name: Optional[str] = None) -> Dict[str, Any]:
        """Get metrics for a specific service or all services.
        
        Args:
            service_name: Optional service name filter
            
        Returns:
            Service metrics data
        """
        with self._lock:
            if service_name:
                if service_name in self.service_metrics:
                    return self._serialize_service_metrics(self.service_metrics[service_name])
                else:
                    return {}
            else:
                return {
                    name: self._serialize_service_metrics(metrics)
                    for name, metrics in self.service_metrics.items()
                }
    
    def get_cross_schema_metrics(self) -> Dict[str, Any]:
        """Get cross-schema operation metrics.
        
        Returns:
            Cross-schema metrics data
        """
        with self._lock:
            return {
                key: {
                    'source_service': metrics.source_service,
                    'target_schemas': metrics.target_schemas,
                    'operation_count': metrics.operation_count,
                    'avg_execution_time': metrics.avg_execution_time,
                    'success_rate': metrics.success_rate,
                    'last_operation': metrics.last_operation.isoformat() if metrics.last_operation else None
                }
                for key, metrics in self.cross_schema_metrics.items()
            }
    
    def get_slow_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get slowest queries.
        
        Args:
            limit: Maximum number of queries to return
            
        Returns:
            List of slow queries
        """
        with self._lock:
            slow_queries = sorted(
                [q for q in self.query_history if q.execution_time > self.slow_query_threshold],
                key=lambda x: x.execution_time,
                reverse=True
            )[:limit]
            
            return [
                {
                    'query_hash': q.query_hash,
                    'service_name': q.service_name,
                    'schema_name': q.schema_name,
                    'execution_time': q.execution_time,
                    'timestamp': q.timestamp.isoformat(),
                    'query_type': q.query_type,
                    'rows_affected': q.rows_affected
                }
                for q in slow_queries
            ]
    
    def get_error_summary(self) -> Dict[str, Any]:
        """Get error summary across all services.
        
        Returns:
            Error summary data
        """
        with self._lock:
            error_summary = {
                'total_errors': sum(m.failed_queries for m in self.service_metrics.values()),
                'services_with_errors': [],
                'recent_errors': []
            }
            
            for service_name, metrics in self.service_metrics.items():
                if metrics.error_rate > self.error_threshold:
                    error_summary['services_with_errors'].append({
                        'service_name': service_name,
                        'error_rate': metrics.error_rate,
                        'failed_queries': metrics.failed_queries,
                        'recent_errors': metrics.recent_errors[-3:]  # Last 3 errors
                    })
            
            # Get recent errors from query history
            one_hour_ago = datetime.now() - timedelta(hours=1)
            recent_errors = [
                {
                    'service_name': q.service_name,
                    'timestamp': q.timestamp.isoformat(),
                    'error_message': q.error_message,
                    'query_type': q.query_type
                }
                for q in self.query_history
                if not q.success and q.timestamp > one_hour_ago
            ][-10:]  # Last 10 errors
            
            error_summary['recent_errors'] = recent_errors
            return error_summary
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall database health status.
        
        Returns:
            Health status data
        """
        with self._lock:
            health_status = {
                'overall_status': 'healthy',
                'services': {},
                'alerts': [],
                'summary': {
                    'total_services': len(self.service_metrics),
                    'active_services': 0,
                    'services_with_errors': 0,
                    'avg_response_time': 0.0
                }
            }
            
            total_response_time = 0.0
            active_services = 0
            services_with_errors = 0
            
            for service_name, metrics in self.service_metrics.items():
                service_status = 'healthy'
                service_alerts = []
                
                # Check for high error rate
                if metrics.error_rate > self.error_threshold:
                    service_status = 'unhealthy'
                    services_with_errors += 1
                    service_alerts.append(f"High error rate: {metrics.error_rate:.2%}")
                
                # Check for slow queries
                if metrics.avg_execution_time > self.slow_query_threshold:
                    if service_status == 'healthy':
                        service_status = 'warning'
                    service_alerts.append(f"Slow average response: {metrics.avg_execution_time:.2f}s")
                
                # Check for recent activity
                if metrics.last_activity:
                    time_since_activity = datetime.now() - metrics.last_activity
                    if time_since_activity < timedelta(minutes=5):
                        active_services += 1
                    elif time_since_activity > timedelta(hours=1):
                        if service_status == 'healthy':
                            service_status = 'warning'
                        service_alerts.append("No recent activity")
                
                health_status['services'][service_name] = {
                    'status': service_status,
                    'alerts': service_alerts,
                    'metrics': self._serialize_service_metrics(metrics)
                }
                
                if metrics.total_queries > 0:
                    total_response_time += metrics.avg_execution_time
            
            # Update summary
            health_status['summary']['active_services'] = active_services
            health_status['summary']['services_with_errors'] = services_with_errors
            
            if len(self.service_metrics) > 0:
                health_status['summary']['avg_response_time'] = (
                    total_response_time / len(self.service_metrics)
                )
            
            # Determine overall status
            if services_with_errors > 0:
                health_status['overall_status'] = 'unhealthy'
            elif any(s['status'] == 'warning' for s in health_status['services'].values()):
                health_status['overall_status'] = 'warning'
            
            return health_status
    
    def _serialize_service_metrics(self, metrics: ServiceMetrics) -> Dict[str, Any]:
        """Serialize service metrics to dictionary.
        
        Args:
            metrics: Service metrics object
            
        Returns:
            Serialized metrics
        """
        return {
            'service_name': metrics.service_name,
            'total_queries': metrics.total_queries,
            'successful_queries': metrics.successful_queries,
            'failed_queries': metrics.failed_queries,
            'avg_execution_time': metrics.avg_execution_time,
            'max_execution_time': metrics.max_execution_time,
            'min_execution_time': metrics.min_execution_time if metrics.min_execution_time != float('inf') else 0.0,
            'queries_per_minute': metrics.queries_per_minute,
            'last_activity': metrics.last_activity.isoformat() if metrics.last_activity else None,
            'error_rate': metrics.error_rate,
            'recent_errors': metrics.recent_errors
        }
    
    def reset_metrics(self, service_name: Optional[str] = None) -> None:
        """Reset metrics for a service or all services.
        
        Args:
            service_name: Optional service name to reset
        """
        with self._lock:
            if service_name:
                if service_name in self.service_metrics:
                    self.service_metrics[service_name] = ServiceMetrics(service_name=service_name)
            else:
                for service_name in self.service_metrics.keys():
                    self.service_metrics[service_name] = ServiceMetrics(service_name=service_name)
                self.query_history.clear()
                self.cross_schema_metrics.clear()
    
    def export_metrics(self, format_type: str = 'json') -> str:
        """Export metrics in specified format.
        
        Args:
            format_type: Export format ('json' or 'prometheus')
            
        Returns:
            Formatted metrics string
        """
        if format_type == 'json':
            return json.dumps({
                'service_metrics': self.get_service_metrics(),
                'cross_schema_metrics': self.get_cross_schema_metrics(),
                'health_status': self.get_health_status(),
                'timestamp': datetime.now().isoformat()
            }, indent=2)
        elif format_type == 'prometheus':
            return self._export_prometheus_metrics()
        else:
            raise ValueError(f"Unsupported format: {format_type}")
    
    def _export_prometheus_metrics(self) -> str:
        """Export metrics in Prometheus format.
        
        Returns:
            Prometheus formatted metrics
        """
        lines = []
        
        # Service metrics
        for service_name, metrics in self.service_metrics.items():
            lines.extend([
                f'# HELP edulink_db_queries_total Total number of database queries',
                f'# TYPE edulink_db_queries_total counter',
                f'edulink_db_queries_total{{service="{service_name}"}} {metrics.total_queries}',
                f'',
                f'# HELP edulink_db_query_duration_seconds Average query execution time',
                f'# TYPE edulink_db_query_duration_seconds gauge',
                f'edulink_db_query_duration_seconds{{service="{service_name}"}} {metrics.avg_execution_time}',
                f'',
                f'# HELP edulink_db_error_rate Query error rate',
                f'# TYPE edulink_db_error_rate gauge',
                f'edulink_db_error_rate{{service="{service_name}"}} {metrics.error_rate}',
                f''
            ])
        
        return '\n'.join(lines)

# Global database monitor instance
db_monitor = DatabaseMonitor()

# Convenience functions
def record_query_execution(service_name: str, schema_name: str, query_hash: str, 
                          execution_time: float, success: bool, 
                          error_message: Optional[str] = None,
                          rows_affected: Optional[int] = None,
                          query_type: Optional[str] = None) -> None:
    """Record a query execution."""
    metrics = QueryMetrics(
        query_hash=query_hash,
        service_name=service_name,
        schema_name=schema_name,
        execution_time=execution_time,
        timestamp=datetime.now(),
        success=success,
        error_message=error_message,
        rows_affected=rows_affected,
        query_type=query_type
    )
    db_monitor.record_query(metrics)

def get_database_health() -> Dict[str, Any]:
    """Get database health status."""
    return db_monitor.get_health_status()

def get_service_performance(service_name: Optional[str] = None) -> Dict[str, Any]:
    """Get service performance metrics."""
    return db_monitor.get_service_metrics(service_name)