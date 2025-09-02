# Logging Configuration
# Comprehensive logging setup for the Edulink application

import logging
import logging.config
import os
from datetime import datetime
from django.conf import settings
import json


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add extra fields if present
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_entry['request_id'] = record.request_id
        if hasattr(record, 'ip_address'):
            log_entry['ip_address'] = record.ip_address
        if hasattr(record, 'user_agent'):
            log_entry['user_agent'] = record.user_agent
        if hasattr(record, 'endpoint'):
            log_entry['endpoint'] = record.endpoint
        if hasattr(record, 'method'):
            log_entry['method'] = record.method
        if hasattr(record, 'status_code'):
            log_entry['status_code'] = record.status_code
        if hasattr(record, 'response_time'):
            log_entry['response_time'] = record.response_time
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry)


class SecurityFormatter(logging.Formatter):
    """Formatter for security-related logs"""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'event_type': getattr(record, 'event_type', 'security'),
            'message': record.getMessage(),
            'severity': getattr(record, 'severity', 'medium'),
        }
        
        # Security-specific fields
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        if hasattr(record, 'ip_address'):
            log_entry['ip_address'] = record.ip_address
        if hasattr(record, 'user_agent'):
            log_entry['user_agent'] = record.user_agent
        if hasattr(record, 'action'):
            log_entry['action'] = record.action
        if hasattr(record, 'resource'):
            log_entry['resource'] = record.resource
        if hasattr(record, 'success'):
            log_entry['success'] = record.success
        
        return json.dumps(log_entry)


# Log Formatters
LOG_FORMATTERS = {
    'verbose': {
        'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
        'style': '{',
    },
    'simple': {
        'format': '{levelname} {message}',
        'style': '{',
    },
    'json': {
        '()': JSONFormatter,
    },
    'security': {
        '()': SecurityFormatter,
    }
}

# Log Handlers
LOG_HANDLERS = {
    'console': {
        'level': 'INFO',
        'class': 'logging.StreamHandler',
        'formatter': 'verbose'
    },
    'file': {
        'level': 'INFO',
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': os.path.join(getattr(settings, 'BASE_DIR', '.'), 'logs', 'edulink.log'),
        'maxBytes': 1024*1024*15,  # 15MB
        'backupCount': 10,
        'formatter': 'json'
    },
    'error_file': {
        'level': 'ERROR',
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': os.path.join(getattr(settings, 'BASE_DIR', '.'), 'logs', 'errors.log'),
        'maxBytes': 1024*1024*15,  # 15MB
        'backupCount': 10,
        'formatter': 'json'
    },
    'security_file': {
        'level': 'WARNING',
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': os.path.join(getattr(settings, 'BASE_DIR', '.'), 'logs', 'security.log'),
        'maxBytes': 1024*1024*15,  # 15MB
        'backupCount': 10,
        'formatter': 'security'
    },
    'performance_file': {
        'level': 'INFO',
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': os.path.join(getattr(settings, 'BASE_DIR', '.'), 'logs', 'performance.log'),
        'maxBytes': 1024*1024*15,  # 15MB
        'backupCount': 10,
        'formatter': 'json'
    },
    'database_file': {
        'level': 'DEBUG',
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': os.path.join(getattr(settings, 'BASE_DIR', '.'), 'logs', 'database.log'),
        'maxBytes': 1024*1024*15,  # 15MB
        'backupCount': 5,
        'formatter': 'json'
    }
}

# Main Logging Configuration
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': LOG_FORMATTERS,
    'handlers': LOG_HANDLERS,
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['database_file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'edulink': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'edulink.security': {
            'handlers': ['security_file', 'console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'edulink.performance': {
            'handlers': ['performance_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'edulink.api': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'edulink.authentication': {
            'handlers': ['security_file', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'edulink.application': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': False,
        },
        'edulink.internship': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': False,
        },
        'edulink.internship_progress': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': False,
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console', 'file']
    }
}


def setup_logging():
    """Setup logging configuration"""
    # Create logs directory if it doesn't exist
    logs_dir = os.path.join(getattr(settings, 'BASE_DIR', '.'), 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    
    # Apply logging configuration
    logging.config.dictConfig(LOGGING_CONFIG)
    
    # Log setup completion
    logger = logging.getLogger('edulink')
    logger.info("Logging system initialized successfully")


def get_logger(name):
    """Get a logger instance with the specified name"""
    return logging.getLogger(f'edulink.{name}')


class RequestLoggingMiddleware:
    """Middleware to log all HTTP requests"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = get_logger('api')
    
    def __call__(self, request):
        # Log request
        self.logger.info(
            "Request started",
            extra={
                'method': request.method,
                'path': request.path,
                'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
                'ip_address': self.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'request_id': getattr(request, 'id', None)
            }
        )
        
        response = self.get_response(request)
        
        # Log response
        self.logger.info(
            "Request completed",
            extra={
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
                'ip_address': self.get_client_ip(request),
                'request_id': getattr(request, 'id', None)
            }
        )
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecurityLoggingMixin:
    """Mixin to add security logging to views"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.security_logger = get_logger('security')
    
    def log_security_event(self, event_type, message, severity='medium', **extra_data):
        """Log a security event"""
        self.security_logger.warning(
            message,
            extra={
                'event_type': event_type,
                'severity': severity,
                **extra_data
            }
        )
    
    def log_authentication_attempt(self, username, success, ip_address, user_agent):
        """Log authentication attempt"""
        self.log_security_event(
            'authentication',
            f"Authentication attempt for user {username}",
            severity='high' if not success else 'low',
            action='login',
            success=success,
            username=username,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    def log_permission_denied(self, user, resource, action, ip_address):
        """Log permission denied event"""
        self.log_security_event(
            'authorization',
            f"Permission denied for user {user} on {resource}",
            severity='medium',
            action=action,
            resource=resource,
            user_id=getattr(user, 'id', None),
            username=getattr(user, 'username', None),
            ip_address=ip_address
        )


# Utility functions for common logging patterns
def log_user_action(user, action, resource=None, details=None):
    """Log user action"""
    logger = get_logger('api')
    logger.info(
        f"User action: {action}",
        extra={
            'user_id': user.id,
            'username': user.username,
            'action': action,
            'resource': resource,
            'details': details
        }
    )


def log_database_query(query, execution_time, table=None):
    """Log database query performance"""
    logger = get_logger('performance')
    logger.info(
        "Database query executed",
        extra={
            'query': str(query)[:500],  # Truncate long queries
            'execution_time': execution_time,
            'table': table,
            'type': 'database_query'
        }
    )


def log_api_performance(endpoint, method, response_time, status_code, user_id=None):
    """Log API endpoint performance"""
    logger = get_logger('performance')
    logger.info(
        "API endpoint performance",
        extra={
            'endpoint': endpoint,
            'method': method,
            'response_time': response_time,
            'status_code': status_code,
            'user_id': user_id,
            'type': 'api_performance'
        }
    )


# Initialize logging when module is imported
if hasattr(settings, 'BASE_DIR'):
    setup_logging()

print("Logging configuration loaded successfully!")
print("Logs will be written to the 'logs' directory.")
print("Available loggers: edulink, edulink.security, edulink.performance, edulink.api")