#!/usr/bin/env python
"""
Edulink Backend Health Check Script

This script performs comprehensive health checks on the Edulink backend system,
including database connectivity, Redis cache, external services, and system resources.

Usage:
    python health_check.py [--verbose] [--json] [--timeout=30]

Options:
    --verbose    Show detailed output
    --json       Output results in JSON format
    --timeout    Set timeout for checks in seconds (default: 30)
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.prod')

try:
    import django
    django.setup()
except Exception as e:
    print(f"Error setting up Django: {e}")
    sys.exit(1)

from django.conf import settings
from django.core.cache import cache
from django.db import connections, connection
from django.core.mail import get_connection
from django.test.utils import override_settings

try:
    import redis
except ImportError:
    redis = None

try:
    import psutil
except ImportError:
    psutil = None

try:
    import requests
except ImportError:
    requests = None


class HealthChecker:
    """Comprehensive health checker for Edulink backend."""
    
    def __init__(self, timeout: int = 30, verbose: bool = False):
        self.timeout = timeout
        self.verbose = verbose
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'unknown',
            'checks': {},
            'summary': {
                'total_checks': 0,
                'passed': 0,
                'failed': 0,
                'warnings': 0
            }
        }
    
    def log(self, message: str, level: str = 'info'):
        """Log message if verbose mode is enabled."""
        if self.verbose:
            timestamp = datetime.now().strftime('%H:%M:%S')
            print(f"[{timestamp}] [{level.upper()}] {message}")
    
    def add_check_result(self, name: str, status: str, message: str, 
                        details: Optional[Dict] = None, duration: float = 0.0):
        """Add a check result to the results dictionary."""
        self.results['checks'][name] = {
            'status': status,
            'message': message,
            'details': details or {},
            'duration_ms': round(duration * 1000, 2)
        }
        
        self.results['summary']['total_checks'] += 1
        if status == 'pass':
            self.results['summary']['passed'] += 1
        elif status == 'fail':
            self.results['summary']['failed'] += 1
        elif status == 'warning':
            self.results['summary']['warnings'] += 1
    
    def check_database(self) -> bool:
        """Check database connectivity and basic operations."""
        self.log("Checking database connectivity...")
        start_time = time.time()
        
        try:
            # Test default database connection
            db_conn = connections['default']
            
            # Test basic query
            with db_conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                
            if result and result[0] == 1:
                # Get database info
                db_info = {
                    'engine': settings.DATABASES['default']['ENGINE'],
                    'name': settings.DATABASES['default']['NAME'],
                    'host': settings.DATABASES['default'].get('HOST', 'localhost'),
                    'port': settings.DATABASES['default'].get('PORT', 'default')
                }
                
                # Test connection pool if available
                try:
                    total_connections = db_conn.queries_logged if hasattr(db_conn, 'queries_logged') else 'unknown'
                    db_info['active_connections'] = len(db_conn.queries) if hasattr(db_conn, 'queries') else 'unknown'
                except:
                    pass
                
                duration = time.time() - start_time
                self.add_check_result(
                    'database',
                    'pass',
                    'Database connection successful',
                    db_info,
                    duration
                )
                return True
            else:
                duration = time.time() - start_time
                self.add_check_result(
                    'database',
                    'fail',
                    'Database query returned unexpected result',
                    {'result': result},
                    duration
                )
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.add_check_result(
                'database',
                'fail',
                f'Database connection failed: {str(e)}',
                {'error_type': type(e).__name__},
                duration
            )
            return False
    
    def check_redis(self) -> bool:
        """Check Redis connectivity and basic operations."""
        self.log("Checking Redis connectivity...")
        start_time = time.time()
        
        if not redis:
            duration = time.time() - start_time
            self.add_check_result(
                'redis',
                'warning',
                'Redis library not installed',
                {},
                duration
            )
            return False
        
        try:
            # Test Django cache (which should use Redis)
            test_key = 'health_check_test'
            test_value = f'test_{int(time.time())}'
            
            # Set a test value
            cache.set(test_key, test_value, timeout=60)
            
            # Get the test value
            retrieved_value = cache.get(test_key)
            
            if retrieved_value == test_value:
                # Clean up
                cache.delete(test_key)
                
                # Get Redis info if possible
                redis_info = {}
                try:
                    if hasattr(cache, '_cache') and hasattr(cache._cache, '_client'):
                        redis_client = cache._cache._client
                        info = redis_client.info()
                        redis_info = {
                            'version': info.get('redis_version', 'unknown'),
                            'connected_clients': info.get('connected_clients', 'unknown'),
                            'used_memory_human': info.get('used_memory_human', 'unknown'),
                            'uptime_in_seconds': info.get('uptime_in_seconds', 'unknown')
                        }
                except:
                    pass
                
                duration = time.time() - start_time
                self.add_check_result(
                    'redis',
                    'pass',
                    'Redis connection and operations successful',
                    redis_info,
                    duration
                )
                return True
            else:
                duration = time.time() - start_time
                self.add_check_result(
                    'redis',
                    'fail',
                    'Redis set/get operation failed',
                    {'expected': test_value, 'actual': retrieved_value},
                    duration
                )
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.add_check_result(
                'redis',
                'fail',
                f'Redis connection failed: {str(e)}',
                {'error_type': type(e).__name__},
                duration
            )
            return False
    
    def check_email(self) -> bool:
        """Check email backend configuration."""
        self.log("Checking email configuration...")
        start_time = time.time()
        
        try:
            email_backend = settings.EMAIL_BACKEND
            
            # Test email connection
            connection = get_connection()
            
            email_info = {
                'backend': email_backend,
                'host': getattr(settings, 'EMAIL_HOST', 'not configured'),
                'port': getattr(settings, 'EMAIL_PORT', 'not configured'),
                'use_tls': getattr(settings, 'EMAIL_USE_TLS', False),
                'use_ssl': getattr(settings, 'EMAIL_USE_SSL', False)
            }
            
            # For console backend, just check configuration
            if 'console' in email_backend.lower():
                duration = time.time() - start_time
                self.add_check_result(
                    'email',
                    'pass',
                    'Email backend configured (console)',
                    email_info,
                    duration
                )
                return True
            
            # For SMTP backends, test connection
            try:
                connection.open()
                connection.close()
                duration = time.time() - start_time
                self.add_check_result(
                    'email',
                    'pass',
                    'Email connection successful',
                    email_info,
                    duration
                )
                return True
            except Exception as conn_error:
                duration = time.time() - start_time
                self.add_check_result(
                    'email',
                    'warning',
                    f'Email connection test failed: {str(conn_error)}',
                    email_info,
                    duration
                )
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.add_check_result(
                'email',
                'fail',
                f'Email configuration check failed: {str(e)}',
                {'error_type': type(e).__name__},
                duration
            )
            return False
    
    def check_static_files(self) -> bool:
        """Check static files configuration."""
        self.log("Checking static files configuration...")
        start_time = time.time()
        
        try:
            static_info = {
                'static_url': settings.STATIC_URL,
                'static_root': getattr(settings, 'STATIC_ROOT', 'not configured'),
                'staticfiles_dirs': getattr(settings, 'STATICFILES_DIRS', []),
                'staticfiles_finders': getattr(settings, 'STATICFILES_FINDERS', [])
            }
            
            # Check if static root exists (in production)
            static_root = getattr(settings, 'STATIC_ROOT', None)
            if static_root and os.path.exists(static_root):
                static_info['static_root_exists'] = True
                static_info['static_files_count'] = len([
                    f for f in os.listdir(static_root) 
                    if os.path.isfile(os.path.join(static_root, f))
                ])
            else:
                static_info['static_root_exists'] = False
            
            duration = time.time() - start_time
            self.add_check_result(
                'static_files',
                'pass',
                'Static files configuration checked',
                static_info,
                duration
            )
            return True
            
        except Exception as e:
            duration = time.time() - start_time
            self.add_check_result(
                'static_files',
                'fail',
                f'Static files check failed: {str(e)}',
                {'error_type': type(e).__name__},
                duration
            )
            return False
    
    def check_system_resources(self) -> bool:
        """Check system resources (CPU, memory, disk)."""
        self.log("Checking system resources...")
        start_time = time.time()
        
        if not psutil:
            duration = time.time() - start_time
            self.add_check_result(
                'system_resources',
                'warning',
                'psutil library not installed, cannot check system resources',
                {},
                duration
            )
            return False
        
        try:
            # Get system information
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            system_info = {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_gb': round(memory.available / (1024**3), 2),
                'memory_total_gb': round(memory.total / (1024**3), 2),
                'disk_percent': disk.percent,
                'disk_free_gb': round(disk.free / (1024**3), 2),
                'disk_total_gb': round(disk.total / (1024**3), 2)
            }
            
            # Determine status based on thresholds
            status = 'pass'
            warnings = []
            
            if cpu_percent > 90:
                status = 'warning'
                warnings.append(f'High CPU usage: {cpu_percent}%')
            
            if memory.percent > 90:
                status = 'warning'
                warnings.append(f'High memory usage: {memory.percent}%')
            
            if disk.percent > 90:
                status = 'warning'
                warnings.append(f'High disk usage: {disk.percent}%')
            
            message = 'System resources checked'
            if warnings:
                message += f' - Warnings: {", ".join(warnings)}'
                system_info['warnings'] = warnings
            
            duration = time.time() - start_time
            self.add_check_result(
                'system_resources',
                status,
                message,
                system_info,
                duration
            )
            return status == 'pass'
            
        except Exception as e:
            duration = time.time() - start_time
            self.add_check_result(
                'system_resources',
                'fail',
                f'System resources check failed: {str(e)}',
                {'error_type': type(e).__name__},
                duration
            )
            return False
    
    def check_django_settings(self) -> bool:
        """Check Django settings and configuration."""
        self.log("Checking Django settings...")
        start_time = time.time()
        
        try:
            settings_info = {
                'debug': settings.DEBUG,
                'allowed_hosts': settings.ALLOWED_HOSTS,
                'secret_key_configured': bool(getattr(settings, 'SECRET_KEY', None)),
                'time_zone': settings.TIME_ZONE,
                'language_code': settings.LANGUAGE_CODE,
                'installed_apps_count': len(settings.INSTALLED_APPS),
                'middleware_count': len(settings.MIDDLEWARE)
            }
            
            # Check for security settings in production
            warnings = []
            if not settings.DEBUG:
                if not settings.ALLOWED_HOSTS or settings.ALLOWED_HOSTS == ['*']:
                    warnings.append('ALLOWED_HOSTS not properly configured for production')
                
                if not getattr(settings, 'SECURE_SSL_REDIRECT', False):
                    warnings.append('SECURE_SSL_REDIRECT not enabled')
                
                if not getattr(settings, 'SECURE_HSTS_SECONDS', 0):
                    warnings.append('SECURE_HSTS_SECONDS not configured')
            
            status = 'warning' if warnings else 'pass'
            message = 'Django settings checked'
            if warnings:
                message += f' - Warnings: {", ".join(warnings)}'
                settings_info['warnings'] = warnings
            
            duration = time.time() - start_time
            self.add_check_result(
                'django_settings',
                status,
                message,
                settings_info,
                duration
            )
            return True
            
        except Exception as e:
            duration = time.time() - start_time
            self.add_check_result(
                'django_settings',
                'fail',
                f'Django settings check failed: {str(e)}',
                {'error_type': type(e).__name__},
                duration
            )
            return False
    
    def check_external_services(self) -> bool:
        """Check external service connectivity."""
        self.log("Checking external services...")
        start_time = time.time()
        
        if not requests:
            duration = time.time() - start_time
            self.add_check_result(
                'external_services',
                'warning',
                'requests library not installed, cannot check external services',
                {},
                duration
            )
            return False
        
        try:
            # List of external services to check
            services = [
                {'name': 'Google DNS', 'url': 'https://8.8.8.8', 'timeout': 5},
                {'name': 'Cloudflare DNS', 'url': 'https://1.1.1.1', 'timeout': 5}
            ]
            
            service_results = {}
            all_passed = True
            
            for service in services:
                try:
                    response = requests.get(
                        service['url'], 
                        timeout=service['timeout'],
                        verify=False  # Skip SSL verification for basic connectivity test
                    )
                    service_results[service['name']] = {
                        'status': 'pass',
                        'response_time_ms': round(response.elapsed.total_seconds() * 1000, 2),
                        'status_code': response.status_code
                    }
                except Exception as e:
                    service_results[service['name']] = {
                        'status': 'fail',
                        'error': str(e)
                    }
                    all_passed = False
            
            status = 'pass' if all_passed else 'warning'
            message = f'External services checked - {len([s for s in service_results.values() if s["status"] == "pass"])}/{len(services)} passed'
            
            duration = time.time() - start_time
            self.add_check_result(
                'external_services',
                status,
                message,
                service_results,
                duration
            )
            return all_passed
            
        except Exception as e:
            duration = time.time() - start_time
            self.add_check_result(
                'external_services',
                'fail',
                f'External services check failed: {str(e)}',
                {'error_type': type(e).__name__},
                duration
            )
            return False
    
    def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks and return results."""
        self.log("Starting comprehensive health check...")
        
        # List of all checks to run
        checks = [
            ('Database', self.check_database),
            ('Redis Cache', self.check_redis),
            ('Email Configuration', self.check_email),
            ('Static Files', self.check_static_files),
            ('System Resources', self.check_system_resources),
            ('Django Settings', self.check_django_settings),
            ('External Services', self.check_external_services)
        ]
        
        # Run each check
        for check_name, check_func in checks:
            self.log(f"Running {check_name} check...")
            try:
                check_func()
            except Exception as e:
                self.log(f"Unexpected error in {check_name} check: {e}", 'error')
                self.add_check_result(
                    check_name.lower().replace(' ', '_'),
                    'fail',
                    f'Unexpected error: {str(e)}',
                    {'error_type': type(e).__name__}
                )
        
        # Determine overall status
        if self.results['summary']['failed'] > 0:
            self.results['overall_status'] = 'unhealthy'
        elif self.results['summary']['warnings'] > 0:
            self.results['overall_status'] = 'degraded'
        else:
            self.results['overall_status'] = 'healthy'
        
        self.log(f"Health check completed - Status: {self.results['overall_status']}")
        return self.results


def main():
    """Main function to run health checks."""
    parser = argparse.ArgumentParser(description='Edulink Backend Health Check')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed output')
    parser.add_argument('--json', '-j', action='store_true', help='Output results in JSON format')
    parser.add_argument('--timeout', '-t', type=int, default=30, help='Timeout for checks in seconds')
    
    args = parser.parse_args()
    
    # Create health checker
    checker = HealthChecker(timeout=args.timeout, verbose=args.verbose)
    
    # Run all checks
    results = checker.run_all_checks()
    
    # Output results
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        # Human-readable output
        print(f"\n{'='*60}")
        print(f"EDULINK BACKEND HEALTH CHECK REPORT")
        print(f"{'='*60}")
        print(f"Timestamp: {results['timestamp']}")
        print(f"Overall Status: {results['overall_status'].upper()}")
        print(f"\nSummary:")
        print(f"  Total Checks: {results['summary']['total_checks']}")
        print(f"  Passed: {results['summary']['passed']}")
        print(f"  Failed: {results['summary']['failed']}")
        print(f"  Warnings: {results['summary']['warnings']}")
        
        print(f"\n{'='*60}")
        print(f"DETAILED RESULTS")
        print(f"{'='*60}")
        
        for check_name, check_result in results['checks'].items():
            status_symbol = {
                'pass': '✓',
                'fail': '✗',
                'warning': '⚠'
            }.get(check_result['status'], '?')
            
            print(f"\n{status_symbol} {check_name.replace('_', ' ').title()}")
            print(f"  Status: {check_result['status'].upper()}")
            print(f"  Message: {check_result['message']}")
            print(f"  Duration: {check_result['duration_ms']}ms")
            
            if check_result['details'] and args.verbose:
                print(f"  Details:")
                for key, value in check_result['details'].items():
                    print(f"    {key}: {value}")
    
    # Exit with appropriate code
    if results['overall_status'] == 'unhealthy':
        sys.exit(1)
    elif results['overall_status'] == 'degraded':
        sys.exit(2)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()