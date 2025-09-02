"""Database migration system for schema-based microservices."""

import os
import logging
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

from .connection_manager import connection_manager
from .config import SERVICE_SCHEMAS

logger = logging.getLogger(__name__)

class MigrationManager:
    """Manages database migrations for all microservices."""
    
    def __init__(self):
        self.migration_table = 'schema_migrations'
    
    def ensure_migration_table(self, service_name: str) -> None:
        """Ensure the migration tracking table exists.
        
        Args:
            service_name: Name of the microservice
        """
        schema_name = SERVICE_SCHEMAS[service_name]
        
        create_table_sql = f"""
        CREATE TABLE IF NOT EXISTS {schema_name}.{self.migration_table} (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL UNIQUE,
            migration_hash VARCHAR(64) NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            service_name VARCHAR(50) NOT NULL,
            schema_name VARCHAR(50) NOT NULL,
            rollback_sql TEXT,
            INDEX(migration_name),
            INDEX(service_name),
            INDEX(applied_at)
        );
        """
        
        try:
            with connection_manager.get_cursor(service_name) as cursor:
                cursor.execute(create_table_sql)
                logger.info(f"Migration table ensured for {service_name}")
        except Exception as e:
            logger.error(f"Failed to create migration table for {service_name}: {e}")
            raise
    
    def get_applied_migrations(self, service_name: str) -> List[str]:
        """Get list of applied migrations for a service.
        
        Args:
            service_name: Name of the microservice
            
        Returns:
            List of applied migration names
        """
        schema_name = SERVICE_SCHEMAS[service_name]
        
        try:
            with connection_manager.get_cursor(service_name, commit=False) as cursor:
                cursor.execute(
                    f"SELECT migration_name FROM {schema_name}.{self.migration_table} "
                    f"WHERE service_name = %s ORDER BY applied_at",
                    (service_name,)
                )
                return [row['migration_name'] for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get applied migrations for {service_name}: {e}")
            return []
    
    def calculate_migration_hash(self, migration_content: str) -> str:
        """Calculate hash for migration content.
        
        Args:
            migration_content: SQL migration content
            
        Returns:
            SHA-256 hash of the migration
        """
        return hashlib.sha256(migration_content.encode()).hexdigest()
    
    def apply_migration(self, service_name: str, migration_name: str, 
                       migration_sql: str, rollback_sql: Optional[str] = None) -> bool:
        """Apply a migration to a service's schema.
        
        Args:
            service_name: Name of the microservice
            migration_name: Name of the migration
            migration_sql: SQL to execute
            rollback_sql: Optional SQL for rollback
            
        Returns:
            True if migration was applied successfully
        """
        schema_name = SERVICE_SCHEMAS[service_name]
        migration_hash = self.calculate_migration_hash(migration_sql)
        
        try:
            with connection_manager.get_connection(service_name) as conn:
                with conn.cursor() as cursor:
                    # Check if migration already applied
                    cursor.execute(
                        f"SELECT migration_hash FROM {schema_name}.{self.migration_table} "
                        f"WHERE migration_name = %s AND service_name = %s",
                        (migration_name, service_name)
                    )
                    
                    existing = cursor.fetchone()
                    if existing:
                        if existing['migration_hash'] == migration_hash:
                            logger.info(f"Migration {migration_name} already applied for {service_name}")
                            return True
                        else:
                            raise Exception(f"Migration {migration_name} hash mismatch for {service_name}")
                    
                    # Apply migration
                    logger.info(f"Applying migration {migration_name} for {service_name}")
                    cursor.execute(migration_sql)
                    
                    # Record migration
                    cursor.execute(
                        f"INSERT INTO {schema_name}.{self.migration_table} "
                        f"(migration_name, migration_hash, service_name, schema_name, rollback_sql) "
                        f"VALUES (%s, %s, %s, %s, %s)",
                        (migration_name, migration_hash, service_name, schema_name, rollback_sql)
                    )
                    
                    conn.commit()
                    logger.info(f"Migration {migration_name} applied successfully for {service_name}")
                    return True
                    
        except Exception as e:
            logger.error(f"Failed to apply migration {migration_name} for {service_name}: {e}")
            raise
    
    def rollback_migration(self, service_name: str, migration_name: str) -> bool:
        """Rollback a migration.
        
        Args:
            service_name: Name of the microservice
            migration_name: Name of the migration to rollback
            
        Returns:
            True if rollback was successful
        """
        schema_name = SERVICE_SCHEMAS[service_name]
        
        try:
            with connection_manager.get_connection(service_name) as conn:
                with conn.cursor() as cursor:
                    # Get rollback SQL
                    cursor.execute(
                        f"SELECT rollback_sql FROM {schema_name}.{self.migration_table} "
                        f"WHERE migration_name = %s AND service_name = %s",
                        (migration_name, service_name)
                    )
                    
                    result = cursor.fetchone()
                    if not result:
                        raise Exception(f"Migration {migration_name} not found for {service_name}")
                    
                    rollback_sql = result['rollback_sql']
                    if not rollback_sql:
                        raise Exception(f"No rollback SQL available for {migration_name}")
                    
                    # Execute rollback
                    logger.info(f"Rolling back migration {migration_name} for {service_name}")
                    cursor.execute(rollback_sql)
                    
                    # Remove migration record
                    cursor.execute(
                        f"DELETE FROM {schema_name}.{self.migration_table} "
                        f"WHERE migration_name = %s AND service_name = %s",
                        (migration_name, service_name)
                    )
                    
                    conn.commit()
                    logger.info(f"Migration {migration_name} rolled back successfully for {service_name}")
                    return True
                    
        except Exception as e:
            logger.error(f"Failed to rollback migration {migration_name} for {service_name}: {e}")
            raise
    
    def load_migrations_from_directory(self, service_name: str, migrations_dir: Path) -> List[Dict[str, Any]]:
        """Load migrations from a directory.
        
        Args:
            service_name: Name of the microservice
            migrations_dir: Path to migrations directory
            
        Returns:
            List of migration dictionaries
        """
        migrations = []
        
        if not migrations_dir.exists():
            logger.warning(f"Migrations directory not found: {migrations_dir}")
            return migrations
        
        # Find all .sql files
        sql_files = sorted(migrations_dir.glob('*.sql'))
        
        for sql_file in sql_files:
            try:
                migration_content = sql_file.read_text(encoding='utf-8')
                
                # Look for rollback section (marked with -- ROLLBACK)
                parts = migration_content.split('-- ROLLBACK')
                migration_sql = parts[0].strip()
                rollback_sql = parts[1].strip() if len(parts) > 1 else None
                
                migrations.append({
                    'name': sql_file.stem,
                    'file_path': sql_file,
                    'migration_sql': migration_sql,
                    'rollback_sql': rollback_sql
                })
                
            except Exception as e:
                logger.error(f"Failed to load migration {sql_file}: {e}")
        
        return migrations
    
    def migrate_service(self, service_name: str, migrations_dir: Optional[Path] = None) -> bool:
        """Run all pending migrations for a service.
        
        Args:
            service_name: Name of the microservice
            migrations_dir: Optional path to migrations directory
            
        Returns:
            True if all migrations applied successfully
        """
        if migrations_dir is None:
            # Default migrations directory
            migrations_dir = Path(__file__).parent.parent.parent / service_name / 'migrations'
        
        try:
            # Ensure migration table exists
            self.ensure_migration_table(service_name)
            
            # Get applied migrations
            applied_migrations = set(self.get_applied_migrations(service_name))
            
            # Load available migrations
            available_migrations = self.load_migrations_from_directory(service_name, migrations_dir)
            
            # Apply pending migrations
            pending_migrations = [
                m for m in available_migrations 
                if m['name'] not in applied_migrations
            ]
            
            if not pending_migrations:
                logger.info(f"No pending migrations for {service_name}")
                return True
            
            logger.info(f"Applying {len(pending_migrations)} migrations for {service_name}")
            
            for migration in pending_migrations:
                self.apply_migration(
                    service_name,
                    migration['name'],
                    migration['migration_sql'],
                    migration['rollback_sql']
                )
            
            logger.info(f"All migrations applied successfully for {service_name}")
            return True
            
        except Exception as e:
            logger.error(f"Migration failed for {service_name}: {e}")
            raise
    
    def migrate_all_services(self) -> Dict[str, bool]:
        """Run migrations for all services.
        
        Returns:
            Dictionary mapping service names to migration success status
        """
        results = {}
        
        for service_name in SERVICE_SCHEMAS.keys():
            try:
                results[service_name] = self.migrate_service(service_name)
            except Exception as e:
                logger.error(f"Migration failed for {service_name}: {e}")
                results[service_name] = False
        
        return results
    
    def get_migration_status(self, service_name: str) -> Dict[str, Any]:
        """Get migration status for a service.
        
        Args:
            service_name: Name of the microservice
            
        Returns:
            Migration status information
        """
        try:
            applied_migrations = self.get_applied_migrations(service_name)
            
            # Get latest migration info
            schema_name = SERVICE_SCHEMAS[service_name]
            
            with connection_manager.get_cursor(service_name, commit=False) as cursor:
                cursor.execute(
                    f"SELECT migration_name, applied_at FROM {schema_name}.{self.migration_table} "
                    f"WHERE service_name = %s ORDER BY applied_at DESC LIMIT 1",
                    (service_name,)
                )
                
                latest = cursor.fetchone()
                
                return {
                    'service': service_name,
                    'schema': schema_name,
                    'total_migrations': len(applied_migrations),
                    'latest_migration': dict(latest) if latest else None,
                    'applied_migrations': applied_migrations
                }
                
        except Exception as e:
            logger.error(f"Failed to get migration status for {service_name}: {e}")
            return {
                'service': service_name,
                'error': str(e)
            }

# Global migration manager instance
migration_manager = MigrationManager()

# Convenience functions
def migrate_service(service_name: str, migrations_dir: Optional[Path] = None) -> bool:
    """Run migrations for a service."""
    return migration_manager.migrate_service(service_name, migrations_dir)

def migrate_all_services() -> Dict[str, bool]:
    """Run migrations for all services."""
    return migration_manager.migrate_all_services()

def get_migration_status(service_name: str) -> Dict[str, Any]:
    """Get migration status for a service."""
    return migration_manager.get_migration_status(service_name)