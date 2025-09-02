"""Cross-schema data access patterns for secure inter-service communication."""

import logging
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from enum import Enum

from .connection_manager import connection_manager
from .config import SERVICE_SCHEMAS

logger = logging.getLogger(__name__)

class AccessLevel(Enum):
    """Access levels for cross-schema operations."""
    READ_ONLY = "read_only"
    READ_WRITE = "read_write"
    ADMIN = "admin"

@dataclass
class CrossSchemaQuery:
    """Represents a cross-schema query with metadata."""
    query: str
    params: Optional[tuple] = None
    source_service: Optional[str] = None
    target_schemas: Optional[List[str]] = None
    access_level: AccessLevel = AccessLevel.READ_ONLY
    description: Optional[str] = None

class CrossSchemaAccessManager:
    """Manages secure cross-schema data access between microservices."""
    
    def __init__(self):
        # Define allowed cross-schema access patterns
        self.access_matrix = {
            'auth': {
                'can_read_from': [],
                'can_write_to': ['auth_schema'],
                'can_be_read_by': ['user', 'application', 'internship', 'notification'],
            },
            'user': {
                'can_read_from': ['auth_schema'],
                'can_write_to': ['user_schema'],
                'can_be_read_by': ['application', 'internship', 'notification'],
            },
            'institution': {
                'can_read_from': [],
                'can_write_to': ['institution_schema'],
                'can_be_read_by': ['user', 'application', 'internship', 'notification'],
            },
            'notification': {
                'can_read_from': ['auth_schema', 'user_schema', 'institution_schema', 
                                'application_schema', 'internship_schema'],
                'can_write_to': ['notification_schema'],
                'can_be_read_by': [],
            },
            'application': {
                'can_read_from': ['auth_schema', 'user_schema', 'institution_schema'],
                'can_write_to': ['application_schema'],
                'can_be_read_by': ['notification'],
            },
            'internship': {
                'can_read_from': ['auth_schema', 'user_schema', 'institution_schema'],
                'can_write_to': ['internship_schema'],
                'can_be_read_by': ['notification'],
            },
        }
    
    def validate_access(self, source_service: str, target_schema: str, 
                       access_level: AccessLevel) -> bool:
        """Validate if a service can access a target schema.
        
        Args:
            source_service: Service requesting access
            target_schema: Target schema to access
            access_level: Required access level
            
        Returns:
            True if access is allowed
        """
        if source_service not in self.access_matrix:
            logger.warning(f"Unknown source service: {source_service}")
            return False
        
        service_permissions = self.access_matrix[source_service]
        
        if access_level == AccessLevel.READ_ONLY:
            return target_schema in service_permissions['can_read_from']
        elif access_level == AccessLevel.READ_WRITE:
            return target_schema in service_permissions['can_write_to']
        elif access_level == AccessLevel.ADMIN:
            # Admin access only to own schema
            return target_schema == SERVICE_SCHEMAS.get(source_service)
        
        return False
    
    def execute_cross_schema_query(self, query: CrossSchemaQuery) -> List[Dict[str, Any]]:
        """Execute a cross-schema query with access validation.
        
        Args:
            query: Cross-schema query object
            
        Returns:
            Query results
            
        Raises:
            PermissionError: If access is not allowed
            Exception: If query execution fails
        """
        # Validate access for each target schema
        if query.target_schemas:
            for schema in query.target_schemas:
                if not self.validate_access(query.source_service, schema, query.access_level):
                    raise PermissionError(
                        f"Service {query.source_service} does not have {query.access_level.value} "
                        f"access to schema {schema}"
                    )
        
        # Log the cross-schema access
        logger.info(
            f"Cross-schema query from {query.source_service}: {query.description or 'No description'}"
        )
        
        try:
            return connection_manager.execute_cross_service_query(query.query, query.params)
        except Exception as e:
            logger.error(f"Cross-schema query failed: {e}")
            raise
    
    def get_user_profile_with_auth(self, user_id: str, requesting_service: str) -> Optional[Dict[str, Any]]:
        """Get user profile data with authentication info.
        
        Args:
            user_id: User ID to fetch
            requesting_service: Service making the request
            
        Returns:
            Combined user data or None
        """
        query = CrossSchemaQuery(
            query="""
            SELECT 
                au.id as auth_id,
                au.email,
                au.is_active,
                au.date_joined,
                up.id as profile_id,
                up.first_name,
                up.last_name,
                up.phone_number,
                up.date_of_birth,
                up.academic_level
            FROM auth_schema.authentication_user au
            LEFT JOIN user_schema.profiles_userprofile up ON au.id = up.user_id
            WHERE au.id = %s AND au.is_active = true
            """,
            params=(user_id,),
            source_service=requesting_service,
            target_schemas=['auth_schema', 'user_schema'],
            access_level=AccessLevel.READ_ONLY,
            description=f"Fetch user profile for user {user_id}"
        )
        
        results = self.execute_cross_schema_query(query)
        return results[0] if results else None
    
    def get_institution_details(self, institution_id: str, requesting_service: str) -> Optional[Dict[str, Any]]:
        """Get institution details.
        
        Args:
            institution_id: Institution ID to fetch
            requesting_service: Service making the request
            
        Returns:
            Institution data or None
        """
        query = CrossSchemaQuery(
            query="""
            SELECT 
                i.id,
                i.name,
                i.code,
                i.type,
                i.country,
                i.city,
                i.is_active,
                i.registration_enabled
            FROM institution_schema.institutions_institution i
            WHERE i.id = %s AND i.is_active = true
            """,
            params=(institution_id,),
            source_service=requesting_service,
            target_schemas=['institution_schema'],
            access_level=AccessLevel.READ_ONLY,
            description=f"Fetch institution details for {institution_id}"
        )
        
        results = self.execute_cross_schema_query(query)
        return results[0] if results else None
    
    def get_user_applications(self, user_id: str, requesting_service: str) -> List[Dict[str, Any]]:
        """Get user's applications with related data.
        
        Args:
            user_id: User ID
            requesting_service: Service making the request
            
        Returns:
            List of applications with related data
        """
        query = CrossSchemaQuery(
            query="""
            SELECT 
                a.id as application_id,
                a.status,
                a.created_at,
                a.updated_at,
                up.first_name,
                up.last_name,
                i.name as institution_name,
                i.code as institution_code
            FROM application_schema.applications_application a
            JOIN user_schema.profiles_userprofile up ON a.user_profile_id = up.id
            JOIN institution_schema.institutions_institution i ON a.institution_id = i.id
            WHERE up.user_id = %s
            ORDER BY a.created_at DESC
            """,
            params=(user_id,),
            source_service=requesting_service,
            target_schemas=['application_schema', 'user_schema', 'institution_schema'],
            access_level=AccessLevel.READ_ONLY,
            description=f"Fetch applications for user {user_id}"
        )
        
        return self.execute_cross_schema_query(query)
    
    def get_notification_recipients(self, notification_type: str, 
                                  requesting_service: str) -> List[Dict[str, Any]]:
        """Get notification recipients based on type.
        
        Args:
            notification_type: Type of notification
            requesting_service: Service making the request
            
        Returns:
            List of recipients
        """
        # This is a complex query that might involve multiple schemas
        # depending on the notification type
        query = CrossSchemaQuery(
            query="""
            SELECT DISTINCT
                au.id as user_id,
                au.email,
                up.first_name,
                up.last_name,
                up.phone_number,
                np.email_enabled,
                np.sms_enabled,
                np.push_enabled
            FROM auth_schema.authentication_user au
            JOIN user_schema.profiles_userprofile up ON au.id = up.user_id
            LEFT JOIN notification_schema.notifications_notificationpreference np 
                ON au.id = np.user_id
            WHERE au.is_active = true
            AND (np.email_enabled = true OR np.sms_enabled = true OR np.push_enabled = true)
            """,
            params=(),
            source_service=requesting_service,
            target_schemas=['auth_schema', 'user_schema', 'notification_schema'],
            access_level=AccessLevel.READ_ONLY,
            description=f"Fetch notification recipients for {notification_type}"
        )
        
        return self.execute_cross_schema_query(query)
    
    def create_audit_log(self, service_name: str, action: str, 
                        resource_type: str, resource_id: str, 
                        user_id: Optional[str] = None, 
                        metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Create an audit log entry across schemas.
        
        Args:
            service_name: Service performing the action
            action: Action performed
            resource_type: Type of resource affected
            resource_id: ID of the resource
            user_id: Optional user ID
            metadata: Optional additional metadata
            
        Returns:
            True if audit log was created successfully
        """
        schema_name = SERVICE_SCHEMAS.get(service_name)
        if not schema_name:
            logger.error(f"Unknown service for audit log: {service_name}")
            return False
        
        query = CrossSchemaQuery(
            query=f"""
            INSERT INTO {schema_name}.audit_log 
            (service_name, action, resource_type, resource_id, user_id, metadata, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            """,
            params=(service_name, action, resource_type, resource_id, user_id, 
                   str(metadata) if metadata else None),
            source_service=service_name,
            target_schemas=[schema_name],
            access_level=AccessLevel.READ_WRITE,
            description=f"Create audit log for {action} on {resource_type}:{resource_id}"
        )
        
        try:
            self.execute_cross_schema_query(query)
            return True
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            return False
    
    def get_service_health_summary(self, requesting_service: str) -> Dict[str, Any]:
        """Get health summary across all services.
        
        Args:
            requesting_service: Service making the request
            
        Returns:
            Health summary data
        """
        # This would typically be called by monitoring service
        if requesting_service != 'monitoring':
            raise PermissionError("Health summary only available to monitoring service")
        
        health_data = {}
        
        for service_name in SERVICE_SCHEMAS.keys():
            try:
                health_check = connection_manager.health_check(service_name)
                pool_stats = connection_manager.get_pool_stats(service_name)
                
                health_data[service_name] = {
                    'database_health': health_check,
                    'connection_pool': pool_stats,
                    'schema': SERVICE_SCHEMAS[service_name]
                }
            except Exception as e:
                health_data[service_name] = {
                    'error': str(e),
                    'schema': SERVICE_SCHEMAS[service_name]
                }
        
        return health_data

# Global cross-schema access manager
cross_schema_manager = CrossSchemaAccessManager()

# Convenience functions
def get_user_profile_with_auth(user_id: str, requesting_service: str) -> Optional[Dict[str, Any]]:
    """Get user profile with authentication data."""
    return cross_schema_manager.get_user_profile_with_auth(user_id, requesting_service)

def get_institution_details(institution_id: str, requesting_service: str) -> Optional[Dict[str, Any]]:
    """Get institution details."""
    return cross_schema_manager.get_institution_details(institution_id, requesting_service)

def get_user_applications(user_id: str, requesting_service: str) -> List[Dict[str, Any]]:
    """Get user applications."""
    return cross_schema_manager.get_user_applications(user_id, requesting_service)

def create_audit_log(service_name: str, action: str, resource_type: str, 
                    resource_id: str, user_id: Optional[str] = None, 
                    metadata: Optional[Dict[str, Any]] = None) -> bool:
    """Create audit log entry."""
    return cross_schema_manager.create_audit_log(
        service_name, action, resource_type, resource_id, user_id, metadata
    )