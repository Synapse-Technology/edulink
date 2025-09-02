from django.apps import AppConfig
from django.conf import settings
import logging
import threading
import time

logger = logging.getLogger(__name__)

class AuthServiceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'auth_service'
    
    def ready(self):
        """Initialize service discovery when Django starts."""
        if getattr(settings, 'SERVICE_DISCOVERY', {}).get('enabled', False):
            self._setup_service_discovery()
    
    def _setup_service_discovery(self):
        """Setup service discovery registration and heartbeat."""
        try:
            from shared.service_discovery import ServiceDiscoveryClient
            
            # Get service configuration
            service_config = settings.SERVICE_DISCOVERY
            service_name = settings.SERVICE_NAME
            service_host = settings.SERVICE_HOST
            service_port = settings.SERVICE_PORT
            
            # Auto-detect host if not provided
            if not service_host:
                import socket
                service_host = socket.gethostname()
            
            # Initialize service discovery client
            client = ServiceDiscoveryClient(
                backend_type=service_config.get('backend', 'redis'),
                redis_url=service_config.get('redis_url')
            )
            
            # Register service
            def register_service():
                try:
                    client.register_service(
                        name=service_name,
                        host=service_host,
                        port=service_port,
                        health_check_path=service_config.get('health_check_path', '/health/'),
                        metadata=service_config.get('metadata', {})
                    )
                    logger.info(f"Successfully registered {service_name} with service discovery")
                    
                    # Start heartbeat in background thread
                    if service_config.get('auto_register', True):
                        heartbeat_thread = threading.Thread(
                            target=self._heartbeat_worker,
                            args=(client, service_name, service_host, service_port),
                            daemon=True
                        )
                        heartbeat_thread.start()
                        
                except Exception as e:
                    logger.error(f"Failed to register {service_name} with service discovery: {e}")
            
            # Delay registration to ensure Django is fully loaded
            threading.Timer(2.0, register_service).start()
            
        except ImportError:
            logger.warning("Service discovery module not found. Skipping registration.")
        except Exception as e:
            logger.error(f"Error setting up service discovery: {e}")
    
    def _heartbeat_worker(self, client, service_name, service_host, service_port):
        """Background worker for sending heartbeats."""
        heartbeat_interval = getattr(settings, 'SERVICE_DISCOVERY', {}).get('heartbeat_interval', 30)
        
        while True:
            try:
                client.send_heartbeat(service_name, service_host, service_port)
                logger.debug(f"Sent heartbeat for {service_name}")
            except Exception as e:
                logger.error(f"Failed to send heartbeat for {service_name}: {e}")
            
            time.sleep(heartbeat_interval)