# Edulink Microservices Database Architecture

This directory contains the centralized database management system for the Edulink microservices architecture, designed to work with a single Supabase instance using separate schemas for each microservice.

## Architecture Overview

The database architecture follows a **schema-per-service** pattern within a single database instance. This approach provides:

- **Service Isolation**: Each microservice has its own schema with dedicated tables
- **Centralized Management**: Single database instance for easier administration
- **Cross-Service Communication**: Secure, controlled access patterns between services
- **Scalability**: Connection pooling and performance monitoring
- **Reliability**: Automated backups and disaster recovery
- **Database Flexibility**: Support for both PostgreSQL (recommended) and SQL Server

## Directory Structure

```
microservices/shared/database/
├── __init__.py                    # Package initialization
├── config.py                      # Database configuration management
├── connection_manager.py          # Connection pooling and management
├── migrations.py                  # Database migration system
├── postgresql_schema_setup.sql    # PostgreSQL schema and role setup
├── sqlserver_schema_setup.sql     # SQL Server schema and role setup
├── django_settings.py             # Django integration utilities
├── cross_schema_access.py         # Cross-service data access patterns
├── monitoring.py                  # Performance monitoring and metrics
├── backup.py                      # Backup and disaster recovery
├── DATABASE_COMPATIBILITY.md      # Database compatibility guide
└── README.md                      # This documentation
```

## Database Schemas

The system uses the following schemas for each microservice:

| Service | Schema Name | Purpose |
|---------|-------------|----------|
| Authentication | `auth_schema` | User authentication, sessions, permissions |
| User Management | `user_schema` | User profiles, preferences, academic info |
| Institution | `institution_schema` | Educational institutions, programs |
| Notification | `notification_schema` | Notifications, preferences, templates |
| Application | `application_schema` | Student applications, workflows |
| Internship | `internship_schema` | Internship opportunities, placements |

## Quick Start

### 1. Environment Setup

Create a `.env` file with your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Connection
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
DATABASE_HOST=db.your-project.supabase.co
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password

# Connection Pool Settings
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
DATABASE_POOL_TIMEOUT=30
```

### 2. Initial Database Setup

Choose the appropriate schema setup script based on your database system:

#### For PostgreSQL/Supabase (Recommended)
```sql
-- Execute postgresql_schema_setup.sql in your Supabase SQL editor or PostgreSQL client
-- This creates all schemas, roles, and permissions with PostgreSQL-specific features
```

#### For SQL Server
```sql
-- Execute sqlserver_schema_setup.sql in SQL Server Management Studio or Azure Data Studio
-- This creates schemas and users with SQL Server-compatible syntax
-- Note: Some PostgreSQL-specific features may need alternative implementations
```

**Important Notes:**
- PostgreSQL is the recommended database for full feature compatibility
- SQL Server support is provided for enterprise environments that require it
- The Python modules are primarily designed for PostgreSQL but can be adapted for SQL Server
- See [DATABASE_COMPATIBILITY.md](DATABASE_COMPATIBILITY.md) for detailed comparison and migration guidance

### 3. Django Integration

For Django-based microservices, update your `settings.py`:

```python
from microservices.shared.database.django_settings import (
    configure_service_database,
    configure_cross_service_databases,
    get_database_router
)

# Configure primary database for your service
DATABASES = configure_service_database('user')  # Replace with your service name

# Add cross-service databases if needed
DATABASES.update(configure_cross_service_databases('user', ['auth', 'institution']))

# Add database router
DATABASE_ROUTERS = [get_database_router()]
```

### 4. Connection Management

```python
from microservices.shared.database.connection_manager import connection_manager

# Get a connection for your service
with connection_manager.get_connection('user_service') as conn:
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM user_schema.profiles_userprofile")
        results = cursor.fetchall()

# Health check
health = connection_manager.health_check('user_service')
print(f"Database health: {health}")
```

## Cross-Schema Data Access

The system provides secure patterns for accessing data across service boundaries:

```python
from microservices.shared.database.cross_schema_access import (
    get_user_profile_with_auth,
    get_institution_details,
    create_audit_log
)

# Get user data with authentication info
user_data = get_user_profile_with_auth(
    user_id="123", 
    requesting_service="application_service"
)

# Get institution details
institution = get_institution_details(
    institution_id="456", 
    requesting_service="user_service"
)

# Create audit log
create_audit_log(
    service_name="user_service",
    action="profile_updated",
    resource_type="user_profile",
    resource_id="123",
    user_id="123"
)
```

## Database Migrations

The migration system supports schema versioning for each service:

```python
from microservices.shared.database.migrations import MigrationManager

# Initialize migration manager
migration_manager = MigrationManager()

# Run migrations for a specific service
migration_manager.run_service_migrations('user_service', './migrations/user')

# Run migrations for all services
migration_manager.run_all_migrations('./migrations')

# Check migration status
status = migration_manager.get_migration_status('user_service')
print(f"Applied migrations: {status['applied_count']}")
```

## Monitoring and Metrics

The system includes comprehensive monitoring capabilities:

```python
from microservices.shared.database.monitoring import (
    record_query_execution,
    get_database_health,
    get_service_performance
)

# Record query execution (usually done automatically)
record_query_execution(
    service_name="user_service",
    schema_name="user_schema",
    query_hash="abc123",
    execution_time=0.05,
    success=True,
    query_type="SELECT"
)

# Get health status
health = get_database_health()
print(f"Overall status: {health['overall_status']}")

# Get performance metrics
metrics = get_service_performance('user_service')
print(f"Average response time: {metrics['avg_execution_time']}s")
```

## Backup and Recovery

Automated backup system with multiple strategies:

```python
from microservices.shared.database.backup import (
    create_full_backup,
    create_schema_backup,
    restore_backup,
    get_backup_status
)

# Create full database backup
backup = create_full_backup(compress=True)
print(f"Backup created: {backup.backup_id}")

# Create schema-specific backup
schema_backup = create_schema_backup(['user_schema', 'auth_schema'])

# Restore backup
success = restore_backup('full_20240115_143022')

# Get backup status
status = get_backup_status()
print(f"Total backups: {status['total_backups']}")
```

## Security Considerations

### Row Level Security (RLS)

Each schema should implement RLS policies:

```sql
-- Enable RLS on tables
ALTER TABLE user_schema.profiles_userprofile ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY user_profile_policy ON user_schema.profiles_userprofile
    FOR ALL TO user_service_role
    USING (user_id = current_setting('app.current_user_id')::uuid);
```

### Service Roles

Each service has dedicated database roles with minimal required permissions:

- `auth_service_role`: Full access to `auth_schema`
- `user_service_role`: Full access to `user_schema`, read access to `auth_schema`
- `notification_service_role`: Read access to all schemas, write to `notification_schema`

### Connection Security

- All connections use SSL/TLS encryption
- Service-specific connection strings with limited permissions
- Connection pooling prevents connection exhaustion attacks
- Query monitoring detects suspicious patterns

## Performance Optimization

### Connection Pooling

- Configurable pool sizes per service
- Automatic connection recycling
- Health checks and failover

### Query Optimization

- Automatic query performance monitoring
- Slow query detection and logging
- Cross-schema query optimization

### Indexing Strategy

```sql
-- Create indexes for common cross-schema queries
CREATE INDEX idx_user_profile_user_id ON user_schema.profiles_userprofile(user_id);
CREATE INDEX idx_application_user_profile ON application_schema.applications_application(user_profile_id);
CREATE INDEX idx_notification_user ON notification_schema.notifications_notification(user_id);
```

## Troubleshooting

### Common Issues

1. **Connection Pool Exhaustion**
   ```python
   # Check pool status
   stats = connection_manager.get_pool_stats('user_service')
   print(f"Active connections: {stats['checked_out']}")
   ```

2. **Cross-Schema Permission Errors**
   ```python
   # Verify access permissions
   from microservices.shared.database.cross_schema_access import cross_schema_manager
   can_access = cross_schema_manager.validate_access('user', 'auth_schema', 'read_only')
   ```

3. **Migration Failures**
   ```python
   # Check migration status
   status = migration_manager.get_migration_status('user_service')
   if status['pending_count'] > 0:
       print(f"Pending migrations: {status['pending_migrations']}")
   ```

### Logging

Enable detailed logging for debugging:

```python
import logging
logging.getLogger('microservices.shared.database').setLevel(logging.DEBUG)
```

### Health Checks

Regular health checks help identify issues early:

```python
# Add to your service health check endpoint
def health_check():
    db_health = connection_manager.health_check('your_service')
    return {
        'database': 'healthy' if db_health else 'unhealthy',
        'timestamp': datetime.now().isoformat()
    }
```

## Best Practices

### 1. Service Isolation
- Each service should only access its own schema directly
- Use cross-schema access patterns for inter-service data needs
- Implement proper error handling and fallbacks

### 2. Migration Management
- Always test migrations in development first
- Use descriptive migration names and comments
- Keep migrations small and focused
- Never modify existing migrations

### 3. Performance
- Monitor query performance regularly
- Use connection pooling appropriately
- Implement caching for frequently accessed data
- Optimize cross-schema queries

### 4. Security
- Use service-specific database roles
- Implement Row Level Security where appropriate
- Audit sensitive operations
- Regularly rotate database credentials

### 5. Backup and Recovery
- Test backup restoration regularly
- Maintain multiple backup types (full, schema, incremental)
- Document recovery procedures
- Monitor backup success and storage usage

## Contributing

When adding new features or modifying the database architecture:

1. Update the relevant documentation
2. Add appropriate tests
3. Consider security implications
4. Update migration scripts if needed
5. Test cross-service compatibility

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review service logs and monitoring data
3. Consult the team's database administrator
4. Create detailed issue reports with reproduction steps

---

*This database architecture supports the Edulink microservices ecosystem with enterprise-grade reliability, security, and performance.*