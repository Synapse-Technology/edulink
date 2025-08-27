#!/usr/bin/env python3
"""
Quick Setup for Student Registration Workflow Monitoring

This script creates the necessary files without installing dependencies.
You can install dependencies manually using: pip install -r requirements.txt
"""

import os
import sys
from pathlib import Path

def create_startup_script(dashboard_port=8080):
    """Create the startup script"""
    startup_content = f"""#!/usr/bin/env python3
\"\"\"Startup script for Student Registration Workflow Monitoring\"\"\"

import os
import sys
import subprocess
from pathlib import Path

def main():
    # Set environment variables
    env = os.environ.copy()
    env.update({{
        'API_GATEWAY_URL': os.getenv('API_GATEWAY_URL', 'http://localhost:8000'),
        'AUTH_SERVICE_URL': os.getenv('AUTH_SERVICE_URL', 'http://localhost:8001'),
        'USER_SERVICE_URL': os.getenv('USER_SERVICE_URL', 'http://localhost:8002'),
        'INSTITUTION_SERVICE_URL': os.getenv('INSTITUTION_SERVICE_URL', 'http://localhost:8003'),
        'NOTIFICATION_SERVICE_URL': os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
    }})
    
    print("Starting Student Registration Workflow Monitoring")
    print(f"Dashboard will be available at: http://localhost:{dashboard_port}")
    print("Press Ctrl+C to stop")
    
    # Start dashboard using uvicorn command
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "dashboard:app",
            "--host", "0.0.0.0",
            "--port", "{dashboard_port}",
            "--log-level", "info"
        ], env=env, cwd=Path(__file__).parent)
    except KeyboardInterrupt:
        print("\\nShutting down monitoring dashboard...")

if __name__ == "__main__":
    main()
"""
    
    with open('start_monitoring.py', 'w') as f:
        f.write(startup_content)
    print("Created start_monitoring.py")

def create_monitoring_service():
    """Create the monitoring service script"""
    service_content = """#!/usr/bin/env python3
\"\"\"Background monitoring service for Student Registration Workflow\"\"\"

import asyncio
import os
import sys
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from registration_workflow_monitor import WorkflowMonitor
except ImportError as e:
    print(f"ERROR: Missing dependency: {e}")
    print("Please install dependencies: pip install -r requirements.txt")
    sys.exit(1)

async def main():
    # Load configuration
    config = {
        'API_GATEWAY_URL': os.getenv('API_GATEWAY_URL', 'http://localhost:8000'),
        'AUTH_SERVICE_URL': os.getenv('AUTH_SERVICE_URL', 'http://localhost:8001'),
        'USER_SERVICE_URL': os.getenv('USER_SERVICE_URL', 'http://localhost:8002'),
        'INSTITUTION_SERVICE_URL': os.getenv('INSTITUTION_SERVICE_URL', 'http://localhost:8003'),
        'NOTIFICATION_SERVICE_URL': os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
    }
    
    monitor = WorkflowMonitor(config)
    
    try:
        print("Starting background monitoring service...")
        await monitor.start_monitoring()
    except KeyboardInterrupt:
        print("\nStopping monitoring service...")
        await monitor.stop_monitoring()
        
        # Generate final report
        report = await monitor.generate_monitoring_report()
        print(f"Final report generated: monitoring_report_{report['report_period']['end_time'].replace(':', '-')}.json")

if __name__ == "__main__":
    asyncio.run(main())
"""
    
    with open('monitoring_service.py', 'w') as f:
        f.write(service_content)
    print("Created monitoring_service.py")

def create_readme():
    """Create README with setup instructions"""
    readme_content = """# Student Registration Workflow Monitoring

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
"""
    
    with open('README.md', 'w') as f:
        f.write(readme_content)
    print("Created README.md")

def main():
    """Main setup function"""
    print("Quick Setup for Student Registration Workflow Monitoring")
    print("=" * 60)
    
    # Change to monitoring directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    try:
        create_startup_script()
        create_monitoring_service()
        create_readme()
        
        print("\nSetup completed successfully!")
        print("\nNext Steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Start monitoring: python start_monitoring.py")
        print("3. Open dashboard: http://localhost:8080")
        
    except Exception as e:
        print(f"\nSetup failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()