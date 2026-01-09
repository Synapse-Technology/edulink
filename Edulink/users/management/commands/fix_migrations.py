from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings

class Command(BaseCommand):
    help = 'Reset database completely'
    
    def handle(self, *args, **options):
        db_name = settings.DATABASES['default']['NAME']
        
        with connection.cursor() as cursor:
            try:
                # Get all table names
                cursor.execute("""
                    SELECT tablename FROM pg_tables 
                    WHERE schemaname = 'public'
                """)
                tables = cursor.fetchall()
                
                # Drop all tables
                for table in tables:
                    cursor.execute(f'DROP TABLE IF EXISTS "{table[0]}" CASCADE')
                    
                self.stdout.write(
                    self.style.SUCCESS('Successfully dropped all tables')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error dropping tables: {e}')
                )