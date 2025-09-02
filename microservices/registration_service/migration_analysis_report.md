# Migration Inconsistency Analysis Report

## Problem Summary

The migration inconsistency error occurs because **duplicate migration records exist in both `auth_schema` and `public` schema** with different timestamps, causing Django to detect conflicting migration histories.

## Root Cause Analysis

### What Happened:

1. **Initial Setup (Aug 26)**: Migrations were first applied to the `public` schema
   - `contenttypes.0001_initial`: 2025-08-26 17:59:59
   - `auth.0001_initial`: 2025-08-26 18:00:07
   - `admin.0001_initial`: 2025-08-26 18:01:07

2. **Schema Migration (Aug 29)**: Same migrations were re-applied to `auth_schema`
   - `contenttypes.0001_initial`: 2025-08-29 09:46:31
   - `auth.0001_initial`: 2025-08-29 09:46:40
   - `admin.0001_initial`: 2025-08-29 09:46:43

3. **Custom Authentication (Aug 26)**: Custom authentication app was applied earlier
   - `authentication.0001_initial`: 2025-08-26 18:01:03 (in auth_schema)

### The Inconsistency:

- **Both schemas contain the same Django built-in migrations** but with different timestamps
- **Django detects this as an inconsistent migration history** when services try to access the same database
- **The `auth_service` and `registration_service` both use `auth_schema`** but Django sees conflicting records

## Database State Analysis

### Schemas and Tables:
- ✅ `auth_schema`: Contains all auth tables and migration records
- ✅ `institution_schema`: Contains institution-specific tables
- ✅ `public`: Contains duplicate migration records and some shared tables

### Migration Records:
- 📊 `auth_schema`: 84 total migrations
- 📊 `public`: 94 total migrations
- ⚠️ **Duplicate records**: `contenttypes`, `auth`, `admin`, `sessions`, `sites` apps exist in both schemas

### Service Configuration:
- ✅ `registration_service`: Correctly configured to use `auth_schema`
- ✅ Database router: Properly maps auth-related apps to `auth_schema`

## Impact Assessment

### Current Issues:
1. **Migration commands fail** with `InconsistentMigrationHistory` error
2. **Services cannot apply new migrations** due to conflicting records
3. **Database integrity is at risk** if migrations are forced

### What's Working:
1. ✅ **Authentication tables exist and are accessible**
2. ✅ **Services can run and connect to the database**
3. ✅ **Core functionality is not affected**

## Recommended Solution

### Strategy: Clean Migration Records

1. **Remove duplicate migration records from `public` schema**
   - Keep only non-auth related migrations in `public`
   - Preserve all records in `auth_schema`

2. **Ensure schema isolation**
   - Auth-related migrations only in `auth_schema`
   - Institution-related migrations only in `institution_schema`
   - Shared/global migrations in `public`

3. **Verify and test**
   - Test migration commands on both services
   - Ensure no data loss or corruption

### Risk Assessment:
- **Low Risk**: Only removing duplicate migration records, not actual data
- **Reversible**: Can restore from backup if needed
- **Tested Approach**: Similar to schema separation we already implemented

## Next Steps

1. Create backup of current migration records
2. Remove duplicate records from `public` schema
3. Test migration commands on both services
4. Verify database integrity
5. Document the fix for future reference

---

*Analysis completed on: 2025-09-01*
*Services affected: auth_service, registration_service*
*Database: PostgreSQL with multiple schemas*