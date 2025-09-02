import asyncio
import logging
import os
import socket
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from contextlib import asynccontextmanager

from .registry import ServiceRegistry, ServiceInstance, ServiceStatus, LoadBalancingStrategy
from .backends import InMemoryServiceDiscovery, RedisServiceDiscovery

logger = logging.getLogger(__name__)

class ServiceDiscoveryClient:
    """Client for service discovery operations"""
    
    def __init__(self, 
                 service_name: str,
                 host: str = None,
                 port: int = None,
                 protocol: str = "http",
                 health_check_path: str = "/health",
                 metadata: Dict[str, str] = None,
                 weight: int = 1,
                 registry: ServiceRegistry = None,
                 auto_register: bool = True,
                 heartbeat_interval: int = 30):
        
        self.service_name = service_name
        self.host = host or self._get_local_ip()
        self.port = port or int(os.getenv('PORT', 8000))
        self.protocol = protocol
        self.health_check_path = health_check_path
        self.metadata = metadata or {}
        self.weight = weight
        self.auto_register = auto_register
        self.heartbeat_interval = heartbeat_interval
        
        # Generate unique instance ID
        self.instance_id = f"{self.service_name}-{self.host}-{self.port}-{uuid.uuid4().hex[:8]}"
        
        # Service registry
        self.registry = registry or self._create_default_registry()
        
        # Internal state
        self._registered = False
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._running = False
    
    def _get_local_ip(self) -> str:
        """Get local IP address"""
        try:
            # Connect to a remote address to determine local IP
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                return s.getsockname()[0]
        except Exception:
            return "127.0.0.1"
    
    def _create_default_registry(self) -> ServiceRegistry:
        """Create default service registry based on environment"""
        redis_url = os.getenv('REDIS_URL')
        
        if redis_url:
            # Use Redis backend for production
            backend = RedisServiceDiscovery(redis_url)
            logger.info("Using Redis service discovery backend")
        else:
            # Use in-memory backend for development
            backend = InMemoryServiceDiscovery()
            logger.info("Using in-memory service discovery backend")
        
        return ServiceRegistry(backend)
    
    @property
    def instance(self) -> ServiceInstance:
        """Get current service instance"""
        return ServiceInstance(
            service_name=self.service_name,
            instance_id=self.instance_id,
            host=self.host,
            port=self.port,
            protocol=self.protocol,
            health_check_path=self.health_check_path,
            metadata=self.metadata,
            weight=self.weight,
            status=ServiceStatus.HEALTHY if self._registered else ServiceStatus.UNKNOWN
        )
    
    async def start(self):
        """Start the service discovery client"""
        if self._running:
            return
        
        self._running = True
        
        # Start the registry
        await self.registry.start()
        
        # Auto-register if enabled
        if self.auto_register:
            await self.register()
        
        # Start heartbeat
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        
        logger.info(f"Service discovery client started for {self.service_name}")
    
    async def stop(self):
        """Stop the service discovery client"""
        if not self._running:
            return
        
        self._running = False
        
        # Stop heartbeat
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
        
        # Deregister service
        if self._registered:
            await self.deregister()
        
        # Stop registry
        await self.registry.stop()
        
        logger.info(f"Service discovery client stopped for {self.service_name}")
    
    async def register(self) -> bool:
        """Register this service instance"""
        success = await self.registry.register_service(self.instance)
        if success:
            self._registered = True
            logger.info(f"Registered service: {self.service_name}/{self.instance_id}")
        else:
            logger.error(f"Failed to register service: {self.service_name}/{self.instance_id}")
        return success
    
    async def deregister(self) -> bool:
        """Deregister this service instance"""
        success = await self.registry.deregister_service(self.service_name, self.instance_id)
        if success:
            self._registered = False
            logger.info(f"Deregistered service: {self.service_name}/{self.instance_id}")
        else:
            logger.error(f"Failed to deregister service: {self.service_name}/{self.instance_id}")
        return success
    
    async def discover_service(self, 
                             service_name: str,
                             strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN,
                             healthy_only: bool = True) -> Optional[ServiceInstance]:
        """Discover a service instance"""
        return await self.registry.discover_service(service_name, strategy, healthy_only)
    
    async def discover_all_instances(self, 
                                   service_name: str,
                                   healthy_only: bool = True) -> List[ServiceInstance]:
        """Discover all instances of a service"""
        return await self.registry.discover_all_instances(service_name, healthy_only)
    
    async def get_service_url(self, 
                            service_name: str,
                            strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN) -> Optional[str]:
        """Get URL for a service"""
        instance = await self.discover_service(service_name, strategy)
        return instance.url if instance else None
    
    async def call_service(self, 
                         service_name: str,
                         path: str = "/",
                         method: str = "GET",
                         data: Dict[str, Any] = None,
                         headers: Dict[str, str] = None,
                         timeout: int = 30,
                         strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN) -> Optional[Dict[str, Any]]:
        """Make HTTP call to a service"""
        import aiohttp
        
        instance = await self.discover_service(service_name, strategy)
        if not instance:
            logger.error(f"No healthy instances found for service: {service_name}")
            return None
        
        url = f"{instance.url}{path}"
        
        try:
            # Increment active connections
            instance.active_connections += 1
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
                async with session.request(method, url, json=data, headers=headers) as response:
                    if response.content_type == 'application/json':
                        return await response.json()
                    else:
                        return {'content': await response.text(), 'status': response.status}
        
        except Exception as e:
            logger.error(f"Failed to call service {service_name} at {url}: {e}")
            return None
        
        finally:
            # Decrement active connections
            instance.active_connections = max(0, instance.active_connections - 1)
    
    async def _heartbeat_loop(self):
        """Heartbeat loop to keep service registration alive"""
        while self._running:
            try:
                if self._registered:
                    # Re-register to refresh TTL in Redis backend
                    await self.registry.register_service(self.instance)
                
                await asyncio.sleep(self.heartbeat_interval)
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in heartbeat loop: {e}")
                await asyncio.sleep(self.heartbeat_interval)
    
    async def update_metadata(self, metadata: Dict[str, str]):
        """Update service metadata"""
        self.metadata.update(metadata)
        if self._registered:
            await self.register()  # Re-register with updated metadata
    
    async def update_weight(self, weight: int):
        """Update service weight for load balancing"""
        self.weight = weight
        if self._registered:
            await self.register()  # Re-register with updated weight
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Get health status of all services"""
        return await self.registry.get_service_health_status()
    
    @asynccontextmanager
    async def service_context(self):
        """Context manager for automatic service lifecycle management"""
        await self.start()
        try:
            yield self
        finally:
            await self.stop()

# Convenience functions for common operations
async def create_service_client(service_name: str, **kwargs) -> ServiceDiscoveryClient:
    """Create and start a service discovery client"""
    client = ServiceDiscoveryClient(service_name, **kwargs)
    await client.start()
    return client

async def discover_service_url(service_name: str, 
                             registry: ServiceRegistry = None,
                             strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN) -> Optional[str]:
    """Quick function to discover a service URL"""
    if not registry:
        redis_url = os.getenv('REDIS_URL')
        backend = RedisServiceDiscovery(redis_url) if redis_url else InMemoryServiceDiscovery()
        registry = ServiceRegistry(backend)
        await registry.start()
    
    try:
        instance = await registry.discover_service(service_name, strategy)
        return instance.url if instance else None
    finally:
        await registry.stop()

# Django integration helpers
def get_django_service_client(service_name: str = None) -> ServiceDiscoveryClient:
    """Get service discovery client for Django applications"""
    from django.conf import settings
    
    if not service_name:
        # Try to infer service name from Django settings
        service_name = getattr(settings, 'SERVICE_NAME', 'django-service')
    
    # Get configuration from Django settings
    host = getattr(settings, 'SERVICE_HOST', None)
    port = getattr(settings, 'SERVICE_PORT', None)
    redis_url = getattr(settings, 'REDIS_URL', None)
    
    # Create registry
    if redis_url:
        backend = RedisServiceDiscovery(redis_url)
    else:
        backend = InMemoryServiceDiscovery()
    
    registry = ServiceRegistry(backend)
    
    return ServiceDiscoveryClient(
        service_name=service_name,
        host=host,
        port=port,
        registry=registry
    )