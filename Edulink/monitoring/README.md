# Edulink Monitoring System

A comprehensive admin monitoring system for the Edulink platform that provides real-time system health monitoring, interactive dashboards, and automated alerting capabilities.

## Features

### 🔍 System Health Monitoring
- **Real-time Resource Monitoring**: CPU, memory, and disk usage tracking
- **Database Connection Verification**: Continuous database health checks
- **Cache System Monitoring**: Redis cache status and performance
- **Service Uptime Tracking**: Monitor critical system services
- **Automated Threshold Alerts**: Configurable warning and critical thresholds

### 📊 Interactive Dashboard
- **Live Metrics Display**: Real-time system status with auto-refresh
- **Visual Charts and Graphs**: Performance trends and historical data
- **Customizable Widgets**: Modular dashboard components
- **Mobile-Responsive Design**: Optimized for all devices
- **Quick Action Controls**: One-click system operations

### 🛡️ Admin Integration
- **Seamless Django Admin Integration**: Built into existing admin interface
- **Role-Based Access Control**: Secure monitoring access
- **Custom Admin Dashboard**: Dedicated monitoring admin panel
- **Audit Logging**: Complete activity tracking
- **Export Capabilities**: CSV reports for analysis

### 🚨 Alert System
- **Automated Notifications**: Email alerts for critical issues
- **Configurable Thresholds**: Customizable warning levels
- **Alert Management**: Acknowledge and resolve alerts
- **Auto-Resolution**: Smart alert resolution when conditions improve

## Installation

### 1. Add to Django Settings

Add the monitoring app to your `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    # ... other apps
    'monitoring',
]
```

### 2. Configure Middleware

Add monitoring middleware to `MIDDLEWARE` in settings:

```python
MIDDLEWARE = [
    # ... other middleware
    'monitoring.middleware.APIMonitoringMiddleware',
    'monitoring.middleware.AuditLoggingMiddleware',
    'monitoring.middleware.SecurityMonitoringMiddleware',
]
```

### 3. URL Configuration

Include monitoring URLs in your main `urls.py`:

```python
from django.urls import path, include

urlpatterns = [
    # ... other URLs
    path('monitoring/', include('monitoring.urls')),
]
```

### 4. Database Migration

Run migrations to create monitoring tables:

```bash
python manage.py makemigrations monitoring
python manage.py migrate
```

### 5. Create Monitoring Configuration

Create initial monitoring configuration:

```bash
python manage.py shell
```

```python
from monitoring.models import MonitoringConfiguration
config = MonitoringConfiguration.objects.create(
    health_check_enabled=True,
    health_check_interval=300,  # 5 minutes
    api_monitoring_enabled=True,
    alerts_enabled=True,
    email_notifications=True,
    cpu_warning_threshold=70.0,
    cpu_critical_threshold=90.0,
    memory_warning_threshold=80.0,
    memory_critical_threshold=95.0,
    disk_warning_threshold=85.0,
    disk_critical_threshold=95.0,
)
```

## Usage

### Accessing the Dashboard

1. **Main Monitoring Dashboard**: Visit `/monitoring/` for the full-featured dashboard
2. **Admin Integration**: Access via Django admin at `/admin/` → Monitoring section
3. **Custom Admin Dashboard**: Available in the admin interface with enhanced features

### Running Health Checks

#### Manual Health Check
```bash
python manage.py run_monitoring
```

#### Automated Monitoring with Alerts
```bash
python manage.py run_monitoring --check-alerts --send-notifications
```

#### Data Cleanup
```bash
python manage.py run_monitoring --cleanup
```

### Setting Up Automated Monitoring

Add to your crontab for automated monitoring:

```bash
# Run health checks every 5 minutes
*/5 * * * * /path/to/python /path/to/manage.py run_monitoring

# Check alerts and send notifications every 15 minutes
*/15 * * * * /path/to/python /path/to/manage.py run_monitoring --check-alerts --send-notifications

# Daily cleanup at 2 AM
0 2 * * * /path/to/python /path/to/manage.py run_monitoring --cleanup
```

### Configuring Email Notifications

Ensure your Django settings include email configuration:

```python
# Email settings for notifications
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'your-smtp-server.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@domain.com'
EMAIL_HOST_PASSWORD = 'your-password'
DEFAULT_FROM_EMAIL = 'monitoring@yourdomain.com'

# Admin emails for notifications
ADMINS = [
    ('Admin Name', 'admin@yourdomain.com'),
]
```

## API Endpoints

### Health Check Endpoints
- `GET /monitoring/health/` - Basic health check
- `GET /monitoring/health/detailed/` - Detailed system health

### Metrics and Dashboard
- `GET /monitoring/metrics/` - System metrics API
- `GET /monitoring/dashboard/` - Dashboard data API
- `GET /monitoring/` - Interactive dashboard UI

### Alert Management
- `GET /monitoring/alerts/` - List active alerts
- `GET /monitoring/alerts/{id}/` - Alert details
- `POST /monitoring/alerts/{id}/` - Acknowledge/resolve alerts

### Configuration
- `GET /monitoring/config/` - Get monitoring configuration
- `POST /monitoring/config/` - Update configuration

## Models

### SystemHealthCheck
Stores system health check results including CPU, memory, disk usage, and service status.

### APIMetrics
Tracks API performance metrics including response times, status codes, and user activity.

### SystemAlert
Manages system alerts with severity levels, status tracking, and resolution notes.

### MonitoringConfiguration
Stores monitoring settings, thresholds, and notification preferences.

## Security Features

- **Authentication Required**: All monitoring endpoints require authentication
- **Role-Based Access**: Admin-only access to sensitive monitoring data
- **Audit Logging**: Complete logging of all monitoring activities
- **Data Sanitization**: Sensitive data filtering in logs
- **CSRF Protection**: All forms protected against CSRF attacks

## Performance Considerations

- **Efficient Queries**: Optimized database queries with proper indexing
- **Caching**: Redis caching for frequently accessed data
- **Async Processing**: Background task processing with Celery
- **Data Retention**: Configurable data cleanup to manage storage
- **Minimal Overhead**: Lightweight middleware with skip conditions

## Troubleshooting

### Common Issues

1. **Health Check Failures**
   - Check database connectivity
   - Verify Redis cache configuration
   - Ensure proper permissions for system metrics

2. **Dashboard Not Loading**
   - Verify static files are served correctly
   - Check JavaScript console for errors
   - Ensure Bootstrap and Chart.js are loading

3. **Alerts Not Sending**
   - Verify email configuration in settings
   - Check ADMINS setting for recipient emails
   - Review monitoring configuration for enabled notifications

4. **High Resource Usage**
   - Adjust monitoring intervals in configuration
   - Enable data cleanup with appropriate retention periods
   - Review middleware skip conditions

### Debug Mode

Enable debug logging for monitoring:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': 'monitoring.log',
        },
    },
    'loggers': {
        'monitoring': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
```

## Contributing

When contributing to the monitoring system:

1. Follow Django best practices
2. Add tests for new features
3. Update documentation
4. Ensure backward compatibility
5. Test performance impact

## License

This monitoring system is part of the Edulink platform and follows the same licensing terms.