
"""
Enhanced Schema Router for Microservices
This router ensures all apps are routed to their correct schemas
"""

class EnhancedSchemaRouter:
    """
    Enhanced router that handles schema routing for all microservices
    """
    
    # Define app to schema mappings
    APP_SCHEMA_MAPPING = {
        'accounts': 'auth_schema',
        'authentication': 'auth_schema',
        'users': 'user_schema',
        'profiles': 'user_schema',
        'institutions': 'user_schema',
        'applications': 'application_schema',
        'internships': 'internship_schema',
        'placements': 'internship_schema',
        'notifications': 'notification_schema',
        'messaging': 'notification_schema'
    }
    
    # Apps that should remain in public schema
    PUBLIC_SCHEMA_APPS = {
        'admin', 'auth', 'contenttypes', 'sessions'
    }
    
    def db_for_read(self, model, **hints):
        """Suggest the database to read from."""
        app_label = model._meta.app_label
        
        if app_label in self.PUBLIC_SCHEMA_APPS:
            return 'default'
        
        if app_label in self.APP_SCHEMA_MAPPING:
            return 'default'  # All use same DB but different schemas
        
        return 'default'
    
    def db_for_write(self, model, **hints):
        """Suggest the database to write to."""
        return self.db_for_read(model, **hints)
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that certain apps' models get created on the right database."""
        if db != 'default':
            return False
        
        # Allow public schema apps to migrate normally
        if app_label in self.PUBLIC_SCHEMA_APPS:
            return True
        
        # Allow app-specific migrations based on current service context
        import os
        current_service = os.environ.get('SERVICE_NAME', '')
        
        if app_label in self.APP_SCHEMA_MAPPING:
            expected_schema = self.APP_SCHEMA_MAPPING[app_label]
            service_schema_mapping = {
                'auth_schema': 'auth',
                'user_schema': 'user',
                'application_schema': 'application',
                'internship_schema': 'internship',
                'notification_schema': 'notification'
            }
            expected_service = service_schema_mapping.get(expected_schema, '')
            return current_service == expected_service
        
        return True
