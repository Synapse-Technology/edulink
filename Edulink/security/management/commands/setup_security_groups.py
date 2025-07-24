from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = 'Set up security groups and permissions for the security app'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--create-users',
            action='store_true',
            help='Create sample security users for testing'
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset existing groups and permissions'
        )
        parser.add_argument(
            '--assign-user',
            type=str,
            help='Assign specific user to security admin group (email)'
        )
        parser.add_argument(
            '--list-groups',
            action='store_true',
            help='List existing security groups and their members'
        )
    
    def handle(self, *args, **options):
        try:
            if options['list_groups']:
                self.list_security_groups()
                return
            
            self.stdout.write(
                self.style.SUCCESS('Setting up security groups and permissions...')
            )
            
            # Reset if requested
            if options['reset']:
                self.reset_security_groups()
            
            # Create security groups and permissions
            self.create_security_groups()
            
            # Create sample users if requested
            if options['create_users']:
                self.create_sample_users()
            
            # Assign specific user if requested
            if options['assign_user']:
                self.assign_user_to_admin_group(options['assign_user'])
            
            self.stdout.write(
                self.style.SUCCESS('Security groups setup completed successfully')
            )
            
        except Exception as e:
            raise CommandError(f'Setup failed: {str(e)}')
    
    def create_security_groups(self):
        """Create security groups with appropriate permissions."""
        # Define security groups and their permissions
        security_groups = {
            'Security Admins': {
                'description': 'Full access to security management',
                'permissions': [
                    'add_securityevent', 'change_securityevent', 'delete_securityevent', 'view_securityevent',
                    'add_usersession', 'change_usersession', 'delete_usersession', 'view_usersession',
                    'add_failedloginattempt', 'change_failedloginattempt', 'delete_failedloginattempt', 'view_failedloginattempt',
                    'add_securityconfiguration', 'change_securityconfiguration', 'delete_securityconfiguration', 'view_securityconfiguration',
                    'add_auditlog', 'change_auditlog', 'delete_auditlog', 'view_auditlog',
                ],
                'custom_permissions': [
                    'can_manage_security',
                    'can_view_security',
                    'can_audit_security',
                    'can_system_access',
                    'can_terminate_sessions',
                    'can_manage_security_config',
                    'can_respond_to_incidents'
                ]
            },
            'Security Analysts': {
                'description': 'Read access to security data and analysis',
                'permissions': [
                    'view_securityevent',
                    'view_usersession',
                    'view_failedloginattempt',
                    'view_securityconfiguration',
                    'view_auditlog',
                ],
                'custom_permissions': [
                    'can_view_security',
                    'can_audit_security',
                    'can_generate_reports'
                ]
            },
            'Security Auditors': {
                'description': 'Access to audit logs and compliance data',
                'permissions': [
                    'view_auditlog',
                    'view_securityevent',
                    'view_failedloginattempt',
                ],
                'custom_permissions': [
                    'can_audit_security',
                    'can_generate_reports'
                ]
            },
            'Security Operators': {
                'description': 'Operational security tasks',
                'permissions': [
                    'view_securityevent',
                    'view_usersession',
                    'change_usersession',
                    'view_failedloginattempt',
                ],
                'custom_permissions': [
                    'can_view_security',
                    'can_terminate_sessions'
                ]
            }
        }
        
        with transaction.atomic():
            for group_name, group_config in security_groups.items():
                self.create_or_update_group(group_name, group_config)
    
    def create_or_update_group(self, group_name, group_config):
        """Create or update a security group with permissions."""
        # Create or get the group
        group, created = Group.objects.get_or_create(name=group_name)
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f"Created group: {group_name}")
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"Updated existing group: {group_name}")
            )
        
        # Clear existing permissions
        group.permissions.clear()
        
        # Add model permissions
        for perm_codename in group_config['permissions']:
            try:
                # Try to find permission in security app first
                permission = Permission.objects.filter(
                    content_type__app_label='security',
                    codename=perm_codename
                ).first()
                
                if permission:
                    group.permissions.add(permission)
                else:
                    # Try to find in other apps
                    permission = Permission.objects.filter(codename=perm_codename).first()
                    if permission:
                        group.permissions.add(permission)
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f"Permission '{perm_codename}' not found for group '{group_name}'"
                            )
                        )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Error adding permission '{perm_codename}' to group '{group_name}': {e}"
                    )
                )
        
        # Add custom permissions
        security_content_type = self.get_security_content_type()
        for custom_perm in group_config['custom_permissions']:
            permission = self.create_custom_permission(custom_perm, security_content_type)
            if permission:
                group.permissions.add(permission)
        
        self.stdout.write(
            f"  Added {group.permissions.count()} permissions to {group_name}"
        )
    
    def get_security_content_type(self):
        """Get or create content type for security app."""
        # Use SecurityEvent model as the default content type for custom permissions
        try:
            return ContentType.objects.get(app_label='security', model='securityevent')
        except ContentType.DoesNotExist:
            # Create a generic content type for custom permissions
            return ContentType.objects.get_or_create(
                app_label='security',
                model='securitypermission'
            )[0]
    
    def create_custom_permission(self, codename, content_type):
        """Create custom security permission."""
        permission_names = {
            'can_manage_security': 'Can manage security settings',
            'can_view_security': 'Can view security data',
            'can_audit_security': 'Can audit security events',
            'can_system_access': 'Can access system-level security',
            'can_terminate_sessions': 'Can terminate user sessions',
            'can_manage_security_config': 'Can manage security configuration',
            'can_respond_to_incidents': 'Can respond to security incidents',
            'can_generate_reports': 'Can generate security reports'
        }
        
        name = permission_names.get(codename, codename.replace('_', ' ').title())
        
        permission, created = Permission.objects.get_or_create(
            content_type=content_type,
            codename=codename,
            defaults={'name': name}
        )
        
        if created:
            self.stdout.write(
                f"  Created custom permission: {codename}"
            )
        
        return permission
    
    def create_sample_users(self):
        """Create sample security users for testing."""
        sample_users = [
            {
                'email': 'security.admin@example.com',
                'group': 'Security Admins',
                'is_staff': True,
                'is_superuser': True
            },
            {
                'email': 'security.analyst@example.com',
                'group': 'Security Analysts',
                'is_staff': True
            },
            {
                'email': 'security.auditor@example.com',
                'group': 'Security Auditors',
                'is_staff': True
            },
            {
                'email': 'security.operator@example.com',
                'group': 'Security Operators',
                'is_staff': True
            }
        ]
        
        self.stdout.write("\nCreating sample security users...")
        
        for user_data in sample_users:
            group_name = user_data.pop('group')
            
            # Create user if doesn't exist
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'is_staff': user_data.get('is_staff', False),
                    'is_superuser': user_data.get('is_superuser', False),
                    'role': user_data.get('role', 'student')
                }
            )
            
            if created:
                # Set password for new user
                user.set_password('SecurePass123!')
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created user: {user.email} (password: SecurePass123!)"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"User {user.email} already exists"
                    )
                )
            
            # Add user to group
            try:
                group = Group.objects.get(name=group_name)
                user.groups.add(group)
                self.stdout.write(
                    f"  Added {user.email} to {group_name}"
                )
            except Group.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f"Group {group_name} not found for user {user.email}"
                    )
                )
    
    def assign_user_to_admin_group(self, user_identifier):
        """Assign a specific user to the security admin group."""
        try:
            # Find user by email
            user = User.objects.get(email=user_identifier)
            
            # Get security admin group
            admin_group = Group.objects.get(name='Security Admins')
            
            # Add user to group
            user.groups.add(admin_group)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Added user {user.email} to Security Admins group"
                )
            )
            
        except User.DoesNotExist:
            raise CommandError(f"User '{user_identifier}' not found")
        except Group.DoesNotExist:
            raise CommandError("Security Admins group not found")
    
    def reset_security_groups(self):
        """Reset existing security groups."""
        security_group_names = [
            'Security Admins',
            'Security Analysts', 
            'Security Auditors',
            'Security Operators'
        ]
        
        self.stdout.write("Resetting existing security groups...")
        
        for group_name in security_group_names:
            try:
                group = Group.objects.get(name=group_name)
                group.delete()
                self.stdout.write(
                    self.style.WARNING(f"Deleted group: {group_name}")
                )
            except Group.DoesNotExist:
                pass
        
        # Delete custom security permissions
        try:
            security_content_type = ContentType.objects.get(app_label='security')
            custom_permissions = Permission.objects.filter(
                content_type=security_content_type,
                codename__startswith='can_'
            )
            deleted_count = custom_permissions.count()
            custom_permissions.delete()
            
            if deleted_count > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f"Deleted {deleted_count} custom security permissions"
                    )
                )
        except ContentType.DoesNotExist:
            pass
    
    def list_security_groups(self):
        """List existing security groups and their members."""
        security_group_names = [
            'Security Admins',
            'Security Analysts',
            'Security Auditors', 
            'Security Operators'
        ]
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("SECURITY GROUPS"))
        self.stdout.write("=" * 60)
        
        for group_name in security_group_names:
            try:
                group = Group.objects.get(name=group_name)
                members = group.custom_user_set.all()
                
                self.stdout.write(f"\n{group_name}:")
                self.stdout.write(f"  Permissions: {group.permissions.count()}")
                self.stdout.write(f"  Members: {members.count()}")
                
                if members.exists():
                    for user in members:
                        self.stdout.write(
                            f"    - {user.email}"
                        )
                else:
                    self.stdout.write("    - No members")
                
            except Group.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"\n{group_name}: Not found")
                )
        
        self.stdout.write("\n" + "=" * 60)
    
    def validate_permissions(self):
        """Validate that all required permissions exist."""
        required_permissions = [
            'add_securityevent', 'change_securityevent', 'delete_securityevent', 'view_securityevent',
            'add_usersession', 'change_usersession', 'delete_usersession', 'view_usersession',
            'add_failedloginattempt', 'change_failedloginattempt', 'delete_failedloginattempt', 'view_failedloginattempt',
            'add_securityconfiguration', 'change_securityconfiguration', 'delete_securityconfiguration', 'view_securityconfiguration',
            'add_auditlog', 'change_auditlog', 'delete_auditlog', 'view_auditlog',
        ]
        
        missing_permissions = []
        
        for perm_codename in required_permissions:
            if not Permission.objects.filter(codename=perm_codename).exists():
                missing_permissions.append(perm_codename)
        
        if missing_permissions:
            self.stdout.write(
                self.style.WARNING(
                    f"Missing permissions: {', '.join(missing_permissions)}"
                )
            )
            self.stdout.write(
                "Run 'python manage.py migrate' to create missing permissions"
            )
        else:
            self.stdout.write(
                self.style.SUCCESS("All required permissions exist")
            )
        
        return len(missing_permissions) == 0