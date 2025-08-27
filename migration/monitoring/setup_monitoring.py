#!/usr/bin/env python3
"""
Student Registration Workflow Monitoring Setup Script

This script sets up and initializes the complete monitoring system
for the student registration workflow across microservices.

Features:
1. Environment validation
2. Service health checks
3. Monitoring system initialization
4. Dashboard deployment
5. Configuration management
6. Automated testing
"""

import asyncio
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import httpx

class MonitoringSetup:
    """Setup and configuration manager for the monitoring system"""
    
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.config = self._load_config()
        self.services = {
            'api_gateway': self.config.get('API_GATEWAY_URL', 'http://localhost:8000'),
            'auth_service': self.config.get('AUTH_SERVICE_URL', 'http://localhost:8001'),
            'user_service': self.config.get('USER_SERVICE_URL', 'http://localhost:8002'),
            'institution_service': self.config.get('INSTITUTION_SERVICE_URL', 'http://localhost:8003'),
            'notification_service': self.config.get('NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
        }
        self.dashboard_port = int(self.config.get('DASHBOARD_PORT', '8080'))
        
    def _load_config(self) -> Dict[str, str]:
        """Load configuration from environment and config files"""
        config = {}
        
        # Load from environment variables
        config.update({
            key: value for key, value in os.environ.items()
            if key.startswith(('API_', 'AUTH_', 'USER_', 'INSTITUTION_', 'NOTIFICATION_', 'DASHBOARD_'))
        })
        
        # Load from .env file if it exists
        env_file = self.base_dir / '.env'
        if env_file.exists():
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip().strip('"\'')
        
        return config
    
    async def setup_monitoring(self) -> bool:
        """Complete monitoring setup process"""
        print("🚀 Starting Student Registration Workflow Monitoring Setup")
        print("=" * 60)
        
        try:
            # Step 1: Validate environment
            print("\n📋 Step 1: Validating Environment")
            if not await self._validate_environment():
                print("❌ Environment validation failed")
                return False
            print("✅ Environment validation passed")
            
            # Step 2: Install dependencies
            print("\n📦 Step 2: Installing Dependencies")
            if not await self._install_dependencies():
                print("❌ Dependency installation failed")
                return False
            print("✅ Dependencies installed successfully")
            
            # Step 3: Check service availability
            print("\n🔍 Step 3: Checking Service Availability")
            service_status = await self._check_services()
            self._display_service_status(service_status)
            
            # Step 4: Initialize monitoring directories
            print("\n📁 Step 4: Initializing Monitoring Directories")
            self._create_monitoring_directories()
            print("✅ Monitoring directories created")
            
            # Step 5: Generate configuration files
            print("\n⚙️ Step 5: Generating Configuration Files")
            await self._generate_config_files()
            print("✅ Configuration files generated")
            
            # Step 6: Test monitoring components
            print("\n🧪 Step 6: Testing Monitoring Components")
            if not await self._test_monitoring_components():
                print("⚠️ Some monitoring components failed tests")
            else:
                print("✅ All monitoring components tested successfully")
            
            # Step 7: Start monitoring system
            print("\n🎯 Step 7: Starting Monitoring System")
            await self._start_monitoring_system()
            
            print("\n🎉 Monitoring Setup Complete!")
            print("=" * 60)
            print(f"📊 Dashboard URL: http://localhost:{self.dashboard_port}")
            print(f"📝 Logs Directory: {self.base_dir / 'logs'}")
            print(f"📈 Metrics Directory: {self.base_dir / 'metrics'}")
            print(f"🚨 Alerts File: {self.base_dir / 'workflow_alerts.json'}")
            
            return True
            
        except Exception as e:
            print(f"❌ Setup failed: {str(e)}")
            return False
    
    async def _validate_environment(self) -> bool:
        """Validate the environment and prerequisites"""
        checks = []
        
        # Check Python version
        python_version = sys.version_info
        if python_version >= (3, 8):
            checks.append(("Python version", True, f"{python_version.major}.{python_version.minor}.{python_version.micro}"))
        else:
            checks.append(("Python version", False, f"{python_version.major}.{python_version.minor}.{python_version.micro} (requires 3.8+)"))
        
        # Check required files
        required_files = [
            'registration_workflow_monitor.py',
            'dashboard.py',
            'requirements.txt',
            'templates/dashboard.html'
        ]
        
        for file_path in required_files:
            file_exists = (self.base_dir / file_path).exists()
            checks.append((f"File: {file_path}", file_exists, "Found" if file_exists else "Missing"))
        
        # Check network connectivity
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get('https://httpbin.org/status/200', timeout=5.0)
                network_ok = response.status_code == 200
        except:
            network_ok = False
        
        checks.append(("Network connectivity", network_ok, "Available" if network_ok else "Limited"))
        
        # Display results
        for check_name, passed, details in checks:
            status = "✅" if passed else "❌"
            print(f"  {status} {check_name}: {details}")
        
        return all(check[1] for check in checks)
    
    async def _install_dependencies(self) -> bool:
        """Install required Python dependencies"""
        requirements_file = self.base_dir / 'requirements.txt'
        
        if not requirements_file.exists():
            print("  ❌ requirements.txt not found")
            return False
        
        try:
            print("  📦 Installing packages...")
            result = subprocess.run([
                sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                print("  ✅ All packages installed successfully")
                return True
            else:
                print(f"  ❌ Installation failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print("  ❌ Installation timed out")
            return False
        except Exception as e:
            print(f"  ❌ Installation error: {str(e)}")
            return False
    
    async def _check_services(self) -> Dict[str, Dict[str, any]]:
        """Check the availability of all microservices"""
        service_status = {}
        
        async with httpx.AsyncClient() as client:
            for service_name, service_url in self.services.items():
                try:
                    start_time = time.time()
                    response = await client.get(f"{service_url}/health", timeout=10.0)
                    response_time = (time.time() - start_time) * 1000
                    
                    service_status[service_name] = {
                        'available': response.status_code == 200,
                        'response_time': response_time,
                        'status_code': response.status_code,
                        'url': service_url,
                        'error': None
                    }
                    
                except Exception as e:
                    service_status[service_name] = {
                        'available': False,
                        'response_time': None,
                        'status_code': None,
                        'url': service_url,
                        'error': str(e)
                    }
        
        return service_status
    
    def _display_service_status(self, service_status: Dict[str, Dict[str, any]]):
        """Display service status in a formatted table"""
        print("\n  Service Status:")
        print("  " + "-" * 70)
        print(f"  {'Service':<20} {'Status':<12} {'Response Time':<15} {'URL':<20}")
        print("  " + "-" * 70)
        
        for service_name, status in service_status.items():
            status_text = "✅ Available" if status['available'] else "❌ Unavailable"
            response_time = f"{status['response_time']:.0f}ms" if status['response_time'] else "N/A"
            url = status['url'].replace('http://', '').replace('https://', '')
            
            print(f"  {service_name:<20} {status_text:<12} {response_time:<15} {url:<20}")
            
            if status['error']:
                print(f"    Error: {status['error']}")
        
        print("  " + "-" * 70)
        
        available_count = sum(1 for s in service_status.values() if s['available'])
        total_count = len(service_status)
        print(f"\n  📊 Services Available: {available_count}/{total_count}")
    
    def _create_monitoring_directories(self):
        """Create necessary directories for monitoring"""
        directories = [
            'logs',
            'metrics',
            'alerts',
            'reports',
            'templates',
            'static'
        ]
        
        for directory in directories:
            dir_path = self.base_dir / directory
            dir_path.mkdir(exist_ok=True)
            print(f"  📁 Created: {directory}/")
    
    async def _generate_config_files(self):
        """Generate configuration files for monitoring"""
        # Generate monitoring configuration
        monitoring_config = {
            'services': self.services,
            'dashboard': {
                'port': self.dashboard_port,
                'host': '0.0.0.0',
                'debug': self.config.get('DEBUG', 'false').lower() == 'true'
            },
            'monitoring': {
                'health_check_interval': 30,
                'metrics_collection_interval': 60,
                'alert_check_interval': 60,
                'workflow_timeout_minutes': 5
            },
            'alerting': {
                'error_rate_threshold': 0.1,
                'response_time_threshold': 5000,
                'failure_rate_threshold': 0.2
            },
            'logging': {
                'level': 'INFO',
                'file': 'logs/monitoring.log',
                'max_size': '10MB',
                'backup_count': 5
            }
        }
        
        config_file = self.base_dir / 'monitoring_config.json'
        with open(config_file, 'w') as f:
            json.dump(monitoring_config, f, indent=2)
        
        print(f"  ⚙️ Generated: monitoring_config.json")
        
        # Generate environment file
        env_file = self.base_dir / '.env'
        if not env_file.exists():
            env_content = f"""# Student Registration Workflow Monitoring Configuration

# Service URLs
API_GATEWAY_URL=http://localhost:8000
AUTH_SERVICE_URL=http://localhost:8001
USER_SERVICE_URL=http://localhost:8002
INSTITUTION_SERVICE_URL=http://localhost:8003
NOTIFICATION_SERVICE_URL=http://localhost:8004

# Dashboard Configuration
DASHBOARD_PORT=8080
DASHBOARD_HOST=0.0.0.0

# Monitoring Settings
DEBUG=false
LOG_LEVEL=INFO

# Alert Settings
ALERT_EMAIL=admin@edulink.com
SLACK_WEBHOOK_URL=

# Database (if using persistent storage)
REDIS_URL=redis://localhost:6379
MONGO_URL=mongodb://localhost:27017/monitoring
"""
            
            with open(env_file, 'w') as f:
                f.write(env_content)
            
            print(f"  ⚙️ Generated: .env")
    
    async def _test_monitoring_components(self) -> bool:
        """Test monitoring components"""
        tests_passed = 0
        total_tests = 0
        
        # Test 1: Import monitoring modules
        total_tests += 1
        try:
            from registration_workflow_monitor import WorkflowMonitor, WorkflowEvent
            print("  ✅ Monitoring modules import successfully")
            tests_passed += 1
        except Exception as e:
            print(f"  ❌ Failed to import monitoring modules: {str(e)}")
        
        # Test 2: Create monitor instance
        total_tests += 1
        try:
            monitor = WorkflowMonitor(self.config)
            print("  ✅ Monitor instance created successfully")
            tests_passed += 1
        except Exception as e:
            print(f"  ❌ Failed to create monitor instance: {str(e)}")
        
        # Test 3: Test dashboard import
        total_tests += 1
        try:
            import dashboard
            print("  ✅ Dashboard module imports successfully")
            tests_passed += 1
        except Exception as e:
            print(f"  ❌ Failed to import dashboard module: {str(e)}")
        
        # Test 4: Test configuration loading
        total_tests += 1
        try:
            config_file = self.base_dir / 'monitoring_config.json'
            if config_file.exists():
                with open(config_file, 'r') as f:
                    config = json.load(f)
                print("  ✅ Configuration file loads successfully")
                tests_passed += 1
            else:
                print("  ❌ Configuration file not found")
        except Exception as e:
            print(f"  ❌ Failed to load configuration: {str(e)}")
        
        print(f"\n  📊 Tests Passed: {tests_passed}/{total_tests}")
        return tests_passed == total_tests
    
    async def _start_monitoring_system(self):
        """Start the monitoring system components"""
        print("  🎯 Starting monitoring components...")
        
        # Create startup script
        startup_script = self.base_dir / 'start_monitoring.py'
        startup_content = """#!/usr/bin/env python3
\"\"\"Startup script for Student Registration Workflow Monitoring\"\"\"

import asyncio
import os
import sys
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from registration_workflow_monitor import WorkflowMonitor
import dashboard
import uvicorn

async def main():
    # Load configuration
    config = {
        'API_GATEWAY_URL': os.getenv('API_GATEWAY_URL', 'http://localhost:8000'),
        'AUTH_SERVICE_URL': os.getenv('AUTH_SERVICE_URL', 'http://localhost:8001'),
        'USER_SERVICE_URL': os.getenv('USER_SERVICE_URL', 'http://localhost:8002'),
        'INSTITUTION_SERVICE_URL': os.getenv('INSTITUTION_SERVICE_URL', 'http://localhost:8003'),
        'NOTIFICATION_SERVICE_URL': os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
    }
    
    print("🚀 Starting Student Registration Workflow Monitoring")
    print(f"📊 Dashboard will be available at: http://localhost:{dashboard_port}")
    print("Press Ctrl+C to stop")
    
    # Start dashboard
    uvicorn.run(
        "dashboard:app",
        host="0.0.0.0",
        port={dashboard_port},
        log_level="info"
    )

if __name__ == "__main__":
    asyncio.run(main())
""".format(dashboard_port=self.dashboard_port)
        
        with open(startup_script, 'w') as f:
            f.write(startup_content)
        
        print(f"  ✅ Created startup script: start_monitoring.py")
        
        # Create monitoring service script
        service_script = self.base_dir / 'monitoring_service.py'
        service_content = """#!/usr/bin/env python3
\"\"\"Background monitoring service for Student Registration Workflow\"\"\"

import asyncio
import os
import sys
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from registration_workflow_monitor import WorkflowMonitor

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
        print("🔍 Starting background monitoring service...")
        await monitor.start_monitoring()
    except KeyboardInterrupt:
        print("\n⏹️ Stopping monitoring service...")
        await monitor.stop_monitoring()
        
        # Generate final report
        report = await monitor.generate_monitoring_report()
        print(f"📊 Final report generated: monitoring_report_{report['report_period']['end_time'].replace(':', '-')}.json")

if __name__ == "__main__":
    asyncio.run(main())
"""
        
        with open(service_script, 'w') as f:
            f.write(service_content)
        
        print(f"  ✅ Created monitoring service: monitoring_service.py")
        
        # Create README
        readme_file = self.base_dir / 'README.md'
        readme_content = f"""# Student Registration Workflow Monitoring

Comprehensive monitoring system for the student registration workflow across microservices.

## Quick Start

### 1. Start Complete Monitoring System
```bash
python start_monitoring.py
```
This starts both the monitoring service and web dashboard.

### 2. Start Background Monitoring Only
```bash
python monitoring_service.py
```
This starts only the background monitoring without the web dashboard.

### 3. Start Dashboard Only
```bash
python dashboard.py
```
This starts only the web dashboard (requires monitoring service to be running separately).

## Access Points

- **Dashboard**: http://localhost:{self.dashboard_port}
- **API Endpoints**: http://localhost:{self.dashboard_port}/api/
- **WebSocket**: ws://localhost:{self.dashboard_port}/ws

## Configuration

Edit `.env` file to configure service URLs and monitoring settings:

```env
API_GATEWAY_URL=http://localhost:8000
AUTH_SERVICE_URL=http://localhost:8001
USER_SERVICE_URL=http://localhost:8002
INSTITUTION_SERVICE_URL=http://localhost:8003
NOTIFICATION_SERVICE_URL=http://localhost:8004
DASHBOARD_PORT=8080
```

## Features

### Real-time Monitoring
- Service health status
- Registration workflow tracking
- Performance metrics
- Error analysis
- Alert management

### Web Dashboard
- Interactive charts and graphs
- Real-time updates via WebSocket
- Service status overview
- Error tracking and analysis
- Registration simulation

### API Endpoints
- `/api/dashboard-data` - Current dashboard data
- `/api/service-health` - Service health status
- `/api/workflow-metrics` - Workflow performance metrics
- `/api/error-analysis` - Error analysis data
- `/api/alerts` - Current alerts
- `/api/simulate-registration` - Simulate registration workflow

## File Structure

```
monitoring/
├── registration_workflow_monitor.py  # Core monitoring logic
├── dashboard.py                       # Web dashboard
├── start_monitoring.py               # Complete system startup
├── monitoring_service.py              # Background monitoring only
├── setup_monitoring.py               # Setup and configuration
├── requirements.txt                   # Python dependencies
├── monitoring_config.json             # Monitoring configuration
├── .env                              # Environment variables
├── templates/
│   └── dashboard.html                # Dashboard HTML template
├── logs/                             # Log files
├── metrics/                          # Metrics snapshots
├── alerts/                           # Alert history
└── reports/                          # Generated reports
```

## Monitoring Data

### Logs
- `logs/monitoring.log` - Main monitoring log
- `workflow_monitor.log` - Workflow-specific events

### Metrics
- `metrics_snapshot_YYYYMMDD.json` - Daily metrics snapshots
- Real-time metrics via API endpoints

### Alerts
- `workflow_alerts.json` - Alert history
- Real-time alerts via dashboard

### Reports
- `monitoring_report_YYYYMMDD_HHMMSS.json` - Periodic monitoring reports

## Troubleshooting

### Common Issues

1. **Services not responding**
   - Check if microservices are running
   - Verify service URLs in configuration
   - Check network connectivity

2. **Dashboard not loading**
   - Ensure port {self.dashboard_port} is available
   - Check for dependency installation issues
   - Review dashboard logs

3. **Missing data**
   - Verify monitoring service is running
   - Check service health endpoints
   - Review monitoring logs

### Support

For issues and questions:
1. Check the logs in `logs/` directory
2. Review the monitoring configuration
3. Verify all services are accessible
4. Check the setup output for any errors
"""
        
        with open(readme_file, 'w') as f:
            f.write(readme_content)
        
        print(f"  ✅ Created documentation: README.md")
        
        print("\n  🎯 Monitoring system is ready to start!")
        print(f"  📝 Run: python start_monitoring.py")
        print(f"  🌐 Dashboard: http://localhost:{self.dashboard_port}")

async def main():
    """Main setup execution"""
    setup = MonitoringSetup()
    
    try:
        success = await setup.setup_monitoring()
        
        if success:
            print("\n🎉 Setup completed successfully!")
            
            # Ask user if they want to start monitoring now
            response = input("\n🚀 Would you like to start the monitoring system now? (y/n): ")
            if response.lower() in ['y', 'yes']:
                print("\n🎯 Starting monitoring system...")
                os.system(f"python {setup.base_dir / 'start_monitoring.py'}")
            else:
                print("\n📝 To start monitoring later, run: python start_monitoring.py")
        else:
            print("\n❌ Setup failed. Please check the errors above and try again.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️ Setup interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n💥 Unexpected error during setup: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())