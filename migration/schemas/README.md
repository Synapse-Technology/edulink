# Database Schema Files

This directory contains the database schema definitions for the Edulink microservices migration.

## Files

### PostgreSQL Schemas
- `auth_service_schema.sql` - PostgreSQL schema for authentication service
- `user_service_schema.sql` - PostgreSQL schema for user management service

### SQL Server Schemas
- `auth_service_schema_sqlserver.sql` - SQL Server compatible schema for authentication service
- `user_service_schema_sqlserver.sql` - SQL Server compatible schema for user management service

## Important Notes

### PostgreSQL-Specific Syntax

These schema files are written specifically for **PostgreSQL** and contain PostgreSQL-specific features:

1. **Extensions**: `uuid-ossp` and `pgcrypto` for UUID generation and cryptographic functions
2. **Data Types**:
   - `UUID` - PostgreSQL native UUID type
   - `JSONB` - PostgreSQL binary JSON type (more efficient than JSON)
   - `INET` - PostgreSQL network address type
   - `TEXT[]` - PostgreSQL array types
   - `TIMESTAMP WITH TIME ZONE` - PostgreSQL timezone-aware timestamps

3. **PostgreSQL Functions**:
   - `gen_random_uuid()` - Generate random UUIDs
   - `CURRENT_TIMESTAMP` - Current timestamp function
   - PL/pgSQL stored procedures and functions

4. **PostgreSQL Features**:
   - Schema creation with `CREATE SCHEMA IF NOT EXISTS`
   - `SET search_path` for schema context
   - Advanced constraint checks with regex (`~*` operator)
   - Partial indexes with `WHERE` clauses

### Database Compatibility

If you need to use these schemas with other database systems, you'll need to:

#### For SQL Server:
- Replace `UUID` with `UNIQUEIDENTIFIER`
- Replace `JSONB` with `NVARCHAR(MAX)` or `JSON` (SQL Server 2016+)
- Replace `INET` with `VARCHAR(45)` for IP addresses
- Replace `TEXT[]` arrays with separate tables or JSON columns
- Replace `gen_random_uuid()` with `NEWID()`
- Modify constraint syntax and regex patterns
- Replace PL/pgSQL functions with T-SQL equivalents

### SQL Server Schema Features

The SQL Server compatible schemas (`*_sqlserver.sql`) include:

- **Native SQL Server data types**: `UNIQUEIDENTIFIER`, `DATETIME2`, `NVARCHAR(MAX)`
- **Proper batch separators**: `GO` statements for schema creation and triggers
- **T-SQL stored procedures**: Converted from PostgreSQL functions
- **SQL Server triggers**: For automatic `updated_at` timestamp updates
- **Optimized indexes**: Tailored for SQL Server query optimizer
- **Check constraints**: For data validation
- **Foreign key relationships**: Maintained across schemas

### Key Differences

| Feature | PostgreSQL | SQL Server |
|---------|------------|------------|
| UUID Generation | `gen_random_uuid()` | `NEWID()` |
| JSON Storage | `JSONB` | `NVARCHAR(MAX)` |
| Timestamps | `TIMESTAMP WITH TIME ZONE` | `DATETIME2` |
| Current Time | `CURRENT_TIMESTAMP` | `GETUTCDATE()` |
| Arrays | `TEXT[]` | `NVARCHAR(MAX)` (JSON) |
| IP Addresses | `INET` | `NVARCHAR(45)` |
| Schema Creation | Single statement | Requires `GO` separator |
| Functions | PL/pgSQL | T-SQL Stored Procedures |

#### For MySQL:
- Replace `UUID` with `CHAR(36)` or use `BINARY(16)` for efficiency
- Replace `JSONB` with `JSON` (MySQL 5.7+)
- Replace `INET` with `VARCHAR(45)` for IP addresses
- Replace `TEXT[]` arrays with separate tables or JSON columns
- Replace `gen_random_uuid()` with `UUID()`
- Modify constraint syntax
- Replace PL/pgSQL functions with MySQL stored procedures

### Usage Instructions

1. **For PostgreSQL (Recommended)**:
   ```bash
   psql -U username -d database_name -f auth_service_schema.sql
   psql -U username -d database_name -f user_service_schema.sql
   ```

2. **For Development with Docker**:
   ```bash
   docker exec -i postgres_container psql -U username -d database_name < auth_service_schema.sql
   docker exec -i postgres_container psql -U username -d database_name < user_service_schema.sql
   ```

3. **Environment Variables**:
   Make sure to update the OAuth provider credentials and other configuration values before running in production.

### Security Considerations

- Change default OAuth client IDs and secrets before deployment
- Review and adjust permission grants for your application user
- Consider enabling row-level security (RLS) for sensitive tables
- Regularly run the cleanup functions to maintain database performance

### Performance Notes

- Indexes are created for common query patterns
- JSONB fields use GIN indexes where appropriate
- Cleanup functions are provided to manage data retention
- Consider partitioning large tables (audit_log, login_attempts) in production

### Migration Support

These schemas are designed to work with the migration scripts in the `../scripts/` directory:
- `export_data.py` - Export data from the monolithic application
- `import_data.py` - Import data into the new microservice databases
- `validate_migration.py` - Validate the migration results
- `rollback.py` - Rollback mechanism if needed

For more information about the migration process, see the main [Migration README](../README.md).