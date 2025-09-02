"""Custom migrate command that ensures search_path is set correctly."""

import os
from django.core.management.commands.migrate import Command as MigrateCommand
from django.db import connection

class Command(MigrateCommand):
    """Custom migrate command that sets search_path before running migrations."""
    
    help = 'Run migrations with correct search_path for cross-schema access'
    
    def handle(self, *args, **options):
        """Handle the migrate command with search_path setup."""
        
        # Set the search_path before running migrations
        with connection.cursor() as cursor:
            service_schema = os.getenv('SERVICE_SCHEMA', 'institution_schema')
            search_path = f"{service_schema},auth_schema,public"
            
            self.stdout.write(f"Setting search_path to: {search_path}")
            cursor.execute(f"SET search_path TO {search_path};")
            
            # Verify the search_path was set
            cursor.execute("SHOW search_path;")
            current_path = cursor.fetchone()[0]
            self.stdout.write(f"Current search_path: {current_path}")
            
            # Test auth_user access
            try:
                cursor.execute("SELECT COUNT(*) FROM auth_user;")
                count = cursor.fetchone()[0]
                self.stdout.write(f"auth_user table accessible: YES (count: {count})")
            except Exception as e:
                self.stdout.write(f"auth_user table accessible: NO ({e})")
        
        # Now run the actual migrate command
        super().handle(*args, **options)