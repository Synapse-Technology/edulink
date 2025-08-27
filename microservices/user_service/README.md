# User Service

The User Service is a core microservice in the Edulink platform that manages user profiles, roles, and institutions. It provides comprehensive profile management for students, employers, and institution representatives.

## Features

### Profile Management
- **Student Profiles**: Academic information, university enrollment, course details
- **Employer Profiles**: Company information, industry details, verification status
- **Institution Profiles**: University/college representative profiles with permissions

### Role Management
- User role assignment and management
- Permission-based access control
- Role-specific functionality

### Institution Management
- Institution registration and verification
- University code validation
- Department and course management

### Event-Driven Communication
- Real-time event publishing for profile changes
- Inter-service communication via events
- Event processing and handling

## Architecture

### Directory Structure
```
user_service/
├── user_service/           # Main Django project
│   ├── settings/          # Environment-specific settings
│   ├── utils/             # Shared utilities and permissions
│   └── urls.py            # Main URL configuration
├── profiles/              # Profile management app
│   ├── models.py          # Profile models
│   ├── views.py           # API views
│   ├── serializers.py     # Data serializers
│   ├── signals.py         # Event signals
│   └── admin.py           # Admin interface
├── roles/                 # Role management app
├── institutions/          # Institution management app
├── events/                # Event system
│   ├── types.py           # Event type definitions
│   ├── publisher.py       # Event publishing
│   ├── handlers.py        # Event handling
│   ├── views.py           # Event API endpoints
│   └── management/        # Management commands
└── shared/                # Shared components
```

### Event System

The User Service implements a comprehensive event-driven architecture for inter-service communication.

#### Event Types
- `STUDENT_PROFILE_CREATED` - New student profile created
- `STUDENT_PROFILE_UPDATED` - Student profile updated
- `EMPLOYER_PROFILE_CREATED` - New employer profile created
- `EMPLOYER_PROFILE_UPDATED` - Employer profile updated
- `INSTITUTION_PROFILE_CREATED` - New institution profile created
- `INSTITUTION_PROFILE_UPDATED` - Institution profile updated
- `PROFILE_VERIFIED` - Profile verification status changed
- `PROFILE_INVITATION_SENT` - Profile invitation sent
- `USER_ROLE_ASSIGNED` - User role assigned
- `USER_ROLE_REMOVED` - User role removed

#### Event Publishing
```python
from events.publisher import EventPublisher
from events.types import EventType, EventPriority

publisher = EventPublisher()
event_id = publisher.publish(
    event_type=EventType.STUDENT_PROFILE_CREATED,
    data={
        'user_id': user.id,
        'profile_id': profile.id,
        'university_code': profile.university_code
    },
    priority=EventPriority.HIGH
)
```

#### Event Handling
Events are automatically processed and routed to appropriate target services:
- **Auth Service**: User authentication and authorization updates
- **Institution Service**: Academic data synchronization
- **Notification Service**: User notifications and alerts
- **Internship Service**: Profile verification for internship eligibility

## API Endpoints

### Profile Management
- `GET /api/v1/profiles/students/` - List student profiles
- `POST /api/v1/profiles/students/` - Create student profile
- `GET /api/v1/profiles/students/{id}/` - Get student profile
- `PUT /api/v1/profiles/students/{id}/` - Update student profile
- `GET /api/v1/profiles/employers/` - List employer profiles
- `POST /api/v1/profiles/employers/` - Create employer profile
- `GET /api/v1/profiles/institutions/` - List institution profiles
- `POST /api/v1/profiles/institutions/` - Create institution profile

### Role Management
- `GET /api/v1/roles/` - List user roles
- `POST /api/v1/roles/assign/` - Assign role to user
- `DELETE /api/v1/roles/{id}/` - Remove user role

### Institution Management
- `GET /api/v1/institutions/` - List institutions
- `POST /api/v1/institutions/` - Register institution
- `GET /api/v1/institutions/{id}/` - Get institution details

### Event System
- `POST /api/v1/events/receive/` - Receive events from other services
- `POST /api/v1/events/publish/` - Publish events (internal)
- `GET /api/v1/events/status/{event_id}/` - Get event status
- `GET /api/v1/events/stats/` - Get event statistics
- `POST /api/v1/events/retry/{event_id}/` - Retry failed event
- `GET /api/v1/events/health/` - Event system health check

## Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/user_service

# Redis Cache
REDIS_URL=redis://localhost:6379/0

# Service Communication
SERVICE_SECRET_KEY=your-service-secret-key
ALLOWED_SERVICES=auth_service,institution_service,notification_service

# External Services
AUTH_SERVICE_URL=http://auth-service:8000
INSTITUTION_SERVICE_URL=http://institution-service:8000
NOTIFICATION_SERVICE_URL=http://notification-service:8000
INTERNSHIP_SERVICE_URL=http://internship-service:8000

# File Storage
MEDIA_ROOT=/app/media
MEDIA_URL=/media/
```

### Service Dependencies
- **PostgreSQL**: Primary database
- **Redis**: Caching and event storage
- **Auth Service**: User authentication
- **Institution Service**: Academic data
- **Notification Service**: User notifications

## Development

### Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver 8001
```

### Testing Events
```bash
# Test event publishing
python manage.py test_events --event-type STUDENT_PROFILE_CREATED --count 5

# Show event statistics
python manage.py test_events --show-stats

# Clear event cache
python manage.py test_events --clear-cache
```

### Running Tests
```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test profiles
python manage.py test events
```

## Deployment

### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8001

CMD ["python", "manage.py", "runserver", "0.0.0.0:8001"]
```

### Health Checks
- `GET /health/` - Service health status
- `GET /ready/` - Service readiness check
- `GET /api/v1/events/health/` - Event system health

## Monitoring

### Metrics
- Profile creation/update rates
- Event publishing/processing rates
- Service response times
- Error rates and failed events

### Logging
- Structured logging with correlation IDs
- Event processing logs
- Service communication logs
- Error tracking and alerting

## Security

### Authentication
- JWT-based service authentication
- User session management
- Role-based access control

### Data Protection
- Personal data encryption
- Secure file uploads
- Input validation and sanitization
- GDPR compliance features

## Contributing

1. Follow Django best practices
2. Write comprehensive tests
3. Document API changes
4. Use type hints
5. Follow PEP 8 style guide

## License

This project is part of the Edulink platform and is proprietary software.