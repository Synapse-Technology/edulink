# Student Registration Workflow Monitoring

Comprehensive monitoring system for the student registration workflow across microservices.

## Quick Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start Monitoring
```bash
python start_monitoring.py
```

### 3. Access Dashboard
Open your browser and go to: http://localhost:8080

## Configuration

Set environment variables to configure service URLs:
```bash
set API_GATEWAY_URL=http://localhost:8000
set AUTH_SERVICE_URL=http://localhost:8001
set USER_SERVICE_URL=http://localhost:8002
set INSTITUTION_SERVICE_URL=http://localhost:8003
set NOTIFICATION_SERVICE_URL=http://localhost:8004
```

## Features

- **Real-time Monitoring**: Live tracking of registration workflows
- **Service Health**: Monitor all microservice health status
- **Performance Metrics**: Response times, success rates, error tracking
- **Interactive Dashboard**: Web-based visualization and control panel
- **Event Tracking**: Cross-service communication monitoring
- **Alerting**: Automated alerts for failures and performance issues

## Files

- `start_monitoring.py` - Main startup script for dashboard
- `monitoring_service.py` - Background monitoring service
- `registration_workflow_monitor.py` - Core monitoring logic
- `dashboard.py` - Web dashboard application
- `templates/dashboard.html` - Dashboard UI template
- `requirements.txt` - Python dependencies

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure all dependencies are installed
   ```bash
   pip install -r requirements.txt
   ```

2. **Port Conflicts**: Change the dashboard port in start_monitoring.py

3. **Service Connection Issues**: Verify microservice URLs in configuration

4. **Permission Errors**: Run with appropriate permissions

### Support

For issues or questions, check the logs in the dashboard or monitoring service output.
