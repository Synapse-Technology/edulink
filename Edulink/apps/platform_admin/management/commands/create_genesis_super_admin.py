"""
Management command to create the genesis super admin.
This is used once at system birth for out-of-band creation.
"""

import getpass
from django.core.management.base import BaseCommand, CommandError
from django.core.exceptions import ValidationError
from edulink.apps.platform_admin.services import create_genesis_super_admin


class Command(BaseCommand):
    help = 'Create the genesis super admin (used once at system birth)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email address for the genesis super admin'
        )
        
        parser.add_argument(
            '--noinput',
            action='store_true',
            help='Skip user input (use with --email and --password)'
        )
        
        parser.add_argument(
            '--password',
            type=str,
            help='Password for the genesis super admin (use with --noinput)'
        )
    
    def handle(self, *args, **options):
        # Check if super admin already exists
        from edulink.apps.platform_admin.models import PlatformStaffProfile
        
        if PlatformStaffProfile.objects.filter(
            role=PlatformStaffProfile.ROLE_SUPER_ADMIN,
            is_active=True
        ).exists():
            raise CommandError(
                "Genesis super admin already exists. "
                "This command can only be run once."
            )
        
        # Get email
        email = options.get('email')
        if not email and not options['noinput']:
            while True:
                email = input('Genesis super admin email: ').strip()
                if email:
                    break
                self.stdout.write(self.style.ERROR('Email cannot be blank'))
        
        if not email:
            raise CommandError('Email is required')
        
        # Get password
        password = options.get('password')
        if not password and not options['noinput']:
            while True:
                password = getpass.getpass('Genesis super admin password: ')
                password2 = getpass.getpass('Password (again): ')
                
                if password and password == password2:
                    break
                
                if not password:
                    self.stdout.write(self.style.ERROR('Password cannot be blank'))
                else:
                    self.stdout.write(self.style.ERROR("Passwords don't match"))
        
        if not password:
            raise CommandError('Password is required')
        
        # Validate password strength
        if len(password) < 12:
            raise CommandError('Password must be at least 12 characters long')
        
        try:
            # Create genesis super admin
            user = create_genesis_super_admin(
                email=email,
                password=password
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Genesis super admin created successfully: {user.email}\n'
                    f'User ID: {user.id}\n'
                    f'Role: Super Admin (Root Authority)\n'
                    f'\n'
                    f'⚠️  IMPORTANT: Store this password securely. '
                    f'This is a root-level account with system ownership.\n'
                    f'⚠️  This command cannot be run again.'
                )
            )
            
        except ValidationError as e:
            raise CommandError(str(e))
        except Exception as e:
            raise CommandError(f'Failed to create genesis super admin: {e}')