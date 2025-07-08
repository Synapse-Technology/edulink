from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError
import os


class Command(BaseCommand):
    help = "Test database connection"

    def handle(self, *args, **options):
        self.stdout.write("Testing database connection...")
        self.stdout.write(f'Database host: {os.getenv("host")}')
        self.stdout.write(f'Database name: {os.getenv("dbname")}')
        self.stdout.write(f'Database user: {os.getenv("user")}')
        self.stdout.write(f'Database port: {os.getenv("port")}')

        try:
            conn = connections["default"]
            conn.cursor()
            self.stdout.write(
                self.style.SUCCESS("Successfully connected to the database!")
            )
        except OperationalError as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to connect to the database: {str(e)}")
            )
