# Error Tracking and Reporting
# Comprehensive error tracking, logging, and reporting system

import traceback
import sys
from datetime import datetime, timedelta
from collections import defaultdict, deque
from functools import wraps
from django.conf import settings
from django.core.mail import send_mail
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.views.debug import ExceptionReporter
from .logging_config import get_logger
import json
import hashlib
import threading


class ErrorTracker:
    """Central error tracking and reporting system"""
    
    def __init__(self):
        self.logger = get_logger('security')
        self.error_counts = defaultdict(int)
        self.recent_errors = deque(maxlen=100)
        self.error_patterns = defaultdict(list)
        self.lock = threading.Lock()
        self.notification_cooldown = {}  # Prevent spam notifications
    
    def track_error(self, error, request=None, user=None, context=None):
        """Track and log an error"""
        error_info = self._extract_error_info(error, request, user, context)
        error_hash = self._generate_error_hash(error_info)
        
        with self.lock:
            # Count error occurrences
            self.error_counts[error_hash] += 1
            
            # Store recent error
            self.recent_errors.append({
                'hash': error_hash,
                'timestamp': datetime.now().isoformat(),
                'count': self.error_counts[error_hash],
                **error_info
            })
            
            # Track error patterns
            self.error_patterns[error_info['type']].append({
                'timestamp': datetime.now(),
                'hash': error_hash,
                'user_id': error_info.get('user_id'),
                'endpoint': error_info.get('endpoint')
            })
        
        # Log the error
        self.logger.error(
            f"Error tracked: {error_info['message']}",
            extra={
                'error_hash': error_hash,
                'error_type': error_info['type'],
                'error_count': self.error_counts[error_hash],
                'user_id': error_info.get('user_id'),
                'endpoint': error_info.get('endpoint'),
                'traceback': error_info.get('traceback'),
                'type': 'error_tracking'
            }
        )
        
        # Check if we need to send notifications
        self._check_error_thresholds(error_hash, error_info)
        
        return error_hash
    
    def _extract_error_info(self, error, request=None, user=None, context=None):
        """Extract comprehensive error information"""
        error_info = {
            'type': type(error).__name__,
            'message': str(error),
            'traceback': traceback.format_exc(),
            'timestamp': datetime.now().isoformat()
        }
        
        # Add request information
        if request:
            error_info.update({
                'method': request.method,
                'endpoint': request.path,
                'query_params': dict(request.GET),
                'ip_address': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'referer': request.META.get('HTTP_REFERER', '')
            })
            
            # Add POST data (sanitized)
            if request.method == 'POST':
                post_data = dict(request.POST)
                # Remove sensitive fields
                sensitive_fields = ['password', 'token', 'secret', 'key']
                for field in sensitive_fields:
                    if field in post_data:
                        post_data[field] = '[REDACTED]'
                error_info['post_data'] = post_data
        
        # Add user information
        if user and hasattr(user, 'id'):
            error_info.update({
                'user_id': user.id,
                'username': getattr(user, 'username', ''),
                'user_type': getattr(user, 'user_type', '')
            })
        
        # Add context information
        if context:
            error_info['context'] = context
        
        return error_info
    
    def _generate_error_hash(self, error_info):
        """Generate a unique hash for the error"""
        # Create hash based on error type, message, and location
        hash_string = f"{error_info['type']}:{error_info['message']}"
        
        # Add traceback location (first few lines)
        if error_info.get('traceback'):
            traceback_lines = error_info['traceback'].split('\n')[:5]
            hash_string += ':' + ''.join(traceback_lines)
        
        return hashlib.md5(hash_string.encode()).hexdigest()[:12]
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _check_error_thresholds(self, error_hash, error_info):
        """Check if error thresholds are exceeded and send notifications"""
        count = self.error_counts[error_hash]
        
        # Define thresholds
        thresholds = {
            'critical': 1,    # Immediate notification for critical errors
            'high': 5,        # High frequency errors
            'medium': 20,     # Medium frequency errors
            'low': 50         # Low frequency but persistent errors
        }
        
        # Determine severity
        severity = 'low'
        if 'critical' in error_info['message'].lower() or error_info['type'] in ['SystemExit', 'KeyboardInterrupt']:
            severity = 'critical'
        elif error_info['type'] in ['DatabaseError', 'ConnectionError', 'TimeoutError']:
            severity = 'high'
        elif error_info['type'] in ['ValidationError', 'PermissionDenied']:
            severity = 'medium'
        
        # Check if we should send notification
        threshold = thresholds.get(severity, 50)
        if count >= threshold:
            self._send_error_notification(error_hash, error_info, count, severity)
    
    def _send_error_notification(self, error_hash, error_info, count, severity):
        """Send error notification"""
        # Check cooldown to prevent spam
        cooldown_key = f"error_notification_{error_hash}"
        if cooldown_key in self.notification_cooldown:
            last_sent = self.notification_cooldown[cooldown_key]
            if datetime.now() - last_sent < timedelta(hours=1):
                return
        
        # Update cooldown
        self.notification_cooldown[cooldown_key] = datetime.now()
        
        # Log critical notification
        self.logger.critical(
            f"Error threshold exceeded: {error_info['type']}",
            extra={
                'error_hash': error_hash,
                'error_count': count,
                'severity': severity,
                'error_message': error_info['message'],
                'endpoint': error_info.get('endpoint'),
                'type': 'error_threshold_exceeded'
            }
        )
        
        # Send email notification (if configured)
        if hasattr(settings, 'ERROR_NOTIFICATION_EMAIL'):
            self._send_email_notification(error_hash, error_info, count, severity)
    
    def _send_email_notification(self, error_hash, error_info, count, severity):
        """Send email notification for critical errors"""
        try:
            subject = f"[{severity.upper()}] Error Alert - {error_info['type']}"
            message = f"""
            Error Hash: {error_hash}
            Error Type: {error_info['type']}
            Message: {error_info['message']}
            Count: {count}
            Endpoint: {error_info.get('endpoint', 'N/A')}
            User: {error_info.get('username', 'Anonymous')}
            Timestamp: {error_info['timestamp']}
            
            Traceback:
            {error_info.get('traceback', 'N/A')}
            """
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [settings.ERROR_NOTIFICATION_EMAIL],
                fail_silently=True
            )
        except Exception as e:
            self.logger.error(f"Failed to send error notification email: {e}")
    
    def get_error_summary(self, hours=24):
        """Get error summary for the specified time period"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        recent_errors = [
            error for error in self.recent_errors
            if datetime.fromisoformat(error['timestamp']) > cutoff_time
        ]
        
        # Group by error type
        error_types = defaultdict(int)
        error_endpoints = defaultdict(int)
        
        for error in recent_errors:
            error_types[error['type']] += 1
            if error.get('endpoint'):
                error_endpoints[error['endpoint']] += 1
        
        return {
            'total_errors': len(recent_errors),
            'unique_errors': len(set(error['hash'] for error in recent_errors)),
            'error_types': dict(error_types),
            'error_endpoints': dict(error_endpoints),
            'recent_errors': list(recent_errors)[-10:]  # Last 10 errors
        }
    
    def get_error_patterns(self):
        """Analyze error patterns"""
        patterns = {}
        
        for error_type, occurrences in self.error_patterns.items():
            # Filter recent occurrences (last 24 hours)
            recent = [
                occ for occ in occurrences
                if datetime.now() - occ['timestamp'] < timedelta(hours=24)
            ]
            
            if recent:
                patterns[error_type] = {
                    'count': len(recent),
                    'unique_users': len(set(occ['user_id'] for occ in recent if occ['user_id'])),
                    'unique_endpoints': len(set(occ['endpoint'] for occ in recent if occ['endpoint'])),
                    'first_occurrence': min(occ['timestamp'] for occ in recent).isoformat(),
                    'last_occurrence': max(occ['timestamp'] for occ in recent).isoformat()
                }
        
        return patterns


# Global error tracker instance
error_tracker = ErrorTracker()


def track_error(error, request=None, user=None, context=None):
    """Convenience function to track errors"""
    return error_tracker.track_error(error, request, user, context)


class CustomErrorHandler:
    """Custom error handler for different types of errors"""
    
    def __init__(self):
        self.logger = get_logger('security')
    
    def handle_validation_error(self, error, request=None):
        """Handle validation errors"""
        error_hash = track_error(error, request, context={'type': 'validation'})
        
        return JsonResponse({
            'error': 'Validation failed',
            'details': str(error),
            'error_id': error_hash
        }, status=400)
    
    def handle_permission_error(self, error, request=None):
        """Handle permission errors"""
        user = getattr(request, 'user', None)
        error_hash = track_error(error, request, user, context={'type': 'permission'})
        
        # Log security event
        self.logger.warning(
            "Permission denied",
            extra={
                'user_id': getattr(user, 'id', None),
                'endpoint': getattr(request, 'path', ''),
                'error_id': error_hash,
                'type': 'permission_denied'
            }
        )
        
        return JsonResponse({
            'error': 'Permission denied',
            'error_id': error_hash
        }, status=403)
    
    def handle_not_found_error(self, error, request=None):
        """Handle not found errors"""
        error_hash = track_error(error, request, context={'type': 'not_found'})
        
        return JsonResponse({
            'error': 'Resource not found',
            'error_id': error_hash
        }, status=404)
    
    def handle_server_error(self, error, request=None):
        """Handle server errors"""
        user = getattr(request, 'user', None)
        error_hash = track_error(error, request, user, context={'type': 'server_error'})
        
        # Log critical error
        self.logger.critical(
            f"Server error: {str(error)}",
            extra={
                'error_id': error_hash,
                'user_id': getattr(user, 'id', None),
                'endpoint': getattr(request, 'path', ''),
                'type': 'server_error'
            }
        )
        
        return JsonResponse({
            'error': 'Internal server error',
            'error_id': error_hash
        }, status=500)


# Global error handler instance
custom_error_handler = CustomErrorHandler()


class ErrorReportingMiddleware(MiddlewareMixin):
    """Middleware to catch and report unhandled errors"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = get_logger('security')
        super().__init__(get_response)
    
    def process_exception(self, request, exception):
        """Process unhandled exceptions"""
        user = getattr(request, 'user', None) if hasattr(request, 'user') else None
        
        # Track the error
        error_hash = track_error(exception, request, user, context={'type': 'unhandled'})
        
        # Log the exception
        self.logger.error(
            f"Unhandled exception: {str(exception)}",
            extra={
                'error_id': error_hash,
                'user_id': getattr(user, 'id', None) if user else None,
                'endpoint': request.path,
                'method': request.method,
                'type': 'unhandled_exception'
            }
        )
        
        # Don't return a response - let Django handle it normally
        return None


class ErrorMetrics:
    """Collect and analyze error metrics"""
    
    def __init__(self):
        self.logger = get_logger('performance')
    
    def get_error_rate(self, hours=1):
        """Calculate error rate for the specified time period"""
        # Get total requests from cache (set by performance middleware)
        total_requests = cache.get('total_requests_last_hour', 0)
        
        # Get error count
        error_summary = error_tracker.get_error_summary(hours=hours)
        error_count = error_summary['total_errors']
        
        if total_requests == 0:
            return 0
        
        error_rate = (error_count / total_requests) * 100
        
        # Log high error rates
        if error_rate > 5:  # More than 5% error rate
            self.logger.warning(
                f"High error rate detected: {error_rate:.2f}%",
                extra={
                    'error_rate': error_rate,
                    'error_count': error_count,
                    'total_requests': total_requests,
                    'type': 'high_error_rate'
                }
            )
        
        return error_rate
    
    def get_top_errors(self, limit=10):
        """Get most frequent errors"""
        error_counts = error_tracker.error_counts
        
        # Sort by count
        top_errors = sorted(
            error_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
        
        return top_errors
    
    def get_error_trends(self, days=7):
        """Get error trends over time"""
        # This would typically query a time-series database
        # For now, return basic trend data
        trends = {}
        
        for i in range(days):
            date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            # In a real implementation, you'd query historical data
            trends[date] = {
                'total_errors': 0,
                'unique_errors': 0,
                'error_rate': 0
            }
        
        return trends


# Global error metrics instance
error_metrics = ErrorMetrics()


def error_handler_decorator(error_type=Exception):
    """Decorator to automatically handle and track errors"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except error_type as e:
                # Try to get request from args
                request = None
                for arg in args:
                    if hasattr(arg, 'method') and hasattr(arg, 'path'):
                        request = arg
                        break
                
                # Track the error
                track_error(e, request, context={'function': func.__name__})
                
                # Re-raise the exception
                raise
        return wrapper
    return decorator


class ErrorDashboard:
    """Generate error dashboard data"""
    
    def get_dashboard_data(self):
        """Get comprehensive error dashboard data"""
        return {
            'error_summary': error_tracker.get_error_summary(),
            'error_patterns': error_tracker.get_error_patterns(),
            'error_rate': error_metrics.get_error_rate(),
            'top_errors': error_metrics.get_top_errors(),
            'error_trends': error_metrics.get_error_trends(),
            'timestamp': datetime.now().isoformat()
        }
    
    def export_error_report(self, format='json'):
        """Export error report in specified format"""
        data = self.get_dashboard_data()
        
        if format == 'json':
            return json.dumps(data, indent=2)
        elif format == 'csv':
            # Convert to CSV format
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers
            writer.writerow(['Error Type', 'Count', 'Last Occurrence'])
            
            # Write data
            for error_type, pattern in data['error_patterns'].items():
                writer.writerow([
                    error_type,
                    pattern['count'],
                    pattern['last_occurrence']
                ])
            
            return output.getvalue()
        
        return str(data)


# Global error dashboard instance
error_dashboard = ErrorDashboard()

print("Error tracking system loaded successfully!")
print("Use @error_handler_decorator to automatically track function errors.")
print("Add ErrorReportingMiddleware to MIDDLEWARE in settings.py.")
print("Configure ERROR_NOTIFICATION_EMAIL in settings for email alerts.")