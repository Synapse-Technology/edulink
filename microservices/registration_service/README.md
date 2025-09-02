# Registration Service

A Django-based microservice for handling self-service registration requests and approval workflows in the Edulink platform.

## Overview

The Registration Service manages the complete lifecycle of user registration requests, from initial submission through verification, risk assessment, and final approval. It provides intelligent automation while maintaining human oversight for complex cases.

## Features

### Core Functionality
- **Self-Service Registration**: Users can register without requiring manual invitation
- **Multi-Step Verification**: Email, domain, and institutional verification
- **Risk Assessment**: Automated scoring system to identify potentially fraudulent requests
- **Approval Workflows**: Configurable approval processes with admin oversight
- **Real-Time Notifications**: WebSocket-based updates for status changes
- **Audit Trail**: Complete logging of all registration activities

### Smart Features
- **Auto-Approval**: Low-risk requests can be automatically approved
- **Institution Recognition**: Built-in database of Kenyan educational institutions
- **Domain Verification**: Automatic verification of institutional email domains
- **Duplicate Detection**: Prevents multiple registrations from the same user
- **Bulk Operations**: Admin tools for processing multiple requests

### Security & Compliance
- **Rate Limiting**: Protection against spam and abuse
- **Data Encryption**: Sensitive data encrypted at rest and in transit
- **GDPR Compliance**: Data retention and deletion policies
- **Audit Logging**: Comprehensive activity tracking
- **Role-Based Access**: Granular permission system

## Architecture

### Technology Stack
- **Framework**: Django 4.2 with Django REST Framework
- **Database**: PostgreSQL with Redis caching
- **Task Queue**: Celery with Redis broker
- **WebSockets**: Django Channels for real-time updates
- **API Documentation**: DRF Spectacular (OpenAPI/Swagger)
- **Monitoring**: Health checks and metrics

### Key Components
- **Models**: Registration requests, verification records, audit logs
- **APIs**: RESTful endpoints for all operations
- **Tasks**: Background processing for verification and notifications
- **WebSockets**: Real-time status updates
- **Admin Interface**: Django admin with custom views

## Installation

### Prerequisites
- Python 3.11+
- PostgreSQL 13+
- Redis 6+
- Node.js 18+ (for frontend integration)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd registration_service
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Database setup**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py loaddata fixtures/initial_data.json
   ```

6. **Run the development server**
   ```bash
   python manage.py runserver
   ```

7. **Start Celery worker** (in another terminal)
   ```bash
   celery -A registration_service worker --loglevel=info
   ```

8. **Start Celery beat** (in another terminal)
   ```bash
   celery -A registration_service beat --loglevel=info
   ```

### Docker Setup

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Run migrations**
   ```bash
   docker-compose exec web python manage.py migrate
   ```

3. **Create superuser**
   ```bash
   docker-compose exec web python manage.py createsuperuser
   ```

## Configuration

### Environment Variables

Key configuration options (see `.env.example` for complete list):

```bash
# Django Settings
DJANGO_SETTINGS_MODULE=registration_service.settings.development
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=registration_service
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/1

# Email
SENDGRID_API_KEY=your-sendgrid-api-key
DEFAULT_FROM_EMAIL=noreply@edulink.co.ke

# Kenya APIs
CUE_API_KEY=your-cue-api-key
TVETA_API_KEY=your-tveta-api-key
```

### Settings Modules

- `development.py`: Local development settings
- `production.py`: Production settings with security hardening
- `testing.py`: Test-specific settings

## API Documentation

### Endpoints

#### Authentication
- `POST /api/v1/auth/token/` - Obtain JWT token
- `POST /api/v1/auth/token/refresh/` - Refresh JWT token
- `POST /api/v1/auth/token/verify/` - Verify JWT token

#### Registration Requests
- `POST /api/v1/registration/requests/` - Submit registration request
- `GET /api/v1/registration/requests/` - List requests (admin)
- `GET /api/v1/registration/requests/{id}/` - Get request details
- `PATCH /api/v1/registration/requests/{id}/` - Update request
- `POST /api/v1/registration/requests/{id}/approve/` - Approve request
- `POST /api/v1/registration/requests/{id}/reject/` - Reject request

#### Verification
- `POST /api/v1/registration/verify-email/` - Verify email address
- `POST /api/v1/registration/verify-domain/` - Verify domain ownership
- `POST /api/v1/registration/verify-institution/` - Verify institution

#### Health Checks
- `GET /api/v1/health/` - Service health status
- `GET /api/v1/health/db/` - Database health
- `GET /api/v1/health/cache/` - Cache health

### API Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`
- OpenAPI Schema: `http://localhost:8000/api/schema/`

## Usage Examples

### Submit Registration Request

```python
import requests

data = {
    "email": "student@university.ac.ke",
    "first_name": "John",
    "last_name": "Doe",
    "role": "student",
    "institution_name": "University of Nairobi",
    "institution_type": "university",
    "phone_number": "+254712345678",
    "reason_for_access": "Academic research"
}

response = requests.post(
    "http://localhost:8000/api/v1/registration/requests/",
    json=data
)

print(response.json())
```

### Check Request Status

```python
request_id = "123e4567-e89b-12d3-a456-426614174000"
response = requests.get(
    f"http://localhost:8000/api/v1/registration/requests/{request_id}/",
    headers={"Authorization": "Bearer your-jwt-token"}
)

print(response.json())
```

## Testing

### Run Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test registration_requests

# Run with coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

### Test Categories

- **Unit Tests**: Model and utility function tests
- **Integration Tests**: API endpoint tests
- **Task Tests**: Celery task tests
- **WebSocket Tests**: Real-time functionality tests

## Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   export DJANGO_SETTINGS_MODULE=registration_service.settings.production
   ```

2. **Database Migration**
   ```bash
   python manage.py migrate
   python manage.py collectstatic --noinput
   ```

3. **Start Services**
   ```bash
   # Web server
   gunicorn --bind 0.0.0.0:8000 registration_service.wsgi:application
   
   # Celery worker
   celery -A registration_service worker --loglevel=info
   
   # Celery beat
   celery -A registration_service beat --loglevel=info
   ```

### Docker Production

```bash
# Build production image
docker build -t registration-service:latest .

# Run with production settings
docker run -d \
  --name registration-service \
  -p 8000:8000 \
  -e DJANGO_SETTINGS_MODULE=registration_service.settings.production \
  registration-service:latest
```

## Monitoring

### Health Checks

The service provides comprehensive health checks:

- **Application Health**: `/api/v1/health/`
- **Database Health**: `/api/v1/health/db/`
- **Cache Health**: `/api/v1/health/cache/`
- **Storage Health**: `/api/v1/health/storage/`

### Metrics

- **Prometheus Metrics**: Available at `/metrics`
- **Celery Monitoring**: Flower dashboard at `http://localhost:5555`
- **Admin Dashboard**: Django admin at `/admin/`

### Logging

Logs are structured and include:
- Request/response logging
- Task execution logs
- Security event logs
- Error tracking

## Security

### Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Controlled cross-origin access
- **SQL Injection Protection**: Django ORM protection
- **XSS Protection**: Content Security Policy headers
- **HTTPS Enforcement**: SSL/TLS in production

### Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **Regular Updates**: Keep dependencies updated
3. **Access Control**: Use principle of least privilege
4. **Audit Logs**: Monitor all administrative actions
5. **Data Encryption**: Encrypt sensitive data at rest

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/new-feature`
3. **Make changes and add tests**
4. **Run tests**: `python manage.py test`
5. **Submit pull request**

### Code Standards

- **PEP 8**: Follow Python style guidelines
- **Type Hints**: Use type annotations
- **Documentation**: Document all public APIs
- **Tests**: Maintain test coverage above 90%

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit
pre-commit install

# Run manually
pre-commit run --all-files
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check PostgreSQL is running
   - Verify connection settings in `.env`
   - Ensure database exists

2. **Redis Connection Errors**
   - Check Redis is running
   - Verify Redis URL in settings
   - Check firewall settings

3. **Celery Task Failures**
   - Check Celery worker logs
   - Verify broker connection
   - Ensure task modules are imported

4. **Email Delivery Issues**
   - Verify SendGrid API key
   - Check email templates
   - Review email logs

### Debug Mode

Enable debug mode for detailed error information:

```bash
export DEBUG=True
export DJANGO_SETTINGS_MODULE=registration_service.settings.development
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- **Documentation**: [Internal Wiki]
- **Issues**: [GitHub Issues]
- **Email**: dev-team@edulink.co.ke
- **Slack**: #registration-service

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.