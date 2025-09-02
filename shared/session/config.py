"""Session Management Configuration.

Provides configuration classes and settings for session management
across microservices.
"""

import os
from datetime import timedelta
from typing import Dict, Any, List
from dataclasses import dataclass, field


@dataclass
class SessionConfig:
    """Session management configuration."""
    
    # Redis configuration
    redis_url: str = field(default_factory=lambda: os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
    redis_password: str = field(default_factory=lambda: os.getenv('REDIS_PASSWORD', ''))
    redis_db: int = field(default_factory=lambda: int(os.getenv('REDIS_DB', '0')))
    
    # JWT configuration
    jwt_secret: str = field(default_factory=lambda: os.getenv('JWT_SECRET', 'your-secret-key-change-in-production'))
    jwt_algorithm: str = 'HS256'
    
    # Session timeouts
    default_session_duration: timedelta = timedelta(hours=24)
    default_token_duration: timedelta = timedelta(hours=1)
    refresh_token_duration: timedelta = timedelta(days=30)
    
    # Token refresh settings
    token_refresh_threshold: timedelta = timedelta(minutes=15)
    auto_refresh_enabled: bool = True
    
    # Session cleanup
    cleanup_interval: int = 3600  # 1 hour in seconds
    max_sessions_per_user: int = 10
    
    # Security settings
    require_https: bool = field(default_factory=lambda: not bool(os.getenv('DEBUG', False)))
    secure_cookies: bool = field(default_factory=lambda: not bool(os.getenv('DEBUG', False)))
    same_site_cookies: str = 'Lax'
    
    # Rate limiting
    rate_limits: Dict[str, Dict[str, int]] = field(default_factory=lambda: {
        'default': {'requests': 100, 'window': 3600},
        'authenticated': {'requests': 1000, 'window': 3600},
        'login': {'requests': 5, 'window': 300},
        'password_reset': {'requests': 3, 'window': 3600}
    })
    
    # Excluded paths from session middleware
    excluded_paths: List[str] = field(default_factory=lambda: [
        '/health/',
        '/metrics/',
        '/static/',
        '/media/',
        '/favicon.ico'
    ])
    
    # Cache settings
    cache_timeout: int = 300  # 5 minutes
    user_data_cache_timeout: int = 600  # 10 minutes
    
    # Logging
    log_session_events: bool = True
    log_token_events: bool = True
    log_security_events: bool = True
    
    # Device tracking
    track_device_info: bool = True
    track_location: bool = False
    max_devices_per_user: int = 5
    
    # Session validation
    validate_ip_address: bool = False
    validate_user_agent: bool = False
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        if not self.jwt_secret or self.jwt_secret == 'your-secret-key-change-in-production':
            if not os.getenv('DEBUG', False):
                raise ValueError("JWT_SECRET must be set in production")
        
        if len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters long")
    
    @classmethod
    def from_env(cls) -> 'SessionConfig':
        """Create configuration from environment variables."""
        return cls(
            redis_url=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
            jwt_secret=os.getenv('JWT_SECRET', 'your-secret-key-change-in-production'),
            default_session_duration=timedelta(hours=int(os.getenv('SESSION_DURATION_HOURS', '24'))),
            default_token_duration=timedelta(hours=int(os.getenv('TOKEN_DURATION_HOURS', '1'))),
            token_refresh_threshold=timedelta(minutes=int(os.getenv('TOKEN_REFRESH_THRESHOLD_MINUTES', '15'))),
            cleanup_interval=int(os.getenv('SESSION_CLEANUP_INTERVAL', '3600')),
            max_sessions_per_user=int(os.getenv('MAX_SESSIONS_PER_USER', '10')),
            require_https=os.getenv('REQUIRE_HTTPS', 'true').lower() == 'true',
            log_session_events=os.getenv('LOG_SESSION_EVENTS', 'true').lower() == 'true'
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'redis_url': self.redis_url,
            'jwt_algorithm': self.jwt_algorithm,
            'default_session_duration': self.default_session_duration.total_seconds(),
            'default_token_duration': self.default_token_duration.total_seconds(),
            'refresh_token_duration': self.refresh_token_duration.total_seconds(),
            'token_refresh_threshold': self.token_refresh_threshold.total_seconds(),
            'auto_refresh_enabled': self.auto_refresh_enabled,
            'cleanup_interval': self.cleanup_interval,
            'max_sessions_per_user': self.max_sessions_per_user,
            'require_https': self.require_https,
            'secure_cookies': self.secure_cookies,
            'same_site_cookies': self.same_site_cookies,
            'rate_limits': self.rate_limits,
            'excluded_paths': self.excluded_paths,
            'cache_timeout': self.cache_timeout,
            'user_data_cache_timeout': self.user_data_cache_timeout,
            'log_session_events': self.log_session_events,
            'log_token_events': self.log_token_events,
            'log_security_events': self.log_security_events,
            'track_device_info': self.track_device_info,
            'track_location': self.track_location,
            'max_devices_per_user': self.max_devices_per_user,
            'validate_ip_address': self.validate_ip_address,
            'validate_user_agent': self.validate_user_agent
        }


@dataclass
class SecurityConfig:
    """Security configuration for session management."""
    
    # Password policies
    min_password_length: int = 8
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = True
    password_history_count: int = 5
    
    # Account lockout
    max_login_attempts: int = 5
    lockout_duration: timedelta = timedelta(minutes=30)
    lockout_threshold_window: timedelta = timedelta(minutes=15)
    
    # Two-factor authentication
    require_2fa: bool = False
    totp_issuer: str = 'Edulink'
    backup_codes_count: int = 10
    
    # Session security
    force_logout_on_password_change: bool = True
    force_logout_on_suspicious_activity: bool = True
    detect_concurrent_sessions: bool = True
    
    # IP and location tracking
    track_login_locations: bool = True
    alert_on_new_location: bool = True
    max_allowed_locations: int = 10
    
    # Security headers
    enable_hsts: bool = True
    hsts_max_age: int = 31536000  # 1 year
    enable_csp: bool = True
    csp_policy: str = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' https:; "
        "connect-src 'self' https:; "
        "frame-ancestors 'none';"
    )
    
    @classmethod
    def from_env(cls) -> 'SecurityConfig':
        """Create security configuration from environment variables."""
        return cls(
            min_password_length=int(os.getenv('MIN_PASSWORD_LENGTH', '8')),
            max_login_attempts=int(os.getenv('MAX_LOGIN_ATTEMPTS', '5')),
            lockout_duration=timedelta(minutes=int(os.getenv('LOCKOUT_DURATION_MINUTES', '30'))),
            require_2fa=os.getenv('REQUIRE_2FA', 'false').lower() == 'true',
            force_logout_on_password_change=os.getenv('FORCE_LOGOUT_ON_PASSWORD_CHANGE', 'true').lower() == 'true',
            track_login_locations=os.getenv('TRACK_LOGIN_LOCATIONS', 'true').lower() == 'true'
        )


@dataclass
class MonitoringConfig:
    """Monitoring and logging configuration."""
    
    # Metrics collection
    enable_metrics: bool = True
    metrics_endpoint: str = '/metrics'
    
    # Health checks
    enable_health_checks: bool = True
    health_check_endpoint: str = '/health'
    
    # Logging
    log_level: str = 'INFO'
    log_format: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Session metrics
    track_session_duration: bool = True
    track_token_usage: bool = True
    track_login_patterns: bool = True
    
    # Performance monitoring
    enable_performance_monitoring: bool = True
    slow_query_threshold: float = 1.0  # seconds
    
    # Alerting
    enable_alerts: bool = True
    alert_on_failed_logins: bool = True
    alert_on_suspicious_activity: bool = True
    alert_threshold: int = 10  # number of events
    
    @classmethod
    def from_env(cls) -> 'MonitoringConfig':
        """Create monitoring configuration from environment variables."""
        return cls(
            enable_metrics=os.getenv('ENABLE_METRICS', 'true').lower() == 'true',
            log_level=os.getenv('LOG_LEVEL', 'INFO'),
            track_session_duration=os.getenv('TRACK_SESSION_DURATION', 'true').lower() == 'true',
            enable_performance_monitoring=os.getenv('ENABLE_PERFORMANCE_MONITORING', 'true').lower() == 'true'
        )


class SessionSettings:
    """Central settings class for session management."""
    
    def __init__(self):
        """Initialize settings from environment."""
        self.session = SessionConfig.from_env()
        self.security = SecurityConfig.from_env()
        self.monitoring = MonitoringConfig.from_env()
    
    def validate(self) -> List[str]:
        """Validate all configurations and return any errors."""
        errors = []
        
        # Validate session config
        try:
            if not self.session.redis_url:
                errors.append("Redis URL is required")
            
            if not self.session.jwt_secret:
                errors.append("JWT secret is required")
            
            if self.session.default_session_duration.total_seconds() <= 0:
                errors.append("Session duration must be positive")
            
            if self.session.default_token_duration.total_seconds() <= 0:
                errors.append("Token duration must be positive")
                
        except Exception as e:
            errors.append(f"Session config validation error: {e}")
        
        # Validate security config
        try:
            if self.security.min_password_length < 6:
                errors.append("Minimum password length should be at least 6")
            
            if self.security.max_login_attempts <= 0:
                errors.append("Max login attempts must be positive")
                
        except Exception as e:
            errors.append(f"Security config validation error: {e}")
        
        return errors
    
    def get_django_settings(self) -> Dict[str, Any]:
        """Get Django-compatible settings dictionary."""
        return {
            # Session settings
            'REDIS_URL': self.session.redis_url,
            'JWT_SECRET': self.session.jwt_secret,
            'SESSION_TIMEOUT': self.session.default_session_duration,
            'TOKEN_TIMEOUT': self.session.default_token_duration,
            'TOKEN_REFRESH_THRESHOLD': self.session.token_refresh_threshold,
            'SESSION_CLEANUP_INTERVAL': self.session.cleanup_interval,
            'SESSION_EXCLUDED_PATHS': self.session.excluded_paths,
            'RATE_LIMITS': self.session.rate_limits,
            
            # Security settings
            'SECURE_SSL_REDIRECT': self.session.require_https,
            'SESSION_COOKIE_SECURE': self.session.secure_cookies,
            'CSRF_COOKIE_SECURE': self.session.secure_cookies,
            'SESSION_COOKIE_SAMESITE': self.session.same_site_cookies,
            'CSRF_COOKIE_SAMESITE': self.session.same_site_cookies,
            
            # Security headers
            'SECURE_HSTS_SECONDS': self.security.hsts_max_age if self.security.enable_hsts else 0,
            'SECURE_HSTS_INCLUDE_SUBDOMAINS': True,
            'SECURE_CONTENT_TYPE_NOSNIFF': True,
            'SECURE_BROWSER_XSS_FILTER': True,
            
            # Logging
            'LOGGING': {
                'version': 1,
                'disable_existing_loggers': False,
                'formatters': {
                    'verbose': {
                        'format': self.monitoring.log_format
                    },
                },
                'handlers': {
                    'console': {
                        'level': self.monitoring.log_level,
                        'class': 'logging.StreamHandler',
                        'formatter': 'verbose'
                    },
                },
                'loggers': {
                    'session_management': {
                        'handlers': ['console'],
                        'level': self.monitoring.log_level,
                        'propagate': False,
                    },
                },
            }
        }


# Global settings instance
settings = SessionSettings()


def get_session_settings() -> SessionSettings:
    """Get global session settings instance."""
    return settings


def validate_settings() -> List[str]:
    """Validate all session management settings."""
    return settings.validate()