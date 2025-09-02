# Edulink Backend Documentation

A comprehensive internship management system built with Django REST Framework.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [API Documentation](#api-documentation)
7. [Testing](#testing)
8. [Monitoring](#monitoring)
9. [Security](#security)
10. [Deployment](#deployment)
11. [Development](#development)
12. [Troubleshooting](#troubleshooting)

## Overview

Edulink is a modern internship management platform that connects students, employers, and educational institutions. The backend provides a robust REST API with comprehensive features for managing internship applications, progress tracking, and user management.

### Key Components

- **Authentication System**: JWT-based authentication with role-based permissions
- **Application Management**: Complete internship application workflow
- **Progress Tracking**: Weekly logbook entries and supervisor feedback
- **Notification System**: Real-time notifications and email alerts
- **Monitoring & Analytics**: Comprehensive performance and error tracking
- **Security**: Rate limiting, input validation, and security headers

## Features

### Core Features

- ✅ **User Management**: Multi-role user system (Students, Employers, Institutions)
- ✅ **Internship Listings**: Create, search, and filter internship opportunities
- ✅ **Application System**: Submit and track internship applications
- ✅ **Progress Tracking**: Weekly logbook entries and supervisor feedback
- ✅ **Notifications**: Real-time notifications and email alerts
- ✅ **Dashboard Analytics**: Comprehensive metrics and reporting

### Advanced Features

- ✅ **API Rate Limiting**: Prevent abuse with configurable rate limits
- ✅ **Performance Monitoring**: Track API response times and database queries
- ✅ **Error Tracking**: Comprehensive error logging and alerting
- ✅ **Security Headers**: CSRF, XSS, and other security protections
- ✅ **File Upload Security**: Validation and virus scanning
- ✅ **Database Optimization**: Indexes and query optimization

## Architecture

### Project Structure

```
Edulink/
├── Edulink/                    # Main project directory
│   ├── settings/               # Environment-specific settings
│   │   ├── base.py            # Base settings
│   │   ├── dev.py             # Development settings
│   │   ├── prod.py            # Production settings
│   │   └── test.py            # Test settings
│   ├── urls.py                # Main URL configuration
│   └── wsgi.py                # WSGI configuration
├── authentication/            # User authentication and authorization
├── application/               # Internship application management
├── internship/               # Internship listings and management
├── internship_progress/      # Progress tracking and logbooks
├── notifications/            # Notification system
├── users/                    # User profile management
├── monitoring/               # Performance and error monitoring
├── security/                 # Security utilities and middleware
├── tests/                    # Test utilities and factories
├── requirements.txt          # Python dependencies
├── pytest.ini              # Test configuration
└── manage.py                # Django management script
```

### Database Schema

#### Core Models

- **User**: Extended Django user with role-based permissions
- **StudentProfile**: Student-specific information and preferences
- **EmployerProfile**: Company information and contact details
- **InstitutionProfile**: Educational institution details
- **Internship**: Internship opportunity listings
- **Application**: Student applications to internships
- **LogbookEntry**: Weekly progress reports
- **SupervisorFeedback**: Employer feedback on student progress
- **Notification**: System notifications and alerts

## Installation

### Prerequisites

- Python 3.9+
- PostgreSQL 12+ (recommended) or SQLite for development
- Redis 6+ (for caching and sessions)
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Edulink
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Database setup**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

6. **Run development server**
   ```bash
   python manage.py runserver
   ```

### Docker Setup (Alternative)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/edulink

# Security
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ACCESS_TOKEN_LIFETIME=15  # minutes
JWT_REFRESH_TOKEN_LIFETIME=7  # days

# File Upload
MAX_UPLOAD_SIZE=10485760  # 10MB
ALLOWED_FILE_EXTENSIONS=pdf,doc,docx,txt

# Monitoring
ERROR_NOTIFICATION_EMAIL=admin@yourdomain.com
PERFORMANCE_MONITORING=True
```

### Settings Files

- **base.py**: Common settings for all environments
- **dev.py**: Development-specific settings (DEBUG=True, SQLite)
- **prod.py**: Production settings (DEBUG=False, PostgreSQL)
- **test.py**: Test-specific settings (in-memory database)

## API Documentation

### Authentication

The API uses JWT (JSON Web Tokens) for authentication.

#### Login
```http
POST /api/auth/login/
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "user@example.com",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

#### Using JWT Tokens

Include the access token in the Authorization header:

```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### API Endpoints

#### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `POST /api/auth/refresh/` - Refresh access token
- `POST /api/auth/logout/` - User logout
- `POST /api/auth/password/reset/` - Password reset

#### Users
- `GET /api/users/profile/` - Get user profile
- `PUT /api/users/profile/` - Update user profile
- `GET /api/users/students/` - List student profiles
- `GET /api/users/employers/` - List employer profiles

#### Internships
- `GET /api/internships/` - List internships
- `POST /api/internships/` - Create internship (employers only)
- `GET /api/internships/{id}/` - Get internship details
- `PUT /api/internships/{id}/` - Update internship
- `DELETE /api/internships/{id}/` - Delete internship

#### Applications
- `GET /api/applications/` - List user's applications
- `POST /api/applications/` - Submit application
- `GET /api/applications/{id}/` - Get application details
- `PUT /api/applications/{id}/status/` - Update application status

#### Progress Tracking
- `GET /api/progress/logbook/` - List logbook entries
- `POST /api/progress/logbook/` - Create logbook entry
- `GET /api/progress/feedback/` - List supervisor feedback
- `POST /api/progress/feedback/` - Create supervisor feedback

#### Notifications
- `GET /api/notifications/` - List notifications
- `PUT /api/notifications/{id}/read/` - Mark as read
- `DELETE /api/notifications/{id}/` - Delete notification

### Interactive API Documentation

Access the interactive API documentation:

- **Swagger UI**: `http://localhost:8000/api/docs/`
- **ReDoc**: `http://localhost:8000/api/redoc/`
- **OpenAPI Schema**: `http://localhost:8000/api/schema/`

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest application/tests.py

# Run with verbose output
pytest -v

# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration
```

### Test Categories

- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test component interactions
- **API Tests**: Test API endpoints and responses
- **Model Tests**: Test database models and relationships

### Test Coverage

The project maintains >80% test coverage. View coverage reports:

```bash
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

## Monitoring

### Performance Monitoring

The system includes comprehensive performance monitoring:

- **API Response Times**: Track slow endpoints
- **Database Query Performance**: Monitor slow queries
- **System Metrics**: CPU, memory, disk usage
- **Error Tracking**: Automatic error detection and alerting

### Accessing Monitoring Data

```python
from monitoring.performance_monitoring import performance_monitor
from monitoring.error_tracking import error_tracker
from monitoring.metrics import metrics_collector

# Get performance report
report = performance_monitor.get_performance_report()

# Get error summary
errors = error_tracker.get_error_summary(hours=24)

# Get system metrics
metrics = metrics_collector.get_metrics_summary()
```

### Log Files

Logs are stored in the `logs/` directory:

- `edulink.log`: General application logs
- `errors.log`: Error logs
- `security.log`: Security-related events
- `performance.log`: Performance metrics
- `database.log`: Database query logs

## Security

### Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Sanitize and validate all inputs
- **Security Headers**: CSRF, XSS, and clickjacking protection
- **File Upload Security**: Validate file types and scan for malware
- **SQL Injection Prevention**: Use Django ORM and parameterized queries

### Security Configuration

```python
# In settings/prod.py
SECURITY_SETTINGS = {
    'RATE_LIMITING_ENABLED': True,
    'SECURITY_HEADERS_ENABLED': True,
    'FILE_UPLOAD_VALIDATION': True,
    'SUSPICIOUS_ACTIVITY_DETECTION': True,
    'BRUTE_FORCE_PROTECTION': True
}
```

### Rate Limiting

API endpoints are protected with rate limiting:

- Authentication: 5 requests/minute
- General API: 100 requests/hour
- File uploads: 10 requests/hour

## Deployment

### Production Deployment

#### Using Docker

1. **Build production image**
   ```bash
   docker build -t edulink-backend .
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

#### Manual Deployment

1. **Server setup**
   ```bash
   # Install dependencies
   sudo apt update
   sudo apt install python3 python3-pip postgresql redis-server nginx
   
   # Create user
   sudo useradd -m -s /bin/bash edulink
   sudo su - edulink
   ```

2. **Application setup**
   ```bash
   git clone <repository-url>
   cd Edulink
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Database setup**
   ```bash
   sudo -u postgres createdb edulink
   sudo -u postgres createuser edulink
   python manage.py migrate
   python manage.py collectstatic
   ```

4. **Web server configuration**
   ```nginx
   # /etc/nginx/sites-available/edulink
   server {
       listen 80;
       server_name yourdomain.com;
       
       location /static/ {
           alias /home/edulink/Edulink/staticfiles/;
       }
       
       location /media/ {
           alias /home/edulink/Edulink/media/;
       }
       
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

5. **Process management**
   ```bash
   # Install Gunicorn
   pip install gunicorn
   
   # Create systemd service
   sudo nano /etc/systemd/system/edulink.service
   ```

### Environment-Specific Settings

- **Development**: Use `dev.py` settings
- **Staging**: Use `prod.py` with staging database
- **Production**: Use `prod.py` with production database

## Development

### Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and test**
   ```bash
   # Run tests
   pytest
   
   # Check code quality
   flake8 .
   black .
   mypy .
   ```

3. **Commit and push**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin feature/new-feature
   ```

### Code Quality Tools

- **Black**: Code formatting
- **Flake8**: Linting
- **MyPy**: Type checking
- **isort**: Import sorting

### Database Migrations

```bash
# Create migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Rollback migration
python manage.py migrate app_name 0001
```

### Adding New Features

1. **Create Django app**
   ```bash
   python manage.py startapp new_feature
   ```

2. **Add to INSTALLED_APPS**
   ```python
   INSTALLED_APPS = [
       # ...
       'new_feature',
   ]
   ```

3. **Create models, views, serializers**
4. **Add URL patterns**
5. **Write tests**
6. **Update documentation**

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check connection
psql -h localhost -U edulink -d edulink
```

#### Redis Connection Errors

```bash
# Check Redis status
sudo systemctl status redis

# Restart Redis
sudo systemctl restart redis

# Test connection
redis-cli ping
```

#### Migration Issues

```bash
# Reset migrations (development only)
python manage.py migrate app_name zero
rm app_name/migrations/0*.py
python manage.py makemigrations app_name
python manage.py migrate
```

#### Performance Issues

1. **Check slow queries**
   ```python
   from monitoring.performance_monitoring import performance_monitor
   slow_queries = performance_monitor.get_slow_queries()
   ```

2. **Monitor system resources**
   ```python
   from monitoring.metrics import metrics_collector
   system_metrics = metrics_collector.get_system_metrics()
   ```

3. **Enable query logging**
   ```python
   # In settings/dev.py
   LOGGING['loggers']['django.db.backends']['level'] = 'DEBUG'
   ```

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Logs**: Check application logs in the `logs/` directory
- **Monitoring**: Use the monitoring dashboard for performance insights
- **Tests**: Run tests to identify issues

### Performance Optimization

1. **Database Optimization**
   - Add indexes for frequently queried fields
   - Use `select_related()` and `prefetch_related()`
   - Optimize slow queries

2. **Caching**
   - Enable Redis caching
   - Cache expensive operations
   - Use database query caching

3. **API Optimization**
   - Implement pagination
   - Use compression
   - Optimize serializers

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For support, please contact the development team or create an issue in the repository.