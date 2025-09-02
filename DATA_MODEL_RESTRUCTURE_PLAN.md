# Data Model Restructuring Plan

## Current Issues Identified

### 1. Data Duplication Between Services
- **Auth Service User Model**: Contains authentication fields + some profile data (phone_number, national_id, role)
- **User Service User Model**: Contains full profile data + duplicated authentication fields
- **Result**: Data inconsistency, synchronization challenges, violation of single source of truth

### 2. Service Boundary Violations
- Auth service storing profile data (phone_number, national_id)
- User service duplicating authentication fields (password, login attempts)
- Mixed responsibilities leading to tight coupling

## Restructured Data Model Design

### Auth Service (Authentication Only)
```python
class AuthUser(AbstractBaseUser, PermissionsMixin, BaseModel):
    """Minimal authentication-only user model"""
    
    # Core Authentication Fields
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    
    # Email Verification
    is_email_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    
    # Security Fields
    failed_login_attempts = models.PositiveIntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(default=timezone.now)
    last_password_reset = models.DateTimeField(null=True, blank=True)
    
    # Two-Factor Authentication
    two_factor_enabled = models.BooleanField(default=False)
    backup_tokens = models.JSONField(default=list, blank=True)
    
    # Role-Based Access (Minimal)
    role = models.CharField(
        max_length=30,
        choices=RoleChoices.CHOICES,
        default=RoleChoices.STUDENT,
    )
    
    # Reference to User Service Profile
    user_profile_id = models.UUIDField(null=True, blank=True)
```

### User Service (Profile Management)
```python
class UserProfile(BaseModel):
    """Complete user profile model"""
    
    # Reference to Auth Service
    auth_user_id = models.UUIDField(unique=True, db_index=True)
    
    # Basic Information
    email = models.EmailField(unique=True)  # Synchronized from Auth
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    
    # Contact Information
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    national_id = models.CharField(max_length=20, blank=True, null=True)
    
    # Profile Information
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    
    # Preferences
    language = models.CharField(max_length=10, default='en')
    timezone = models.CharField(max_length=50, default='UTC')
    
    # Privacy Settings
    profile_visibility = models.CharField(
        max_length=20,
        default='PUBLIC',
        choices=[
            ('PUBLIC', 'Public'),
            ('INSTITUTION', 'Institution Only'),
            ('PRIVATE', 'Private'),
        ]
    )
    
    # Notification Preferences
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    push_notifications = models.BooleanField(default=True)
    
    # Status (Synchronized from Auth)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    role = models.CharField(max_length=30)  # Synchronized from Auth
    
    # Metadata
    last_ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
```

### Institution Service (Enhanced)
```python
class Institution(BaseModel):
    """Enhanced institution model with proper relationships"""
    
    # Basic Information
    name = models.CharField(max_length=255, unique=True)
    short_name = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    institution_type = models.CharField(max_length=50, choices=InstitutionType.choices)
    
    # Contact Information
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    
    # Address Information
    address = models.JSONField(default=dict)  # Structured address data
    
    # Registration & Legal
    registration_number = models.CharField(max_length=100, unique=True)
    tax_id = models.CharField(max_length=50, blank=True)
    accreditation_number = models.CharField(max_length=100, blank=True)
    
    # Status & Settings
    status = models.CharField(max_length=20, choices=InstitutionStatus.choices)
    is_verified = models.BooleanField(default=False)
    is_public = models.BooleanField(default=True)
    
    # Media
    logo = models.ImageField(upload_to='institutions/logos/', blank=True, null=True)
    banner_image = models.ImageField(upload_to='institutions/banners/', blank=True, null=True)
    
    # Metadata
    established_year = models.PositiveIntegerField(blank=True, null=True)
    student_count = models.PositiveIntegerField(default=0)
    faculty_count = models.PositiveIntegerField(default=0)
    
    # Settings
    settings = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

class InstitutionMembership(BaseModel):
    """Relationship between users and institutions"""
    
    user_profile_id = models.UUIDField(db_index=True)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    
    role = models.CharField(
        max_length=30,
        choices=[
            ('student', 'Student'),
            ('faculty', 'Faculty'),
            ('admin', 'Administrator'),
            ('staff', 'Staff'),
        ]
    )
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('pending', 'Pending'),
            ('suspended', 'Suspended'),
        ],
        default='pending'
    )
    
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user_profile_id', 'institution']
```

## Key Improvements

### 1. Clear Service Boundaries
- **Auth Service**: Only authentication, authorization, and security
- **User Service**: Complete profile management and user data
- **Institution Service**: Institution data and membership relationships

### 2. Data Synchronization Strategy
- Event-driven synchronization between Auth and User services
- Eventual consistency model with conflict resolution
- Bidirectional reference linking (auth_user_id ↔ user_profile_id)

### 3. Eliminated Duplication
- Single source of truth for each data domain
- Clear ownership of data fields
- Reduced data inconsistency risks

### 4. Enhanced Relationships
- Proper foreign key relationships within services
- Cross-service references via UUID fields
- Institution membership as separate entity

## Migration Strategy

### Phase 1: Create New Models
1. Create new AuthUser model in Auth Service
2. Create new UserProfile model in User Service
3. Create enhanced Institution models

### Phase 2: Data Migration
1. Migrate existing auth data to new AuthUser model
2. Migrate profile data to new UserProfile model
3. Establish cross-service references

### Phase 3: Implement Synchronization
1. Set up event-driven sync between services
2. Implement conflict resolution mechanisms
3. Add data validation and integrity checks

### Phase 4: Update Applications
1. Update all service endpoints
2. Modify authentication flows
3. Update frontend applications

### Phase 5: Cleanup
1. Remove old duplicate models
2. Clean up unused fields
3. Optimize database indexes

This restructuring will create a clean, maintainable microservice architecture with proper data boundaries and synchronization mechanisms.