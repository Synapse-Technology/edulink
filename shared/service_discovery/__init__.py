"""Service Discovery Package for Edulink Microservices

This package provides a comprehensive service discovery solution with:
- Multiple backends (In-memory, Redis, Consul, etcd)
- Health monitoring and automatic failover
- Load balancing strategies
- Django integration
- Automatic service registration and deregistration
"""

from .registry import (
    ServiceRegistry,
    ServiceInstance,
    ServiceStatus,
    LoadBalancingStrategy,
    ServiceDiscoveryBackend
)

from .backends import (
    InMemoryServiceDiscovery,
    RedisServiceDiscovery,
    ConsulServiceDiscovery,
    EtcdServiceDiscovery
)

from .client import (
    ServiceDiscoveryClient,
    create_service_client,
    discover_service_url,
    get_django_service_client
)

__version__ = "1.0.0"
__author__ = "Edulink Development Team"

__all__ = [
    # Core classes
    'ServiceRegistry',
    'ServiceInstance',
    'ServiceStatus',
    'LoadBalancingStrategy',
    'ServiceDiscoveryBackend',
    
    # Backends
    'InMemoryServiceDiscovery',
    'RedisServiceDiscovery',
    'ConsulServiceDiscovery',
    'EtcdServiceDiscovery',
    
    # Client
    'ServiceDiscoveryClient',
    'create_service_client',
    'discover_service_url',
    'get_django_service_client',
]

# Default configuration
DEFAULT_CONFIG = {
    'health_check_interval': 30,
    'health_check_timeout': 5,
    'max_consecutive_failures': 3,
    'heartbeat_interval': 30,
    'service_ttl': 60,
    'load_balancing_strategy': LoadBalancingStrategy.ROUND_ROBIN,
}

def get_default_config():
    """Get default configuration for service discovery"""
    return DEFAULT_CONFIG.copy()