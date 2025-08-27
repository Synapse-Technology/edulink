import json
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import aioredis
import logging
from .registry import ServiceDiscoveryBackend, ServiceInstance, ServiceStatus

logger = logging.getLogger(__name__)

class RedisServiceDiscovery(ServiceDiscoveryBackend):
    """Redis-based service discovery backend for production"""
    
    def __init__(self, redis_url: str, key_prefix: str = "services:", ttl: int = 60):
        self.redis_url = redis_url
        self.key_prefix = key_prefix
        self.ttl = ttl  # Time to live for service registrations
        self._redis: Optional[aioredis.Redis] = None
    
    async def connect(self):
        """Connect to Redis"""
        if not self._redis:
            self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
            logger.info("Connected to Redis for service discovery")
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self._redis:
            await self._redis.close()
            self._redis = None
            logger.info("Disconnected from Redis")
    
    def _service_key(self, service_name: str) -> str:
        """Get Redis key for a service"""
        return f"{self.key_prefix}{service_name}"
    
    def _instance_key(self, service_name: str, instance_id: str) -> str:
        """Get Redis key for a service instance"""
        return f"{self.key_prefix}{service_name}:{instance_id}"
    
    def _serialize_instance(self, instance: ServiceInstance) -> str:
        """Serialize service instance to JSON"""
        data = {
            'service_name': instance.service_name,
            'instance_id': instance.instance_id,
            'host': instance.host,
            'port': instance.port,
            'protocol': instance.protocol,
            'health_check_path': instance.health_check_path,
            'metadata': instance.metadata,
            'weight': instance.weight,
            'status': instance.status.value,
            'last_health_check': instance.last_health_check.isoformat() if instance.last_health_check else None,
            'consecutive_failures': instance.consecutive_failures,
            'active_connections': instance.active_connections,
            'registered_at': instance.registered_at.isoformat()
        }
        return json.dumps(data)
    
    def _deserialize_instance(self, data: str) -> ServiceInstance:
        """Deserialize service instance from JSON"""
        obj = json.loads(data)
        
        instance = ServiceInstance(
            service_name=obj['service_name'],
            instance_id=obj['instance_id'],
            host=obj['host'],
            port=obj['port'],
            protocol=obj.get('protocol', 'http'),
            health_check_path=obj.get('health_check_path', '/health'),
            metadata=obj.get('metadata', {}),
            weight=obj.get('weight', 1),
            status=ServiceStatus(obj.get('status', 'unknown')),
            consecutive_failures=obj.get('consecutive_failures', 0),
            active_connections=obj.get('active_connections', 0)
        )
        
        if obj.get('last_health_check'):
            instance.last_health_check = datetime.fromisoformat(obj['last_health_check'])
        
        if obj.get('registered_at'):
            instance.registered_at = datetime.fromisoformat(obj['registered_at'])
        
        return instance
    
    async def register_service(self, instance: ServiceInstance) -> bool:
        """Register a service instance in Redis"""
        await self.connect()
        
        try:
            # Store instance data with TTL
            instance_key = self._instance_key(instance.service_name, instance.instance_id)
            instance_data = self._serialize_instance(instance)
            
            # Use pipeline for atomic operations
            pipe = self._redis.pipeline()
            
            # Set instance data with TTL
            pipe.setex(instance_key, self.ttl, instance_data)
            
            # Add instance to service set
            service_key = self._service_key(instance.service_name)
            pipe.sadd(service_key, instance.instance_id)
            pipe.expire(service_key, self.ttl)
            
            await pipe.execute()
            
            logger.info(f"Registered service instance in Redis: {instance.service_name}/{instance.instance_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register service instance in Redis: {e}")
            return False
    
    async def deregister_service(self, service_name: str, instance_id: str) -> bool:
        """Deregister a service instance from Redis"""
        await self.connect()
        
        try:
            # Use pipeline for atomic operations
            pipe = self._redis.pipeline()
            
            # Remove instance data
            instance_key = self._instance_key(service_name, instance_id)
            pipe.delete(instance_key)
            
            # Remove instance from service set
            service_key = self._service_key(service_name)
            pipe.srem(service_key, instance_id)
            
            # Check if service set is empty and remove if so
            pipe.scard(service_key)
            
            results = await pipe.execute()
            
            # If service set is empty, remove it
            if results[-1] == 0:
                await self._redis.delete(service_key)
            
            logger.info(f"Deregistered service instance from Redis: {service_name}/{instance_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to deregister service instance from Redis: {e}")
            return False
    
    async def discover_services(self, service_name: str) -> List[ServiceInstance]:
        """Discover all instances of a service from Redis"""
        await self.connect()
        
        try:
            service_key = self._service_key(service_name)
            instance_ids = await self._redis.smembers(service_key)
            
            if not instance_ids:
                return []
            
            # Get all instance data
            pipe = self._redis.pipeline()
            for instance_id in instance_ids:
                instance_key = self._instance_key(service_name, instance_id)
                pipe.get(instance_key)
            
            instance_data_list = await pipe.execute()
            
            instances = []
            for i, instance_data in enumerate(instance_data_list):
                if instance_data:
                    try:
                        instance = self._deserialize_instance(instance_data)
                        instances.append(instance)
                    except Exception as e:
                        logger.warning(f"Failed to deserialize instance data: {e}")
                        # Clean up invalid instance
                        invalid_instance_id = list(instance_ids)[i]
                        await self.deregister_service(service_name, invalid_instance_id)
            
            return instances
            
        except Exception as e:
            logger.error(f"Failed to discover services from Redis: {e}")
            return []
    
    async def get_all_services(self) -> Dict[str, List[ServiceInstance]]:
        """Get all registered services from Redis"""
        await self.connect()
        
        try:
            # Get all service keys
            pattern = f"{self.key_prefix}*"
            service_keys = await self._redis.keys(pattern)
            
            # Filter out instance keys (they contain ':')
            service_keys = [key for key in service_keys if ':' not in key.replace(self.key_prefix, '')]
            
            result = {}
            for service_key in service_keys:
                service_name = service_key.replace(self.key_prefix, '')
                instances = await self.discover_services(service_name)
                if instances:
                    result[service_name] = instances
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get all services from Redis: {e}")
            return {}
    
    async def cleanup_expired_services(self):
        """Clean up expired service registrations"""
        await self.connect()
        
        try:
            all_services = await self.get_all_services()
            
            for service_name, instances in all_services.items():
                service_key = self._service_key(service_name)
                valid_instance_ids = set()
                
                for instance in instances:
                    instance_key = self._instance_key(service_name, instance.instance_id)
                    # Check if instance key still exists
                    if await self._redis.exists(instance_key):
                        valid_instance_ids.add(instance.instance_id)
                    else:
                        # Remove from service set if instance key doesn't exist
                        await self._redis.srem(service_key, instance.instance_id)
                
                # If no valid instances, remove service key
                if not valid_instance_ids:
                    await self._redis.delete(service_key)
            
            logger.debug("Completed cleanup of expired services")
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired services: {e}")

class ConsulServiceDiscovery(ServiceDiscoveryBackend):
    """Consul-based service discovery backend (placeholder for future implementation)"""
    
    def __init__(self, consul_url: str = "http://localhost:8500"):
        self.consul_url = consul_url
        # TODO: Implement Consul integration
        raise NotImplementedError("Consul backend not yet implemented")
    
    async def register_service(self, instance: ServiceInstance) -> bool:
        # TODO: Implement Consul service registration
        raise NotImplementedError("Consul backend not yet implemented")
    
    async def deregister_service(self, service_name: str, instance_id: str) -> bool:
        # TODO: Implement Consul service deregistration
        raise NotImplementedError("Consul backend not yet implemented")
    
    async def discover_services(self, service_name: str) -> List[ServiceInstance]:
        # TODO: Implement Consul service discovery
        raise NotImplementedError("Consul backend not yet implemented")
    
    async def get_all_services(self) -> Dict[str, List[ServiceInstance]]:
        # TODO: Implement Consul get all services
        raise NotImplementedError("Consul backend not yet implemented")

class EtcdServiceDiscovery(ServiceDiscoveryBackend):
    """etcd-based service discovery backend (placeholder for future implementation)"""
    
    def __init__(self, etcd_url: str = "http://localhost:2379"):
        self.etcd_url = etcd_url
        # TODO: Implement etcd integration
        raise NotImplementedError("etcd backend not yet implemented")
    
    async def register_service(self, instance: ServiceInstance) -> bool:
        # TODO: Implement etcd service registration
        raise NotImplementedError("etcd backend not yet implemented")
    
    async def deregister_service(self, service_name: str, instance_id: str) -> bool:
        # TODO: Implement etcd service deregistration
        raise NotImplementedError("etcd backend not yet implemented")
    
    async def discover_services(self, service_name: str) -> List[ServiceInstance]:
        # TODO: Implement etcd service discovery
        raise NotImplementedError("etcd backend not yet implemented")
    
    async def get_all_services(self) -> Dict[str, List[ServiceInstance]]:
        # TODO: Implement etcd get all services
        raise NotImplementedError("etcd backend not yet implemented")