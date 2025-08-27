import logging
import logging.config
import os
from datetime import datetime
from typing import Dict, Any

def get_logging_config(service_name: str, log_level: str = 'INFO') -> Dict[str, Any]:
    """Get logging configuration for microservices."""
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.join(os.getcwd(), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    return {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'detailed': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(funcName)s:%(lineno)d - %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'simple': {
                'format': '%(levelname)s - %(message)s'
            },
            'json': {
                'format': '%(asctime)s %(name)s %(levelname)s %(module)s %(funcName)s %(lineno)d %(message)s',
                'class': 'pythonjsonlogger.jsonlogger.JsonFormatter'
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': log_level,
                'formatter': 'detailed',
                'stream': 'ext://sys.stdout'
            },
            'file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': log_level,
                'formatter': 'detailed',
                'filename': os.path.join(log_dir, f'{service_name}.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            },
            'error_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'ERROR',
                'formatter': 'detailed',
                'filename': os.path.join(log_dir, f'{service_name}_errors.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            },
            'security_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'INFO',
                'formatter': 'json',
                'filename': os.path.join(log_dir, f'{service_name}_security.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 10
            }
        },
        'loggers': {
            '': {  # Root logger
                'handlers': ['console', 'file', 'error_file'],
                'level': log_level,
                'propagate': False
            },
            'django': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
                'propagate': False
            },
            'django.request': {
                'handlers': ['console', 'file', 'error_file'],
                'level': 'INFO',
                'propagate': False
            },
            'django.security': {
                'handlers': ['security_file', 'console'],
                'level': 'INFO',
                'propagate': False
            },
            f'{service_name}.security': {
                'handlers': ['security_file', 'console'],
                'level': 'INFO',
                'propagate': False
            },
            f'{service_name}.authentication': {
                'handlers': ['console', 'file', 'security_file'],
                'level': 'INFO',
                'propagate': False
            },
            f'{service_name}.authorization': {
                'handlers': ['console', 'file', 'security_file'],
                'level': 'INFO',
                'propagate': False
            },
            'celery': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
                'propagate': False
            },
            'redis': {
                'handlers': ['file'],
                'level': 'WARNING',
                'propagate': False
            }
        }
    }

def setup_logging(service_name: str, log_level: str = None):
    """Setup logging for a microservice."""
    if log_level is None:
        log_level = os.getenv('LOG_LEVEL', 'INFO')
    
    config = get_logging_config(service_name, log_level)
    logging.config.dictConfig(config)
    
    # Log startup message
    logger = logging.getLogger(service_name)
    logger.info(f"{service_name} logging initialized at {datetime.now()}")
    
    return logger

class SecurityLogger:
    """Specialized logger for security events."""
    
    def __init__(self, service_name: str):
        self.logger = logging.getLogger(f'{service_name}.security')
    
    def log_login_attempt(self, username: str, ip_address: str, success: bool, user_agent: str = None):
        """Log login attempts."""
        self.logger.info(
            "Login attempt",
            extra={
                'event_type': 'login_attempt',
                'username': username,
                'ip_address': ip_address,
                'success': success,
                'user_agent': user_agent,
                'timestamp': datetime.now().isoformat()
            }
        )
    
    def log_logout(self, username: str, ip_address: str):
        """Log logout events."""
        self.logger.info(
            "User logout",
            extra={
                'event_type': 'logout',
                'username': username,
                'ip_address': ip_address,
                'timestamp': datetime.now().isoformat()
            }
        )
    
    def log_permission_denied(self, username: str, resource: str, action: str, ip_address: str):
        """Log permission denied events."""
        self.logger.warning(
            "Permission denied",
            extra={
                'event_type': 'permission_denied',
                'username': username,
                'resource': resource,
                'action': action,
                'ip_address': ip_address,
                'timestamp': datetime.now().isoformat()
            }
        )
    
    def log_token_validation(self, token_type: str, success: bool, reason: str = None):
        """Log token validation events."""
        self.logger.info(
            "Token validation",
            extra={
                'event_type': 'token_validation',
                'token_type': token_type,
                'success': success,
                'reason': reason,
                'timestamp': datetime.now().isoformat()
            }
        )
    
    def log_suspicious_activity(self, description: str, ip_address: str, username: str = None, **kwargs):
        """Log suspicious activities."""
        self.logger.warning(
            "Suspicious activity detected",
            extra={
                'event_type': 'suspicious_activity',
                'description': description,
                'ip_address': ip_address,
                'username': username,
                'timestamp': datetime.now().isoformat(),
                **kwargs
            }
        )

class PerformanceLogger:
    """Logger for performance monitoring."""
    
    def __init__(self, service_name: str):
        self.logger = logging.getLogger(f'{service_name}.performance')
    
    def log_request_duration(self, endpoint: str, method: str, duration: float, status_code: int):
        """Log request performance metrics."""
        self.logger.info(
            "Request completed",
            extra={
                'event_type': 'request_performance',
                'endpoint': endpoint,
                'method': method,
                'duration_ms': duration * 1000,
                'status_code': status_code,
                'timestamp': datetime.now().isoformat()
            }
        )
    
    def log_database_query(self, query_type: str, duration: float, table: str = None):
        """Log database query performance."""
        self.logger.info(
            "Database query executed",
            extra={
                'event_type': 'database_performance',
                'query_type': query_type,
                'duration_ms': duration * 1000,
                'table': table,
                'timestamp': datetime.now().isoformat()
            }
        )