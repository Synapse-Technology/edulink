# Multi-stage Docker build for Edulink Backend
# Stage 1: Build stage
FROM python:3.11-slim as builder

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
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
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
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN groupadd -r edulink && useradd -r -g edulink edulink

# Create directories
RUN mkdir -p /app /app/staticfiles /app/mediafiles /app/logs \
    && chown -R edulink:edulink /app

# Set work directory
WORKDIR /app

# Copy Python dependencies from builder stage
COPY --from=builder /root/.local /root/.local

# Copy project files
COPY --chown=edulink:edulink . .

# Copy entrypoint script
COPY --chown=edulink:edulink docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create health check script
RUN echo '#!/bin/bash\n\
curl -f http://localhost:8000/health/ || exit 1' > /usr/local/bin/healthcheck.sh \
    && chmod +x /usr/local/bin/healthcheck.sh

# Switch to non-root user
USER edulink

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Default command
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "Edulink.wsgi:application"]

# Development stage
FROM production as development

# Switch back to root for development setup
USER root

# Install development dependencies
RUN apt-get update && apt-get install -y \
    git \
    vim \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install development Python packages
COPY requirements-dev.txt .
RUN pip install --user --no-cache-dir -r requirements-dev.txt

# Switch back to edulink user
USER edulink

# Override environment for development
ENV DJANGO_SETTINGS_MODULE=Edulink.settings.dev \
    DEBUG=True

# Development command
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Testing stage
FROM development as testing

# Set test environment
ENV DJANGO_SETTINGS_MODULE=Edulink.settings.test

# Run tests by default
CMD ["pytest", "-v", "--cov=.", "--cov-report=html", "--cov-report=term-missing"]

# Labels for metadata
LABEL maintainer="Edulink Team <team@edulink.com>" \
      version="1.0.0" \
      description="Edulink Internship Management System Backend" \
      org.opencontainers.image.source="https://github.com/edulink/backend" \
      org.opencontainers.image.documentation="https://docs.edulink.com" \
      org.opencontainers.image.licenses="MIT"