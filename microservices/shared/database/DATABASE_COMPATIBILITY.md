# Database Compatibility Guide

This guide explains the database compatibility options for the Edulink microservices architecture.

## Supported Databases

### PostgreSQL (Recommended)
- **Full Feature Support**: All features are designed and tested for PostgreSQL
- **Supabase Integration**: Native support for Supabase (PostgreSQL-as-a-Service)
- **Advanced Features**: UUID generation, full-text search, JSON operations
- **Extensions**: Support for `uuid-ossp`, `pg_trgm`, `btree_gin`
- **Setup File**: `postgresql_schema_setup.sql`

### SQL Server (Enterprise Support)
- **Basic Feature Support**: Core schema and role management
- **Enterprise Compatibility**: For organizations using Microsoft SQL Server
- **Limited Extensions**: Some PostgreSQL-specific features require alternatives
- **Setup File**: `sqlserver_schema_setup.sql`

## Feature Comparison

| Feature | PostgreSQL | SQL Server | Notes |
|---------|------------|------------|---------|
| Schema Creation | ✅ Full | ✅ Full | Both support schema-based isolation |
| Role Management | ✅ Roles | ⚠️ Users | SQL Server uses database users instead of roles |
| UUID Generation | ✅ Native | ⚠️ Manual | SQL Server requires NEWID() or custom functions |
| Full-Text Search | ✅ pg_trgm | ✅ Native | Different syntax and capabilities |
| JSON Operations | ✅ Native | ✅ Native | Both support JSON, different syntax |
| Extensions | ✅ Rich | ❌ Limited | PostgreSQL has extensive extension ecosystem |
| Connection Pooling | ✅ pgbouncer | ✅ Built-in | Different pooling mechanisms |

## Migration Considerations

### From PostgreSQL to SQL Server
1. **Data Types**: Map PostgreSQL types to SQL Server equivalents
2. **Functions**: Rewrite PostgreSQL functions using T-SQL
3. **Extensions**: Find SQL Server alternatives for PostgreSQL extensions
4. **Roles**: Convert PostgreSQL roles to SQL Server users and permissions
5. **Triggers**: Adapt trigger syntax and functionality

### From SQL Server to PostgreSQL
1. **Identity Columns**: Convert to PostgreSQL sequences
2. **T-SQL Functions**: Rewrite using PL/pgSQL or SQL
3. **Permissions**: Map SQL Server permissions to PostgreSQL roles
4. **Data Types**: Convert SQL Server-specific types
5. **Indexes**: Adapt indexing strategies

## Python Module Compatibility

The Python modules in this package are primarily designed for PostgreSQL:

### Full Compatibility (PostgreSQL)
- `connection_manager.py`: Uses psycopg2/asyncpg
- `migrations.py`: PostgreSQL-specific migration tracking
- `monitoring.py`: PostgreSQL system tables and statistics
- `backup.py`: Uses pg_dump and pg_restore

### Requires Adaptation (SQL Server)
- **Connection Manager**: Replace with pyodbc or pymssql
- **Migrations**: Adapt to SQL Server system tables
- **Monitoring**: Use SQL Server DMVs instead of PostgreSQL stats
- **Backup**: Use SQL Server backup commands

## Recommendations

### For New Projects
- **Use PostgreSQL/Supabase**: Full feature support and easier development
- **Cloud Deployment**: Supabase provides managed PostgreSQL with additional features
- **Development**: PostgreSQL offers better development tools and community support

### For Existing SQL Server Environments
- **Gradual Migration**: Start with schema setup and basic functionality
- **Hybrid Approach**: Use PostgreSQL for new services, maintain SQL Server for existing
- **Enterprise Integration**: SQL Server may be required for enterprise compliance

### For Multi-Database Support
- **Abstract Database Layer**: Create database-agnostic interfaces
- **Configuration-Driven**: Use environment variables to switch database types
- **Testing**: Maintain test suites for both database types

## Getting Help

- **PostgreSQL Issues**: Check Supabase documentation and PostgreSQL community
- **SQL Server Issues**: Consult Microsoft documentation and SQL Server community
- **Migration Questions**: Consider professional database migration services
- **Performance Tuning**: Database-specific optimization guides

## Future Roadmap

- **Enhanced SQL Server Support**: Improve compatibility modules
- **Database Abstraction Layer**: Create unified interface for both databases
- **Migration Tools**: Automated migration scripts between database types
- **Performance Benchmarks**: Comparative performance analysis