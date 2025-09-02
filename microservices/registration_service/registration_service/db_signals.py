"""Database signals to ensure search_path is set correctly."""

import os
from django.db import connection
from django.db.backends.signals import connection_created
from django.dispatch import receiver

@receiver(connection_created)
def set_search_path(sender, connection, **kwargs):
    """Set the search_path on every new database connection."""
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            # Get the service schema from environment
            service_schema = os.getenv('SERVICE_SCHEMA', 'institution_schema')
            search_path = f"{service_schema},auth_schema,public"
            
            # Set the search_path
            cursor.execute(f"SET search_path TO {search_path};")