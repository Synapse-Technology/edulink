# Edulink Automated Account Generation Guide

## Overview

This guide provides comprehensive documentation for the automated account generation system in Edulink, including the complete user workflow analysis and secure credential management.

## Table of Contents

1. [Project Workflow Analysis](#project-workflow-analysis)
2. [User Flow Documentation](#user-flow-documentation)
3. [Automated Script Usage](#automated-script-usage)
4. [Generated Accounts](#generated-accounts)
5. [Security Considerations](#security-considerations)
6. [Troubleshooting](#troubleshooting)

## Project Workflow Analysis

### Authentication System

Edulink uses a custom Django authentication system with the following components:

- **Custom User Model**: `authentication.models.User`
  - Uses email as the primary identifier (USERNAME_FIELD)
  - Supports multiple user roles via `users.roles.RoleChoices`
  - Includes phone number and national ID fields
  - Email verification system built-in

- **Role-Based Access Control**:
  - `STUDENT`: Default role for student users
  - `INSTITUTION_ADMIN`: Administrative users for educational institutions
  - `EMPLOYER`: Company representatives managing internships
  - `COMPANY_SUPERVISOR`: Supervisors within companies
  - `INSTITUTION_SUPERVISOR`: Academic supervisors
  - `SUPER_ADMIN`: System administrators

### Profile System

Each user role has an associated profile model:

1. **EmployerProfile** (`users.models.employer_profile.EmployerProfile`)
   - Extends `ProfileBase` with company-specific fields
   - Required fields: `company_name`, `first_name`, `last_name`, `phone_number`
   - Optional fields: `industry`, `location`, `company_size`, `website`, `department`, `position`
   - Verification system with `is_verified` flag

2. **InstitutionProfile** (`users.models.institution_profile.InstitutionProfile`)
   - Links to `Institution` model via OneToOneField
   - Required fields: `first_name`, `last_name`, `phone_number`, `institution`
   - Optional fields: `position`, `profile_picture`
   - Phone verification system

3. **Institution Model** (`institutions.models.Institution`)
   - Separate entity representing educational institutions
   - Auto-generates unique university codes
   - Links to master institution database
   - Required fields: `name`, `institution_type`, `email`

## User Flow Documentation

### Complete User Journey

#### 1. Account Registration
```
User Registration → Email Verification → Profile Creation → Role Assignment → Dashboard Access
```

#### 2. Employer Workflow
```
Employer Registration → Company Profile Setup → Internship Posting → Application Management → Student Selection → Supervision
```

#### 3. Institution Workflow
```
Institution Registration → Institution Setup → Student Management → Supervisor Assignment → Progress Monitoring → Evaluation
```

#### 4. Student Workflow
```
Student Registration → Profile Completion → Institution Linking → Internship Search → Application Submission → Placement → Progress Tracking
```

### Authentication Flow

1. **User Creation**: Email-based registration with secure password
2. **Email Verification**: Automated verification system
3. **Profile Linking**: Automatic profile creation based on user role
4. **Permission Assignment**: Role-based access control
5. **Dashboard Access**: Customized dashboard per user type

## Automated Script Usage

### Script Location
```
C:\Users\bouri\Documents\Projects\Edulink\Edulink\create_test_accounts.py
```

### Running the Script

```bash
# Navigate to the Edulink directory
cd C:\Users\bouri\Documents\Projects\Edulink\Edulink

# Run the automated account generation script
python create_test_accounts.py
```

### Script Features

- **Secure Password Generation**: 12-character passwords with mixed case, numbers, and symbols
- **Unique Phone Numbers**: Kenyan format (+254-7XX-XXXXXX)
- **National ID Generation**: 8-digit unique identifiers
- **Database Transactions**: Atomic operations to ensure data consistency
- **Error Handling**: Comprehensive error reporting and rollback
- **Credential Export**: Secure file generation with all login details

### Script Architecture

```python
SecureCredentialGenerator
├── generate_password()     # Secure password creation
├── generate_phone_number() # Kenyan phone format
└── generate_national_id()  # Unique ID generation

AccountCreator
├── create_employer_accounts()    # Employer + EmployerProfile creation
├── create_institution_accounts() # Institution + InstitutionProfile creation
├── generate_credentials_report() # Console output formatting
└── save_credentials_to_file()    # Secure file export
```

## Generated Accounts

### Employer Accounts (5 Created)

| Company | Industry | Location | Email | Role |
|---------|----------|----------|-------|------|
| TechCorp Kenya Ltd | Technology | Nairobi | employer1@techcorpkenya.co.ke | EMPLOYER |
| SafariBank Limited | Banking & Finance | Mombasa | employer2@safaribank.co.ke | EMPLOYER |
| GreenEnergy Solutions | Renewable Energy | Kisumu | employer3@greenenergysolutions.co.ke | EMPLOYER |
| MediCare Hospital Group | Healthcare | Eldoret | employer4@medicarehospital.co.ke | EMPLOYER |
| AgriTech Innovations | Agriculture Technology | Nakuru | employer5@agritechinnovations.co.ke | EMPLOYER |

### Institution Accounts (5 Created)

| Institution | Type | Location | Email | Role |
|-------------|------|----------|-------|------|
| Nairobi Technical Institute | Institute | Nairobi | admin@nairobitechnical.ac.ke | INSTITUTION_ADMIN |
| Mombasa Polytechnic College | Polytechnic | Mombasa | admin@mombasa.ac.ke | INSTITUTION_ADMIN |
| Kisumu University College | University | Kisumu | admin@kisumu.ac.ke | INSTITUTION_ADMIN |
| Eldoret Institute of Technology | Institute | Eldoret | admin@eldoretoftechnology.ac.ke | INSTITUTION_ADMIN |
| Nakuru TVET College | TVET Institution | Nakuru | admin@nakuru.ac.ke | INSTITUTION_ADMIN |

### Account Statistics

- **Total Accounts Created**: 10
- **Employer Accounts**: 5
- **Institution Accounts**: 5
- **Success Rate**: 100%
- **Database Verification**: ✅ Confirmed

## Security Considerations

### Password Security

- **Length**: 12 characters minimum
- **Complexity**: Mixed case letters, numbers, and special characters
- **Uniqueness**: Each password is cryptographically generated
- **Entropy**: High entropy using `secrets` module

### Data Protection

- **Credential Storage**: Temporary file with security warnings
- **Database Transactions**: Atomic operations prevent partial data
- **Error Handling**: Secure rollback on failures
- **Access Control**: Role-based permissions enforced

### Best Practices

1. **Immediate Password Change**: Users should change passwords on first login
2. **Secure File Handling**: Delete credential files after distribution
3. **Two-Factor Authentication**: Enable 2FA where available
4. **Regular Audits**: Monitor account usage and access patterns
5. **Principle of Least Privilege**: Assign minimal required permissions

## Credential File Format

The script generates a timestamped credential file:

```
test_accounts_credentials_YYYYMMDD_HHMMSS.txt
```

### File Contents

```
EDULINK TEST ACCOUNTS - SECURE CREDENTIALS
Generated: YYYY-MM-DD HH:MM:SS

EMPLOYER ACCOUNTS
--------------------------------------------------
1. Company Name
   Email: user@company.co.ke
   Password: SecurePassword123!
   Phone: +254-7XX-XXXXXX
   National ID: XXXXXXXX
   User ID: uuid-string

INSTITUTION ACCOUNTS
--------------------------------------------------
1. Institution Name
   Email: admin@institution.ac.ke
   Password: SecurePassword456@
   Phone: +254-7XX-XXXXXX
   National ID: XXXXXXXX
   User ID: uuid-string
   Institution ID: X
```

## Troubleshooting

### Common Issues

#### 1. Django Setup Errors
```bash
# Ensure Django environment is properly configured
export DJANGO_SETTINGS_MODULE=Edulink.settings.dev
```

#### 2. Database Connection Issues
```bash
# Check database connectivity
python manage.py check --database default
```

#### 3. Duplicate Email Errors
```bash
# Clear existing test accounts if needed
python manage.py shell
>>> from authentication.models import User
>>> User.objects.filter(email__contains='@techcorpkenya.co.ke').delete()
```

#### 4. Permission Errors
```bash
# Ensure proper file permissions for credential output
chmod 600 test_accounts_credentials_*.txt
```

### Verification Commands

```bash
# Check created accounts
python -c "import os; import django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev'); django.setup(); from authentication.models import User; print('Employers:', User.objects.filter(role='employer').count()); print('Institutions:', User.objects.filter(role='institution_admin').count())"

# Verify profiles
python manage.py shell
>>> from users.models.employer_profile import EmployerProfile
>>> from users.models.institution_profile import InstitutionProfile
>>> print(f"Employer Profiles: {EmployerProfile.objects.count()}")
>>> print(f"Institution Profiles: {InstitutionProfile.objects.count()}")
```

### Script Customization

To modify the script for different requirements:

1. **Change Account Count**: Modify the `count` parameter in main()
2. **Update Company Data**: Edit the `employer_data` list
3. **Modify Institution Data**: Edit the `institution_data` list
4. **Adjust Password Policy**: Update `SecureCredentialGenerator.generate_password()`
5. **Change File Output**: Modify `save_credentials_to_file()` method

## Integration with Existing Systems

### API Endpoints

The created accounts can be used with existing API endpoints:

- **Authentication**: `/api/auth/login/`
- **Profile Management**: `/api/users/profile/`
- **Dashboard Access**: `/api/dashboard/`
- **Internship Management**: `/api/internships/`

### Testing Workflows

Use the generated accounts to test:

1. **Login Flow**: Verify authentication works
2. **Profile Updates**: Test profile modification
3. **Role Permissions**: Confirm access control
4. **Dashboard Features**: Validate role-specific dashboards
5. **Internship Processes**: Test end-to-end workflows

## Maintenance

### Regular Tasks

1. **Credential Rotation**: Periodically update test account passwords
2. **Data Cleanup**: Remove unused test accounts
3. **Security Audits**: Review account access and permissions
4. **Script Updates**: Keep generation logic current with model changes

### Monitoring

- Monitor test account usage in application logs
- Track authentication attempts and failures
- Review profile completion rates
- Audit role-based access patterns

---

**Generated on**: 2025-09-08 09:26:39  
**Script Version**: 1.0  
**Total Accounts**: 10 (5 Employers + 5 Institutions)  
**Success Rate**: 100%  

**⚠️ Security Notice**: This documentation contains references to test accounts. Ensure proper security measures are in place before using in production environments.