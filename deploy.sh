#!/bin/bash

# Edulink Production Deployment Script
# This script should be placed on the production server at ~/deploy.sh

set -e  # Exit on any error

# Configuration
DEPLOYMENT_DIR="$HOME/edulink-deployment"
BACKUP_DIR="$HOME/edulink-backups"
LOG_FILE="$DEPLOYMENT_DIR/deploy.log"
DATE=$(date '+%Y-%m-%d_%H-%M-%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Create necessary directories
mkdir -p "$DEPLOYMENT_DIR" "$BACKUP_DIR"
cd "$DEPLOYMENT_DIR"

log "Starting Edulink deployment process..."

# Check if required files exist
if [ ! -f ".env" ]; then
    log_error ".env file not found in $DEPLOYMENT_DIR"
    log_error "Please copy .env.production to .env and configure it"
    exit 1
fi

if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "docker-compose.prod.yml not found in $DEPLOYMENT_DIR"
    log_error "Please ensure all deployment files are present"
    exit 1
fi

# Load environment variables
source .env
export BACKEND_IMAGE
export FRONTEND_IMAGE

# Set Django settings module
export DJANGO_SETTINGS_MODULE=edulink.config.settings.prod

# Backup current database
log "Creating database backup..."
if docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_DIR/db_backup_$DATE.sql" 2>/dev/null; then
    log_success "Database backup created: db_backup_$DATE.sql"
else
    log_warning "Database backup failed or no existing database found"
fi

# Pull latest images
log "Pulling latest Docker images..."
if [ -n "$1" ] && [ -n "$2" ]; then
    export BACKEND_IMAGE=$1
    export FRONTEND_IMAGE=$2
    log "Using provided images: $BACKEND_IMAGE and $FRONTEND_IMAGE"
fi

docker pull "$BACKEND_IMAGE" || {
    log_error "Failed to pull backend image: $BACKEND_IMAGE"
    exit 1
}

docker pull "$FRONTEND_IMAGE" || {
    log_error "Failed to pull frontend image: $FRONTEND_IMAGE"
    exit 1
}

log_success "Docker images pulled successfully"

# Stop existing containers gracefully
log "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --timeout 30

# Start database first
log "Starting database..."
docker-compose -f docker-compose.prod.yml up -d db

# Wait for database to be ready
log "Waiting for database to be ready..."
for i in {1..30}; do
    if docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
        log_success "Database is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "Database failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

# Run database migrations
log "Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend python edulink/manage.py migrate --noinput || {
    log_error "Database migrations failed"
    exit 1
}

# Collect static files
log "Collecting static files..."
docker-compose -f docker-compose.prod.yml run --rm backend python edulink/manage.py collectstatic --noinput || {
    log_error "Static files collection failed"
    exit 1
}

# Start all services
log "Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
log "Waiting for services to be healthy..."
sleep 30

# Health checks
log "Performing health checks..."

# Check backend health
if curl -fL http://localhost/health/ >/dev/null 2>&1; then
    log_success "Backend health check passed"
else
    log_error "Backend health check failed"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# Check frontend
if curl -fL http://localhost/ >/dev/null 2>&1; then
    log_success "Frontend health check passed"
else
    log_error "Frontend health check failed"
    docker-compose -f docker-compose.prod.yml logs frontend nginx
    exit 1
fi

# Clean up old images and containers
log "Cleaning up old Docker images..."
docker image prune -f
docker container prune -f

# Clean up old backups (keep last 30 days)
log "Cleaning up old backups..."
find "$BACKUP_DIR" -name "db_backup_*.sql" -mtime +30 -delete 2>/dev/null || true

log_success "Deployment completed successfully!"
log "Services status:"
docker-compose -f docker-compose.prod.yml ps

log "Deployment logs saved to: $LOG_FILE"
log "Access your application at: https://edulink.jhubafrica.com"