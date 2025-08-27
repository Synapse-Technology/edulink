from django.apps import AppConfig
import logging


logger = logging.getLogger(__name__)


class AuthenticationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'authentication'
    verbose_name = 'Authentication'
    
    def ready(self):
        """Import signal handlers when the app is ready."""
        try:
            import authentication.signals  # noqa F401
        except ImportError:
            pass
        
        # Initialize synchronization system
        try:
            # Import sync signals to register them
            from . import sync_signals
            
            # Setup synchronization signals
            sync_signals.setup_auth_sync_signals()
            
            # Initialize event bus for this service
            self._initialize_event_bus()
            
            logger.info("Authentication service synchronization initialized")
            
        except Exception as e:
            logger.error(f"Error initializing authentication service sync: {str(e)}")
    
    def _initialize_event_bus(self):
        """Initialize the event bus for the authentication service."""
        try:
            import os
            import sys
            
            # Add shared modules to path
            shared_path = os.path.join(os.path.dirname(__file__), '../../shared')
            if shared_path not in sys.path:
                sys.path.append(shared_path)
            
            from events.event_bus import initialize_event_bus
            
            # Get Redis configuration from environment or use defaults
            redis_host = os.getenv('REDIS_HOST', 'localhost')
            redis_port = int(os.getenv('REDIS_PORT', 6379))
            
            # Initialize event bus for auth service
            event_bus = initialize_event_bus(
                service_name='auth_service',
                redis_host=redis_host,
                redis_port=redis_port
            )
            
            logger.info(f"Event bus initialized for auth service (Redis: {redis_host}:{redis_port})")
            
        except ImportError as e:
            logger.warning(f"Could not import event bus modules: {str(e)}")
        except Exception as e:
            logger.error(f"Error initializing event bus for auth service: {str(e)}")