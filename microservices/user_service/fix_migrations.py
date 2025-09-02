import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line
from django.apps import apps
from django.db.migrations.recorder import MigrationRecorder

# Create the django_migrations table
recorder = MigrationRecorder(connection)
recorder.ensure_schema()

print("Django migrations table recreated.")

# Now let's mark all existing migrations as applied
from django.core.management.commands.migrate import Command
from django.db.migrations.loader import MigrationLoader

loader = MigrationLoader(connection)

print("\nMarking migrations as applied...")

for app_label in loader.migrated_apps:
    migrations = loader.disk_migrations
    for migration_key in migrations:
        if migration_key[0] == app_label:
            migration = migrations[migration_key]
            recorder.record_applied(app_label, migration.name)
            print(f"Marked {app_label}.{migration.name} as applied")

print("\nAll migrations marked as applied!")