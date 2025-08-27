#!/usr/bin/env python3
"""
Migration Monitoring Script for Edulink Microservices Migration

This script monitors the migration process, system health, and provides
real-time alerts and metrics during the migration.

Usage:
    python migration_monitor.py --config config.json
"""

import os
import sys
import json
import time
import argparse
import logging
import threading
import smtplib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

import psycopg2
import psycopg2.extras
import requests
from psycopg2.extensions import ISOLATION_LEVEL_READ_COMMITTED

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration_monitor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class AlertManager:
    """Manages alerts and notifications during migration."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.email_config = config.get('alerts', {}).get('email', {})
        self.webhook_config = config.get('alerts', {}).get('webhook', {})
        self.alert_history = []
    
    def send_email_alert(self, subject: str, message: str, severity: str = 'warning') -> bool:
        """Send email alert."""
        if not self.email_config.get('enabled', False):
            return True
        
        try:
            msg = MimeMultipart()
            msg['From'] = self.email_config['from']
            msg['To'] = ', '.join(self.email_config['to'])
            msg['Subject'] = f"[{severity.upper()}] Edulink Migration: {subject}"
            
            body = f"""
            Edulink Migration Alert
            
            Severity: {severity.upper()}
            Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            
            Message:
            {message}
            
            This is an automated alert from the Edulink migration monitoring system.
            """
            
            msg.attach(MimeText(body, 'plain'))
            
            server = smtplib.SMTP(self.email_config['smtp_host'], self.email_config['smtp_port'])
            if self.email_config.get('use_tls', True):
                server.starttls()
            if self.email_config.get('username'):
                server.login(self.email_config['username'], self.email_config['password'])
            
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email alert sent: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
            return False
    
    def send_webhook_alert(self, subject: str, message: str, severity: str = 'warning') -> bool:
        """Send webhook alert."""
        if not self.webhook_config.get('enabled', False):
            return True
        
        try:
            payload = {
                'subject': subject,
                'message': message,
                'severity': severity,
                'timestamp': datetime.now().isoformat(),
                'source': 'edulink_migration_monitor'
            }
            
            response = requests.post(
                self.webhook_config['url'],
                json=payload,
                headers=self.webhook_config.get('headers', {}),
                timeout=10
            )
            
            response.raise_for_status()
            logger.info(f"Webhook alert sent: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")
            return False
    
    def send_alert(self, subject: str, message: str, severity: str = 'warning') -> None:
        """Send alert via all configured channels."""
        alert_info = {
            'timestamp': datetime.now().isoformat(),
            'subject': subject,
            'message': message,
            'severity': severity
        }
        
        self.alert_history.append(alert_info)
        
        # Send via email
        self.send_email_alert(subject, message, severity)
        
        # Send via webhook
        self.send_webhook_alert(subject, message, severity)
        
        logger.warning(f"ALERT [{severity.upper()}]: {subject} - {message}")


class DatabaseMonitor:
    """Monitors database health and performance."""
    
    def __init__(self, db_config: Dict[str, Any], name: str):
        self.db_config = db_config
        self.name = name
        self.connection = None
        self.metrics = {
            'connection_count': 0,
            'active_queries': 0,
            'database_size_mb': 0,
            'last_check': None,
            'is_healthy': True,
            'error_count': 0
        }
    
    def connect(self) -> bool:
        """Connect to database."""
        try:
            if self.connection:
                self.connection.close()
            
            self.connection = psycopg2.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                database=self.db_config['database'],
                user=self.db_config['username'],
                password=self.db_config['password'],
                connect_timeout=10
            )
            self.connection.set_isolation_level(ISOLATION_LEVEL_READ_COMMITTED)
            return True
        except Exception as e:
            logger.error(f"Failed to connect to {self.name}: {e}")
            self.metrics['error_count'] += 1
            self.metrics['is_healthy'] = False
            return False
    
    def check_health(self) -> Dict[str, Any]:
        """Check database health and collect metrics."""
        if not self.connection or self.connection.closed:
            if not self.connect():
                return self.metrics
        
        try:
            cursor = self.connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Check connection count
            cursor.execute("""
                SELECT count(*) as connection_count
                FROM pg_stat_activity
                WHERE datname = current_database()
            """)
            result = cursor.fetchone()
            self.metrics['connection_count'] = result['connection_count']
            
            # Check active queries
            cursor.execute("""
                SELECT count(*) as active_queries
                FROM pg_stat_activity
                WHERE datname = current_database()
                AND state = 'active'
                AND query NOT LIKE '%pg_stat_activity%'
            """)
            result = cursor.fetchone()
            self.metrics['active_queries'] = result['active_queries']
            
            # Check database size
            cursor.execute("""
                SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                       pg_database_size(current_database()) / 1024 / 1024 as size_mb
            """)
            result = cursor.fetchone()
            self.metrics['database_size_mb'] = float(result['size_mb'])
            
            # Check for long-running queries
            cursor.execute("""
                SELECT count(*) as long_queries
                FROM pg_stat_activity
                WHERE datname = current_database()
                AND state = 'active'
                AND now() - query_start > interval '5 minutes'
            """)
            result = cursor.fetchone()
            self.metrics['long_running_queries'] = result['long_queries']
            
            cursor.close()
            
            self.metrics['last_check'] = datetime.now().isoformat()
            self.metrics['is_healthy'] = True
            
        except Exception as e:
            logger.error(f"Health check failed for {self.name}: {e}")
            self.metrics['error_count'] += 1
            self.metrics['is_healthy'] = False
            
            # Try to reconnect
            self.connect()
        
        return self.metrics
    
    def disconnect(self) -> None:
        """Disconnect from database."""
        if self.connection:
            self.connection.close()
            self.connection = None


class ServiceMonitor:
    """Monitors microservice health."""
    
    def __init__(self, service_config: Dict[str, Any], name: str):
        self.service_config = service_config
        self.name = name
        self.metrics = {
            'is_healthy': False,
            'response_time_ms': 0,
            'last_check': None,
            'error_count': 0,
            'status_code': None
        }
    
    def check_health(self) -> Dict[str, Any]:
        """Check service health."""
        if not self.service_config.get('enabled', False):
            self.metrics['is_healthy'] = True
            self.metrics['last_check'] = datetime.now().isoformat()
            return self.metrics
        
        try:
            health_url = f"{self.service_config['base_url']}/health"
            
            start_time = time.time()
            response = requests.get(health_url, timeout=10)
            response_time = (time.time() - start_time) * 1000
            
            self.metrics['response_time_ms'] = response_time
            self.metrics['status_code'] = response.status_code
            self.metrics['is_healthy'] = response.status_code == 200
            self.metrics['last_check'] = datetime.now().isoformat()
            
            if not self.metrics['is_healthy']:
                self.metrics['error_count'] += 1
            
        except Exception as e:
            logger.error(f"Health check failed for {self.name}: {e}")
            self.metrics['error_count'] += 1
            self.metrics['is_healthy'] = False
            self.metrics['last_check'] = datetime.now().isoformat()
        
        return self.metrics


class MigrationMonitor:
    """Main migration monitoring class."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.alert_manager = AlertManager(config)
        self.running = False
        self.monitor_thread = None
        
        # Initialize database monitors
        self.db_monitors = {}
        if 'source_database' in config:
            self.db_monitors['source'] = DatabaseMonitor(config['source_database'], 'Source DB')
        if 'auth_database' in config:
            self.db_monitors['auth'] = DatabaseMonitor(config['auth_database'], 'Auth Service DB')
        if 'user_database' in config:
            self.db_monitors['user'] = DatabaseMonitor(config['user_database'], 'User Service DB')
        
        # Initialize service monitors
        self.service_monitors = {}
        services_config = config.get('services', {})
        if 'auth_service' in services_config:
            self.service_monitors['auth'] = ServiceMonitor(services_config['auth_service'], 'Auth Service')
        if 'user_service' in services_config:
            self.service_monitors['user'] = ServiceMonitor(services_config['user_service'], 'User Service')
        
        # Monitoring state
        self.monitoring_data = {
            'start_time': None,
            'checks_performed': 0,
            'alerts_sent': 0,
            'last_check': None,
            'databases': {},
            'services': {}
        }
        
        # Thresholds
        self.thresholds = config.get('monitoring', {}).get('thresholds', {
            'max_connections': 100,
            'max_active_queries': 50,
            'max_response_time_ms': 5000,
            'max_error_count': 5
        })
    
    def check_migration_files(self) -> Dict[str, Any]:
        """Check migration-related files and processes."""
        status = {
            'export_running': False,
            'import_running': False,
            'validation_running': False,
            'export_progress': None,
            'import_progress': None
        }
        
        try:
            # Check for export manifest
            export_manifest_path = Path('export_manifest.json')
            if export_manifest_path.exists():
                with open(export_manifest_path, 'r', encoding='utf-8') as f:
                    export_data = json.load(f)
                status['export_progress'] = export_data.get('status')
            
            # Check for import manifest
            import_manifest_path = Path('import_manifest.json')
            if import_manifest_path.exists():
                with open(import_manifest_path, 'r', encoding='utf-8') as f:
                    import_data = json.load(f)
                status['import_progress'] = import_data.get('status')
            
            # Check for running processes (simplified)
            # In a real implementation, you might check process lists or lock files
            
        except Exception as e:
            logger.error(f"Failed to check migration files: {e}")
        
        return status
    
    def perform_health_checks(self) -> None:
        """Perform health checks on all monitored components."""
        self.monitoring_data['checks_performed'] += 1
        self.monitoring_data['last_check'] = datetime.now().isoformat()
        
        # Check databases
        for name, monitor in self.db_monitors.items():
            metrics = monitor.check_health()
            self.monitoring_data['databases'][name] = metrics
            
            # Check thresholds and send alerts
            self.check_database_thresholds(name, metrics)
        
        # Check services
        for name, monitor in self.service_monitors.items():
            metrics = monitor.check_health()
            self.monitoring_data['services'][name] = metrics
            
            # Check thresholds and send alerts
            self.check_service_thresholds(name, metrics)
        
        # Check migration files
        migration_status = self.check_migration_files()
        self.monitoring_data['migration'] = migration_status
    
    def check_database_thresholds(self, name: str, metrics: Dict[str, Any]) -> None:
        """Check database metrics against thresholds."""
        if not metrics['is_healthy']:
            self.alert_manager.send_alert(
                f"Database {name} Unhealthy",
                f"Database {name} failed health check. Error count: {metrics['error_count']}",
                'critical'
            )
            return
        
        # Check connection count
        if metrics['connection_count'] > self.thresholds['max_connections']:
            self.alert_manager.send_alert(
                f"High Connection Count - {name}",
                f"Database {name} has {metrics['connection_count']} connections (threshold: {self.thresholds['max_connections']})",
                'warning'
            )
        
        # Check active queries
        if metrics['active_queries'] > self.thresholds['max_active_queries']:
            self.alert_manager.send_alert(
                f"High Active Query Count - {name}",
                f"Database {name} has {metrics['active_queries']} active queries (threshold: {self.thresholds['max_active_queries']})",
                'warning'
            )
        
        # Check for long-running queries
        if metrics.get('long_running_queries', 0) > 0:
            self.alert_manager.send_alert(
                f"Long Running Queries - {name}",
                f"Database {name} has {metrics['long_running_queries']} queries running longer than 5 minutes",
                'warning'
            )
    
    def check_service_thresholds(self, name: str, metrics: Dict[str, Any]) -> None:
        """Check service metrics against thresholds."""
        if not metrics['is_healthy']:
            self.alert_manager.send_alert(
                f"Service {name} Unhealthy",
                f"Service {name} failed health check. Status code: {metrics.get('status_code', 'N/A')}",
                'critical'
            )
            return
        
        # Check response time
        if metrics['response_time_ms'] > self.thresholds['max_response_time_ms']:
            self.alert_manager.send_alert(
                f"High Response Time - {name}",
                f"Service {name} response time is {metrics['response_time_ms']:.0f}ms (threshold: {self.thresholds['max_response_time_ms']}ms)",
                'warning'
            )
        
        # Check error count
        if metrics['error_count'] > self.thresholds['max_error_count']:
            self.alert_manager.send_alert(
                f"High Error Count - {name}",
                f"Service {name} has {metrics['error_count']} errors (threshold: {self.thresholds['max_error_count']})",
                'warning'
            )
    
    def create_status_report(self) -> Dict[str, Any]:
        """Create a comprehensive status report."""
        report = {
            'timestamp': datetime.now().isoformat(),
            'monitoring_info': {
                'start_time': self.monitoring_data['start_time'],
                'uptime_seconds': (datetime.now() - datetime.fromisoformat(self.monitoring_data['start_time'])).total_seconds() if self.monitoring_data['start_time'] else 0,
                'checks_performed': self.monitoring_data['checks_performed'],
                'alerts_sent': len(self.alert_manager.alert_history),
                'last_check': self.monitoring_data['last_check']
            },
            'overall_health': {
                'databases_healthy': all(db.get('is_healthy', False) for db in self.monitoring_data['databases'].values()),
                'services_healthy': all(svc.get('is_healthy', False) for svc in self.monitoring_data['services'].values()),
                'system_healthy': True  # Will be calculated
            },
            'databases': self.monitoring_data['databases'],
            'services': self.monitoring_data['services'],
            'migration': self.monitoring_data.get('migration', {}),
            'recent_alerts': self.alert_manager.alert_history[-10:]  # Last 10 alerts
        }
        
        # Calculate overall system health
        report['overall_health']['system_healthy'] = (
            report['overall_health']['databases_healthy'] and
            report['overall_health']['services_healthy']
        )
        
        return report
    
    def save_status_report(self) -> None:
        """Save status report to file."""
        try:
            report = self.create_status_report()
            
            # Save detailed report
            report_path = Path('migration_monitor_status.json')
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2)
            
            # Save summary report
            summary_path = Path('migration_monitor_summary.txt')
            with open(summary_path, 'w', encoding='utf-8') as f:
                f.write("EDULINK MIGRATION MONITORING STATUS\n")
                f.write("=" * 40 + "\n\n")
                f.write(f"Last Updated: {report['timestamp']}\n")
                f.write(f"Monitoring Uptime: {report['monitoring_info']['uptime_seconds']:.0f} seconds\n")
                f.write(f"Checks Performed: {report['monitoring_info']['checks_performed']}\n")
                f.write(f"Alerts Sent: {report['monitoring_info']['alerts_sent']}\n\n")
                
                f.write("OVERALL HEALTH:\n")
                f.write(f"System Healthy: {'✓' if report['overall_health']['system_healthy'] else '✗'}\n")
                f.write(f"Databases Healthy: {'✓' if report['overall_health']['databases_healthy'] else '✗'}\n")
                f.write(f"Services Healthy: {'✓' if report['overall_health']['services_healthy'] else '✗'}\n\n")
                
                f.write("DATABASE STATUS:\n")
                for name, metrics in report['databases'].items():
                    status = '✓' if metrics.get('is_healthy', False) else '✗'
                    f.write(f"{name}: {status} (Connections: {metrics.get('connection_count', 0)}, Active Queries: {metrics.get('active_queries', 0)})\n")
                
                f.write("\nSERVICE STATUS:\n")
                for name, metrics in report['services'].items():
                    status = '✓' if metrics.get('is_healthy', False) else '✗'
                    f.write(f"{name}: {status} (Response Time: {metrics.get('response_time_ms', 0):.0f}ms)\n")
                
                if report['recent_alerts']:
                    f.write("\nRECENT ALERTS:\n")
                    for alert in report['recent_alerts'][-5:]:  # Last 5 alerts
                        f.write(f"[{alert['severity'].upper()}] {alert['timestamp']}: {alert['subject']}\n")
            
        except Exception as e:
            logger.error(f"Failed to save status report: {e}")
    
    def monitor_loop(self) -> None:
        """Main monitoring loop."""
        check_interval = self.config.get('monitoring', {}).get('check_interval_seconds', 30)
        
        while self.running:
            try:
                self.perform_health_checks()
                self.save_status_report()
                
                # Log summary
                if self.monitoring_data['checks_performed'] % 10 == 0:  # Every 10 checks
                    logger.info(f"Monitoring check #{self.monitoring_data['checks_performed']} completed")
                    
                    # Log database status
                    for name, metrics in self.monitoring_data['databases'].items():
                        status = 'HEALTHY' if metrics.get('is_healthy', False) else 'UNHEALTHY'
                        logger.info(f"Database {name}: {status} (Connections: {metrics.get('connection_count', 0)})")
                    
                    # Log service status
                    for name, metrics in self.monitoring_data['services'].items():
                        status = 'HEALTHY' if metrics.get('is_healthy', False) else 'UNHEALTHY'
                        logger.info(f"Service {name}: {status} (Response: {metrics.get('response_time_ms', 0):.0f}ms)")
                
                time.sleep(check_interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(check_interval)
    
    def start_monitoring(self) -> None:
        """Start the monitoring process."""
        if self.running:
            logger.warning("Monitoring is already running")
            return
        
        logger.info("Starting migration monitoring...")
        self.running = True
        self.monitoring_data['start_time'] = datetime.now().isoformat()
        
        # Send startup alert
        self.alert_manager.send_alert(
            "Migration Monitoring Started",
            "Migration monitoring system has been started and is now actively monitoring the migration process.",
            'info'
        )
        
        # Start monitoring thread
        self.monitor_thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.monitor_thread.start()
        
        logger.info("Migration monitoring started successfully")
    
    def stop_monitoring(self) -> None:
        """Stop the monitoring process."""
        if not self.running:
            logger.warning("Monitoring is not running")
            return
        
        logger.info("Stopping migration monitoring...")
        self.running = False
        
        # Wait for monitoring thread to finish
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=10)
        
        # Disconnect from databases
        for monitor in self.db_monitors.values():
            monitor.disconnect()
        
        # Send shutdown alert
        self.alert_manager.send_alert(
            "Migration Monitoring Stopped",
            f"Migration monitoring system has been stopped after {self.monitoring_data['checks_performed']} checks.",
            'info'
        )
        
        logger.info("Migration monitoring stopped")


def load_config(config_file: str) -> Dict[str, Any]:
    """Load configuration from JSON file."""
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load config file {config_file}: {e}")
        raise


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Monitor Edulink microservices migration'
    )
    parser.add_argument(
        '--config', 
        required=True, 
        help='Configuration file path'
    )
    parser.add_argument(
        '--duration', 
        type=int, 
        help='Monitoring duration in seconds (default: run indefinitely)'
    )
    parser.add_argument(
        '--verbose', 
        action='store_true', 
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        # Load configuration
        config = load_config(args.config)
        
        # Create and start monitor
        monitor = MigrationMonitor(config)
        monitor.start_monitoring()
        
        # Run for specified duration or indefinitely
        if args.duration:
            logger.info(f"Monitoring for {args.duration} seconds...")
            time.sleep(args.duration)
        else:
            logger.info("Monitoring indefinitely. Press Ctrl+C to stop.")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("Received interrupt signal")
        
        # Stop monitoring
        monitor.stop_monitoring()
        
        logger.info("Migration monitoring completed successfully!")
        
    except Exception as e:
        logger.error(f"Monitoring failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()