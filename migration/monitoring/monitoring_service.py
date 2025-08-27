#!/usr/bin/env python3
"""Background monitoring service for Student Registration Workflow"""

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
        print("
Stopping monitoring service...")
        await monitor.stop_monitoring()
        
        # Generate final report
        report = await monitor.generate_monitoring_report()
        print(f"Final report generated: monitoring_report_{report['report_period']['end_time'].replace(':', '-')}.json")

if __name__ == "__main__":
    asyncio.run(main())
