"""Database connection manager with pooling and health monitoring."""

import logging
import time
from typing import Dict, Optional, Any
from contextlib import contextmanager
from threading import Lock

import psycopg2
from psycopg2 import pool, sql
from psycopg2.extras import RealDictCursor
from django.core.exceptions import ImproperlyConfigured

from .config import db_config, SERVICE_SCHEMAS

logger = logging.getLogger(__name__)

class DatabaseConnectionManager:
    """Manages database connections with pooling for all microservices."""
    
    def __init__(self):
        self._pools: Dict[str, psycopg2.pool.ThreadedConnectionPool] = {}
        self._pool_lock = Lock()
        self._health_check_interval = 60  # seconds
        self._last_health_check = {}
    
    def get_connection_pool(self, service_name: str) -> psycopg2.pool.ThreadedConnectionPool:
        """Get or create a connection pool for a service.
        
        Args:
            service_name: Name of the microservice
            
        Returns:
            Connection pool for the service
        """
        if service_name not in self._pools:
            with self._pool_lock:
                if service_name not in self._pools:
                    self._create_connection_pool(service_name)
        
        return self._pools[service_name]
    
    def _create_connection_pool(self, service_name: str) -> None:
        """Create a new connection pool for a service.
        
        Args:
            service_name: Name of the microservice
        """
        try:
            schema_name = SERVICE_SCHEMAS.get(service_name)
            if not schema_name:
                raise ValueError(f"Unknown service: {service_name}")
            
            db_settings = db_config.get_database_config(service_name, schema_name)
            pool_config = db_config.get_connection_pool_config()
            
            # Create connection string
            conn_string = (
                f"host={db_settings['HOST']} "
                f"port={db_settings['PORT']} "
                f"dbname={db_settings['NAME']} "
                f"user={db_settings['USER']} "
                f"password={db_settings['PASSWORD']} "
                f"sslmode={db_settings['OPTIONS']['sslmode']} "
                f"application_name={db_settings['OPTIONS']['application_name']}"
            )
            
            # Create threaded connection pool
            self._pools[service_name] = psycopg2.pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=pool_config['POOL_SIZE'],
                dsn=conn_string,
                cursor_factory=RealDictCursor
            )
            
            # Set search path for the pool
            self._set_search_path(service_name, schema_name)
            
            logger.info(f"Created connection pool for {service_name} service")
            
        except Exception as e:
            logger.error(f"Failed to create connection pool for {service_name}: {e}")
            raise ImproperlyConfigured(f"Database connection failed for {service_name}: {e}")
    
    def _set_search_path(self, service_name: str, schema_name: str) -> None:
        """Set the search path for a service's connection pool.
        
        Args:
            service_name: Name of the microservice
            schema_name: Database schema name
        """
        try:
            pool = self._pools[service_name]
            conn = pool.getconn()
            
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        sql.SQL("SET search_path TO {}, public").format(
                            sql.Identifier(schema_name)
                        )
                    )
                    conn.commit()
            finally:
                pool.putconn(conn)
                
        except Exception as e:
            logger.error(f"Failed to set search path for {service_name}: {e}")
    
    @contextmanager
    def get_connection(self, service_name: str):
        """Get a database connection from the pool.
        
        Args:
            service_name: Name of the microservice
            
        Yields:
            Database connection
        """
        pool = self.get_connection_pool(service_name)
        conn = None
        
        try:
            conn = pool.getconn()
            if conn:
                yield conn
            else:
                raise Exception(f"Failed to get connection for {service_name}")
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database connection error for {service_name}: {e}")
            raise
        finally:
            if conn:
                pool.putconn(conn)
    
    @contextmanager
    def get_cursor(self, service_name: str, commit: bool = True):
        """Get a database cursor with automatic transaction management.
        
        Args:
            service_name: Name of the microservice
            commit: Whether to commit the transaction automatically
            
        Yields:
            Database cursor
        """
        with self.get_connection(service_name) as conn:
            cursor = conn.cursor()
            try:
                yield cursor
                if commit:
                    conn.commit()
            except Exception as e:
                conn.rollback()
                logger.error(f"Database transaction error for {service_name}: {e}")
                raise
            finally:
                cursor.close()
    
    def health_check(self, service_name: str) -> Dict[str, Any]:
        """Perform health check on a service's database connection.
        
        Args:
            service_name: Name of the microservice
            
        Returns:
            Health check results
        """
        current_time = time.time()
        last_check = self._last_health_check.get(service_name, 0)
        
        # Skip if recently checked
        if current_time - last_check < self._health_check_interval:
            return {'status': 'cached', 'healthy': True}
        
        try:
            with self.get_cursor(service_name, commit=False) as cursor:
                cursor.execute("SELECT 1 as health_check")
                result = cursor.fetchone()
                
                self._last_health_check[service_name] = current_time
                
                return {
                    'status': 'success',
                    'healthy': True,
                    'response_time': time.time() - current_time,
                    'result': dict(result) if result else None
                }
                
        except Exception as e:
            logger.error(f"Health check failed for {service_name}: {e}")
            return {
                'status': 'error',
                'healthy': False,
                'error': str(e),
                'response_time': time.time() - current_time
            }
    
    def get_pool_stats(self, service_name: str) -> Dict[str, Any]:
        """Get connection pool statistics.
        
        Args:
            service_name: Name of the microservice
            
        Returns:
            Pool statistics
        """
        if service_name not in self._pools:
            return {'error': 'Pool not found'}
        
        pool = self._pools[service_name]
        
        return {
            'service': service_name,
            'minconn': pool.minconn,
            'maxconn': pool.maxconn,
            'closed': pool.closed
        }
    
    def close_all_pools(self) -> None:
        """Close all connection pools."""
        with self._pool_lock:
            for service_name, pool in self._pools.items():
                try:
                    pool.closeall()
                    logger.info(f"Closed connection pool for {service_name}")
                except Exception as e:
                    logger.error(f"Error closing pool for {service_name}: {e}")
            
            self._pools.clear()
    
    def execute_cross_service_query(self, query: str, params: Optional[tuple] = None) -> list:
        """Execute a query that spans multiple services/schemas.
        
        Args:
            query: SQL query to execute
            params: Query parameters
            
        Returns:
            Query results
        """
        # Use a special cross-service connection
        try:
            db_settings = db_config.get_cross_service_database_config()
            
            conn_string = (
                f"host={db_settings['HOST']} "
                f"port={db_settings['PORT']} "
                f"dbname={db_settings['NAME']} "
                f"user={db_settings['USER']} "
                f"password={db_settings['PASSWORD']} "
                f"sslmode={db_settings['OPTIONS']['sslmode']}"
            )
            
            with psycopg2.connect(conn_string, cursor_factory=RealDictCursor) as conn:
                with conn.cursor() as cursor:
                    # Set search path to include all schemas
                    all_schemas = ','.join(SERVICE_SCHEMAS.values())
                    cursor.execute(f"SET search_path TO {all_schemas}, public")
                    
                    cursor.execute(query, params)
                    return [dict(row) for row in cursor.fetchall()]
                    
        except Exception as e:
            logger.error(f"Cross-service query failed: {e}")
            raise

# Global connection manager instance
connection_manager = DatabaseConnectionManager()

# Convenience functions
def get_connection(service_name: str):
    """Get a database connection for a service."""
    return connection_manager.get_connection(service_name)

def get_cursor(service_name: str, commit: bool = True):
    """Get a database cursor for a service."""
    return connection_manager.get_cursor(service_name, commit)

def health_check(service_name: str) -> Dict[str, Any]:
    """Perform health check on a service's database."""
    return connection_manager.health_check(service_name)

def get_pool_stats(service_name: str) -> Dict[str, Any]:
    """Get connection pool statistics for a service."""
    return connection_manager.get_pool_stats(service_name)