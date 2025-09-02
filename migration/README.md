# Data Migration Strategy

This document outlines the comprehensive strategy for migrating authentication and user management data from the monolithic Edulink application to the new microservices architecture.

## Overview

The migration involves separating user-related data from the monolith into two dedicated microservices:
- **Authentication Service**: Handles login credentials, sessions, and security
- **User Service**: Manages user profiles, roles, and relationships

## Migration Phases

### Phase 1: Preparation and Analysis
- [ ] Analyze existing data structure
- [ ] Identify data dependencies
- [ ] Create migration scripts
- [ ] Set up testing environment
- [ ] Validate data integrity

### Phase 2: Schema Migration
- [ ] Create new database schemas
- [ ] Set up replication
- [ ] Migrate authentication data
- [ ] Migrate user profile data
- [ ] Validate data consistency

### Phase 3: Service Integration
- [ ] Deploy microservices
- [ ] Configure service communication
- [ ] Update application endpoints
- [ ] Test end-to-end functionality
- [ ] Monitor performance

### Phase 4: Cleanup and Optimization
- [ ] Remove legacy code
- [ ] Optimize database performance
- [ ] Update documentation
- [ ] Train development team
- [ ] Monitor production metrics

## Data Mapping

### Authentication Service Data

```sql
-- Source: monolith.auth_user
-- Target: auth_service.users
CREATE TABLE auth_service.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Source: monolith.django_session
-- Target: Redis (handled by session manager)
-- No direct SQL migration needed

-- Source: monolith.auth_group, auth_permission
-- Target: auth_service.permissions
CREATE TABLE auth_service.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    codename VARCHAR(100) NOT NULL,
    content_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_service.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth_service.users(id),
    permission_id UUID REFERENCES auth_service.permissions(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES auth_service.users(id)
);
```

### User Service Data

```sql
-- Source: monolith.users_profile
-- Target: user_service.profiles
CREATE TABLE user_service.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth_service.users(id)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    bio TEXT,
    avatar_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    website_url VARCHAR(500),
    profile_type VARCHAR(20) NOT NULL, -- student, company, institution
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Source: monolith.users_role
-- Target: user_service.roles
CREATE TABLE user_service.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_type VARCHAR(50) NOT NULL, -- student, company_admin, institution_admin, etc.
    institution_id UUID,
    company_id UUID,
    permissions JSONB,
    is_active BOOLEAN DEFAULT true,
    granted_by UUID,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Source: monolith.students
-- Target: user_service.student_profiles
CREATE TABLE user_service.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    student_id VARCHAR(50) UNIQUE,
    institution_id UUID,
    program VARCHAR(200),
    year_of_study INTEGER,
    gpa DECIMAL(3,2),
    graduation_date DATE,
    skills JSONB,
    interests JSONB,
    resume_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    is_seeking_internship BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Source: monolith.companies
-- Target: user_service.company_profiles
CREATE TABLE user_service.company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    description TEXT,
    website_url VARCHAR(500),
    logo_url VARCHAR(500),
    headquarters VARCHAR(200),
    founded_year INTEGER,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Scripts

### 1. Data Export Script

```python
# migration/scripts/export_data.py
import os
import json
import psycopg2
from datetime import datetime
from typing import Dict, List, Any

class DataExporter:
    def __init__(self, source_db_url: str, output_dir: str):
        self.source_db_url = source_db_url
        self.output_dir = output_dir
        self.conn = psycopg2.connect(source_db_url)
        
    def export_auth_data(self) -> Dict[str, Any]:
        """Export authentication-related data from monolith"""
        cursor = self.conn.cursor()
        
        # Export users
        cursor.execute("""
            SELECT id, username, email, password, is_active, is_staff, is_superuser,
                   last_login, date_joined, first_name, last_name
            FROM auth_user
            ORDER BY id
        """)
        users = cursor.fetchall()
        
        # Export user permissions
        cursor.execute("""
            SELECT u.id as user_id, p.name, p.codename, p.content_type_id
            FROM auth_user u
            JOIN auth_user_user_permissions uup ON u.id = uup.user_id
            JOIN auth_permission p ON uup.permission_id = p.id
            ORDER BY u.id
        """)
        permissions = cursor.fetchall()
        
        # Export groups
        cursor.execute("""
            SELECT u.id as user_id, g.name as group_name
            FROM auth_user u
            JOIN auth_user_groups ug ON u.id = ug.user_id
            JOIN auth_group g ON ug.group_id = g.id
            ORDER BY u.id
        """)
        groups = cursor.fetchall()
        
        return {
            'users': users,
            'permissions': permissions,
            'groups': groups,
            'exported_at': datetime.now().isoformat()
        }
    
    def export_user_data(self) -> Dict[str, Any]:
        """Export user profile and role data from monolith"""
        cursor = self.conn.cursor()
        
        # Export user profiles
        cursor.execute("""
            SELECT user_id, first_name, last_name, phone, date_of_birth,
                   gender, address, city, country, postal_code, bio,
                   avatar_url, linkedin_url, github_url, website_url,
                   profile_type, is_public, created_at, updated_at
            FROM users_profile
            ORDER BY user_id
        """)
        profiles = cursor.fetchall()
        
        # Export student profiles
        cursor.execute("""
            SELECT user_id, student_id, institution_id, program, year_of_study,
                   gpa, graduation_date, skills, interests, resume_url,
                   portfolio_url, is_seeking_internship, created_at, updated_at
            FROM students
            ORDER BY user_id
        """)
        students = cursor.fetchall()
        
        # Export company profiles
        cursor.execute("""
            SELECT user_id, company_name, industry, company_size, description,
                   website_url, logo_url, headquarters, founded_year,
                   is_verified, created_at, updated_at
            FROM companies
            ORDER BY user_id
        """)
        companies = cursor.fetchall()
        
        # Export roles
        cursor.execute("""
            SELECT user_id, role_type, institution_id, company_id, permissions,
                   is_active, granted_by, granted_at, expires_at,
                   created_at, updated_at
            FROM users_role
            ORDER BY user_id
        """)
        roles = cursor.fetchall()
        
        return {
            'profiles': profiles,
            'students': students,
            'companies': companies,
            'roles': roles,
            'exported_at': datetime.now().isoformat()
        }
    
    def save_to_file(self, data: Dict[str, Any], filename: str):
        """Save data to JSON file"""
        os.makedirs(self.output_dir, exist_ok=True)
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        
        print(f"Data exported to {filepath}")
    
    def export_all(self):
        """Export all data"""
        print("Starting data export...")
        
        # Export authentication data
        auth_data = self.export_auth_data()
        self.save_to_file(auth_data, 'auth_data.json')
        
        # Export user data
        user_data = self.export_user_data()
        self.save_to_file(user_data, 'user_data.json')
        
        print("Data export completed successfully!")
    
    def __del__(self):
        if hasattr(self, 'conn'):
            self.conn.close()

if __name__ == '__main__':
    exporter = DataExporter(
        source_db_url=os.getenv('SOURCE_DB_URL'),
        output_dir='./migration_data'
    )
    exporter.export_all()
```

### 2. Data Import Script

```python
# migration/scripts/import_data.py
import os
import json
import psycopg2
import uuid
from datetime import datetime
from typing import Dict, List, Any

class DataImporter:
    def __init__(self, auth_db_url: str, user_db_url: str, data_dir: str):
        self.auth_db_url = auth_db_url
        self.user_db_url = user_db_url
        self.data_dir = data_dir
        self.auth_conn = psycopg2.connect(auth_db_url)
        self.user_conn = psycopg2.connect(user_db_url)
        self.user_id_mapping = {}  # old_id -> new_uuid
    
    def load_data(self, filename: str) -> Dict[str, Any]:
        """Load data from JSON file"""
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, 'r') as f:
            return json.load(f)
    
    def import_auth_data(self):
        """Import authentication data to auth service"""
        print("Importing authentication data...")
        
        auth_data = self.load_data('auth_data.json')
        cursor = self.auth_conn.cursor()
        
        # Import users
        for user in auth_data['users']:
            old_id, username, email, password, is_active, is_staff, is_superuser, \
            last_login, date_joined, first_name, last_name = user
            
            new_id = str(uuid.uuid4())
            self.user_id_mapping[old_id] = new_id
            
            cursor.execute("""
                INSERT INTO users (id, username, email, password_hash, is_active,
                                 is_verified, last_login, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                new_id, username, email, password, is_active,
                not is_superuser,  # Regular users are verified, superusers need manual verification
                last_login, date_joined, date_joined
            ))
        
        # Import permissions
        permission_mapping = {}
        for perm in auth_data['permissions']:
            user_id, name, codename, content_type_id = perm
            
            # Create permission if not exists
            perm_key = f"{codename}_{content_type_id}"
            if perm_key not in permission_mapping:
                perm_id = str(uuid.uuid4())
                permission_mapping[perm_key] = perm_id
                
                cursor.execute("""
                    INSERT INTO permissions (id, name, codename, content_type)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (codename, content_type) DO NOTHING
                """, (perm_id, name, codename, f"content_type_{content_type_id}"))
            
            # Assign permission to user
            if user_id in self.user_id_mapping:
                cursor.execute("""
                    INSERT INTO user_permissions (id, user_id, permission_id)
                    VALUES (%s, %s, %s)
                """, (
                    str(uuid.uuid4()),
                    self.user_id_mapping[user_id],
                    permission_mapping[perm_key]
                ))
        
        self.auth_conn.commit()
        print(f"Imported {len(auth_data['users'])} users and {len(auth_data['permissions'])} permissions")
    
    def import_user_data(self):
        """Import user profile data to user service"""
        print("Importing user profile data...")
        
        user_data = self.load_data('user_data.json')
        cursor = self.user_conn.cursor()
        
        # Import profiles
        for profile in user_data['profiles']:
            user_id, first_name, last_name, phone, date_of_birth, gender, \
            address, city, country, postal_code, bio, avatar_url, linkedin_url, \
            github_url, website_url, profile_type, is_public, created_at, updated_at = profile
            
            if user_id in self.user_id_mapping:
                cursor.execute("""
                    INSERT INTO profiles (id, user_id, first_name, last_name, phone,
                                        date_of_birth, gender, address, city, country,
                                        postal_code, bio, avatar_url, linkedin_url,
                                        github_url, website_url, profile_type, is_public,
                                        created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    str(uuid.uuid4()), self.user_id_mapping[user_id],
                    first_name, last_name, phone, date_of_birth, gender,
                    address, city, country, postal_code, bio, avatar_url,
                    linkedin_url, github_url, website_url, profile_type,
                    is_public, created_at, updated_at
                ))
        
        # Import student profiles
        for student in user_data['students']:
            user_id, student_id, institution_id, program, year_of_study, gpa, \
            graduation_date, skills, interests, resume_url, portfolio_url, \
            is_seeking_internship, created_at, updated_at = student
            
            if user_id in self.user_id_mapping:
                cursor.execute("""
                    INSERT INTO student_profiles (id, user_id, student_id, institution_id,
                                                 program, year_of_study, gpa, graduation_date,
                                                 skills, interests, resume_url, portfolio_url,
                                                 is_seeking_internship, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    str(uuid.uuid4()), self.user_id_mapping[user_id],
                    student_id, institution_id, program, year_of_study, gpa,
                    graduation_date, json.dumps(skills), json.dumps(interests),
                    resume_url, portfolio_url, is_seeking_internship,
                    created_at, updated_at
                ))
        
        # Import company profiles
        for company in user_data['companies']:
            user_id, company_name, industry, company_size, description, \
            website_url, logo_url, headquarters, founded_year, is_verified, \
            created_at, updated_at = company
            
            if user_id in self.user_id_mapping:
                cursor.execute("""
                    INSERT INTO company_profiles (id, user_id, company_name, industry,
                                                 company_size, description, website_url,
                                                 logo_url, headquarters, founded_year,
                                                 is_verified, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    str(uuid.uuid4()), self.user_id_mapping[user_id],
                    company_name, industry, company_size, description,
                    website_url, logo_url, headquarters, founded_year,
                    is_verified, created_at, updated_at
                ))
        
        # Import roles
        for role in user_data['roles']:
            user_id, role_type, institution_id, company_id, permissions, \
            is_active, granted_by, granted_at, expires_at, created_at, updated_at = role
            
            if user_id in self.user_id_mapping:
                granted_by_uuid = self.user_id_mapping.get(granted_by) if granted_by else None
                
                cursor.execute("""
                    INSERT INTO roles (id, user_id, role_type, institution_id, company_id,
                                     permissions, is_active, granted_by, granted_at,
                                     expires_at, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    str(uuid.uuid4()), self.user_id_mapping[user_id],
                    role_type, institution_id, company_id,
                    json.dumps(permissions), is_active, granted_by_uuid,
                    granted_at, expires_at, created_at, updated_at
                ))
        
        self.user_conn.commit()
        print(f"Imported {len(user_data['profiles'])} profiles, {len(user_data['students'])} students, {len(user_data['companies'])} companies, {len(user_data['roles'])} roles")
    
    def import_all(self):
        """Import all data"""
        print("Starting data import...")
        
        try:
            self.import_auth_data()
            self.import_user_data()
            print("Data import completed successfully!")
            
            # Save user ID mapping for reference
            with open(os.path.join(self.data_dir, 'user_id_mapping.json'), 'w') as f:
                json.dump(self.user_id_mapping, f, indent=2)
            
        except Exception as e:
            print(f"Error during import: {e}")
            self.auth_conn.rollback()
            self.user_conn.rollback()
            raise
    
    def __del__(self):
        if hasattr(self, 'auth_conn'):
            self.auth_conn.close()
        if hasattr(self, 'user_conn'):
            self.user_conn.close()

if __name__ == '__main__':
    importer = DataImporter(
        auth_db_url=os.getenv('AUTH_DB_URL'),
        user_db_url=os.getenv('USER_DB_URL'),
        data_dir='./migration_data'
    )
    importer.import_all()
```

### 3. Data Validation Script

```python
# migration/scripts/validate_migration.py
import os
import json
import psycopg2
from typing import Dict, List, Tuple

class MigrationValidator:
    def __init__(self, source_db_url: str, auth_db_url: str, user_db_url: str, data_dir: str):
        self.source_db_url = source_db_url
        self.auth_db_url = auth_db_url
        self.user_db_url = user_db_url
        self.data_dir = data_dir
        
        self.source_conn = psycopg2.connect(source_db_url)
        self.auth_conn = psycopg2.connect(auth_db_url)
        self.user_conn = psycopg2.connect(user_db_url)
        
        # Load user ID mapping
        with open(os.path.join(data_dir, 'user_id_mapping.json'), 'r') as f:
            self.user_id_mapping = json.load(f)
    
    def validate_user_counts(self) -> bool:
        """Validate that user counts match between source and target"""
        print("Validating user counts...")
        
        # Count users in source
        source_cursor = self.source_conn.cursor()
        source_cursor.execute("SELECT COUNT(*) FROM auth_user")
        source_count = source_cursor.fetchone()[0]
        
        # Count users in auth service
        auth_cursor = self.auth_conn.cursor()
        auth_cursor.execute("SELECT COUNT(*) FROM users")
        auth_count = auth_cursor.fetchone()[0]
        
        print(f"Source users: {source_count}, Auth service users: {auth_count}")
        
        if source_count != auth_count:
            print("❌ User count mismatch!")
            return False
        
        print("✅ User counts match")
        return True
    
    def validate_profile_counts(self) -> bool:
        """Validate that profile counts match"""
        print("Validating profile counts...")
        
        # Count profiles in source
        source_cursor = self.source_conn.cursor()
        source_cursor.execute("SELECT COUNT(*) FROM users_profile")
        source_count = source_cursor.fetchone()[0]
        
        # Count profiles in user service
        user_cursor = self.user_conn.cursor()
        user_cursor.execute("SELECT COUNT(*) FROM profiles")
        user_count = user_cursor.fetchone()[0]
        
        print(f"Source profiles: {source_count}, User service profiles: {user_count}")
        
        if source_count != user_count:
            print("❌ Profile count mismatch!")
            return False
        
        print("✅ Profile counts match")
        return True
    
    def validate_data_integrity(self) -> bool:
        """Validate data integrity by sampling records"""
        print("Validating data integrity...")
        
        # Sample 10 users for detailed validation
        source_cursor = self.source_conn.cursor()
        source_cursor.execute("""
            SELECT id, username, email, first_name, last_name
            FROM auth_user
            ORDER BY RANDOM()
            LIMIT 10
        """)
        sample_users = source_cursor.fetchall()
        
        auth_cursor = self.auth_conn.cursor()
        user_cursor = self.user_conn.cursor()
        
        for old_id, username, email, first_name, last_name in sample_users:
            new_id = self.user_id_mapping.get(str(old_id))
            if not new_id:
                print(f"❌ Missing user mapping for ID {old_id}")
                return False
            
            # Check auth service data
            auth_cursor.execute(
                "SELECT username, email FROM users WHERE id = %s",
                (new_id,)
            )
            auth_result = auth_cursor.fetchone()
            
            if not auth_result or auth_result[0] != username or auth_result[1] != email:
                print(f"❌ Auth data mismatch for user {username}")
                return False
            
            # Check user service data
            user_cursor.execute(
                "SELECT first_name, last_name FROM profiles WHERE user_id = %s",
                (new_id,)
            )
            user_result = user_cursor.fetchone()
            
            if user_result and (user_result[0] != first_name or user_result[1] != last_name):
                print(f"❌ Profile data mismatch for user {username}")
                return False
        
        print("✅ Data integrity validation passed")
        return True
    
    def validate_foreign_keys(self) -> bool:
        """Validate that foreign key relationships are maintained"""
        print("Validating foreign key relationships...")
        
        user_cursor = self.user_conn.cursor()
        
        # Check that all profiles have valid user_ids
        user_cursor.execute("""
            SELECT COUNT(*) FROM profiles p
            WHERE NOT EXISTS (
                SELECT 1 FROM users u WHERE u.id = p.user_id
            )
        """)
        orphaned_profiles = user_cursor.fetchone()[0]
        
        if orphaned_profiles > 0:
            print(f"❌ Found {orphaned_profiles} orphaned profiles")
            return False
        
        # Check that all roles have valid user_ids
        user_cursor.execute("""
            SELECT COUNT(*) FROM roles r
            WHERE NOT EXISTS (
                SELECT 1 FROM users u WHERE u.id = r.user_id
            )
        """)
        orphaned_roles = user_cursor.fetchone()[0]
        
        if orphaned_roles > 0:
            print(f"❌ Found {orphaned_roles} orphaned roles")
            return False
        
        print("✅ Foreign key validation passed")
        return True
    
    def generate_migration_report(self) -> Dict[str, any]:
        """Generate comprehensive migration report"""
        print("Generating migration report...")
        
        report = {
            'migration_date': datetime.now().isoformat(),
            'validation_results': {},
            'statistics': {},
            'issues': []
        }
        
        # Run all validations
        validations = [
            ('user_counts', self.validate_user_counts),
            ('profile_counts', self.validate_profile_counts),
            ('data_integrity', self.validate_data_integrity),
            ('foreign_keys', self.validate_foreign_keys)
        ]
        
        all_passed = True
        for name, validation_func in validations:
            try:
                result = validation_func()
                report['validation_results'][name] = result
                if not result:
                    all_passed = False
            except Exception as e:
                report['validation_results'][name] = False
                report['issues'].append(f"Validation {name} failed: {str(e)}")
                all_passed = False
        
        # Collect statistics
        try:
            auth_cursor = self.auth_conn.cursor()
            user_cursor = self.user_conn.cursor()
            
            auth_cursor.execute("SELECT COUNT(*) FROM users")
            report['statistics']['total_users'] = auth_cursor.fetchone()[0]
            
            user_cursor.execute("SELECT COUNT(*) FROM profiles")
            report['statistics']['total_profiles'] = user_cursor.fetchone()[0]
            
            user_cursor.execute("SELECT COUNT(*) FROM student_profiles")
            report['statistics']['student_profiles'] = user_cursor.fetchone()[0]
            
            user_cursor.execute("SELECT COUNT(*) FROM company_profiles")
            report['statistics']['company_profiles'] = user_cursor.fetchone()[0]
            
            user_cursor.execute("SELECT COUNT(*) FROM roles")
            report['statistics']['total_roles'] = user_cursor.fetchone()[0]
            
        except Exception as e:
            report['issues'].append(f"Statistics collection failed: {str(e)}")
        
        report['overall_success'] = all_passed
        
        # Save report
        report_path = os.path.join(self.data_dir, 'migration_report.json')
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"Migration report saved to {report_path}")
        
        if all_passed:
            print("🎉 Migration validation completed successfully!")
        else:
            print("⚠️ Migration validation found issues. Please review the report.")
        
        return report
    
    def __del__(self):
        for conn in [self.source_conn, self.auth_conn, self.user_conn]:
            if conn:
                conn.close()

if __name__ == '__main__':
    validator = MigrationValidator(
        source_db_url=os.getenv('SOURCE_DB_URL'),
        auth_db_url=os.getenv('AUTH_DB_URL'),
        user_db_url=os.getenv('USER_DB_URL'),
        data_dir='./migration_data'
    )
    validator.generate_migration_report()
```

## Rollback Strategy

### 1. Database Snapshots

Before starting migration:
```bash
# Create database snapshots
pg_dump $SOURCE_DB_URL > backup/monolith_pre_migration.sql
pg_dump $AUTH_DB_URL > backup/auth_service_pre_migration.sql
pg_dump $USER_DB_URL > backup/user_service_pre_migration.sql
```

### 2. Rollback Script

```python
# migration/scripts/rollback.py
import os
import subprocess
from datetime import datetime

class MigrationRollback:
    def __init__(self, backup_dir: str):
        self.backup_dir = backup_dir
    
    def rollback_databases(self):
        """Restore databases from backup"""
        print("Starting database rollback...")
        
        databases = [
            ('AUTH_DB_URL', 'auth_service_pre_migration.sql'),
            ('USER_DB_URL', 'user_service_pre_migration.sql')
        ]
        
        for env_var, backup_file in databases:
            db_url = os.getenv(env_var)
            backup_path = os.path.join(self.backup_dir, backup_file)
            
            if os.path.exists(backup_path):
                print(f"Restoring {env_var} from {backup_file}...")
                subprocess.run([
                    'psql', db_url, '-f', backup_path
                ], check=True)
                print(f"✅ {env_var} restored successfully")
            else:
                print(f"❌ Backup file {backup_file} not found")
    
    def cleanup_migration_data(self):
        """Clean up migration artifacts"""
        print("Cleaning up migration data...")
        
        # Remove migration data files
        migration_files = [
            'auth_data.json',
            'user_data.json',
            'user_id_mapping.json',
            'migration_report.json'
        ]
        
        for file in migration_files:
            file_path = os.path.join(self.backup_dir, '..', 'migration_data', file)
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"Removed {file}")
    
    def execute_rollback(self):
        """Execute complete rollback"""
        try:
            self.rollback_databases()
            self.cleanup_migration_data()
            print("🔄 Rollback completed successfully")
        except Exception as e:
            print(f"❌ Rollback failed: {e}")
            raise

if __name__ == '__main__':
    rollback = MigrationRollback('./backup')
    rollback.execute_rollback()
```

## Testing Strategy

### 1. Unit Tests

```python
# migration/tests/test_migration.py
import unittest
from unittest.mock import Mock, patch
from migration.scripts.export_data import DataExporter
from migration.scripts.import_data import DataImporter

class TestDataMigration(unittest.TestCase):
    
    def setUp(self):
        self.mock_conn = Mock()
        self.mock_cursor = Mock()
        self.mock_conn.cursor.return_value = self.mock_cursor
    
    @patch('psycopg2.connect')
    def test_export_auth_data(self, mock_connect):
        mock_connect.return_value = self.mock_conn
        
        # Mock database responses
        self.mock_cursor.fetchall.side_effect = [
            [(1, 'user1', 'user1@example.com', 'hash1', True, False, False, None, '2023-01-01', 'John', 'Doe')],
            [(1, 'permission1', 'code1', 1)],
            [(1, 'group1')]
        ]
        
        exporter = DataExporter('test_url', './test_output')
        result = exporter.export_auth_data()
        
        self.assertIn('users', result)
        self.assertIn('permissions', result)
        self.assertIn('groups', result)
        self.assertEqual(len(result['users']), 1)
    
    def test_user_id_mapping(self):
        importer = DataImporter('auth_url', 'user_url', './test_data')
        
        # Test that old IDs are properly mapped to new UUIDs
        old_id = 123
        new_id = 'uuid-string'
        importer.user_id_mapping[old_id] = new_id
        
        self.assertEqual(importer.user_id_mapping[old_id], new_id)

if __name__ == '__main__':
    unittest.main()
```

### 2. Integration Tests

```python
# migration/tests/test_integration.py
import os
import tempfile
import unittest
from migration.scripts.validate_migration import MigrationValidator

class TestMigrationIntegration(unittest.TestCase):
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        
        # Create test databases (using SQLite for testing)
        self.source_db = os.path.join(self.temp_dir, 'source.db')
        self.auth_db = os.path.join(self.temp_dir, 'auth.db')
        self.user_db = os.path.join(self.temp_dir, 'user.db')
    
    def test_end_to_end_migration(self):
        """Test complete migration process"""
        # 1. Set up test data in source database
        # 2. Run export
        # 3. Run import
        # 4. Validate results
        
        # This would be a comprehensive test of the entire migration process
        pass
    
    def tearDown(self):
        # Clean up temporary files
        import shutil
        shutil.rmtree(self.temp_dir)
```

## Monitoring and Alerts

### 1. Migration Monitoring

```python
# migration/monitoring/migration_monitor.py
import time
import psutil
import logging
from datetime import datetime
from typing import Dict, Any

class MigrationMonitor:
    def __init__(self, log_file: str = 'migration.log'):
        logging.basicConfig(
            filename=log_file,
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        self.start_time = None
    
    def start_monitoring(self):
        """Start monitoring migration process"""
        self.start_time = datetime.now()
        self.logger.info("Migration monitoring started")
    
    def log_progress(self, step: str, progress: float, details: Dict[str, Any] = None):
        """Log migration progress"""
        elapsed = datetime.now() - self.start_time if self.start_time else None
        
        message = f"Step: {step}, Progress: {progress:.2%}"
        if elapsed:
            message += f", Elapsed: {elapsed}"
        if details:
            message += f", Details: {details}"
        
        self.logger.info(message)
        print(message)
    
    def log_system_metrics(self):
        """Log system resource usage"""
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        metrics = {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_available_gb': memory.available / (1024**3),
            'disk_percent': disk.percent,
            'disk_free_gb': disk.free / (1024**3)
        }
        
        self.logger.info(f"System metrics: {metrics}")
        return metrics
    
    def check_thresholds(self, metrics: Dict[str, float]):
        """Check if system metrics exceed thresholds"""
        thresholds = {
            'cpu_percent': 80,
            'memory_percent': 85,
            'disk_percent': 90
        }
        
        alerts = []
        for metric, value in metrics.items():
            if metric in thresholds and value > thresholds[metric]:
                alert = f"HIGH {metric.upper()}: {value}% (threshold: {thresholds[metric]}%)"
                alerts.append(alert)
                self.logger.warning(alert)
        
        return alerts
```

## Post-Migration Tasks

### 1. Performance Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_email ON auth_service.users(email);
CREATE INDEX CONCURRENTLY idx_users_username ON auth_service.users(username);
CREATE INDEX CONCURRENTLY idx_profiles_user_id ON user_service.profiles(user_id);
CREATE INDEX CONCURRENTLY idx_roles_user_id ON user_service.roles(user_id);
CREATE INDEX CONCURRENTLY idx_roles_active ON user_service.roles(is_active) WHERE is_active = true;

-- Update table statistics
ANALYZE auth_service.users;
ANALYZE user_service.profiles;
ANALYZE user_service.roles;
```

### 2. Data Cleanup

```python
# migration/scripts/cleanup.py
def cleanup_legacy_data():
    """Clean up legacy data after successful migration"""
    
    # Archive old session data
    # Remove temporary migration files
    # Update application configuration
    # Clear caches
    
    pass
```

## Documentation Updates

After migration completion:

1. Update API documentation
2. Update database schema documentation
3. Update deployment guides
4. Create migration runbook
5. Update monitoring dashboards
6. Train development team on new architecture

## Success Criteria

- [ ] All user data successfully migrated
- [ ] Zero data loss
- [ ] All authentication flows working
- [ ] Performance meets or exceeds baseline
- [ ] All tests passing
- [ ] Monitoring and alerting functional
- [ ] Team trained on new system
- [ ] Documentation updated
- [ ] Rollback plan tested and ready