# Edulink Microservices Migration Scripts

This directory contains scripts to migrate data from the monolithic Edulink application to the microservices architecture.

## Overview

The migration process involves:
1. **Data Migration**: Moving data from the monolithic database to separate microservice databases
2. **Validation**: Verifying data integrity and consistency after migration
3. **Rollback**: Ability to reverse the migration if needed

## Prerequisites

- Python 3.8+
- PostgreSQL databases set up for both monolith and microservices
- Required Python packages: `psycopg2-binary`

### Install Dependencies

```bash
pip install psycopg2-binary
```

## Database Setup

Before running the migration, ensure you have the following databases:

1. **Monolithic Database**: `edulink` (source)
2. **Internship Service Database**: `edulink_internships` (target)
3. **Application Service Database**: `edulink_applications` (target)

The databases should be accessible with the credentials specified in the scripts:
- Host: `localhost`
- Port: `5432`
- User: `edulink_user`
- Password: `edulink_password`

## Migration Scripts

### 1. Data Migration (`migrate_data.py`)

Migrates data from the monolithic database to microservice databases.

**Usage:**
```bash
python migrate_data.py
```

**What it does:**
- Migrates skill tags to internship service
- Migrates internships and their skill relationships
- Migrates applications to application service
- Migrates application documents and supervisor feedback
- Updates database sequences to prevent ID conflicts
- Creates a detailed migration log

**Output:**
- Console output showing migration progress
- Migration log file: `migration_log_YYYYMMDD_HHMMSS.json`

### 2. Migration Validation (`validate_migration.py`)

Validates data integrity and consistency after migration.

**Usage:**
```bash
python validate_migration.py
```

**What it validates:**
- Record counts match between monolith and microservices
- Data integrity (required fields, valid dates, etc.)
- Foreign key relationships
- Sample data consistency
- Database constraints

**Output:**
- Console output showing validation results
- Detailed validation report: `validation_report_YYYYMMDD_HHMMSS.json`
- Exit code: 0 for success, 1 for failure

### 3. Migration Rollback (`rollback_migration.py`)

Rolls back the migration by syncing data back to monolith and clearing microservice databases.

**Usage:**
```bash
# Full rollback
python rollback_migration.py

# Backup only (without clearing microservice data)
python rollback_migration.py --backup-only
```

**What it does:**
- Creates backup of current microservice data
- Syncs any new/updated data back to monolith
- Clears microservice databases (unless `--backup-only`)
- Resets database sequences
- Creates rollback log

**Output:**
- Console output showing rollback progress
- Backup files in `backups/` directory
- Rollback log file: `rollback_log_YYYYMMDD_HHMMSS.json`

## Migration Process

### Step 1: Pre-Migration

1. **Backup your databases**:
   ```bash
   pg_dump edulink > edulink_backup.sql
   ```

2. **Ensure microservice databases are set up**:
   ```bash
   # Run the init-db.psql script
psql -U postgres -f ../init-db.psql
   ```

3. **Test database connections**:
   ```bash
   # Test connection to all databases
   psql -h localhost -U edulink_user -d edulink -c "SELECT 1;"
   psql -h localhost -U edulink_user -d edulink_internships -c "SELECT 1;"
   psql -h localhost -U edulink_user -d edulink_applications -c "SELECT 1;"
   ```

### Step 2: Run Migration

1. **Execute the migration**:
   ```bash
   python migrate_data.py
   ```

2. **Validate the migration**:
   ```bash
   python validate_migration.py
   ```

3. **Review validation results**:
   - Check console output for any failures or warnings
   - Review the detailed validation report JSON file
   - Address any issues before proceeding

### Step 3: Post-Migration

1. **Update application configurations** to use microservice databases
2. **Deploy microservices** with the migrated data
3. **Test the application** thoroughly
4. **Monitor for any issues**

### Step 4: Rollback (if needed)

If issues are discovered after migration:

1. **Create backup of current state**:
   ```bash
   python rollback_migration.py --backup-only
   ```

2. **Perform full rollback**:
   ```bash
   python rollback_migration.py
   ```

3. **Restore monolithic application** configuration

## Configuration

### Database Configuration

To modify database connection settings, update the `DATABASE_CONFIGS` dictionary in each script:

```python
DATABASE_CONFIGS = {
    'monolith': {
        'host': 'your_host',
        'port': 5432,
        'database': 'your_monolith_db',
        'user': 'your_user',
        'password': 'your_password'
    },
    # ... other databases
}
```

### Logging

All scripts generate detailed logs in JSON format with timestamps, operation details, and results. These logs can be used for:
- Troubleshooting migration issues
- Auditing data changes
- Performance analysis
- Compliance reporting

## Troubleshooting

### Common Issues

1. **Connection Errors**:
   - Verify database credentials and connectivity
   - Ensure PostgreSQL is running
   - Check firewall settings

2. **Permission Errors**:
   - Verify user has necessary permissions on all databases
   - Check table ownership and grants

3. **Data Integrity Issues**:
   - Review validation report for specific failures
   - Check for data corruption in source database
   - Verify foreign key relationships

4. **Sequence Issues**:
   - Ensure sequences are properly updated after migration
   - Check for ID conflicts in new records

### Recovery Procedures

1. **Partial Migration Failure**:
   - Review migration log to identify failure point
   - Fix underlying issue
   - Run rollback and retry migration

2. **Validation Failures**:
   - Review validation report details
   - Fix data issues in source database
   - Re-run migration

3. **Performance Issues**:
   - Monitor database performance during migration
   - Consider running migration during low-traffic periods
   - Optimize database indexes if needed

## Best Practices

1. **Always backup** before migration
2. **Test migration** on a copy of production data first
3. **Run validation** after every migration
4. **Monitor application** closely after migration
5. **Keep migration logs** for audit purposes
6. **Plan rollback strategy** before starting
7. **Coordinate with team** on migration timing

## Support

For issues or questions regarding the migration process:

1. Check the troubleshooting section above
2. Review migration and validation logs
3. Contact the development team with specific error details
4. Include relevant log files and database states

## Files Generated

- `migration_log_YYYYMMDD_HHMMSS.json` - Detailed migration log
- `validation_report_YYYYMMDD_HHMMSS.json` - Validation results
- `rollback_log_YYYYMMDD_HHMMSS.json` - Rollback operation log
- `backups/` - Directory containing backup files during rollback

Keep these files for audit and troubleshooting purposes.