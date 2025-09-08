# Multi-stage Dockerfile for Full-Stack Edulink Application
# Stage 1: Build Backend
FROM python:3.11-slim as backend-builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create and set work directory
WORKDIR /app/backend

# Copy requirements and install Python dependencies
COPY Edulink/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Production stage
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/root/.local/bin:$PATH \
    DJANGO_SETTINGS_MODULE=Edulink.settings.prod

# Install system dependencies for production
RUN apt-get update && apt-get install -y \
    libpq5 \
    netcat-traditional \
    curl \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN groupadd -r edulink && useradd -r -g edulink edulink

# Create directories
RUN mkdir -p /app/backend /app/frontend /app/staticfiles /app/mediafiles /app/logs \
    && chown -R edulink:edulink /app

# Copy Python dependencies from builder stage
COPY --from=backend-builder /root/.local /root/.local

# Copy backend application
COPY Edulink/ /app/backend/
WORKDIR /app/backend

# Copy frontend files
COPY Edulink_website/ /app/frontend/

# Create nginx configuration file
COPY <<EOF /etc/nginx/sites-available/default
server {
    listen 80;
    server_name localhost;
    
    # Serve frontend static files
    location / {
        root /app/frontend;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }
    
    # Proxy API requests to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Serve Django admin and static files
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /static/ {
        alias /app/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /media/ {
        alias /app/mediafiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Cache frontend static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)\$ {
        root /app/frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
EOF

# Create Supervisor configuration file
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root

[program:django]
command=python manage.py runserver 0.0.0.0:8000
directory=/app/backend
user=edulink
autostart=true
autorestart=true
stdout_logfile=/app/logs/django.log
stderr_logfile=/app/logs/django_error.log

[program:nginx]
command=nginx -g "daemon off;"
user=root
autostart=true
autorestart=true
stdout_logfile=/app/logs/nginx.log
stderr_logfile=/app/logs/nginx_error.log
EOF

# Set proper permissions
RUN chown -R edulink:edulink /app/backend /app/frontend

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port 80 (Nginx will serve both frontend and proxy backend)
EXPOSE 80

# Start supervisor to manage both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]