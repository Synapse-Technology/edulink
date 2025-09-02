# Metrics Collection and Analysis
# Comprehensive metrics collection for system and application monitoring

import time
import psutil
import threading
from datetime import datetime, timedelta
from collections import defaultdict, deque
from django.db import connection
from django.core.cache import cache
from django.conf import settings
from django.contrib.auth import get_user_model
from .logging_config import get_logger
import json
from functools import wraps

User = get_user_model()


class MetricsCollector:
    """Central metrics collection and analysis system"""
    
    def __init__(self):
        self.logger = get_logger('performance')
        self.metrics_history = defaultdict(deque)
        self.custom_metrics = defaultdict(list)
        self.lock = threading.Lock()
        self.collection_interval = 60  # seconds
        self.max_history_size = 1440  # 24 hours of minute-by-minute data
    
    def collect_system_metrics(self):
        """Collect system-level metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory metrics
            memory = psutil.virtual_memory()
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            
            # Network metrics (if available)
            try:
                network = psutil.net_io_counters()
                network_metrics = {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv,
                    'packets_sent': network.packets_sent,
                    'packets_recv': network.packets_recv
                }
            except:
                network_metrics = {}
            
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'cpu': {
                    'percent': cpu_percent,
                    'count': cpu_count,
                    'load_avg': getattr(psutil, 'getloadavg', lambda: [0, 0, 0])()
                },
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used,
                    'free': memory.free
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': disk.percent
                },
                'network': network_metrics
            }
            
            with self.lock:
                self.metrics_history['system'].append(metrics)
                if len(self.metrics_history['system']) > self.max_history_size:
                    self.metrics_history['system'].popleft()
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {e}")
            return {}
    
    def collect_database_metrics(self):
        """Collect database-related metrics"""
        try:
            # Query count and timing
            query_count = len(connection.queries)
            
            # Database connection info
            db_info = {
                'vendor': connection.vendor,
                'queries_count': query_count
            }
            
            # Get database size (PostgreSQL specific)
            if connection.vendor == 'postgresql':
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT pg_size_pretty(pg_database_size(current_database()))
                    """)
                    db_size = cursor.fetchone()[0]
                    db_info['size'] = db_size
            
            # Table sizes and row counts
            table_stats = self._get_table_statistics()
            
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'database': db_info,
                'tables': table_stats
            }
            
            with self.lock:
                self.metrics_history['database'].append(metrics)
                if len(self.metrics_history['database']) > self.max_history_size:
                    self.metrics_history['database'].popleft()
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error collecting database metrics: {e}")
            return {}
    
    def _get_table_statistics(self):
        """Get statistics for important tables"""
        try:
            from django.apps import apps
            
            table_stats = {}
            important_models = [
                'authentication.User',
                'application.Application',
                'internship.Internship',
                'internship_progress.LogbookEntry',
                'notifications.Notification'
            ]
            
            for model_name in important_models:
                try:
                    model = apps.get_model(model_name)
                    count = model.objects.count()
                    table_stats[model._meta.db_table] = {
                        'row_count': count,
                        'model': model_name
                    }
                except Exception:
                    continue
            
            return table_stats
            
        except Exception as e:
            self.logger.error(f"Error getting table statistics: {e}")
            return {}
    
    def collect_application_metrics(self):
        """Collect application-specific metrics"""
        try:
            # User metrics
            user_metrics = self._get_user_metrics()
            
            # Application metrics
            app_metrics = self._get_application_metrics()
            
            # Internship metrics
            internship_metrics = self._get_internship_metrics()
            
            # Cache metrics
            cache_metrics = self._get_cache_metrics()
            
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'users': user_metrics,
                'applications': app_metrics,
                'internships': internship_metrics,
                'cache': cache_metrics
            }
            
            with self.lock:
                self.metrics_history['application'].append(metrics)
                if len(self.metrics_history['application']) > self.max_history_size:
                    self.metrics_history['application'].popleft()
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error collecting application metrics: {e}")
            return {}
    
    def _get_user_metrics(self):
        """Get user-related metrics"""
        try:
            now = datetime.now()
            today = now.date()
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)
            
            total_users = User.objects.count()
            active_today = User.objects.filter(last_login__date=today).count()
            active_week = User.objects.filter(last_login__gte=week_ago).count()
            active_month = User.objects.filter(last_login__gte=month_ago).count()
            new_today = User.objects.filter(date_joined__date=today).count()
            new_week = User.objects.filter(date_joined__gte=week_ago).count()
            
            # User type distribution
            user_types = {}
            if hasattr(User, 'user_type'):
                from django.db.models import Count
                user_type_counts = User.objects.values('user_type').annotate(count=Count('id'))
                for item in user_type_counts:
                    user_types[item['user_type']] = item['count']
            
            return {
                'total': total_users,
                'active_today': active_today,
                'active_week': active_week,
                'active_month': active_month,
                'new_today': new_today,
                'new_week': new_week,
                'user_types': user_types
            }
            
        except Exception as e:
            self.logger.error(f"Error getting user metrics: {e}")
            return {}
    
    def _get_application_metrics(self):
        """Get application-related metrics"""
        try:
            from django.apps import apps
            
            # Try to get Application model
            try:
                Application = apps.get_model('application.Application')
                
                total_applications = Application.objects.count()
                pending_applications = Application.objects.filter(status='pending').count()
                accepted_applications = Application.objects.filter(status='accepted').count()
                rejected_applications = Application.objects.filter(status='rejected').count()
                
                today = datetime.now().date()
                applications_today = Application.objects.filter(application_date__date=today).count()
                
                return {
                    'total': total_applications,
                    'pending': pending_applications,
                    'accepted': accepted_applications,
                    'rejected': rejected_applications,
                    'today': applications_today,
                    'acceptance_rate': (accepted_applications / total_applications * 100) if total_applications > 0 else 0
                }
            except:
                return {}
                
        except Exception as e:
            self.logger.error(f"Error getting application metrics: {e}")
            return {}
    
    def _get_internship_metrics(self):
        """Get internship-related metrics"""
        try:
            from django.apps import apps
            
            try:
                Internship = apps.get_model('internship.Internship')
                
                total_internships = Internship.objects.count()
                active_internships = Internship.objects.filter(
                    start_date__lte=datetime.now().date(),
                    end_date__gte=datetime.now().date()
                ).count()
                
                upcoming_internships = Internship.objects.filter(
                    start_date__gt=datetime.now().date()
                ).count()
                
                return {
                    'total': total_internships,
                    'active': active_internships,
                    'upcoming': upcoming_internships
                }
            except:
                return {}
                
        except Exception as e:
            self.logger.error(f"Error getting internship metrics: {e}")
            return {}
    
    def _get_cache_metrics(self):
        """Get cache-related metrics"""
        try:
            # Basic cache info
            cache_info = {
                'backend': str(cache.__class__.__name__)
            }
            
            # Try to get Redis info if using Redis
            if 'redis' in str(cache.__class__).lower():
                try:
                    import redis
                    r = cache._cache.get_client()
                    info = r.info()
                    cache_info.update({
                        'used_memory': info.get('used_memory', 0),
                        'used_memory_human': info.get('used_memory_human', '0B'),
                        'connected_clients': info.get('connected_clients', 0),
                        'total_commands_processed': info.get('total_commands_processed', 0),
                        'keyspace_hits': info.get('keyspace_hits', 0),
                        'keyspace_misses': info.get('keyspace_misses', 0)
                    })
                    
                    # Calculate hit rate
                    hits = info.get('keyspace_hits', 0)
                    misses = info.get('keyspace_misses', 0)
                    total = hits + misses
                    cache_info['hit_rate'] = (hits / total * 100) if total > 0 else 0
                except:
                    pass
            
            return cache_info
            
        except Exception as e:
            self.logger.error(f"Error getting cache metrics: {e}")
            return {}
    
    def record_custom_metric(self, name, value, tags=None):
        """Record a custom metric"""
        metric = {
            'timestamp': datetime.now().isoformat(),
            'name': name,
            'value': value,
            'tags': tags or {}
        }
        
        with self.lock:
            self.custom_metrics[name].append(metric)
            # Keep only recent metrics
            if len(self.custom_metrics[name]) > 1000:
                self.custom_metrics[name] = self.custom_metrics[name][-1000:]
    
    def get_metrics_summary(self, hours=1):
        """Get metrics summary for the specified time period"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        summary = {
            'timestamp': datetime.now().isoformat(),
            'period_hours': hours,
            'system': self._summarize_metrics('system', cutoff_time),
            'database': self._summarize_metrics('database', cutoff_time),
            'application': self._summarize_metrics('application', cutoff_time)
        }
        
        return summary
    
    def _summarize_metrics(self, metric_type, cutoff_time):
        """Summarize metrics for a specific type"""
        with self.lock:
            metrics = self.metrics_history[metric_type]
            
            recent_metrics = [
                m for m in metrics
                if datetime.fromisoformat(m['timestamp']) > cutoff_time
            ]
            
            if not recent_metrics:
                return {}
            
            if metric_type == 'system':
                return self._summarize_system_metrics(recent_metrics)
            elif metric_type == 'database':
                return self._summarize_database_metrics(recent_metrics)
            elif metric_type == 'application':
                return self._summarize_application_metrics(recent_metrics)
            
            return {}
    
    def _summarize_system_metrics(self, metrics):
        """Summarize system metrics"""
        if not metrics:
            return {}
        
        cpu_values = [m['cpu']['percent'] for m in metrics]
        memory_values = [m['memory']['percent'] for m in metrics]
        disk_values = [m['disk']['percent'] for m in metrics]
        
        return {
            'cpu': {
                'avg': sum(cpu_values) / len(cpu_values),
                'max': max(cpu_values),
                'min': min(cpu_values)
            },
            'memory': {
                'avg': sum(memory_values) / len(memory_values),
                'max': max(memory_values),
                'min': min(memory_values)
            },
            'disk': {
                'avg': sum(disk_values) / len(disk_values),
                'max': max(disk_values),
                'min': min(disk_values)
            },
            'samples': len(metrics)
        }
    
    def _summarize_database_metrics(self, metrics):
        """Summarize database metrics"""
        if not metrics:
            return {}
        
        query_counts = [m['database']['queries_count'] for m in metrics]
        
        return {
            'queries': {
                'avg': sum(query_counts) / len(query_counts),
                'max': max(query_counts),
                'min': min(query_counts),
                'total': sum(query_counts)
            },
            'samples': len(metrics)
        }
    
    def _summarize_application_metrics(self, metrics):
        """Summarize application metrics"""
        if not metrics:
            return {}
        
        latest = metrics[-1]
        return {
            'users': latest.get('users', {}),
            'applications': latest.get('applications', {}),
            'internships': latest.get('internships', {}),
            'samples': len(metrics)
        }


# Global metrics collector instance
metrics_collector = MetricsCollector()


def collect_metrics():
    """Collect all metrics"""
    system_metrics = metrics_collector.collect_system_metrics()
    database_metrics = metrics_collector.collect_database_metrics()
    application_metrics = metrics_collector.collect_application_metrics()
    
    return {
        'system': system_metrics,
        'database': database_metrics,
        'application': application_metrics
    }


def metric_tracker(metric_name, tags=None):
    """Decorator to track function execution metrics"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Record success metric
                metrics_collector.record_custom_metric(
                    f"{metric_name}_execution_time",
                    execution_time,
                    {**(tags or {}), 'status': 'success'}
                )
                
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                
                # Record error metric
                metrics_collector.record_custom_metric(
                    f"{metric_name}_execution_time",
                    execution_time,
                    {**(tags or {}), 'status': 'error', 'error_type': type(e).__name__}
                )
                
                raise
        return wrapper
    return decorator


class MetricsExporter:
    """Export metrics in various formats"""
    
    def __init__(self):
        self.logger = get_logger('performance')
    
    def export_prometheus(self):
        """Export metrics in Prometheus format"""
        try:
            metrics = collect_metrics()
            prometheus_metrics = []
            
            # System metrics
            if 'system' in metrics and metrics['system']:
                sys_metrics = metrics['system']
                prometheus_metrics.extend([
                    f"# HELP cpu_percent CPU usage percentage",
                    f"# TYPE cpu_percent gauge",
                    f"cpu_percent {sys_metrics['cpu']['percent']}",
                    f"# HELP memory_percent Memory usage percentage",
                    f"# TYPE memory_percent gauge",
                    f"memory_percent {sys_metrics['memory']['percent']}",
                    f"# HELP disk_percent Disk usage percentage",
                    f"# TYPE disk_percent gauge",
                    f"disk_percent {sys_metrics['disk']['percent']}"
                ])
            
            # Application metrics
            if 'application' in metrics and metrics['application']:
                app_metrics = metrics['application']
                if 'users' in app_metrics:
                    user_metrics = app_metrics['users']
                    prometheus_metrics.extend([
                        f"# HELP total_users Total number of users",
                        f"# TYPE total_users gauge",
                        f"total_users {user_metrics.get('total', 0)}",
                        f"# HELP active_users_today Active users today",
                        f"# TYPE active_users_today gauge",
                        f"active_users_today {user_metrics.get('active_today', 0)}"
                    ])
            
            return "\n".join(prometheus_metrics)
            
        except Exception as e:
            self.logger.error(f"Error exporting Prometheus metrics: {e}")
            return ""
    
    def export_json(self):
        """Export metrics in JSON format"""
        try:
            metrics = collect_metrics()
            summary = metrics_collector.get_metrics_summary()
            
            return json.dumps({
                'current': metrics,
                'summary': summary,
                'timestamp': datetime.now().isoformat()
            }, indent=2)
            
        except Exception as e:
            self.logger.error(f"Error exporting JSON metrics: {e}")
            return "{}"
    
    def export_csv(self):
        """Export metrics in CSV format"""
        try:
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers
            writer.writerow([
                'Timestamp', 'Metric Type', 'Metric Name', 'Value'
            ])
            
            # Get current metrics
            metrics = collect_metrics()
            timestamp = datetime.now().isoformat()
            
            # Write system metrics
            if 'system' in metrics and metrics['system']:
                sys_metrics = metrics['system']
                writer.writerow([timestamp, 'system', 'cpu_percent', sys_metrics['cpu']['percent']])
                writer.writerow([timestamp, 'system', 'memory_percent', sys_metrics['memory']['percent']])
                writer.writerow([timestamp, 'system', 'disk_percent', sys_metrics['disk']['percent']])
            
            # Write application metrics
            if 'application' in metrics and metrics['application']:
                app_metrics = metrics['application']
                if 'users' in app_metrics:
                    user_metrics = app_metrics['users']
                    for key, value in user_metrics.items():
                        if isinstance(value, (int, float)):
                            writer.writerow([timestamp, 'application', f'users_{key}', value])
            
            return output.getvalue()
            
        except Exception as e:
            self.logger.error(f"Error exporting CSV metrics: {e}")
            return ""


# Global metrics exporter instance
metrics_exporter = MetricsExporter()


# Predefined system metrics
SYSTEM_METRICS = {
    'cpu_percent': 'CPU usage percentage',
    'memory_percent': 'Memory usage percentage',
    'disk_percent': 'Disk usage percentage',
    'network_bytes_sent': 'Network bytes sent',
    'network_bytes_recv': 'Network bytes received'
}

# Predefined application metrics
APPLICATION_METRICS = {
    'total_users': 'Total number of users',
    'active_users': 'Number of active users',
    'total_applications': 'Total number of applications',
    'pending_applications': 'Number of pending applications',
    'total_internships': 'Total number of internships',
    'active_internships': 'Number of active internships'
}


class MetricsScheduler:
    """Schedule periodic metrics collection"""
    
    def __init__(self, interval=60):
        self.interval = interval
        self.logger = get_logger('performance')
        self.running = False
        self.thread = None
    
    def start(self):
        """Start periodic metrics collection"""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._collect_loop, daemon=True)
        self.thread.start()
        
        self.logger.info(f"Metrics collection started with {self.interval}s interval")
    
    def stop(self):
        """Stop periodic metrics collection"""
        self.running = False
        if self.thread:
            self.thread.join()
        
        self.logger.info("Metrics collection stopped")
    
    def _collect_loop(self):
        """Main collection loop"""
        while self.running:
            try:
                collect_metrics()
                time.sleep(self.interval)
            except Exception as e:
                self.logger.error(f"Error in metrics collection loop: {e}")
                time.sleep(self.interval)


# Global metrics scheduler
metrics_scheduler = MetricsScheduler()

print("Metrics collection system loaded successfully!")
print("Use @metric_tracker decorator to track function metrics.")
print("Call metrics_scheduler.start() to begin periodic collection.")
print("Access metrics via metrics_collector.get_metrics_summary().")