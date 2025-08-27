"""Django management command to validate data integrity across microservices."""

import logging
import uuid
from collections import defaultdict
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.utils import timezone


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Management command to validate data integrity across microservices."""
    
    help = 'Validate data integrity and consistency across restructured microservices'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--check-type',
            type=str,
            choices=['orphaned', 'duplicates', 'references', 'consistency', 'all'],
            default='all',
            help='Type of integrity check to perform',
        )
        parser.add_argument(
            '--fix-issues',
            action='store_true',
            help='Attempt to fix found integrity issues',
        )
        parser.add_argument(
            '--report-only',
            action='store_true',
            help='Only report issues without fixing them',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Batch size for processing records',
        )
    
    def handle(self, *args, **options):
        """Execute the data integrity validation."""
        self.check_type = options['check_type']
        self.fix_issues = options['fix_issues'] and not options['report_only']
        self.batch_size = options['batch_size']
        
        self.issues_found = defaultdict(list)
        self.issues_fixed = defaultdict(int)
        
        self.stdout.write(self.style.SUCCESS('Starting data integrity validation...'))
        
        try:
            if self.check_type in ['orphaned', 'all']:
                self._check_orphaned_records()
            
            if self.check_type in ['duplicates', 'all']:
                self._check_duplicate_records()
            
            if self.check_type in ['references', 'all']:
                self._check_reference_integrity()
            
            if self.check_type in ['consistency', 'all']:
                self._check_data_consistency()
            
            self._generate_report()
            
        except Exception as e:
            logger.error(f"Error during data integrity validation: {str(e)}")
            raise CommandError(f"Validation failed: {str(e)}")
    
    def _check_orphaned_records(self):
        """Check for orphaned records across services."""
        self.stdout.write('Checking for orphaned records...')
        
        try:
            # Check for orphaned UserProfiles (auth_user_id not in AuthUser)
            self._check_orphaned_user_profiles()
            
            # Check for orphaned InstitutionMemberships
            self._check_orphaned_memberships()
            
            # Check for orphaned legacy User records
            self._check_orphaned_legacy_users()
            
        except Exception as e:
            logger.error(f"Error checking orphaned records: {str(e)}")
            raise
    
    def _check_orphaned_user_profiles(self):
        """Check for UserProfiles without corresponding AuthUser."""
        try:
            from users.models import UserProfile
            
            # Get all UserProfile auth_user_ids
            profile_auth_ids = set(
                UserProfile.objects.values_list('auth_user_id', flat=True)
            )
            
            # Try to get AuthUser IDs (if auth service is available)
            try:
                from authentication.models import AuthUser
                auth_user_ids = set(
                    AuthUser.objects.values_list('id', flat=True)
                )
                
                # Find orphaned profiles
                orphaned_ids = profile_auth_ids - auth_user_ids
                
                if orphaned_ids:
                    orphaned_profiles = UserProfile.objects.filter(
                        auth_user_id__in=orphaned_ids
                    )
                    
                    for profile in orphaned_profiles:
                        issue = {
                            'type': 'orphaned_user_profile',
                            'id': profile.id,
                            'auth_user_id': profile.auth_user_id,
                            'email': profile.email,
                            'message': f'UserProfile {profile.id} references non-existent AuthUser {profile.auth_user_id}'
                        }
                        self.issues_found['orphaned'].append(issue)
                    
                    if self.fix_issues:
                        # Option 1: Delete orphaned profiles
                        # Option 2: Create placeholder AuthUser records
                        # For safety, we'll just report them
                        self.stdout.write(
                            self.style.WARNING(
                                f'Found {len(orphaned_ids)} orphaned UserProfiles. '
                                'Manual intervention required.'
                            )
                        )
                
            except ImportError:
                self.stdout.write(
                    self.style.WARNING(
                        'AuthUser model not available - cannot check UserProfile orphans'
                    )
                )
            
        except ImportError:
            self.stdout.write(
                self.style.WARNING('UserProfile model not available')
            )
        except Exception as e:
            logger.error(f"Error checking orphaned user profiles: {str(e)}")
            raise
    
    def _check_orphaned_memberships(self):
        """Check for InstitutionMemberships without corresponding UserProfile or Institution."""
        try:
            from institutions.models import InstitutionMembership, Institution
            from users.models import UserProfile
            
            # Check memberships with invalid user_profile_id
            membership_user_ids = set(
                InstitutionMembership.objects.values_list('user_profile_id', flat=True)
            )
            profile_ids = set(
                UserProfile.objects.values_list('id', flat=True)
            )
            
            orphaned_user_ids = membership_user_ids - profile_ids
            
            if orphaned_user_ids:
                orphaned_memberships = InstitutionMembership.objects.filter(
                    user_profile_id__in=orphaned_user_ids
                )
                
                for membership in orphaned_memberships:
                    issue = {
                        'type': 'orphaned_membership_user',
                        'id': membership.id,
                        'user_profile_id': membership.user_profile_id,
                        'institution_id': membership.institution.id,
                        'message': f'InstitutionMembership {membership.id} references non-existent UserProfile {membership.user_profile_id}'
                    }
                    self.issues_found['orphaned'].append(issue)
                
                if self.fix_issues:
                    deleted_count = orphaned_memberships.delete()[0]
                    self.issues_fixed['orphaned_memberships'] += deleted_count
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Deleted {deleted_count} orphaned memberships with invalid user references'
                        )
                    )
            
            # Check memberships with invalid institution references
            # This should be handled by foreign key constraints, but let's verify
            try:
                invalid_memberships = InstitutionMembership.objects.filter(
                    institution__isnull=True
                )
                
                if invalid_memberships.exists():
                    for membership in invalid_memberships:
                        issue = {
                            'type': 'orphaned_membership_institution',
                            'id': membership.id,
                            'message': f'InstitutionMembership {membership.id} has null institution reference'
                        }
                        self.issues_found['orphaned'].append(issue)
                    
                    if self.fix_issues:
                        deleted_count = invalid_memberships.delete()[0]
                        self.issues_fixed['orphaned_memberships'] += deleted_count
            
            except Exception as e:
                logger.warning(f"Could not check institution references: {str(e)}")
            
        except ImportError:
            self.stdout.write(
                self.style.WARNING('Institution models not available')
            )
        except Exception as e:
            logger.error(f"Error checking orphaned memberships: {str(e)}")
            raise
    
    def _check_orphaned_legacy_users(self):
        """Check for orphaned legacy User records."""
        try:
            from users.models import User as LegacyUser
            
            # Check if legacy users have corresponding profiles or auth users
            legacy_users = LegacyUser.objects.all()
            
            for user in legacy_users:
                # Check if there's a corresponding UserProfile
                try:
                    from users.models import UserProfile
                    profile_exists = UserProfile.objects.filter(
                        email=user.email
                    ).exists()
                    
                    if not profile_exists:
                        issue = {
                            'type': 'orphaned_legacy_user',
                            'id': user.id,
                            'email': user.email,
                            'message': f'Legacy User {user.id} ({user.email}) has no corresponding UserProfile'
                        }
                        self.issues_found['orphaned'].append(issue)
                
                except Exception as e:
                    logger.warning(f"Could not check legacy user {user.id}: {str(e)}")
            
        except ImportError:
            # Legacy User model might not exist yet
            pass
        except Exception as e:
            logger.error(f"Error checking orphaned legacy users: {str(e)}")
            raise
    
    def _check_duplicate_records(self):
        """Check for duplicate records within and across services."""
        self.stdout.write('Checking for duplicate records...')
        
        try:
            # Check for duplicate emails across AuthUser and UserProfile
            self._check_duplicate_emails()
            
            # Check for duplicate usernames
            self._check_duplicate_usernames()
            
            # Check for duplicate institution memberships
            self._check_duplicate_memberships()
            
        except Exception as e:
            logger.error(f"Error checking duplicate records: {str(e)}")
            raise
    
    def _check_duplicate_emails(self):
        """Check for duplicate email addresses."""
        try:
            # Check within UserProfile
            from users.models import UserProfile
            
            duplicate_emails = (
                UserProfile.objects
                .values('email')
                .annotate(count=models.Count('email'))
                .filter(count__gt=1)
            )
            
            for dup in duplicate_emails:
                profiles = UserProfile.objects.filter(email=dup['email'])
                issue = {
                    'type': 'duplicate_email_userprofile',
                    'email': dup['email'],
                    'count': dup['count'],
                    'ids': list(profiles.values_list('id', flat=True)),
                    'message': f'Email {dup["email"]} appears {dup["count"]} times in UserProfile'
                }
                self.issues_found['duplicates'].append(issue)
            
            # Check across AuthUser and UserProfile (if both available)
            try:
                from authentication.models import AuthUser
                
                auth_emails = set(AuthUser.objects.values_list('email', flat=True))
                profile_emails = set(UserProfile.objects.values_list('email', flat=True))
                
                common_emails = auth_emails & profile_emails
                
                for email in common_emails:
                    auth_users = AuthUser.objects.filter(email=email)
                    profiles = UserProfile.objects.filter(email=email)
                    
                    # Check if they're properly linked
                    auth_user_ids = set(auth_users.values_list('id', flat=True))
                    profile_auth_ids = set(profiles.values_list('auth_user_id', flat=True))
                    
                    if auth_user_ids != profile_auth_ids:
                        issue = {
                            'type': 'email_sync_mismatch',
                            'email': email,
                            'auth_user_ids': list(auth_user_ids),
                            'profile_auth_ids': list(profile_auth_ids),
                            'message': f'Email {email} sync mismatch between AuthUser and UserProfile'
                        }
                        self.issues_found['consistency'].append(issue)
            
            except ImportError:
                pass
            
        except ImportError:
            self.stdout.write(
                self.style.WARNING('UserProfile model not available')
            )
        except Exception as e:
            logger.error(f"Error checking duplicate emails: {str(e)}")
            raise
    
    def _check_duplicate_usernames(self):
        """Check for duplicate usernames."""
        try:
            from users.models import UserProfile
            from django.db import models
            
            duplicate_usernames = (
                UserProfile.objects
                .exclude(username__isnull=True)
                .exclude(username='')
                .values('username')
                .annotate(count=models.Count('username'))
                .filter(count__gt=1)
            )
            
            for dup in duplicate_usernames:
                profiles = UserProfile.objects.filter(username=dup['username'])
                issue = {
                    'type': 'duplicate_username',
                    'username': dup['username'],
                    'count': dup['count'],
                    'ids': list(profiles.values_list('id', flat=True)),
                    'message': f'Username {dup["username"]} appears {dup["count"]} times'
                }
                self.issues_found['duplicates'].append(issue)
                
                if self.fix_issues:
                    # Fix by appending numbers to duplicate usernames
                    profiles_list = list(profiles)
                    for i, profile in enumerate(profiles_list[1:], 1):
                        new_username = f"{profile.username}_{i}"
                        profile.username = new_username
                        profile.save()
                        self.issues_fixed['duplicate_usernames'] += 1
            
        except ImportError:
            pass
        except Exception as e:
            logger.error(f"Error checking duplicate usernames: {str(e)}")
            raise
    
    def _check_duplicate_memberships(self):
        """Check for duplicate institution memberships."""
        try:
            from institutions.models import InstitutionMembership
            from django.db import models
            
            duplicate_memberships = (
                InstitutionMembership.objects
                .values('user_profile_id', 'institution')
                .annotate(count=models.Count('id'))
                .filter(count__gt=1)
            )
            
            for dup in duplicate_memberships:
                memberships = InstitutionMembership.objects.filter(
                    user_profile_id=dup['user_profile_id'],
                    institution=dup['institution']
                )
                
                issue = {
                    'type': 'duplicate_membership',
                    'user_profile_id': dup['user_profile_id'],
                    'institution_id': dup['institution'],
                    'count': dup['count'],
                    'ids': list(memberships.values_list('id', flat=True)),
                    'message': f'User {dup["user_profile_id"]} has {dup["count"]} memberships in institution {dup["institution"]}'
                }
                self.issues_found['duplicates'].append(issue)
                
                if self.fix_issues:
                    # Keep the most recent membership, delete others
                    memberships_list = list(memberships.order_by('-created_at'))
                    for membership in memberships_list[1:]:
                        membership.delete()
                        self.issues_fixed['duplicate_memberships'] += 1
            
        except ImportError:
            pass
        except Exception as e:
            logger.error(f"Error checking duplicate memberships: {str(e)}")
            raise
    
    def _check_reference_integrity(self):
        """Check foreign key and reference integrity."""
        self.stdout.write('Checking reference integrity...')
        
        try:
            # Check UserProfile -> AuthUser references
            self._check_userprofile_authuser_refs()
            
            # Check InstitutionMembership references
            self._check_membership_refs()
            
        except Exception as e:
            logger.error(f"Error checking reference integrity: {str(e)}")
            raise
    
    def _check_userprofile_authuser_refs(self):
        """Check UserProfile to AuthUser reference integrity."""
        try:
            from users.models import UserProfile
            
            # Check for null auth_user_id
            null_auth_profiles = UserProfile.objects.filter(auth_user_id__isnull=True)
            
            for profile in null_auth_profiles:
                issue = {
                    'type': 'null_auth_user_id',
                    'id': profile.id,
                    'email': profile.email,
                    'message': f'UserProfile {profile.id} has null auth_user_id'
                }
                self.issues_found['references'].append(issue)
            
            if self.fix_issues and null_auth_profiles.exists():
                # This requires manual intervention - cannot auto-fix
                self.stdout.write(
                    self.style.WARNING(
                        f'Found {null_auth_profiles.count()} UserProfiles with null auth_user_id. '
                        'Manual intervention required.'
                    )
                )
            
        except ImportError:
            pass
        except Exception as e:
            logger.error(f"Error checking UserProfile-AuthUser references: {str(e)}")
            raise
    
    def _check_membership_refs(self):
        """Check InstitutionMembership reference integrity."""
        try:
            from institutions.models import InstitutionMembership
            
            # Check for null user_profile_id
            null_user_memberships = InstitutionMembership.objects.filter(
                user_profile_id__isnull=True
            )
            
            for membership in null_user_memberships:
                issue = {
                    'type': 'null_user_profile_id',
                    'id': membership.id,
                    'institution_id': membership.institution.id if membership.institution else None,
                    'message': f'InstitutionMembership {membership.id} has null user_profile_id'
                }
                self.issues_found['references'].append(issue)
            
            if self.fix_issues and null_user_memberships.exists():
                deleted_count = null_user_memberships.delete()[0]
                self.issues_fixed['null_references'] += deleted_count
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Deleted {deleted_count} memberships with null user references'
                    )
                )
            
        except ImportError:
            pass
        except Exception as e:
            logger.error(f"Error checking membership references: {str(e)}")
            raise
    
    def _check_data_consistency(self):
        """Check data consistency across services."""
        self.stdout.write('Checking data consistency...')
        
        try:
            # Check email consistency between AuthUser and UserProfile
            self._check_email_consistency()
            
            # Check role consistency
            self._check_role_consistency()
            
            # Check status consistency
            self._check_status_consistency()
            
        except Exception as e:
            logger.error(f"Error checking data consistency: {str(e)}")
            raise
    
    def _check_email_consistency(self):
        """Check email consistency between AuthUser and UserProfile."""
        try:
            from users.models import UserProfile
            from authentication.models import AuthUser
            
            # Find profiles with corresponding auth users
            profiles_with_auth = UserProfile.objects.exclude(auth_user_id__isnull=True)
            
            for profile in profiles_with_auth:
                try:
                    auth_user = AuthUser.objects.get(id=profile.auth_user_id)
                    
                    if profile.email != auth_user.email:
                        issue = {
                            'type': 'email_mismatch',
                            'profile_id': profile.id,
                            'auth_user_id': auth_user.id,
                            'profile_email': profile.email,
                            'auth_email': auth_user.email,
                            'message': f'Email mismatch: Profile {profile.id} ({profile.email}) vs AuthUser {auth_user.id} ({auth_user.email})'
                        }
                        self.issues_found['consistency'].append(issue)
                        
                        if self.fix_issues:
                            # Sync profile email to auth user email (auth is source of truth)
                            profile.email = auth_user.email
                            profile.save()
                            self.issues_fixed['email_sync'] += 1
                
                except AuthUser.DoesNotExist:
                    # This is handled in orphaned records check
                    pass
            
        except ImportError:
            pass
        except Exception as e:
            logger.error(f"Error checking email consistency: {str(e)}")
            raise
    
    def _check_role_consistency(self):
        """Check role consistency between services."""
        try:
            from users.models import UserProfile
            from authentication.models import AuthUser
            
            profiles_with_auth = UserProfile.objects.exclude(auth_user_id__isnull=True)
            
            for profile in profiles_with_auth:
                try:
                    auth_user = AuthUser.objects.get(id=profile.auth_user_id)
                    
                    if profile.role != auth_user.role:
                        issue = {
                            'type': 'role_mismatch',
                            'profile_id': profile.id,
                            'auth_user_id': auth_user.id,
                            'profile_role': profile.role,
                            'auth_role': auth_user.role,
                            'message': f'Role mismatch: Profile {profile.id} ({profile.role}) vs AuthUser {auth_user.id} ({auth_user.role})'
                        }
                        self.issues_found['consistency'].append(issue)
                        
                        if self.fix_issues:
                            # Sync profile role to auth user role
                            profile.role = auth_user.role
                            profile.save()
                            self.issues_fixed['role_sync'] += 1
                
                except AuthUser.DoesNotExist:
                    pass
            
        except ImportError:
            pass
        except Exception as e:
            logger.error(f"Error checking role consistency: {str(e)}")
            raise
    
    def _check_status_consistency(self):
        """Check status consistency between services."""
        try:
            from users.models import UserProfile
            from authentication.models import AuthUser
            
            profiles_with_auth = UserProfile.objects.exclude(auth_user_id__isnull=True)
            
            for profile in profiles_with_auth:
                try:
                    auth_user = AuthUser.objects.get(id=profile.auth_user_id)
                    
                    if profile.is_active != auth_user.is_active:
                        issue = {
                            'type': 'status_mismatch',
                            'profile_id': profile.id,
                            'auth_user_id': auth_user.id,
                            'profile_active': profile.is_active,
                            'auth_active': auth_user.is_active,
                            'message': f'Status mismatch: Profile {profile.id} (active={profile.is_active}) vs AuthUser {auth_user.id} (active={auth_user.is_active})'
                        }
                        self.issues_found['consistency'].append(issue)
                        
                        if self.fix_issues:
                            # Sync profile status to auth user status
                            profile.is_active = auth_user.is_active
                            profile.save()
                            self.issues_fixed['status_sync'] += 1
                
                except AuthUser.DoesNotExist:
                    pass
            
        except ImportError:
            pass
        except Exception as e:
            logger.error(f"Error checking status consistency: {str(e)}")
            raise
    
    def _generate_report(self):
        """Generate a comprehensive integrity report."""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('DATA INTEGRITY VALIDATION REPORT'))
        self.stdout.write('='*60)
        
        total_issues = sum(len(issues) for issues in self.issues_found.values())
        total_fixed = sum(self.issues_fixed.values())
        
        if total_issues == 0:
            self.stdout.write(self.style.SUCCESS('✓ No data integrity issues found!'))
            return
        
        self.stdout.write(f'\nTotal issues found: {total_issues}')
        if self.fix_issues:
            self.stdout.write(f'Total issues fixed: {total_fixed}')
        
        # Report by category
        for category, issues in self.issues_found.items():
            if issues:
                self.stdout.write(f'\n{category.upper()} ISSUES ({len(issues)})')
                self.stdout.write('-' * 40)
                
                for issue in issues[:10]:  # Show first 10 issues
                    self.stdout.write(f"  • {issue['message']}")
                
                if len(issues) > 10:
                    self.stdout.write(f"  ... and {len(issues) - 10} more")
        
        # Report fixes
        if self.issues_fixed:
            self.stdout.write('\nISSUES FIXED')
            self.stdout.write('-' * 40)
            for fix_type, count in self.issues_fixed.items():
                self.stdout.write(f"  • {fix_type}: {count}")
        
        # Recommendations
        self.stdout.write('\nRECOMMENDations')
        self.stdout.write('-' * 40)
        
        if self.issues_found['orphaned']:
            self.stdout.write("  • Review orphaned records and consider cleanup")
        
        if self.issues_found['duplicates']:
            self.stdout.write("  • Implement unique constraints to prevent duplicates")
        
        if self.issues_found['references']:
            self.stdout.write("  • Fix reference integrity issues before production")
        
        if self.issues_found['consistency']:
            self.stdout.write("  • Ensure synchronization mechanisms are working properly")
        
        self.stdout.write('\n' + '='*60)