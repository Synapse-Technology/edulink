# Database Schema Design for Edulink Microservices

## Overview
This document outlines the database schema design for migrating from separate databases to a single Supabase instance with separate schemas per microservice.

## Current State vs Target State

### Current State
- Each microservice has its own PostgreSQL database
- Separate connection strings and credentials per service
- Independent backup and monitoring per database

### Target State (Supabase Schema-based)
- Single Supabase PostgreSQL instance
- Separate schemas for logical isolation
- Centralized connection management
- Unified monitoring and backup

## Schema Design

### 1. Auth Service Schema (`auth_schema`)
```sql
CREATE SCHEMA IF NOT EXISTS auth_schema;

-- Tables:
-- auth_schema.users (core authentication)
-- auth_schema.user_sessions
-- auth_schema.password_reset_tokens
-- auth_schema.email_verification_tokens
-- auth_schema.oauth_providers
-- auth_schema.security_logs
```

### 2. User Service Schema (`user_schema`)
```sql
CREATE SCHEMA IF NOT EXISTS user_schema;

-- Tables:
-- user_schema.user_profiles
-- user_schema.academic_information
-- user_schema.contact_information
-- user_schema.preferences
-- user_schema.profile_history
```

### 3. Institution Service Schema (`institution_schema`)
```sql
CREATE SCHEMA IF NOT EXISTS institution_schema;

-- Tables:
-- institution_schema.institutions
-- institution_schema.departments
-- institution_schema.programs
-- institution_schema.registration_codes
-- institution_schema.institution_settings
```

### 4. Notification Service Schema (`notification_schema`)
```sql
CREATE SCHEMA IF NOT EXISTS notification_schema;

-- Tables:
-- notification_schema.notification_templates
-- notification_schema.notification_queue
-- notification_schema.notification_history
-- notification_schema.delivery_preferences
-- notification_schema.notification_channels
```

### 5. Application Service Schema (`application_schema`)
```sql
CREATE SCHEMA IF NOT EXISTS application_schema;

-- Tables:
-- application_schema.applications
-- application_schema.application_documents
-- application_schema.application_status_history
-- application_schema.application_reviews
```

### 6. Internship Service Schema (`internship_schema`)
```sql
CREATE SCHEMA IF NOT EXISTS internship_schema;

-- Tables:
-- internship_schema.internship_postings
-- internship_schema.internship_applications
-- internship_schema.internship_progress
-- internship_schema.internship_evaluations
```

## Cross-Schema Relationships

### Foreign Key Constraints Across Schemas
```sql
-- Example: User profile references auth user
ALTER TABLE user_schema.user_profiles 
ADD CONSTRAINT fk_user_auth 
FOREIGN KEY (auth_user_id) 
REFERENCES auth_schema.users(id);

-- Example: Application references user profile
ALTER TABLE application_schema.applications 
ADD CONSTRAINT fk_user_profile 
FOREIGN KEY (user_profile_id) 
REFERENCES user_schema.user_profiles(id);
```

## Security and Access Control

### Row Level Security (RLS)
```sql
-- Enable RLS on sensitive tables
ALTER TABLE auth_schema.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schema.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for service-specific access
CREATE POLICY auth_service_access ON auth_schema.users
FOR ALL TO auth_service_role;

CREATE POLICY user_service_access ON user_schema.user_profiles
FOR ALL TO user_service_role;
```

### Service-Specific Database Roles
```sql
-- Create roles for each service
CREATE ROLE auth_service_role;
CREATE ROLE user_service_role;
CREATE ROLE institution_service_role;
CREATE ROLE notification_service_role;
CREATE ROLE application_service_role;
CREATE ROLE internship_service_role;

-- Grant schema-specific permissions
GRANT USAGE ON SCHEMA auth_schema TO auth_service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth_schema TO auth_service_role;

GRANT USAGE ON SCHEMA user_schema TO user_service_role;
GRANT ALL ON ALL TABLES IN SCHEMA user_schema TO user_service_role;

-- Grant read-only cross-schema access where needed
GRANT SELECT ON auth_schema.users TO user_service_role;
GRANT SELECT ON user_schema.user_profiles TO application_service_role;
```

## Migration Strategy

### Phase 1: Schema Creation
1. Create all schemas in Supabase
2. Set up service-specific roles and permissions
3. Create initial tables with proper constraints

### Phase 2: Data Migration
1. Export data from existing databases
2. Transform data to fit new schema structure
3. Import data into respective schemas
4. Validate data integrity

### Phase 3: Application Updates
1. Update connection strings to use single Supabase instance
2. Update Django settings to use schema-specific database routing
3. Update ORM queries to include schema prefixes where necessary
4. Test cross-service data access patterns

### Phase 4: Monitoring and Optimization
1. Set up schema-level monitoring
2. Optimize queries and indexes
3. Fine-tune connection pooling
4. Implement backup and recovery procedures

## Connection Management

### Supabase Connection Configuration
```python
# shared/database/config.py
SUPABASE_CONFIG = {
    'HOST': 'your-project.supabase.co',
    'PORT': 5432,
    'NAME': 'postgres',
    'USER': 'postgres',
    'PASSWORD': 'your-password',
    'OPTIONS': {
        'sslmode': 'require',
        'search_path': 'auth_schema,public',  # Service-specific
    }
}
```

### Service-Specific Database Routing
```python
# Each service will have its own database router
class AuthServiceDatabaseRouter:
    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'authentication':
            return 'auth_db'
        return None
    
    def db_for_write(self, model, **hints):
        if model._meta.app_label == 'authentication':
            return 'auth_db'
        return None
```

## Benefits of This Approach

1. **Operational Simplicity**: Single database instance to manage
2. **Cost Efficiency**: Reduced infrastructure overhead
3. **Data Consistency**: Easier to maintain referential integrity
4. **Backup Strategy**: Unified backup and recovery
5. **Monitoring**: Centralized database monitoring
6. **Security**: Fine-grained access control with RLS
7. **Scalability**: Leverage Supabase's built-in scaling

## Considerations and Trade-offs

### Pros:
- Simplified operations and maintenance
- Better resource utilization
- Easier cross-service queries when needed
- Centralized security and compliance

### Cons:
- Potential single point of failure
- Schema changes require coordination
- Possible performance bottlenecks under high load
- Less isolation compared to separate databases

## Next Steps

1. Review and approve this schema design
2. Set up Supabase project and configure schemas
3. Create migration scripts for data transfer
4. Update microservice configurations
5. Implement monitoring and alerting
6. Plan rollback strategy in case of issues