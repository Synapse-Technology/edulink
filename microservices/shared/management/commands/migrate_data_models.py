"""Django management command to migrate data from old models to new restructured models."""

import logging
import uuid
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Management command to migrate data from legacy models to new restructured models."""
    
    help = 'Migrate data from legacy User models to new AuthUser and UserProfile models'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run migration in dry-run mode (no actual changes)',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of records to process in each batch (default: 100)',
        )
        parser.add_argument(
            '--service',
            type=str,
            choices=['auth', 'user', 'all'],
            default='all',
            help='Which service to migrate (auth, user, or all)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force migration even if target models already have data',
        )
    
    def handle(self, *args, **options):
        """Execute the data migration."""
        self.dry_run = options['dry_run']
        self.batch_size = options['batch_size']
        self.service = options['service']
        self.force = options['force']
        
        if self.dry_run:
            self.stdout.write(self.style.WARNING('Running in DRY-RUN mode - no changes will be made'))
        
        try:
            if self.service in ['auth', 'all']:
                self._migrate_auth_service()
            
            if self.service in ['user', 'all']:
                self._migrate_user_service()
            
            self.stdout.write(self.style.SUCCESS('Data migration completed successfully'))
            
        except Exception as e:
            logger.error(f"Error during data migration: {str(e)}")
            raise CommandError(f"Migration failed: {str(e)}")
    
    def _migrate_auth_service(self):
        """Migrate data in the auth service."""
        self.stdout.write('Migrating auth service data...')
        
        try:
            from authentication.models import User, AuthUser
            
            # Check if target model already has data
            if not self.force and AuthUser.objects.exists():
                self.stdout.write(
                    self.style.WARNING(
                        'AuthUser model already contains data. Use --force to override.'
                    )
                )
                return
            
            # Get legacy users
            legacy_users = User.objects.all()
            total_users = legacy_users.count()
            
            if total_users == 0:
                self.stdout.write('No legacy users found in auth service')
                return
            
            self.stdout.write(f'Found {total_users} legacy users to migrate')
            
            migrated_count = 0
            
            # Process in batches
            for i in range(0, total_users, self.batch_size):
                batch = legacy_users[i:i + self.batch_size]
                
                with transaction.atomic():
                    for legacy_user in batch:
                        if not self.dry_run:
                            # Create new AuthUser
                            auth_user = AuthUser(
                                id=legacy_user.id,  # Keep same ID
                                email=legacy_user.email,
                                is_active=legacy_user.is_active,
                                is_staff=legacy_user.is_staff,
                                date_joined=legacy_user.date_joined,
                                is_email_verified=getattr(legacy_user, 'email_verified', False),
                                email_verified_at=getattr(legacy_user, 'email_verified_at', None),
                                role=getattr(legacy_user, 'role', 'student'),
                                phone_number=getattr(legacy_user, 'phone_number', ''),
                                two_factor_enabled=getattr(legacy_user, 'two_factor_enabled', False),
                                user_profile_id=getattr(legacy_user, 'profile_service_id', None),
                                created_at=getattr(legacy_user, 'created_at', timezone.now()),
                                updated_at=getattr(legacy_user, 'updated_at', timezone.now()),
                            )
                            auth_user.save()
                        
                        migrated_count += 1
                
                self.stdout.write(f'Migrated batch {i//self.batch_size + 1}: {migrated_count}/{total_users} users')
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully migrated {migrated_count} users to AuthUser model')
            )
            
        except ImportError:
            self.stdout.write(
                self.style.WARNING('Auth service models not available - skipping auth migration')
            )
        except Exception as e:
            logger.error(f"Error migrating auth service: {str(e)}")
            raise
    
    def _migrate_user_service(self):
        """Migrate data in the user service."""
        self.stdout.write('Migrating user service data...')
        
        try:
            from users.models import User, UserProfile
            
            # Check if target model already has data
            if not self.force and UserProfile.objects.exists():
                self.stdout.write(
                    self.style.WARNING(
                        'UserProfile model already contains data. Use --force to override.'
                    )
                )
                return
            
            # Get legacy users
            legacy_users = User.objects.all()
            total_users = legacy_users.count()
            
            if total_users == 0:
                self.stdout.write('No legacy users found in user service')
                return
            
            self.stdout.write(f'Found {total_users} legacy users to migrate')
            
            migrated_count = 0
            
            # Process in batches
            for i in range(0, total_users, self.batch_size):
                batch = legacy_users[i:i + self.batch_size]
                
                with transaction.atomic():
                    for legacy_user in batch:
                        if not self.dry_run:
                            # Create new UserProfile
                            user_profile = UserProfile(
                                id=legacy_user.id,  # Keep same ID
                                auth_user_id=legacy_user.id,  # Reference to auth user
                                email=legacy_user.email,
                                username=getattr(legacy_user, 'username', legacy_user.email.split('@')[0]),
                                first_name=getattr(legacy_user, 'first_name', ''),
                                last_name=getattr(legacy_user, 'last_name', ''),
                                phone_number=getattr(legacy_user, 'phone_number', ''),
                                is_active=legacy_user.is_active,
                                is_verified=getattr(legacy_user, 'is_verified', False),
                                role=getattr(legacy_user, 'role', 'student'),
                                avatar=getattr(legacy_user, 'avatar', None),
                                bio=getattr(legacy_user, 'bio', ''),
                                date_of_birth=getattr(legacy_user, 'date_of_birth', None),
                                gender=getattr(legacy_user, 'gender', ''),
                                address=getattr(legacy_user, 'address', ''),
                                city=getattr(legacy_user, 'city', ''),
                                country=getattr(legacy_user, 'country', ''),
                                postal_code=getattr(legacy_user, 'postal_code', ''),
                                language_preference=getattr(legacy_user, 'language_preference', 'en'),
                                timezone=getattr(legacy_user, 'timezone', 'UTC'),
                                profile_visibility=getattr(legacy_user, 'profile_visibility', 'public'),
                                email_notifications=getattr(legacy_user, 'email_notifications', True),
                                sms_notifications=getattr(legacy_user, 'sms_notifications', False),
                                push_notifications=getattr(legacy_user, 'push_notifications', True),
                                two_factor_enabled=getattr(legacy_user, 'two_factor_enabled', False),
                                email_verified_at=getattr(legacy_user, 'email_verified_at', None),
                                created_at=getattr(legacy_user, 'created_at', timezone.now()),
                                updated_at=getattr(legacy_user, 'updated_at', timezone.now()),
                            )
                            user_profile.save()
                        
                        migrated_count += 1
                
                self.stdout.write(f'Migrated batch {i//self.batch_size + 1}: {migrated_count}/{total_users} users')
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully migrated {migrated_count} users to UserProfile model')
            )
            
        except ImportError:
            self.stdout.write(
                self.style.WARNING('User service models not available - skipping user migration')
            )
        except Exception as e:
            logger.error(f"Error migrating user service: {str(e)}")
            raise
    
    def _create_cross_service_references(self):
        """Create cross-service references between AuthUser and UserProfile."""
        self.stdout.write('Creating cross-service references...')
        
        try:
            # This would typically involve API calls or event publishing
            # to update references between services
            
            # For now, we'll just log the action
            self.stdout.write(
                self.style.SUCCESS('Cross-service references would be created via API calls')
            )
            
        except Exception as e:
            logger.error(f"Error creating cross-service references: {str(e)}")
            raise