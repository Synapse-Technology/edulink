# Supabase Integration Guide for Edulink Microservices

This guide walks you through connecting your existing microservices to Supabase using the centralized database architecture.

## Prerequisites

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Database Setup**: Execute the schema setup scripts
3. **Environment Variables**: Configure connection details

## Step 1: Supabase Project Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your users
3. Set a strong database password
4. Wait for the project to be ready

### 1.2 Get Connection Details
From your Supabase dashboard, collect:
- **Project URL**: `https://your-project-id.supabase.co`
- **Anon Key**: For client-side access
- **Service Role Key**: For server-side access
- **Database URL**: `postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres`

### 1.3 Execute Schema Setup
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `postgresql_schema_setup.sql`
3. Execute the script to create schemas and roles

## Step 2: Environment Configuration

### 2.1 Create Environment Files

For each microservice, create a `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database Connection
DATABASE_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres
DATABASE_HOST=db.your-project-id.supabase.co
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=postgres
DATABASE_PASSWORD=your-database-password

# Service-Specific Configuration
SERVICE_NAME=auth  # Change this for each service: auth, user, institution, notification
SERVICE_SCHEMA=auth_schema  # Corresponding schema name

# Connection Pool Settings
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
DATABASE_POOL_TIMEOUT=30

# Redis (if using Supabase Redis or external)
REDIS_URL=redis://localhost:6379/0
```

### 2.2 Service-Specific Environment Files

**Auth Service** (`.env`):
```env
SERVICE_NAME=auth
SERVICE_SCHEMA=auth_schema
```

**User Service** (`.env`):
```env
SERVICE_NAME=user
SERVICE_SCHEMA=user_schema
CROSS_SERVICE_ACCESS=auth,institution
```

**Institution Service** (`.env`):
```env
SERVICE_NAME=institution
SERVICE_SCHEMA=institution_schema
CROSS_SERVICE_ACCESS=user
```

**Notification Service** (`.env`):
```env
SERVICE_NAME=notification
SERVICE_SCHEMA=notification_schema
CROSS_SERVICE_ACCESS=auth,user
```

## Step 3: Django Settings Integration

### 3.1 Update Django Settings

For each microservice, update your `settings.py`:

```python
# settings.py
import os
from pathlib import Path
from microservices.shared.database.django_settings import (
    configure_service_database,
    configure_cross_service_databases,
    get_database_router,
    apply_environment_overrides
)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Service configuration
SERVICE_NAME = os.getenv('SERVICE_NAME', 'auth')  # Change per service
CROSS_SERVICES = os.getenv('CROSS_SERVICE_ACCESS', '').split(',') if os.getenv('CROSS_SERVICE_ACCESS') else []

# Database configuration
DATABASES = configure_service_database(SERVICE_NAME)

# Add cross-service databases if needed
if CROSS_SERVICES:
    DATABASES.update(configure_cross_service_databases(SERVICE_NAME, CROSS_SERVICES))

# Database router for cross-schema queries
DATABASE_ROUTERS = [get_database_router()]

# Apply environment-specific overrides
DATABASES = apply_environment_overrides(DATABASES)

# Rest of your Django settings...
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key')
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    # Your service-specific apps
]

# Supabase-specific settings
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
```

### 3.2 Install Required Dependencies

Add to your `requirements.txt`:

```txt
# Database
psycopg2-binary>=2.9.0
django-environ>=0.9.0
supabase>=1.0.0

# Connection pooling
SQLAlchemy>=1.4.0
psycopg2-pool>=1.1

# Environment management
python-dotenv>=0.19.0

# Existing Django dependencies
Django>=4.2.0
djangorestframework>=3.14.0
```

## Step 4: Connection Manager Integration

### 4.1 Initialize Connection Manager

Create a service initialization file:

```python
# services/database.py
from microservices.shared.database.connection_manager import DatabaseConnectionManager
from microservices.shared.database.config import DatabaseConfig
import os

# Initialize database configuration
db_config = DatabaseConfig()

# Initialize connection manager
connection_manager = DatabaseConnectionManager(db_config)

# Service-specific connection pool
service_name = os.getenv('SERVICE_NAME', 'auth')
service_pool = connection_manager.get_or_create_pool(service_name)

def get_db_connection():
    """Get a database connection for this service"""
    return connection_manager.get_connection(service_name)

def get_db_cursor():
    """Get a database cursor for this service"""
    return connection_manager.get_cursor(service_name)

def execute_cross_service_query(target_service, query, params=None):
    """Execute a query on another service's schema"""
    return connection_manager.execute_cross_service_query(
        service_name, target_service, query, params
    )
```

### 4.2 Use in Django Views

```python
# views.py
from django.http import JsonResponse
from django.views import View
from .database import get_db_connection, execute_cross_service_query

class UserProfileView(View):
    def get(self, request, user_id):
        # Get user data from user service
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM user_schema.users WHERE id = %s", 
                    [user_id]
                )
                user_data = cursor.fetchone()
        
        # Get auth data from auth service (cross-service query)
        auth_data = execute_cross_service_query(
            'auth',
            "SELECT last_login, is_active FROM auth_schema.auth_user WHERE id = %s",
            [user_id]
        )
        
        return JsonResponse({
            'user': user_data,
            'auth': auth_data
        })
```

## Step 5: Migration and Data Setup

### 5.1 Run Database Migrations

```python
# migrate_service.py
from microservices.shared.database.migrations import MigrationManager
from microservices.shared.database.config import DatabaseConfig
import os

def migrate_service():
    service_name = os.getenv('SERVICE_NAME')
    db_config = DatabaseConfig()
    migration_manager = MigrationManager(db_config)
    
    # Run migrations for this service
    migration_manager.migrate_service(service_name)
    print(f"Migrations completed for {service_name} service")

if __name__ == '__main__':
    migrate_service()
```

### 5.2 Create Django Migrations

```bash
# For each service, create and run Django migrations
python manage.py makemigrations
python manage.py migrate
```

## Step 6: Testing the Connection

### 6.1 Health Check Script

```python
# health_check.py
from microservices.shared.database.connection_manager import DatabaseConnectionManager
from microservices.shared.database.config import DatabaseConfig
import os

def test_connection():
    service_name = os.getenv('SERVICE_NAME')
    db_config = DatabaseConfig()
    connection_manager = DatabaseConnectionManager(db_config)
    
    # Test connection
    health = connection_manager.health_check(service_name)
    print(f"Service: {service_name}")
    print(f"Connection Status: {'✅ Healthy' if health['healthy'] else '❌ Unhealthy'}")
    print(f"Response Time: {health['response_time_ms']}ms")
    
    if not health['healthy']:
        print(f"Error: {health['error']}")
    
    # Test cross-service access
    if service_name != 'auth':
        try:
            result = connection_manager.execute_cross_service_query(
                service_name, 'auth', 
                "SELECT COUNT(*) FROM auth_schema.auth_user"
            )
            print(f"Cross-service query successful: {result}")
        except Exception as e:
            print(f"Cross-service query failed: {e}")

if __name__ == '__main__':
    test_connection()
```

### 6.2 Run Health Check

```bash
# Test each service
SERVICE_NAME=auth python health_check.py
SERVICE_NAME=user python health_check.py
SERVICE_NAME=institution python health_check.py
SERVICE_NAME=notification python health_check.py
```

## Step 7: Monitoring and Maintenance

### 7.1 Enable Monitoring

```python
# monitoring_setup.py
from microservices.shared.database.monitoring import DatabaseMonitor
from microservices.shared.database.config import DatabaseConfig
import os

def setup_monitoring():
    service_name = os.getenv('SERVICE_NAME')
    db_config = DatabaseConfig()
    monitor = DatabaseMonitor(db_config)
    
    # Start monitoring
    print(f"Monitoring enabled for {service_name} service")
    
    # Get current metrics
    metrics = monitor.get_service_metrics(service_name)
    print(f"Current metrics: {metrics}")

if __name__ == '__main__':
    setup_monitoring()
```

### 7.2 Backup Setup

```python
# backup_setup.py
from microservices.shared.database.backup import DatabaseBackupManager
from microservices.shared.database.config import DatabaseConfig
import os

def setup_backup():
    service_name = os.getenv('SERVICE_NAME')
    db_config = DatabaseConfig()
    backup_manager = DatabaseBackupManager(db_config)
    
    # Create backup
    backup_path = backup_manager.create_schema_backup(service_name)
    print(f"Backup created: {backup_path}")
    
    # Test restore
    test_result = backup_manager.test_backup_restore(backup_path)
    print(f"Backup test: {'✅ Passed' if test_result else '❌ Failed'}")

if __name__ == '__main__':
    setup_backup()
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check Supabase project status
   - Verify DATABASE_URL format
   - Ensure IP is whitelisted in Supabase

2. **Schema Not Found**
   - Verify schema setup script was executed
   - Check SERVICE_SCHEMA environment variable
   - Ensure proper schema permissions

3. **Cross-Service Access Denied**
   - Verify role permissions in PostgreSQL
   - Check CROSS_SERVICE_ACCESS configuration
   - Ensure target schema exists

4. **Migration Errors**
   - Check Django database configuration
   - Verify schema search path
   - Ensure migration files are in correct location

### Debug Commands

```bash
# Test database connection
psql "postgresql://postgres:password@db.project-id.supabase.co:5432/postgres" -c "\l"

# Check schemas
psql "postgresql://postgres:password@db.project-id.supabase.co:5432/postgres" -c "\dn"

# Test Django connection
python manage.py dbshell

# Check migration status
python manage.py showmigrations
```

## Next Steps

1. **Deploy Services**: Deploy each microservice with proper environment configuration
2. **Set Up CI/CD**: Automate deployment with database migrations
3. **Configure Monitoring**: Set up alerts and dashboards
4. **Implement Backup Strategy**: Schedule regular backups
5. **Performance Tuning**: Optimize queries and connection pools

Your microservices are now connected to Supabase with a robust, scalable database architecture!