# Authentication Service

The Authentication Service is a microservice responsible for user authentication, authorization, and security management in the Edulink platform.

## Features

### Authentication
- User registration and login
- JWT token-based authentication
- Password reset functionality
- Email OTP verification
- Account lockout protection
- Two-factor authentication support

### Security
- Security event logging and monitoring
- Audit trail management
- User session tracking
- Failed login attempt monitoring
- Suspicious activity detection
- Risk assessment and scoring

### Background Tasks
- Automated cleanup of expired tokens
- Account unlocking
- Security event processing
- Daily security reports
- System health monitoring

## Technology Stack

- **Framework**: Django 4.2.7 with Django REST Framework
- **Database**: PostgreSQL
- **Cache/Message Broker**: Redis
- **Background Tasks**: Celery with Celery Beat
- **Authentication**: JWT with SimpleJWT
- **Containerization**: Docker

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)
- PostgreSQL (for local development)
- Redis (for local development)

### Using Docker Compose (Recommended)

1. Clone the repository and navigate to the auth service directory:
   ```bash
   cd microservices/auth_service
   ```

2. Copy the environment file and configure it:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Create the external network:
   ```bash
   docker network create edulink_network
   ```

4. Start the services:
   ```bash
   docker-compose up -d
   ```

5. Run database migrations:
   ```bash
   docker-compose exec auth_service python manage.py migrate
   ```

6. Create a superuser:
   ```bash
   docker-compose exec auth_service python manage.py createsuperuser
   ```

7. Initialize security configurations:
   ```bash
   docker-compose exec auth_service python manage.py init_security_config
   ```

### Local Development Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. Run database migrations:
   ```bash
   python manage.py migrate
   ```

5. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```

6. Initialize security configurations:
   ```bash
   python manage.py init_security_config
   ```

7. Start the development server:
   ```bash
   python manage.py runserver
   ```

8. Start Celery worker (in a separate terminal):
   ```bash
   celery -A auth_service worker --loglevel=info
   ```

9. Start Celery beat (in a separate terminal):
   ```bash
   celery -A auth_service beat --loglevel=info
   ```

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `POST /api/auth/password/reset/` - Request password reset
- `POST /api/auth/password/reset/confirm/` - Confirm password reset
- `POST /api/auth/email/verify/` - Verify email address
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/` - Update user profile

### Security Endpoints

- `GET /api/security/events/` - List security events
- `POST /api/security/events/` - Create security event
- `GET /api/security/audit-logs/` - List audit logs
- `GET /api/security/sessions/` - List user sessions
- `DELETE /api/security/sessions/{id}/` - Terminate session
- `GET /api/security/dashboard/` - Security dashboard data
- `GET /api/security/reports/` - Generate security reports

### Health Check Endpoints

- `GET /health/` - Service health check
- `GET /health/db/` - Database health check
- `GET /health/cache/` - Cache health check

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

### Security Configuration

The service includes a management command to initialize default security configurations:

```bash
python manage.py init_security_config
```

This sets up:
- Retention policies for logs and events
- Maximum login attempts
- Session timeouts
- Password policies
- Security feature toggles

## Management Commands

### Security Data Cleanup

```bash
# Clean up old security data
python manage.py cleanup_security_data

# Dry run to see what would be deleted
python manage.py cleanup_security_data --dry-run

# Override retention days
python manage.py cleanup_security_data --security-events-days 30
```

### Security Reports

```bash
# Generate security report for last 7 days
python manage.py generate_security_report --days 7

# Generate report with specific date range
python manage.py generate_security_report --start-date 2024-01-01 --end-date 2024-01-31

# Export to CSV
python manage.py generate_security_report --days 30 --format csv --output report.csv
```

### Security Configuration

```bash
# Initialize default configurations
python manage.py init_security_config

# Force update existing configurations
python manage.py init_security_config --force

# List current configurations
python manage.py init_security_config --list
```

## Monitoring

### Celery Flower

Celery Flower is available for monitoring background tasks:
- URL: http://localhost:5555
- Monitor task execution, worker status, and queue statistics

### Health Checks

The service provides comprehensive health checks:
- Database connectivity
- Cache (Redis) connectivity
- Service-specific health metrics

### Logging

Logs are written to:
- `logs/auth_service.log` - General application logs
- `logs/security.log` - Security-specific logs
- Console output for development

## Security Features

### Account Protection
- Configurable maximum login attempts
- Automatic account lockout
- Brute force attack detection
- IP-based rate limiting

### Session Management
- Secure session handling
- Session expiration tracking
- Multi-device session support
- Session termination capabilities

### Audit Trail
- Comprehensive audit logging
- User action tracking
- Security event monitoring
- Risk assessment scoring

### Background Monitoring
- Automated suspicious activity detection
- Daily security reports
- System health monitoring
- Automated cleanup tasks

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=.

# Run specific test file
pytest tests/test_authentication.py
```

### Code Quality

```bash
# Format code
black .

# Sort imports
isort .

# Lint code
flake8 .
```

### Database Migrations

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations
```

## Deployment

### Production Considerations

1. **Environment Variables**: Ensure all production environment variables are set
2. **Database**: Use a managed PostgreSQL service
3. **Redis**: Use a managed Redis service or cluster
4. **Secrets**: Use a secret management service
5. **SSL/TLS**: Enable HTTPS in production
6. **Monitoring**: Set up application monitoring and alerting
7. **Backup**: Implement database backup strategies

### Docker Production Build

```bash
# Build production image
docker build -t edulink/auth-service:latest .

# Run with production settings
docker run -d \
  --name auth-service \
  -p 8000:8000 \
  -e DEBUG=False \
  -e SECRET_KEY=your-production-secret \
  edulink/auth-service:latest
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check DATABASE_URL configuration
   - Ensure PostgreSQL is running
   - Verify network connectivity

2. **Redis Connection Issues**
   - Check REDIS_URL configuration
   - Ensure Redis is running
   - Verify Celery broker connectivity

3. **Celery Tasks Not Running**
   - Check Celery worker status
   - Verify Redis broker connection
   - Check task queue status in Flower

4. **JWT Token Issues**
   - Verify SECRET_KEY consistency
   - Check token expiration settings
   - Ensure clock synchronization

### Logs and Debugging

```bash
# View service logs
docker-compose logs auth_service

# View Celery worker logs
docker-compose logs celery_worker

# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f
```

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting
5. Follow security best practices

## License

This project is part of the Edulink platform.