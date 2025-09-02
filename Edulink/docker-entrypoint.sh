#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to wait for database
wait_for_db() {
    log "Waiting for database to be ready..."
    
    # Extract database connection details from DATABASE_URL
    if [ -n "$DATABASE_URL" ]; then
        # Parse DATABASE_URL (format: postgresql://user:password@host:port/dbname)
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        
        if [ -z "$DB_PORT" ]; then
            DB_PORT=5432
        fi
    else
        DB_HOST=${DB_HOST:-localhost}
        DB_PORT=${DB_PORT:-5432}
    fi
    
    log "Checking database connection to $DB_HOST:$DB_PORT"
    
    # Wait for database to be ready
    for i in {1..30}; do
        if nc -z "$DB_HOST" "$DB_PORT"; then
            log_success "Database is ready!"
            return 0
        fi
        log "Database not ready yet... waiting (attempt $i/30)"
        sleep 2
    done
    
    log_error "Database failed to become ready in time"
    exit 1
}

# Function to wait for Redis
wait_for_redis() {
    log "Waiting for Redis to be ready..."
    
    # Extract Redis connection details from REDIS_URL
    if [ -n "$REDIS_URL" ]; then
        # Parse REDIS_URL (format: redis://[:password@]host:port[/db])
        REDIS_HOST=$(echo $REDIS_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        if [ -z "$REDIS_HOST" ]; then
            REDIS_HOST=$(echo $REDIS_URL | sed -n 's/redis:\/\/\([^:]*\):.*/\1/p')
        fi
        REDIS_PORT=$(echo $REDIS_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        
        if [ -z "$REDIS_PORT" ]; then
            REDIS_PORT=6379
        fi
    else
        REDIS_HOST=${REDIS_HOST:-localhost}
        REDIS_PORT=${REDIS_PORT:-6379}
    fi
    
    log "Checking Redis connection to $REDIS_HOST:$REDIS_PORT"
    
    # Wait for Redis to be ready
    for i in {1..30}; do
        if nc -z "$REDIS_HOST" "$REDIS_PORT"; then
            log_success "Redis is ready!"
            return 0
        fi
        log "Redis not ready yet... waiting (attempt $i/30)"
        sleep 2
    done
    
    log_error "Redis failed to become ready in time"
    exit 1
}

# Function to run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Check if we can connect to the database
    if python manage.py check --database default; then
        # Run migrations
        python manage.py migrate --noinput
        log_success "Database migrations completed successfully"
    else
        log_error "Database connection failed"
        exit 1
    fi
}

# Function to collect static files
collect_static() {
    log "Collecting static files..."
    
    # Only collect static files in production
    if [ "$DJANGO_SETTINGS_MODULE" = "Edulink.settings.prod" ]; then
        python manage.py collectstatic --noinput --clear
        log_success "Static files collected successfully"
    else
        log "Skipping static file collection (not in production mode)"
    fi
}

# Function to create superuser
create_superuser() {
    log "Checking for superuser..."
    
    # Only create superuser if environment variables are set
    if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
        python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
    User.objects.create_superuser('$DJANGO_SUPERUSER_USERNAME', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')
    print('Superuser created successfully')
else:
    print('Superuser already exists')
EOF
        log_success "Superuser check completed"
    else
        log "Superuser environment variables not set, skipping creation"
    fi
}

# Function to load initial data
load_initial_data() {
    log "Loading initial data..."
    
    # Check if fixtures directory exists
    if [ -d "fixtures" ]; then
        # Load fixtures if they exist
        for fixture in fixtures/*.json; do
            if [ -f "$fixture" ]; then
                log "Loading fixture: $fixture"
                python manage.py loaddata "$fixture"
            fi
        done
        log_success "Initial data loaded successfully"
    else
        log "No fixtures directory found, skipping initial data loading"
    fi
}

# Function to warm up cache
warm_cache() {
    log "Warming up cache..."
    
    # Run cache warming commands if they exist
    if python manage.py help | grep -q "warm_cache"; then
        python manage.py warm_cache
        log_success "Cache warmed up successfully"
    else
        log "No cache warming command found, skipping"
    fi
}

# Function to check system health
health_check() {
    log "Performing health check..."
    
    # Check if Django can start properly
    if python manage.py check --deploy; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi
}

# Main execution
main() {
    log "Starting Edulink application initialization..."
    
    # Set default Django settings if not provided
    export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-Edulink.settings.prod}
    
    log "Using Django settings: $DJANGO_SETTINGS_MODULE"
    
    # Wait for external services
    wait_for_db
    wait_for_redis
    
    # Run initialization tasks
    run_migrations
    collect_static
    create_superuser
    load_initial_data
    warm_cache
    health_check
    
    log_success "Edulink application initialization completed successfully!"
    
    # Execute the main command
    log "Starting application with command: $@"
    exec "$@"
}

# Handle different commands
case "$1" in
    "python")
        # If running Django management commands, skip some initialization
        if [[ "$2" == "manage.py" ]]; then
            case "$3" in
                "migrate"|"collectstatic"|"createsuperuser")
                    log "Running Django management command: $3"
                    wait_for_db
                    exec "$@"
                    ;;
                "shell"|"dbshell")
                    log "Running Django shell command"
                    wait_for_db
                    exec "$@"
                    ;;
                "runserver")
                    log "Running Django development server"
                    wait_for_db
                    wait_for_redis
                    run_migrations
                    exec "$@"
                    ;;
                *)
                    log "Running Django management command: $3"
                    exec "$@"
                    ;;
            esac
        else
            main "$@"
        fi
        ;;
    "gunicorn")
        log "Starting Gunicorn server"
        main "$@"
        ;;
    "celery")
        log "Starting Celery worker/beat"
        wait_for_db
        wait_for_redis
        exec "$@"
        ;;
    "pytest")
        log "Running tests"
        wait_for_db
        export DJANGO_SETTINGS_MODULE=Edulink.settings.test
        exec "$@"
        ;;
    "bash"|"sh")
        log "Starting shell"
        exec "$@"
        ;;
    *)
        log "Running custom command: $@"
        main "$@"
        ;;
esac