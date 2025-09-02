import asyncio
import logging
import threading
from typing import Optional
from django.conf import settings
from django.core.management.base import BaseCommand
from django.apps import AppConfig
from django.utils.module_loading import import_string

from .client import ServiceDiscoveryClient, get_django_service_client
from .registry import LoadBalancingStrategy

logger = logging.getLogger(__name__)

class ServiceDiscoveryMiddleware:
    """Django middleware for service discovery integration"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.client: Optional[ServiceDiscoveryClient] = None
        self._setup_client()
    
    def _setup_client(self):
        """Setup service discovery client"""
        try:
            self.client = get_django_service_client()
            # Start client in a separate thread to avoid blocking
            threading.Thread(target=self._start_client_sync, daemon=True).start()
        except Exception as e:
            logger.error(f"Failed to setup service discovery client: {e}")
    
    def _start_client_sync(self):
        """Start client synchronously in a separate thread"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.client.start())
            # Keep the loop running for heartbeat
            loop.run_forever()
        except Exception as e:
            logger.error(f"Failed to start service discovery client: {e}")
    
    def __call__(self, request):
        # Add service discovery client to request for easy access
        if self.client:
            request.service_discovery = self.client
        
        response = self.get_response(request)
        return response
    
    def process_exception(self, request, exception):
        """Handle exceptions"""
        # Log service-related exceptions
        if self.client:
            logger.error(f"Service {self.client.service_name} encountered error: {exception}")
        return None

class ServiceDiscoveryAppConfig(AppConfig):
    """App config for automatic service discovery setup"""
    
    name = 'service_discovery'
    verbose_name = 'Service Discovery'
    
    def ready(self):
        """Initialize service discovery when Django starts"""
        # Only run in main process (not in management commands)
        import sys
        if 'runserver' in sys.argv or 'gunicorn' in sys.argv[0]:
            self._setup_service_discovery()
    
    def _setup_service_discovery(self):
        """Setup service discovery for the Django application"""
        try:
            # Get service configuration from settings
            service_config = getattr(settings, 'SERVICE_DISCOVERY', {})
            
            if service_config.get('enabled', True):
                client = get_django_service_client()
                
                # Start client in background thread
                def start_client():
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(client.start())
                    loop.run_forever()
                
                thread = threading.Thread(target=start_client, daemon=True)
                thread.start()
                
                logger.info(f"Service discovery initialized for {client.service_name}")
        
        except Exception as e:
            logger.error(f"Failed to initialize service discovery: {e}")

class ServiceDiscoveryMixin:
    """Mixin for Django views to easily access other services"""
    
    def get_service_client(self) -> Optional[ServiceDiscoveryClient]:
        """Get service discovery client from request"""
        return getattr(self.request, 'service_discovery', None)
    
    async def call_service(self, service_name: str, path: str = "/", 
                          method: str = "GET", data=None, **kwargs):
        """Call another service"""
        client = self.get_service_client()
        if not client:
            raise RuntimeError("Service discovery not available")
        
        return await client.call_service(service_name, path, method, data, **kwargs)
    
    async def get_service_url(self, service_name: str, 
                            strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN):
        """Get URL for a service"""
        client = self.get_service_client()
        if not client:
            raise RuntimeError("Service discovery not available")
        
        return await client.get_service_url(service_name, strategy)

# Management command for service discovery operations
class Command(BaseCommand):
    """Management command for service discovery operations"""
    
    help = 'Service discovery management commands'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['register', 'deregister', 'discover', 'health', 'list'],
            help='Action to perform'
        )
        parser.add_argument(
            '--service-name',
            type=str,
            help='Service name for register/deregister/discover actions'
        )
        parser.add_argument(
            '--host',
            type=str,
            help='Host for register action'
        )
        parser.add_argument(
            '--port',
            type=int,
            help='Port for register action'
        )
    
    def handle(self, *args, **options):
        action = options['action']
        
        if action == 'register':
            self._register_service(options)
        elif action == 'deregister':
            self._deregister_service(options)
        elif action == 'discover':
            self._discover_service(options)
        elif action == 'health':
            self._check_health()
        elif action == 'list':
            self._list_services()
    
    def _register_service(self, options):
        """Register a service"""
        service_name = options.get('service_name')
        host = options.get('host')
        port = options.get('port')
        
        if not all([service_name, host, port]):
            self.stdout.write(
                self.style.ERROR('Service name, host, and port are required for registration')
            )
            return
        
        async def register():
            client = ServiceDiscoveryClient(
                service_name=service_name,
                host=host,
                port=port
            )
            await client.start()
            success = await client.register()
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully registered {service_name}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f'Failed to register {service_name}')
                )
            await client.stop()
        
        asyncio.run(register())
    
    def _deregister_service(self, options):
        """Deregister a service"""
        service_name = options.get('service_name')
        
        if not service_name:
            self.stdout.write(
                self.style.ERROR('Service name is required for deregistration')
            )
            return
        
        async def deregister():
            client = get_django_service_client(service_name)
            await client.start()
            success = await client.deregister()
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully deregistered {service_name}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f'Failed to deregister {service_name}')
                )
            await client.stop()
        
        asyncio.run(deregister())
    
    def _discover_service(self, options):
        """Discover service instances"""
        service_name = options.get('service_name')
        
        if not service_name:
            self.stdout.write(
                self.style.ERROR('Service name is required for discovery')
            )
            return
        
        async def discover():
            client = get_django_service_client()
            await client.start()
            instances = await client.discover_all_instances(service_name)
            
            if instances:
                self.stdout.write(
                    self.style.SUCCESS(f'Found {len(instances)} instances of {service_name}:')
                )
                for instance in instances:
                    self.stdout.write(f'  - {instance.url} ({instance.status.value})')
            else:
                self.stdout.write(
                    self.style.WARNING(f'No instances found for {service_name}')
                )
            
            await client.stop()
        
        asyncio.run(discover())
    
    def _check_health(self):
        """Check health of all services"""
        async def check():
            client = get_django_service_client()
            await client.start()
            health_status = await client.get_health_status()
            
            if health_status:
                self.stdout.write(self.style.SUCCESS('Service Health Status:'))
                for service_name, instances in health_status.items():
                    self.stdout.write(f'\n{service_name}:')
                    for instance_id, status in instances.items():
                        status_style = self.style.SUCCESS if status['status'] == 'healthy' else self.style.ERROR
                        self.stdout.write(f'  - {instance_id}: {status_style(status["status"])}')
                        self.stdout.write(f'    URL: {status["url"]}')
                        if status['last_check']:
                            self.stdout.write(f'    Last Check: {status["last_check"]}')
            else:
                self.stdout.write(self.style.WARNING('No services found'))
            
            await client.stop()
        
        asyncio.run(check())
    
    def _list_services(self):
        """List all registered services"""
        async def list_services():
            client = get_django_service_client()
            await client.start()
            health_status = await client.get_health_status()
            
            if health_status:
                self.stdout.write(self.style.SUCCESS('Registered Services:'))
                for service_name, instances in health_status.items():
                    healthy_count = sum(1 for inst in instances.values() if inst['status'] == 'healthy')
                    total_count = len(instances)
                    self.stdout.write(f'  - {service_name}: {healthy_count}/{total_count} healthy')
            else:
                self.stdout.write(self.style.WARNING('No services registered'))
            
            await client.stop()
        
        asyncio.run(list_services())

# Utility functions for Django integration
def setup_service_discovery_settings():
    """Setup default service discovery settings for Django"""
    from django.conf import settings
    
    # Default service discovery configuration
    default_config = {
        'enabled': True,
        'backend': 'redis',  # or 'memory'
        'redis_url': getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0'),
        'health_check_interval': 30,
        'heartbeat_interval': 30,
        'auto_register': True,
    }
    
    # Merge with existing configuration
    if hasattr(settings, 'SERVICE_DISCOVERY'):
        default_config.update(settings.SERVICE_DISCOVERY)
    
    settings.SERVICE_DISCOVERY = default_config
    
    # Set service name if not already set
    if not hasattr(settings, 'SERVICE_NAME'):
        # Try to infer from ROOT_URLCONF
        root_urlconf = getattr(settings, 'ROOT_URLCONF', '')
        if root_urlconf:
            service_name = root_urlconf.split('.')[0].replace('_', '-')
            settings.SERVICE_NAME = service_name
        else:
            settings.SERVICE_NAME = 'django-service'

def get_service_discovery_middleware():
    """Get the service discovery middleware class path"""
    return 'shared.service_discovery.django_integration.ServiceDiscoveryMiddleware'