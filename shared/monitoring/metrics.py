import time
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict, deque
from threading import Lock
import json

@dataclass
class MetricPoint:
    """A single metric data point."""
    timestamp: float
    value: float
    labels: Dict[str, str] = field(default_factory=dict)

@dataclass
class ServiceMetrics:
    """Service-level metrics collection."""
    service_name: str
    request_count: int = 0
    error_count: int = 0
    total_response_time: float = 0.0
    active_connections: int = 0
    last_health_check: Optional[float] = None
    health_status: str = 'unknown'
    
    @property
    def average_response_time(self) -> float:
        """Calculate average response time."""
        if self.request_count == 0:
            return 0.0
        return self.total_response_time / self.request_count
    
    @property
    def error_rate(self) -> float:
        """Calculate error rate percentage."""
        if self.request_count == 0:
            return 0.0
        return (self.error_count / self.request_count) * 100

class MetricsCollector:
    """Centralized metrics collection system."""
    
    def __init__(self, max_points: int = 1000):
        self.max_points = max_points
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_points))
        self.service_metrics: Dict[str, ServiceMetrics] = {}
        self.lock = Lock()
        self.logger = logging.getLogger('metrics')
    
    def record_metric(self, name: str, value: float, labels: Dict[str, str] = None):
        """Record a metric point."""
        with self.lock:
            point = MetricPoint(
                timestamp=time.time(),
                value=value,
                labels=labels or {}
            )
            self.metrics[name].append(point)
            self.logger.debug(f"Recorded metric {name}: {value}")
    
    def record_request(self, service_name: str, response_time: float, status_code: int):
        """Record a request metric."""
        with self.lock:
            if service_name not in self.service_metrics:
                self.service_metrics[service_name] = ServiceMetrics(service_name)
            
            metrics = self.service_metrics[service_name]
            metrics.request_count += 1
            metrics.total_response_time += response_time
            
            if status_code >= 400:
                metrics.error_count += 1
            
            # Record individual metrics
            self.record_metric(f'{service_name}.request_count', metrics.request_count)
            self.record_metric(f'{service_name}.response_time', response_time)
            self.record_metric(f'{service_name}.error_rate', metrics.error_rate)
    
    def update_health_status(self, service_name: str, status: str):
        """Update service health status."""
        with self.lock:
            if service_name not in self.service_metrics:
                self.service_metrics[service_name] = ServiceMetrics(service_name)
            
            self.service_metrics[service_name].health_status = status
            self.service_metrics[service_name].last_health_check = time.time()
            
            # Record health metric (1 for healthy, 0 for unhealthy)
            health_value = 1.0 if status == 'healthy' else 0.0
            self.record_metric(f'{service_name}.health', health_value)
    
    def get_metrics(self, name: str, since: float = None) -> list:
        """Get metrics for a specific name."""
        with self.lock:
            points = list(self.metrics.get(name, []))
            if since:
                points = [p for p in points if p.timestamp >= since]
            return points
    
    def get_service_summary(self, service_name: str) -> Dict[str, Any]:
        """Get service metrics summary."""
        with self.lock:
            if service_name not in self.service_metrics:
                return {}
            
            metrics = self.service_metrics[service_name]
            return {
                'service_name': service_name,
                'request_count': metrics.request_count,
                'error_count': metrics.error_count,
                'error_rate': metrics.error_rate,
                'average_response_time': metrics.average_response_time,
                'health_status': metrics.health_status,
                'last_health_check': metrics.last_health_check,
                'active_connections': metrics.active_connections
            }
    
    def get_all_services_summary(self) -> Dict[str, Dict[str, Any]]:
        """Get summary for all services."""
        return {name: self.get_service_summary(name) for name in self.service_metrics.keys()}
    
    def export_prometheus_format(self) -> str:
        """Export metrics in Prometheus format."""
        lines = []
        
        with self.lock:
            for service_name, metrics in self.service_metrics.items():
                # Request count
                lines.append(f'# HELP {service_name}_requests_total Total number of requests')
                lines.append(f'# TYPE {service_name}_requests_total counter')
                lines.append(f'{service_name}_requests_total {metrics.request_count}')
                
                # Error count
                lines.append(f'# HELP {service_name}_errors_total Total number of errors')
                lines.append(f'# TYPE {service_name}_errors_total counter')
                lines.append(f'{service_name}_errors_total {metrics.error_count}')
                
                # Average response time
                lines.append(f'# HELP {service_name}_response_time_avg Average response time in seconds')
                lines.append(f'# TYPE {service_name}_response_time_avg gauge')
                lines.append(f'{service_name}_response_time_avg {metrics.average_response_time}')
                
                # Health status
                lines.append(f'# HELP {service_name}_health Service health status (1=healthy, 0=unhealthy)')
                lines.append(f'# TYPE {service_name}_health gauge')
                health_value = 1 if metrics.health_status == 'healthy' else 0
                lines.append(f'{service_name}_health {health_value}')
        
        return '\n'.join(lines)
    
    def reset_metrics(self, service_name: str = None):
        """Reset metrics for a service or all services."""
        with self.lock:
            if service_name:
                if service_name in self.service_metrics:
                    del self.service_metrics[service_name]
                # Clear related metric points
                keys_to_remove = [k for k in self.metrics.keys() if k.startswith(f'{service_name}.')]
                for key in keys_to_remove:
                    del self.metrics[key]
            else:
                self.service_metrics.clear()
                self.metrics.clear()

class AlertManager:
    """Simple alerting system for service metrics."""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
        self.alert_rules = []
        self.logger = logging.getLogger('alerts')
    
    def add_alert_rule(self, name: str, condition_func, message: str, severity: str = 'warning'):
        """Add an alert rule."""
        self.alert_rules.append({
            'name': name,
            'condition': condition_func,
            'message': message,
            'severity': severity
        })
    
    def check_alerts(self) -> list:
        """Check all alert rules and return triggered alerts."""
        triggered_alerts = []
        
        for rule in self.alert_rules:
            try:
                if rule['condition'](self.metrics_collector):
                    alert = {
                        'name': rule['name'],
                        'message': rule['message'],
                        'severity': rule['severity'],
                        'timestamp': time.time()
                    }
                    triggered_alerts.append(alert)
                    self.logger.warning(f"Alert triggered: {rule['name']} - {rule['message']}")
            except Exception as e:
                self.logger.error(f"Error checking alert rule {rule['name']}: {e}")
        
        return triggered_alerts

# Global metrics collector instance
metrics_collector = MetricsCollector()

# Default alert rules
def setup_default_alerts(alert_manager: AlertManager):
    """Setup default alert rules."""
    
    # High error rate alert
    def high_error_rate(collector):
        for service_name, metrics in collector.service_metrics.items():
            if metrics.error_rate > 10.0 and metrics.request_count > 10:
                return True
        return False
    
    alert_manager.add_alert_rule(
        'high_error_rate',
        high_error_rate,
        'Service has high error rate (>10%)',
        'critical'
    )
    
    # Slow response time alert
    def slow_response_time(collector):
        for service_name, metrics in collector.service_metrics.items():
            if metrics.average_response_time > 5.0 and metrics.request_count > 5:
                return True
        return False
    
    alert_manager.add_alert_rule(
        'slow_response_time',
        slow_response_time,
        'Service has slow average response time (>5s)',
        'warning'
    )
    
    # Service down alert
    def service_down(collector):
        current_time = time.time()
        for service_name, metrics in collector.service_metrics.items():
            if (metrics.last_health_check and 
                current_time - metrics.last_health_check > 300 and  # 5 minutes
                metrics.health_status != 'healthy'):
                return True
        return False
    
    alert_manager.add_alert_rule(
        'service_down',
        service_down,
        'Service appears to be down or unhealthy',
        'critical'
    )