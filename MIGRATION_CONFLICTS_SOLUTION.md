# Migration Conflicts Solution

## Problem Summary

The Django microservices architecture was experiencing migration conflicts due to:

1. **Inconsistent BaseModel Definitions**: Each app (profiles, users, companies) had its own BaseModel with different field sets
2. **Missing Database Routing**: SchemaRouter expected multiple database aliases but only 'default' was configured
3. **Field Conflicts**: Migration 0003 was trying to add `created_at` fields that already existed in BaseModel inheritance
4. **Schema Routing Issues**: Tables were being created in `public` schema instead of designated service schemas

## Root Causes

### 1. Multiple BaseModel Definitions
- `profiles/models.py`: BaseModel with id, created_at, updated_at, is_deleted, deleted_at
- `users/models.py`: BaseModel with id, created_at, updated_at
- `companies/models.py`: BaseModel with created_at, updated_at only

### 2. Database Configuration Mismatch
- SchemaRouter expected aliases like `user_db`, `auth_db`, etc.
- Settings only defined `default` database
- This caused all migrations to route to `public` schema

### 3. Migration Field Conflicts
- Migration 0003 attempted to add `created_at` to models that inherit from BaseModel
- This created duplicate field definitions

## Permanent Solution Implemented

### 1. Centralized BaseModel

Created `microservices/shared/models/base.py` with a unified BaseModel:

```python
class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        abstract = True
```

### 2. Updated Database Configuration

Modified `microservices/shared/database/django_settings.py` to include all required database aliases:

```python
databases = {
    'default': primary_db,
    'auth_db': get_service_database_config('auth'),
    'user_db': get_service_database_config('user'),
    'institution_db': get_service_database_config('institution'),
    'notification_db': get_service_database_config('notification'),
    'application_db': get_service_database_config('application'),
    'internship_db': get_service_database_config('internship'),
    'cross_service': cross_service_db,
}
```

### 3. Updated Model Imports

Updated all model files to import from the centralized BaseModel:
- `profiles/models.py`
- `users/models.py`
- `companies/models.py`

Removed duplicate BaseModel definitions and conflicting field declarations.

### 4. New Migration Created

Generated `profiles/migrations/0005_fix_basemodel_inheritance.py` to properly handle the BaseModel transition.

## Benefits of This Solution

1. **Consistency**: All models now inherit from the same BaseModel with identical fields
2. **Schema Routing**: Database router can now properly direct operations to correct schemas
3. **Maintainability**: Single source of truth for common model fields
4. **Extensibility**: Easy to add new common fields to all models
5. **No More Conflicts**: Eliminates field duplication and migration conflicts

## Implementation Steps Taken

1. ✅ Created centralized BaseModel in `shared/models/base.py`
2. ✅ Updated database configuration to include all required aliases
3. ✅ Updated all model files to use centralized BaseModel
4. ✅ Removed duplicate BaseModel definitions
5. ✅ Fixed import issues (uuid, etc.)
6. ✅ Generated new migration with proper inheritance

## Next Steps

1. Apply the new migration: `python manage.py migrate profiles`
2. Test schema routing by creating new models
3. Validate that tables are created in correct schemas
4. Update other microservices to use the same centralized BaseModel

## Prevention Measures

1. **Code Reviews**: Ensure all new models inherit from `shared.models.BaseModel`
2. **Documentation**: Update development guidelines to reference centralized BaseModel
3. **Testing**: Add tests to verify schema routing works correctly
4. **Linting**: Consider adding linting rules to prevent duplicate BaseModel definitions

This solution provides a lasting fix that addresses the root causes rather than just commenting out problematic migrations.