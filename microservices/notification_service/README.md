# Edulink Notification Service

A centralized notification service for the Edulink platform that handles email, SMS, and push notifications across all microservices.

## Features

- **Multi-channel notifications**: Email, SMS, and Push notifications
- **Template management**: Reusable notification templates with variable substitution
- **Bulk notifications**: Send notifications to multiple recipients efficiently
- **Scheduling**: Schedule notifications for future delivery
- **Retry mechanism**: Automatic retry for failed notifications
- **User preferences**: Respect user notification preferences and quiet hours
- **Provider integration**: Support for SendGrid, Twilio, and SMTP
- **Webhook handling**: Process delivery status updates from providers
- **Comprehensive logging**: Track all notification attempts and outcomes
- **Admin interface**: Django admin for managing notifications and templates
- **API-first design**: RESTful API for all operations

## Architecture

### Components

- **Django REST API**: Main application server
- **Celery Workers**: Asynchronous task processing for sending notifications
- **Celery Beat**: Scheduled task management
- **Redis**: Message broker and caching
- **PostgreSQL**: Primary database
- **Flower**: Celery monitoring (optional)

### Models

- **NotificationTemplate**: Reusable templates for notifications
- **Notification**: Individual notification records
- **NotificationLog**: Detailed logs of delivery attempts
- **NotificationPreference**: User notification preferences
- **NotificationBatch**: Bulk notification management

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone and navigate to the service directory**:
   ```bash
   cd microservices/notification_service
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the services**:
   ```bash
   docker-compose up -d
   ```

4. **Run migrations**:
   ```bash
   docker-compose exec notification_service python manage.py migrate
   ```

5. **Create a superuser**:
   ```bash
   docker-compose exec notification_service python manage.py createsuperuser
   ```

6. **Access the service**:
   - API: http://localhost:8003/
   - Admin: http://localhost:8003/admin/
   - Flower (Celery monitoring): http://localhost:5555/

### Manual Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables**:
   ```bash
   export DATABASE_URL="postgresql://user:pass@localhost:5432/notification_db"
   export REDIS_URL="redis://localhost:6379/0"
   export SECRET_KEY="your-secret-key"
   # Add other environment variables as needed
   ```

3. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

4. **Start the development server**:
   ```bash
   python manage.py runserver 8003
   ```

5. **Start Celery worker** (in another terminal):
   ```bash
   celery -A notification_service worker --loglevel=info
   ```

6. **Start Celery beat** (in another terminal):
   ```bash
   celery -A notification_service beat --loglevel=info
   ```

## Configuration

### Environment Variables

#### Database
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

#### Email Configuration
- `EMAIL_BACKEND`: Django email backend
- `EMAIL_HOST`: SMTP server host
- `EMAIL_PORT`: SMTP server port
- `EMAIL_USE_TLS`: Enable TLS (True/False)
- `EMAIL_HOST_USER`: SMTP username
- `EMAIL_HOST_PASSWORD`: SMTP password
- `DEFAULT_FROM_EMAIL`: Default sender email
- `SENDGRID_API_KEY`: SendGrid API key (optional)

#### SMS Configuration
- `TWILIO_ACCOUNT_SID`: Twilio account SID
- `TWILIO_AUTH_TOKEN`: Twilio auth token
- `TWILIO_PHONE_NUMBER`: Twilio phone number

#### Notification Settings
- `NOTIFICATION_RATE_LIMIT_PER_MINUTE`: Rate limit per minute (default: 100)
- `NOTIFICATION_MAX_RETRIES`: Maximum retry attempts (default: 3)
- `NOTIFICATION_RETRY_DELAY`: Retry delay in seconds (default: 300)

## API Usage

### Send a Single Notification

```bash
curl -X POST http://localhost:8003/api/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "user@example.com",
    "notification_type": "email",
    "category": "registration",
    "priority": "high",
    "subject": "Welcome to Edulink",
    "message": "Thank you for registering!",
    "source_service": "auth_service"
  }'
```

### Send Bulk Notifications

```bash
curl -X POST http://localhost:8003/api/notifications/bulk/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "email",
    "category": "announcement",
    "priority": "medium",
    "subject": "System Maintenance",
    "message": "Scheduled maintenance tonight.",
    "recipients": [
      {"email": "user1@example.com"},
      {"email": "user2@example.com"}
    ]
  }'
```

### Using Templates

```bash
# Create a template
curl -X POST http://localhost:8003/api/templates/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_email",
    "notification_type": "email",
    "category": "registration",
    "subject": "Welcome {{user_name}}!",
    "message": "Hello {{user_name}}, welcome to {{platform_name}}!",
    "variables": {"user_name": "User name", "platform_name": "Platform name"}
  }'

# Send notification using template
curl -X POST http://localhost:8003/api/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "user@example.com",
    "template_id": "template-uuid-here",
    "template_variables": {
      "user_name": "John Doe",
      "platform_name": "Edulink"
    }
  }'
```

### Check Notification Status

```bash
curl http://localhost:8003/api/notifications/{notification_id}/
```

### Get Statistics

```bash
curl http://localhost:8003/api/stats/
```

## Integration with Other Services

### From Auth Service (Student Registration)

```python
import requests

def send_welcome_email(user_email, user_name):
    notification_data = {
        "recipient_email": user_email,
        "notification_type": "email",
        "category": "registration",
        "priority": "high",
        "template_id": "welcome_template_id",
        "template_variables": {
            "user_name": user_name,
            "platform_name": "Edulink"
        },
        "source_service": "auth_service",
        "reference_id": f"user_registration_{user_id}"
    }
    
    response = requests.post(
        "http://notification_service:8000/api/notifications/",
        json=notification_data
    )
    return response.json()
```

### From Institution Service (Code Validation)

```python
def send_code_validation_sms(phone_number, validation_code):
    notification_data = {
        "recipient_phone": phone_number,
        "notification_type": "sms",
        "category": "verification",
        "priority": "high",
        "message": f"Your Edulink verification code is: {validation_code}",
        "source_service": "institution_service"
    }
    
    response = requests.post(
        "http://notification_service:8000/api/notifications/",
        json=notification_data
    )
    return response.json()
```

## Monitoring and Maintenance

### Health Check

```bash
curl http://localhost:8003/health/
```

### Celery Monitoring

Access Flower at http://localhost:5555/ to monitor Celery tasks.

### Logs

Logs are available in the `logs/` directory:
- `notification_service.log`: Main application logs
- `celery.log`: Celery worker logs

### Cleanup Tasks

The service includes automatic cleanup tasks:
- Old notifications (90+ days) are automatically deleted
- Old logs (30+ days) are automatically deleted
- Failed notifications are automatically retried

### Manual Cleanup

```bash
# Clean up old notifications
docker-compose exec notification_service python manage.py shell -c "
from notifications.tasks import cleanup_old_notifications
cleanup_old_notifications.delay()
"

# Retry failed notifications
docker-compose exec notification_service python manage.py shell -c "
from notifications.tasks import retry_failed_notifications
retry_failed_notifications.delay()
"
```

## Security Considerations

1. **API Authentication**: Implement proper authentication for production
2. **Rate Limiting**: Configure appropriate rate limits
3. **Environment Variables**: Never commit sensitive data to version control
4. **Network Security**: Use proper network isolation in production
5. **Data Encryption**: Ensure database and Redis are properly secured

## Troubleshooting

### Common Issues

1. **Notifications not sending**:
   - Check Celery worker logs
   - Verify email/SMS provider configuration
   - Check notification status in admin interface

2. **High memory usage**:
   - Monitor Redis memory usage
   - Adjust Redis maxmemory settings
   - Check for stuck Celery tasks

3. **Database connection issues**:
   - Verify DATABASE_URL configuration
   - Check PostgreSQL container health
   - Review connection pool settings

### Debug Mode

Enable debug mode for development:

```bash
export DEBUG=True
docker-compose up
```

## Contributing

1. Follow Django and Python best practices
2. Add tests for new features
3. Update documentation
4. Use proper logging
5. Handle errors gracefully

## License

This project is part of the Edulink platform.