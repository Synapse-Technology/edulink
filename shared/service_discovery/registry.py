from typing import Dict, List, Optional, Set, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import asyncio
import aiohttp
import logging
import json
import hashlib
from enum import Enum
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class ServiceStatus(Enum):
    """Service status enumeration"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"
    STARTING = "starting"
    STOPPING = "stopping"

class LoadBalancingStrategy(Enum):
    """Load balancing strategies"""
    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTIONS = "least_connections"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    RANDOM = "random"

@dataclass
class ServiceInstance:
    """Represents a service instance"""
    service_name: str
    instance_id: str
    host: str
    port: int
    protocol: str = "http"
    health_check_path: str = "/health"
    metadata: Dict[str, str] = field(default_factory=dict)
    weight: int = 1
    status: ServiceStatus = ServiceStatus.UNKNOWN
    last_health_check: Optional[datetime] = None
    consecutive_failures: int = 0
    active_connections: int = 0
    registered_at: datetime = field(default_factory=datetime.utcnow)
    
    @property
    def url(self) -> str:
        """Get the base URL for this service instance"""
        return f"{self.protocol}://{self.host}:{self.port}"
    
    @property
    def health_check_url(self) -> str:
        """Get the health check URL for this service instance"""
        return f"{self.url}{self.health_check_path}"
    
    def is_healthy(self) -> bool:
        """Check if the service instance is healthy"""
        return self.status == ServiceStatus.HEALTHY
    
    def mark_healthy(self):
        """Mark the service instance as healthy"""
        self.status = ServiceStatus.HEALTHY
        self.last_health_check = datetime.utcnow()
        self.consecutive_failures = 0
    
    def mark_unhealthy(self):
        """Mark the service instance as unhealthy"""
        self.status = ServiceStatus.UNHEALTHY
        self.last_health_check = datetime.utcnow()
        self.consecutive_failures += 1

class ServiceDiscoveryBackend(ABC):
    """Abstract base class for service discovery backends"""
    
    @abstractmethod
    async def register_service(self, instance: ServiceInstance) -> bool:
        """Register a service instance"""
        pass
    
    @abstractmethod
    async def deregister_service(self, service_name: str, instance_id: str) -> bool:
        """Deregister a service instance"""
        pass
    
    @abstractmethod
    async def discover_services(self, service_name: str) -> List[ServiceInstance]:
        """Discover all instances of a service"""
        pass
    
    @abstractmethod
    async def get_all_services(self) -> Dict[str, List[ServiceInstance]]:
        """Get all registered services"""
        pass

class InMemoryServiceDiscovery(ServiceDiscoveryBackend):
    """In-memory service discovery backend for development"""
    
    def __init__(self):
        self._services: Dict[str, Dict[str, ServiceInstance]] = {}
        self._lock = asyncio.Lock()
    
    async def register_service(self, instance: ServiceInstance) -> bool:
        """Register a service instance"""
        async with self._lock:
            if instance.service_name not in self._services:
                self._services[instance.service_name] = {}
            
            self._services[instance.service_name][instance.instance_id] = instance
            logger.info(f"Registered service instance: {instance.service_name}/{instance.instance_id}")
            return True
    
    async def deregister_service(self, service_name: str, instance_id: str) -> bool:
        """Deregister a service instance"""
        async with self._lock:
            if service_name in self._services and instance_id in self._services[service_name]:
                del self._services[service_name][instance_id]
                logger.info(f"Deregistered service instance: {service_name}/{instance_id}")
                
                # Clean up empty service entries
                if not self._services[service_name]:
                    del self._services[service_name]
                
                return True
            return False
    
    async def discover_services(self, service_name: str) -> List[ServiceInstance]:
        """Discover all instances of a service"""
        async with self._lock:
            if service_name in self._services:
                return list(self._services[service_name].values())
            return []
    
    async def get_all_services(self) -> Dict[str, List[ServiceInstance]]:
        """Get all registered services"""
        async with self._lock:
            result = {}
            for service_name, instances in self._services.items():
                result[service_name] = list(instances.values())
            return result

class ServiceRegistry:
    """Main service registry with health monitoring and load balancing"""
    
    def __init__(self, 
                 backend: ServiceDiscoveryBackend,
                 health_check_interval: int = 30,
                 health_check_timeout: int = 5,
                 max_consecutive_failures: int = 3):
        self.backend = backend
        self.health_check_interval = health_check_interval
        self.health_check_timeout = health_check_timeout
        self.max_consecutive_failures = max_consecutive_failures
        self._health_check_task: Optional[asyncio.Task] = None
        self._running = False
        self._load_balancer_state: Dict[str, int] = {}  # For round-robin state
        self._event_handlers: Dict[str, List[Callable]] = {
            'service_registered': [],
            'service_deregistered': [],
            'service_health_changed': [],
        }
    
    async def start(self):
        """Start the service registry and health monitoring"""
        if self._running:
            return
        
        self._running = True
        self._health_check_task = asyncio.create_task(self._health_check_loop())
        logger.info("Service registry started")
    
    async def stop(self):
        """Stop the service registry"""
        self._running = False
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
        logger.info("Service registry stopped")
    
    async def register_service(self, instance: ServiceInstance) -> bool:
        """Register a service instance"""
        success = await self.backend.register_service(instance)
        if success:
            await self._trigger_event('service_registered', instance)
        return success
    
    async def deregister_service(self, service_name: str, instance_id: str) -> bool:
        """Deregister a service instance"""
        success = await self.backend.deregister_service(service_name, instance_id)
        if success:
            await self._trigger_event('service_deregistered', service_name, instance_id)
        return success
    
    async def discover_service(self, service_name: str, 
                             strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN,
                             healthy_only: bool = True) -> Optional[ServiceInstance]:
        """Discover a single service instance using load balancing"""
        instances = await self.backend.discover_services(service_name)
        
        if healthy_only:
            instances = [i for i in instances if i.is_healthy()]
        
        if not instances:
            return None
        
        return self._select_instance(service_name, instances, strategy)
    
    async def discover_all_instances(self, service_name: str, 
                                   healthy_only: bool = True) -> List[ServiceInstance]:
        """Discover all instances of a service"""
        instances = await self.backend.discover_services(service_name)
        
        if healthy_only:
            instances = [i for i in instances if i.is_healthy()]
        
        return instances
    
    def _select_instance(self, service_name: str, instances: List[ServiceInstance], 
                        strategy: LoadBalancingStrategy) -> ServiceInstance:
        """Select an instance based on load balancing strategy"""
        if strategy == LoadBalancingStrategy.ROUND_ROBIN:
            if service_name not in self._load_balancer_state:
                self._load_balancer_state[service_name] = 0
            
            index = self._load_balancer_state[service_name] % len(instances)
            self._load_balancer_state[service_name] += 1
            return instances[index]
        
        elif strategy == LoadBalancingStrategy.LEAST_CONNECTIONS:
            return min(instances, key=lambda x: x.active_connections)
        
        elif strategy == LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN:
            # Simple weighted selection based on weight
            total_weight = sum(i.weight for i in instances)
            if service_name not in self._load_balancer_state:
                self._load_balancer_state[service_name] = 0
            
            target = self._load_balancer_state[service_name] % total_weight
            self._load_balancer_state[service_name] += 1
            
            current_weight = 0
            for instance in instances:
                current_weight += instance.weight
                if current_weight > target:
                    return instance
            
            return instances[0]  # Fallback
        
        elif strategy == LoadBalancingStrategy.RANDOM:
            import random
            return random.choice(instances)
        
        else:
            return instances[0]  # Default to first instance
    
    async def _health_check_loop(self):
        """Continuous health checking loop"""
        while self._running:
            try:
                await self._perform_health_checks()
                await asyncio.sleep(self.health_check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                await asyncio.sleep(self.health_check_interval)
    
    async def _perform_health_checks(self):
        """Perform health checks on all registered services"""
        all_services = await self.backend.get_all_services()
        
        tasks = []
        for service_name, instances in all_services.items():
            for instance in instances:
                task = asyncio.create_task(self._check_instance_health(instance))
                tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _check_instance_health(self, instance: ServiceInstance):
        """Check health of a single service instance"""
        previous_status = instance.status
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.health_check_timeout)) as session:
                async with session.get(instance.health_check_url) as response:
                    if response.status == 200:
                        instance.mark_healthy()
                    else:
                        instance.mark_unhealthy()
        except Exception as e:
            logger.debug(f"Health check failed for {instance.service_name}/{instance.instance_id}: {e}")
            instance.mark_unhealthy()
        
        # Remove instance if it has too many consecutive failures
        if instance.consecutive_failures >= self.max_consecutive_failures:
            logger.warning(f"Removing unhealthy instance: {instance.service_name}/{instance.instance_id}")
            await self.deregister_service(instance.service_name, instance.instance_id)
        
        # Trigger event if status changed
        if previous_status != instance.status:
            await self._trigger_event('service_health_changed', instance, previous_status)
    
    def add_event_handler(self, event_type: str, handler: Callable):
        """Add an event handler"""
        if event_type in self._event_handlers:
            self._event_handlers[event_type].append(handler)
    
    async def _trigger_event(self, event_type: str, *args):
        """Trigger event handlers"""
        if event_type in self._event_handlers:
            for handler in self._event_handlers[event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(*args)
                    else:
                        handler(*args)
                except Exception as e:
                    logger.error(f"Error in event handler {handler}: {e}")
    
    async def get_service_health_status(self) -> Dict[str, Dict[str, str]]:
        """Get health status of all services"""
        all_services = await self.backend.get_all_services()
        status = {}
        
        for service_name, instances in all_services.items():
            status[service_name] = {}
            for instance in instances:
                status[service_name][instance.instance_id] = {
                    'status': instance.status.value,
                    'url': instance.url,
                    'last_check': instance.last_health_check.isoformat() if instance.last_health_check else None,
                    'consecutive_failures': instance.consecutive_failures
                }
        
        return status