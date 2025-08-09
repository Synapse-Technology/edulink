# Edulink Deployment Guide

Comprehensive guide for deploying the Edulink backend in various environments.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Local Development](#local-development)
5. [Docker Deployment](#docker-deployment)
6. [Production Deployment](#production-deployment)
7. [Cloud Deployment](#cloud-deployment)
8. [Database Setup](#database-setup)
9. [Security Configuration](#security-configuration)
10. [Monitoring Setup](#monitoring-setup)
11. [Backup and Recovery](#backup-and-recovery)
12. [Troubleshooting](#troubleshooting)

## Overview

This guide covers deployment strategies for the Edulink backend system, from local development to production environments. The system is designed to be scalable and can be deployed using various methods.

### Deployment Options

- **Local Development**: SQLite + Django dev server
- **Docker Development**: PostgreSQL + Redis + Django in containers
- **Production**: PostgreSQL + Redis + Gunicorn + Nginx
- **Cloud**: AWS/GCP/Azure with managed services

## Prerequisites

### System Requirements

- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended for production)
- **Storage**: 20GB minimum (SSD recommended)
- **Network**: Stable internet connection

### Software Requirements

- **Python**: 3.9 or higher
- **Database**: PostgreSQL 12+ (SQLite for development)
- **Cache**: Redis 6+
- **Web Server**: Nginx (production)
- **Process Manager**: Gunicorn (production)
- **Container**: Docker & Docker Compose (optional)

## Environment Configuration

### Environment Variables

Create environment-specific `.env` files:

#### Development (.env.dev)
```env
# Django Settings
DJANGO_SETTINGS_MODULE=Edulink.settings.dev
DEBUG=True
SECRET_KEY=dev-secret-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database
DATABASE_URL=sqlite:///db.sqlite3
# Or for PostgreSQL:
# DATABASE_URL=postgresql://edulink:password@localhost:5432/edulink_dev

# Redis
REDIS_URL=redis://localhost:6379/0

# Email (Development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Security
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# JWT
JWT_SECRET_KEY=jwt-dev-secret
JWT_ACCESS_TOKEN_LIFETIME=60  # minutes
JWT_REFRESH_TOKEN_LIFETIME=7  # days

# File Upload
MAX_UPLOAD_SIZE=10485760  # 10MB
ALLOWED_FILE_EXTENSIONS=pdf,doc,docx,txt,jpg,png

# Monitoring
PERFORMANCE_MONITORING=True
ERROR_TRACKING=True
```

#### Production (.env.prod)
```env
# Django Settings
DJANGO_SETTINGS_MODULE=Edulink.settings.prod
DEBUG=False
SECRET_KEY=your-super-secret-production-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,api.yourdomain.com

# Database
DATABASE_URL=postgresql://edulink:secure_password@localhost:5432/edulink_prod

# Redis
REDIS_URL=redis://localhost:6379/0

# Email (Production)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=noreply@yourdomain.com
EMAIL_HOST_PASSWORD=your-email-app-password
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=Edulink <noreply@yourdomain.com>

# Security
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# JWT
JWT_SECRET_KEY=your-jwt-production-secret-key
JWT_ACCESS_TOKEN_LIFETIME=15  # minutes
JWT_REFRESH_TOKEN_LIFETIME=7  # days

# File Upload
MAX_UPLOAD_SIZE=10485760  # 10MB
ALLOWED_FILE_EXTENSIONS=pdf,doc,docx,txt

# Monitoring
PERFORMANCE_MONITORING=True
ERROR_TRACKING=True
ERROR_NOTIFICATION_EMAIL=admin@yourdomain.com

# Logging
LOG_LEVEL=INFO
LOG_FILE_PATH=/var/log/edulink/

# Static Files
STATIC_ROOT=/var/www/edulink/static/
MEDIA_ROOT=/var/www/edulink/media/
```

## Local Development

### Quick Setup

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd Edulink
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Environment configuration**
   ```bash
   cp .env.example .env.dev
   # Edit .env.dev with your settings
   export DJANGO_SETTINGS_MODULE=Edulink.settings.dev
   ```

3. **Database setup**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py loaddata fixtures/sample_data.json  # Optional
   ```

4. **Run development server**
   ```bash
   python manage.py runserver
   ```

### Development with PostgreSQL

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create database**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE edulink_dev;
   CREATE USER edulink WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE edulink_dev TO edulink;
   \q
   ```

3. **Update .env.dev**
   ```env
   DATABASE_URL=postgresql://edulink:password@localhost:5432/edulink_dev
   ```

### Development with Redis

1. **Install Redis**
   ```bash
   # Ubuntu/Debian
   sudo apt install redis-server
   
   # macOS
   brew install redis
   
   # Windows
   # Use WSL or download from https://github.com/microsoftarchive/redis/releases
   ```

2. **Start Redis**
   ```bash
   redis-server
   # Or as service: sudo systemctl start redis
   ```

## Docker Deployment

### Docker Compose for Development

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: edulink_dev
      POSTGRES_USER: edulink
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/app
      - media_volume:/app/media
    ports:
      - "8000:8000"
    environment:
      - DJANGO_SETTINGS_MODULE=Edulink.settings.dev
    env_file:
      - .env.dev
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
  media_volume:
```

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Create directories for logs and media
RUN mkdir -p /app/logs /app/media /app/staticfiles

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "Edulink.wsgi:application"]
```

### Running with Docker

```bash
# Build and start services
docker-compose up --build

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# View logs
docker-compose logs -f web

# Stop services
docker-compose down
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: edulink_prod
      POSTGRES_USER: edulink
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  web:
    build: .
    command: gunicorn --bind 0.0.0.0:8000 --workers 3 Edulink.wsgi:application
    volumes:
      - static_volume:/app/staticfiles
      - media_volume:/app/media
      - logs_volume:/app/logs
    expose:
      - 8000
    environment:
      - DJANGO_SETTINGS_MODULE=Edulink.settings.prod
    env_file:
      - .env.prod
    depends_on:
      - db
      - redis
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - static_volume:/var/www/static
      - media_volume:/var/www/media
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - web
    restart: unless-stopped

volumes:
  postgres_data:
  static_volume:
  media_volume:
  logs_volume:
```

## Production Deployment

### Server Setup (Ubuntu 20.04/22.04)

1. **Update system**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install dependencies**
   ```bash
   sudo apt install -y python3 python3-pip python3-venv \
                       postgresql postgresql-contrib \
                       redis-server nginx git \
                       supervisor certbot python3-certbot-nginx
   ```

3. **Create application user**
   ```bash
   sudo useradd -m -s /bin/bash edulink
   sudo usermod -aG sudo edulink
   ```

### Application Setup

1. **Switch to application user**
   ```bash
   sudo su - edulink
   ```

2. **Clone and setup application**
   ```bash
   git clone <repository-url> /home/edulink/Edulink
   cd /home/edulink/Edulink
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   pip install gunicorn
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.prod
   # Edit .env.prod with production settings
   ```

### Database Setup

1. **Configure PostgreSQL**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE edulink_prod;
   CREATE USER edulink WITH PASSWORD 'secure_password_here';
   ALTER ROLE edulink SET client_encoding TO 'utf8';
   ALTER ROLE edulink SET default_transaction_isolation TO 'read committed';
   ALTER ROLE edulink SET timezone TO 'UTC';
   GRANT ALL PRIVILEGES ON DATABASE edulink_prod TO edulink;
   \q
   ```

2. **Run migrations**
   ```bash
   cd /home/edulink/Edulink
   source .venv/bin/activate
   python manage.py migrate
   python manage.py collectstatic --noinput
   python manage.py createsuperuser
   ```

### Gunicorn Configuration

Create `/home/edulink/Edulink/gunicorn.conf.py`:

```python
# Gunicorn configuration file
import multiprocessing

# Server socket
bind = "127.0.0.1:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Restart workers after this many requests
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "/home/edulink/Edulink/logs/gunicorn_access.log"
errorlog = "/home/edulink/Edulink/logs/gunicorn_error.log"
loglevel = "info"

# Process naming
proc_name = "edulink_gunicorn"

# Server mechanics
daemon = False
pidfile = "/home/edulink/Edulink/gunicorn.pid"
user = "edulink"
group = "edulink"
tmp_upload_dir = None

# SSL (if using HTTPS directly with Gunicorn)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"
```

### Supervisor Configuration

Create `/etc/supervisor/conf.d/edulink.conf`:

```ini
[program:edulink]
command=/home/edulink/Edulink/.venv/bin/gunicorn --config /home/edulink/Edulink/gunicorn.conf.py Edulink.wsgi:application
directory=/home/edulink/Edulink
user=edulink
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/home/edulink/Edulink/logs/supervisor.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
environment=DJANGO_SETTINGS_MODULE="Edulink.settings.prod"
```

Start the service:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start edulink
```

### Nginx Configuration

Create `/etc/nginx/sites-available/edulink`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Client upload size
    client_max_body_size 10M;

    # Static files
    location /static/ {
        alias /home/edulink/Edulink/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /home/edulink/Edulink/media/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Admin interface
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Health check
    location /health/ {
        proxy_pass http://127.0.0.1:8000;
        access_log off;
    }

    # Root location (for frontend or API docs)
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/edulink /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL Certificate Setup

```bash
# Install SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Setup auto-renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## Cloud Deployment

### AWS Deployment

#### Using AWS Elastic Beanstalk

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB application**
   ```bash
   eb init edulink-backend
   ```

3. **Create environment**
   ```bash
   eb create production
   ```

4. **Configure environment variables**
   ```bash
   eb setenv DJANGO_SETTINGS_MODULE=Edulink.settings.prod \
            SECRET_KEY=your-secret-key \
            DATABASE_URL=your-rds-url \
            REDIS_URL=your-elasticache-url
   ```

#### Using AWS ECS with Fargate

Create `docker-compose.aws.yml`:

```yaml
version: '3.8'

services:
  web:
    image: your-account.dkr.ecr.region.amazonaws.com/edulink:latest
    ports:
      - "80:8000"
    environment:
      - DJANGO_SETTINGS_MODULE=Edulink.settings.prod
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SECRET_KEY=${SECRET_KEY}
    logging:
      driver: awslogs
      options:
        awslogs-group: /ecs/edulink
        awslogs-region: us-west-2
        awslogs-stream-prefix: ecs
```

### Google Cloud Platform

#### Using Cloud Run

1. **Build and push image**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/edulink
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy edulink \
     --image gcr.io/PROJECT_ID/edulink \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars DJANGO_SETTINGS_MODULE=Edulink.settings.prod
   ```

### Azure Deployment

#### Using Azure Container Instances

```bash
# Create resource group
az group create --name edulink-rg --location eastus

# Create container instance
az container create \
  --resource-group edulink-rg \
  --name edulink-backend \
  --image your-registry/edulink:latest \
  --dns-name-label edulink-api \
  --ports 80 \
  --environment-variables \
    DJANGO_SETTINGS_MODULE=Edulink.settings.prod \
    DATABASE_URL=your-database-url
```

## Database Setup

### PostgreSQL Optimization

Edit `/etc/postgresql/14/main/postgresql.conf`:

```conf
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Connection settings
max_connections = 100

# Logging
log_statement = 'mod'
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### Database Backup

Create backup script `/home/edulink/backup_db.sh`:

```bash
#!/bin/bash

# Database backup script
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/home/edulink/backups"
DB_NAME="edulink_prod"
DB_USER="edulink"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/edulink_backup_$DATE.sql.gz

# Remove backups older than 7 days
find $BACKUP_DIR -name "edulink_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: edulink_backup_$DATE.sql.gz"
```

Make executable and add to cron:

```bash
chmod +x /home/edulink/backup_db.sh
echo "0 2 * * * /home/edulink/backup_db.sh" | crontab -
```

## Security Configuration

### Firewall Setup

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow PostgreSQL (only from localhost)
sudo ufw allow from 127.0.0.1 to any port 5432

# Allow Redis (only from localhost)
sudo ufw allow from 127.0.0.1 to any port 6379

# Check status
sudo ufw status
```

### Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Create custom configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

Edit `/etc/fail2ban/jail.local`:

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
logpath = /var/log/nginx/error.log
```

Restart Fail2Ban:

```bash
sudo systemctl restart fail2ban
```

## Monitoring Setup

### System Monitoring

Install monitoring tools:

```bash
sudo apt install htop iotop nethogs
```

### Log Rotation

Create `/etc/logrotate.d/edulink`:

```
/home/edulink/Edulink/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 edulink edulink
    postrotate
        supervisorctl restart edulink
    endscript
}
```

### Health Check Endpoint

Add to `urls.py`:

```python
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache

def health_check(request):
    try:
        # Check database
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        # Check cache
        cache.set('health_check', 'ok', 10)
        cache.get('health_check')
        
        return JsonResponse({
            'status': 'healthy',
            'database': 'ok',
            'cache': 'ok',
            'timestamp': timezone.now().isoformat()
        })
    except Exception as e:
        return JsonResponse({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=500)

urlpatterns = [
    path('health/', health_check, name='health_check'),
    # ... other patterns
]
```

## Backup and Recovery

### Full System Backup

Create backup script `/home/edulink/full_backup.sh`:

```bash
#!/bin/bash

BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_ROOT="/home/edulink/backups"
APP_DIR="/home/edulink/Edulink"

# Create backup directories
mkdir -p $BACKUP_ROOT/database
mkdir -p $BACKUP_ROOT/media
mkdir -p $BACKUP_ROOT/config

# Database backup
pg_dump -U edulink -h localhost edulink_prod | gzip > $BACKUP_ROOT/database/db_$BACKUP_DATE.sql.gz

# Media files backup
tar -czf $BACKUP_ROOT/media/media_$BACKUP_DATE.tar.gz -C $APP_DIR media/

# Configuration backup
cp $APP_DIR/.env.prod $BACKUP_ROOT/config/env_$BACKUP_DATE
cp /etc/nginx/sites-available/edulink $BACKUP_ROOT/config/nginx_$BACKUP_DATE
cp /etc/supervisor/conf.d/edulink.conf $BACKUP_ROOT/config/supervisor_$BACKUP_DATE

# Clean old backups (keep 30 days)
find $BACKUP_ROOT -type f -mtime +30 -delete

echo "Full backup completed: $BACKUP_DATE"
```

### Recovery Procedure

1. **Database Recovery**
   ```bash
   # Stop application
   sudo supervisorctl stop edulink
   
   # Restore database
   dropdb edulink_prod
   createdb edulink_prod
   gunzip -c backup_file.sql.gz | psql -U edulink edulink_prod
   
   # Start application
   sudo supervisorctl start edulink
   ```

2. **Media Files Recovery**
   ```bash
   cd /home/edulink/Edulink
   tar -xzf media_backup.tar.gz
   ```

## Troubleshooting

### Common Issues

#### Application Won't Start

1. **Check logs**
   ```bash
   sudo supervisorctl status
   tail -f /home/edulink/Edulink/logs/supervisor.log
   tail -f /home/edulink/Edulink/logs/gunicorn_error.log
   ```

2. **Check environment variables**
   ```bash
   sudo supervisorctl restart edulink
   ```

#### Database Connection Issues

1. **Check PostgreSQL status**
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "SELECT version();"
   ```

2. **Test connection**
   ```bash
   psql -U edulink -h localhost edulink_prod -c "SELECT 1;"
   ```

#### High Memory Usage

1. **Check processes**
   ```bash
   htop
   ps aux --sort=-%mem | head
   ```

2. **Optimize Gunicorn workers**
   ```python
   # In gunicorn.conf.py
   workers = 2  # Reduce if memory constrained
   max_requests = 500  # Restart workers more frequently
   ```

#### Slow Performance

1. **Check database queries**
   ```bash
   tail -f /home/edulink/Edulink/logs/database.log
   ```

2. **Monitor system resources**
   ```bash
   iotop
   nethogs
   ```

### Performance Optimization

1. **Enable database query caching**
   ```python
   # In settings/prod.py
   CACHES = {
       'default': {
           'BACKEND': 'django_redis.cache.RedisCache',
           'LOCATION': 'redis://127.0.0.1:6379/1',
           'OPTIONS': {
               'CLIENT_CLASS': 'django_redis.client.DefaultClient',
           }
       }
   }
   ```

2. **Optimize static file serving**
   ```nginx
   # In nginx configuration
   location /static/ {
       alias /home/edulink/Edulink/staticfiles/;
       expires 1y;
       add_header Cache-Control "public, immutable";
       gzip_static on;
   }
   ```

3. **Enable compression**
   ```python
   # In settings/prod.py
   MIDDLEWARE = [
       'django.middleware.gzip.GZipMiddleware',
       # ... other middleware
   ]
   ```

---

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review error logs
   - Check disk space
   - Monitor performance metrics

2. **Monthly**
   - Update dependencies
   - Review security logs
   - Test backup restoration

3. **Quarterly**
   - Security audit
   - Performance optimization
   - Capacity planning

### Update Procedure

1. **Backup current version**
   ```bash
   /home/edulink/full_backup.sh
   ```

2. **Deploy new version**
   ```bash
   cd /home/edulink/Edulink
   git pull origin main
   source .venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py collectstatic --noinput
   sudo supervisorctl restart edulink
   ```

3. **Verify deployment**
   ```bash
   curl -f http://localhost/health/
   ```

For additional support, refer to the main README.md or contact the development team.