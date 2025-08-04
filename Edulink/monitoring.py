#!/usr/bin/env python
"""
Edulink Backend Monitoring and Logging Configuration

This module provides comprehensive monitoring, logging, and alerting
capabilities for the Edulink internship management system.

Features:
- Application performance monitoring
- Error tracking and alerting
- Custom metrics collection
- Health checks and status monitoring
- Log aggregation and analysis
- Real-time notifications
- Performance profiling
- Resource usage tracking

Usage:
    python monitoring.py [command] [options]

Commands:
    start           Start monitoring services
    stop            Stop monitoring services
    status          Show monitoring status
    metrics         Display current metrics
    alerts          Show active alerts
    logs            View recent logs
    health          Run health checks
    profile         Start performance profiling
    report          Generate monitoring report

Options:
    --config FILE   Configuration file path
    --verbose       Enable verbose output
    --format FORMAT Output format (json, table, csv)
    --since PERIOD  Time period for logs/metrics (1h, 1d, 1w)
    --help          Show this help message

Examples:
    python monitoring.py start
    python monitoring.py metrics --since 1h
    python monitoring.py logs --format json
    python monitoring.py health --verbose
"""

import os
import sys
import json
import time
import psutil
import logging
import argparse
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from collections import defaultdict, deque

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')

try:
    import django
    from django.conf import settings
    from django.core.cache import cache
    from django.db import connection
    django.setup()
except ImportError as e:
    print(f"Warning: Django not available: {e}")
    django = None


@dataclass
class MetricPoint:
    """Represents a single metric data point."""
    name: str
    value: float
    timestamp: datetime
    tags: Dict[str, str] = None
    unit: str = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = {}


@dataclass
class Alert:
    """Represents a monitoring alert."""
    id: str
    level: str  # INFO, WARNING, ERROR, CRITICAL
    message: str
    timestamp: datetime
    source: str
    resolved: bool = False
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class MetricsCollector:
    """Collects and stores application metrics."""

    def __init__(self):
        self.metrics = defaultdict(lambda: deque(maxlen=1000))
        self.running = False
        self.collection_interval = 30  # seconds
        self.thread = None

    def start(self):
        """Start metrics collection."""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._collect_loop, daemon=True)
        self.thread.start()
        print("Metrics collection started")

    def stop(self):
        """Stop metrics collection."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("Metrics collection stopped")

    def _collect_loop(self):
        """Main collection loop."""
        while self.running:
            try:
                self._collect_system_metrics()
                self._collect_application_metrics()
                self._collect_database_metrics()
                self._collect_cache_metrics()
            except Exception as e:
                print(f"Error collecting metrics: {e}")
            
            time.sleep(self.collection_interval)

    def _collect_system_metrics(self):
        """Collect system-level metrics."""
        now = datetime.now()
        
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        self.add_metric(MetricPoint(
            name="system.cpu.usage",
            value=cpu_percent,
            timestamp=now,
            unit="percent"
        ))
        
        # Memory metrics
        memory = psutil.virtual_memory()
        self.add_metric(MetricPoint(
            name="system.memory.usage",
            value=memory.percent,
            timestamp=now,
            unit="percent"
        ))
        
        self.add_metric(MetricPoint(
            name="system.memory.available",
            value=memory.available / (1024**3),  # GB
            timestamp=now,
            unit="GB"
        ))
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        self.add_metric(MetricPoint(
            name="system.disk.usage",
            value=disk.percent,
            timestamp=now,
            unit="percent"
        ))
        
        # Network metrics
        network = psutil.net_io_counters()
        self.add_metric(MetricPoint(
            name="system.network.bytes_sent",
            value=network.bytes_sent,
            timestamp=now,
            unit="bytes"
        ))
        
        self.add_metric(MetricPoint(
            name="system.network.bytes_recv",
            value=network.bytes_recv,
            timestamp=now,
            unit="bytes"
        ))

    def _collect_application_metrics(self):
        """Collect Django application metrics."""
        if not django:
            return
        
        now = datetime.now()
        
        try:
            # Process metrics
            process = psutil.Process()
            
            self.add_metric(MetricPoint(
                name="app.process.memory",
                value=process.memory_info().rss / (1024**2),  # MB
                timestamp=now,
                unit="MB"
            ))
            
            self.add_metric(MetricPoint(
                name="app.process.cpu",
                value=process.cpu_percent(),
                timestamp=now,
                unit="percent"
            ))
            
            # Thread count
            self.add_metric(MetricPoint(
                name="app.process.threads",
                value=process.num_threads(),
                timestamp=now,
                unit="count"
            ))
            
        except Exception as e:
            print(f"Error collecting application metrics: {e}")

    def _collect_database_metrics(self):
        """Collect database metrics."""
        if not django:
            return
        
        now = datetime.now()
        
        try:
            # Database connection count
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"
                )
                active_connections = cursor.fetchone()[0]
                
                self.add_metric(MetricPoint(
                    name="database.connections.active",
                    value=active_connections,
                    timestamp=now,
                    unit="count"
                ))
                
                # Database size
                cursor.execute(
                    "SELECT pg_size_pretty(pg_database_size(current_database()))"
                )
                db_size = cursor.fetchone()[0]
                
                # Query performance
                cursor.execute("""
                    SELECT avg(total_time), count(*)
                    FROM pg_stat_statements
                    WHERE calls > 0
                """)
                result = cursor.fetchone()
                if result[0]:
                    self.add_metric(MetricPoint(
                        name="database.query.avg_time",
                        value=float(result[0]),
                        timestamp=now,
                        unit="ms"
                    ))
                    
                    self.add_metric(MetricPoint(
                        name="database.query.count",
                        value=result[1],
                        timestamp=now,
                        unit="count"
                    ))
                
        except Exception as e:
            print(f"Error collecting database metrics: {e}")

    def _collect_cache_metrics(self):
        """Collect cache metrics."""
        if not django:
            return
        
        now = datetime.now()
        
        try:
            # Redis metrics (if using Redis cache)
            if hasattr(cache, '_cache') and hasattr(cache._cache, '_client'):
                redis_client = cache._cache._client
                info = redis_client.info()
                
                self.add_metric(MetricPoint(
                    name="cache.memory.used",
                    value=info.get('used_memory', 0) / (1024**2),  # MB
                    timestamp=now,
                    unit="MB"
                ))
                
                self.add_metric(MetricPoint(
                    name="cache.connections.connected",
                    value=info.get('connected_clients', 0),
                    timestamp=now,
                    unit="count"
                ))
                
                self.add_metric(MetricPoint(
                    name="cache.operations.hits",
                    value=info.get('keyspace_hits', 0),
                    timestamp=now,
                    unit="count"
                ))
                
                self.add_metric(MetricPoint(
                    name="cache.operations.misses",
                    value=info.get('keyspace_misses', 0),
                    timestamp=now,
                    unit="count"
                ))
                
        except Exception as e:
            print(f"Error collecting cache metrics: {e}")

    def add_metric(self, metric: MetricPoint):
        """Add a metric point to the collection."""
        self.metrics[metric.name].append(metric)

    def get_metrics(self, name: str = None, since: datetime = None) -> List[MetricPoint]:
        """Get metrics by name and time range."""
        if name:
            metrics = list(self.metrics.get(name, []))
        else:
            metrics = []
            for metric_list in self.metrics.values():
                metrics.extend(metric_list)
        
        if since:
            metrics = [m for m in metrics if m.timestamp >= since]
        
        return sorted(metrics, key=lambda m: m.timestamp)

    def get_latest_metrics(self) -> Dict[str, MetricPoint]:
        """Get the latest value for each metric."""
        latest = {}
        for name, metric_list in self.metrics.items():
            if metric_list:
                latest[name] = metric_list[-1]
        return latest


class AlertManager:
    """Manages monitoring alerts and notifications."""

    def __init__(self):
        self.alerts = deque(maxlen=1000)
        self.alert_rules = self._load_alert_rules()
        self.notification_handlers = []

    def _load_alert_rules(self) -> List[Dict]:
        """Load alert rules configuration."""
        return [
            {
                'name': 'high_cpu_usage',
                'metric': 'system.cpu.usage',
                'condition': 'gt',
                'threshold': 80,
                'level': 'WARNING',
                'message': 'High CPU usage detected: {value}%'
            },
            {
                'name': 'high_memory_usage',
                'metric': 'system.memory.usage',
                'condition': 'gt',
                'threshold': 85,
                'level': 'WARNING',
                'message': 'High memory usage detected: {value}%'
            },
            {
                'name': 'disk_space_low',
                'metric': 'system.disk.usage',
                'condition': 'gt',
                'threshold': 90,
                'level': 'CRITICAL',
                'message': 'Disk space critically low: {value}%'
            },
            {
                'name': 'database_connections_high',
                'metric': 'database.connections.active',
                'condition': 'gt',
                'threshold': 50,
                'level': 'WARNING',
                'message': 'High number of database connections: {value}'
            },
            {
                'name': 'slow_database_queries',
                'metric': 'database.query.avg_time',
                'condition': 'gt',
                'threshold': 1000,  # 1 second
                'level': 'WARNING',
                'message': 'Slow database queries detected: {value}ms average'
            }
        ]

    def check_alerts(self, metrics: List[MetricPoint]):
        """Check metrics against alert rules."""
        for metric in metrics:
            for rule in self.alert_rules:
                if rule['metric'] == metric.name:
                    self._evaluate_rule(rule, metric)

    def _evaluate_rule(self, rule: Dict, metric: MetricPoint):
        """Evaluate a single alert rule against a metric."""
        condition = rule['condition']
        threshold = rule['threshold']
        value = metric.value
        
        triggered = False
        if condition == 'gt' and value > threshold:
            triggered = True
        elif condition == 'lt' and value < threshold:
            triggered = True
        elif condition == 'eq' and value == threshold:
            triggered = True
        
        if triggered:
            alert = Alert(
                id=f"{rule['name']}_{int(metric.timestamp.timestamp())}",
                level=rule['level'],
                message=rule['message'].format(value=value),
                timestamp=metric.timestamp,
                source=rule['name'],
                metadata={'metric': metric.name, 'value': value, 'threshold': threshold}
            )
            self.add_alert(alert)

    def add_alert(self, alert: Alert):
        """Add an alert to the collection."""
        # Check if similar alert already exists (avoid spam)
        recent_alerts = [a for a in self.alerts 
                        if a.source == alert.source and 
                        (alert.timestamp - a.timestamp).seconds < 300]  # 5 minutes
        
        if not recent_alerts:
            self.alerts.append(alert)
            self._send_notifications(alert)

    def _send_notifications(self, alert: Alert):
        """Send alert notifications."""
        for handler in self.notification_handlers:
            try:
                handler(alert)
            except Exception as e:
                print(f"Error sending notification: {e}")

    def get_active_alerts(self, level: str = None) -> List[Alert]:
        """Get active alerts, optionally filtered by level."""
        alerts = [a for a in self.alerts if not a.resolved]
        if level:
            alerts = [a for a in alerts if a.level == level]
        return sorted(alerts, key=lambda a: a.timestamp, reverse=True)

    def resolve_alert(self, alert_id: str):
        """Mark an alert as resolved."""
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.resolved = True
                break


class LogAnalyzer:
    """Analyzes application logs for patterns and issues."""

    def __init__(self, log_file: Path = None):
        self.log_file = log_file or Path('logs/edulink.log')
        self.error_patterns = [
            r'ERROR',
            r'CRITICAL',
            r'Exception',
            r'Traceback',
            r'500 Internal Server Error',
            r'Database connection failed',
            r'Redis connection failed'
        ]

    def analyze_logs(self, since: datetime = None) -> Dict[str, Any]:
        """Analyze logs for errors and patterns."""
        if not self.log_file.exists():
            return {'error': 'Log file not found'}
        
        since = since or datetime.now() - timedelta(hours=1)
        
        error_count = 0
        warning_count = 0
        total_lines = 0
        error_types = defaultdict(int)
        
        try:
            with open(self.log_file, 'r') as f:
                for line in f:
                    total_lines += 1
                    
                    # Parse timestamp (assuming standard format)
                    try:
                        timestamp_str = line.split(']')[0][1:]
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                        if timestamp < since:
                            continue
                    except (ValueError, IndexError):
                        continue
                    
                    # Count error levels
                    if 'ERROR' in line or 'CRITICAL' in line:
                        error_count += 1
                        # Extract error type
                        for pattern in self.error_patterns:
                            if pattern in line:
                                error_types[pattern] += 1
                    elif 'WARNING' in line:
                        warning_count += 1
        
        except Exception as e:
            return {'error': f'Failed to analyze logs: {e}'}
        
        return {
            'total_lines': total_lines,
            'error_count': error_count,
            'warning_count': warning_count,
            'error_types': dict(error_types),
            'analysis_period': since.isoformat()
        }


class HealthChecker:
    """Performs comprehensive health checks."""

    def __init__(self):
        self.checks = [
            self._check_database,
            self._check_cache,
            self._check_disk_space,
            self._check_memory,
            self._check_external_services
        ]

    def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks."""
        results = {}
        overall_status = 'healthy'
        
        for check in self.checks:
            try:
                result = check()
                results[check.__name__] = result
                if result['status'] != 'healthy':
                    overall_status = 'unhealthy'
            except Exception as e:
                results[check.__name__] = {
                    'status': 'error',
                    'message': str(e)
                }
                overall_status = 'unhealthy'
        
        results['overall_status'] = overall_status
        results['timestamp'] = datetime.now().isoformat()
        
        return results

    def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and performance."""
        if not django:
            return {'status': 'skipped', 'message': 'Django not available'}
        
        try:
            start_time = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
            
            response_time = (time.time() - start_time) * 1000  # ms
            
            if result[0] == 1:
                status = 'healthy' if response_time < 100 else 'slow'
                return {
                    'status': status,
                    'response_time_ms': response_time,
                    'message': f'Database responding in {response_time:.2f}ms'
                }
            else:
                return {
                    'status': 'unhealthy',
                    'message': 'Database query returned unexpected result'
                }
        
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Database connection failed: {e}'
            }

    def _check_cache(self) -> Dict[str, Any]:
        """Check cache connectivity and performance."""
        if not django:
            return {'status': 'skipped', 'message': 'Django not available'}
        
        try:
            start_time = time.time()
            test_key = 'health_check_test'
            test_value = 'test_value'
            
            cache.set(test_key, test_value, 60)
            retrieved_value = cache.get(test_key)
            cache.delete(test_key)
            
            response_time = (time.time() - start_time) * 1000  # ms
            
            if retrieved_value == test_value:
                status = 'healthy' if response_time < 50 else 'slow'
                return {
                    'status': status,
                    'response_time_ms': response_time,
                    'message': f'Cache responding in {response_time:.2f}ms'
                }
            else:
                return {
                    'status': 'unhealthy',
                    'message': 'Cache test failed'
                }
        
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Cache connection failed: {e}'
            }

    def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space."""
        try:
            disk_usage = psutil.disk_usage('/')
            free_percent = (disk_usage.free / disk_usage.total) * 100
            
            if free_percent > 20:
                status = 'healthy'
            elif free_percent > 10:
                status = 'warning'
            else:
                status = 'critical'
            
            return {
                'status': status,
                'free_percent': free_percent,
                'free_gb': disk_usage.free / (1024**3),
                'message': f'{free_percent:.1f}% disk space available'
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to check disk space: {e}'
            }

    def _check_memory(self) -> Dict[str, Any]:
        """Check memory usage."""
        try:
            memory = psutil.virtual_memory()
            available_percent = memory.available / memory.total * 100
            
            if available_percent > 20:
                status = 'healthy'
            elif available_percent > 10:
                status = 'warning'
            else:
                status = 'critical'
            
            return {
                'status': status,
                'available_percent': available_percent,
                'available_gb': memory.available / (1024**3),
                'message': f'{available_percent:.1f}% memory available'
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to check memory: {e}'
            }

    def _check_external_services(self) -> Dict[str, Any]:
        """Check external service dependencies."""
        # This would check external APIs, email services, etc.
        # For now, just return a placeholder
        return {
            'status': 'healthy',
            'message': 'External services check not implemented'
        }


class MonitoringManager:
    """Main monitoring manager that coordinates all monitoring components."""

    def __init__(self, config_file: Path = None):
        self.config = self._load_config(config_file)
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager()
        self.log_analyzer = LogAnalyzer()
        self.health_checker = HealthChecker()
        self.running = False

    def _load_config(self, config_file: Path = None) -> Dict:
        """Load monitoring configuration."""
        if config_file and config_file.exists():
            with open(config_file, 'r') as f:
                return json.load(f)
        
        # Default configuration
        return {
            'metrics': {
                'collection_interval': 30,
                'retention_period': 86400  # 24 hours
            },
            'alerts': {
                'enabled': True,
                'notification_channels': ['console']
            },
            'logging': {
                'level': 'INFO',
                'file': 'logs/monitoring.log'
            },
            'health_checks': {
                'interval': 300,  # 5 minutes
                'enabled': True
            }
        }

    def start(self):
        """Start all monitoring services."""
        if self.running:
            print("Monitoring already running")
            return
        
        print("Starting Edulink monitoring services...")
        
        self.metrics_collector.start()
        self.running = True
        
        # Start monitoring loop
        self._monitoring_loop()

    def stop(self):
        """Stop all monitoring services."""
        if not self.running:
            return
        
        print("Stopping monitoring services...")
        
        self.running = False
        self.metrics_collector.stop()
        
        print("Monitoring services stopped")

    def _monitoring_loop(self):
        """Main monitoring loop."""
        while self.running:
            try:
                # Check for alerts
                latest_metrics = self.metrics_collector.get_latest_metrics()
                self.alert_manager.check_alerts(list(latest_metrics.values()))
                
                # Run health checks periodically
                if int(time.time()) % self.config['health_checks']['interval'] == 0:
                    health_results = self.health_checker.run_all_checks()
                    if health_results['overall_status'] != 'healthy':
                        print(f"Health check warning: {health_results}")
                
                time.sleep(10)  # Check every 10 seconds
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error in monitoring loop: {e}")
                time.sleep(10)

    def get_status(self) -> Dict[str, Any]:
        """Get current monitoring status."""
        return {
            'running': self.running,
            'metrics_collector': {
                'running': self.metrics_collector.running,
                'metrics_count': len(self.metrics_collector.metrics)
            },
            'alerts': {
                'active_count': len(self.alert_manager.get_active_alerts()),
                'total_count': len(self.alert_manager.alerts)
            },
            'health': self.health_checker.run_all_checks(),
            'timestamp': datetime.now().isoformat()
        }

    def get_metrics_report(self, since: datetime = None, format: str = 'json') -> str:
        """Generate a metrics report."""
        since = since or datetime.now() - timedelta(hours=1)
        metrics = self.metrics_collector.get_metrics(since=since)
        
        if format == 'json':
            return json.dumps([asdict(m) for m in metrics], indent=2, default=str)
        elif format == 'csv':
            # Simple CSV format
            lines = ['name,value,timestamp,unit']
            for m in metrics:
                lines.append(f'{m.name},{m.value},{m.timestamp},{m.unit or ""}')
            return '\n'.join(lines)
        else:
            # Table format
            lines = ['Name\tValue\tTimestamp\tUnit']
            for m in metrics:
                lines.append(f'{m.name}\t{m.value}\t{m.timestamp}\t{m.unit or ""}')
            return '\n'.join(lines)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Edulink Backend Monitoring",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument('command', 
                       choices=['start', 'stop', 'status', 'metrics', 'alerts', 'logs', 'health', 'profile', 'report'],
                       help='Command to execute')
    parser.add_argument('--config', type=Path, help='Configuration file path')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose output')
    parser.add_argument('--format', choices=['json', 'table', 'csv'], default='table',
                       help='Output format')
    parser.add_argument('--since', default='1h', help='Time period (1h, 1d, 1w)')
    
    args = parser.parse_args()
    
    # Parse since parameter
    since_map = {'1h': 1, '1d': 24, '1w': 168}
    since_hours = since_map.get(args.since, 1)
    since = datetime.now() - timedelta(hours=since_hours)
    
    # Create monitoring manager
    monitor = MonitoringManager(args.config)
    
    try:
        if args.command == 'start':
            monitor.start()
        elif args.command == 'stop':
            monitor.stop()
        elif args.command == 'status':
            status = monitor.get_status()
            if args.format == 'json':
                print(json.dumps(status, indent=2, default=str))
            else:
                print(f"Monitoring Status: {'Running' if status['running'] else 'Stopped'}")
                print(f"Active Alerts: {status['alerts']['active_count']}")
                print(f"Health Status: {status['health']['overall_status']}")
        elif args.command == 'metrics':
            report = monitor.get_metrics_report(since=since, format=args.format)
            print(report)
        elif args.command == 'alerts':
            alerts = monitor.alert_manager.get_active_alerts()
            if args.format == 'json':
                print(json.dumps([asdict(a) for a in alerts], indent=2, default=str))
            else:
                for alert in alerts:
                    print(f"[{alert.level}] {alert.message} ({alert.timestamp})")
        elif args.command == 'health':
            health = monitor.health_checker.run_all_checks()
            if args.format == 'json':
                print(json.dumps(health, indent=2, default=str))
            else:
                print(f"Overall Status: {health['overall_status']}")
                for check, result in health.items():
                    if check != 'overall_status' and check != 'timestamp':
                        print(f"  {check}: {result.get('status', 'unknown')} - {result.get('message', '')}")
        elif args.command == 'logs':
            analysis = monitor.log_analyzer.analyze_logs(since=since)
            if args.format == 'json':
                print(json.dumps(analysis, indent=2, default=str))
            else:
                print(f"Log Analysis (since {since})")
                print(f"  Total lines: {analysis.get('total_lines', 0)}")
                print(f"  Errors: {analysis.get('error_count', 0)}")
                print(f"  Warnings: {analysis.get('warning_count', 0)}")
        else:
            print(f"Command '{args.command}' not implemented yet")
    
    except KeyboardInterrupt:
        print("\nMonitoring interrupted")
        monitor.stop()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()