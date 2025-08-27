#!/usr/bin/env python3
"""Startup script for Student Registration Workflow Monitoring"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    # Set environment variables
    env = os.environ.copy()
    env.update({
        'API_GATEWAY_URL': os.getenv('API_GATEWAY_URL', 'http://localhost:8000'),
        'AUTH_SERVICE_URL': os.getenv('AUTH_SERVICE_URL', 'http://localhost:8001'),
        'USER_SERVICE_URL': os.getenv('USER_SERVICE_URL', 'http://localhost:8002'),
        'INSTITUTION_SERVICE_URL': os.getenv('INSTITUTION_SERVICE_URL', 'http://localhost:8003'),
        'NOTIFICATION_SERVICE_URL': os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
    })
    
    print("Starting Student Registration Workflow Monitoring")
    print(f"Dashboard will be available at: http://localhost:8080")
    print("Press Ctrl+C to stop")
    
    # Start dashboard using uvicorn command
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "dashboard:app",
            "--host", "0.0.0.0",
            "--port", "8080",
            "--log-level", "info"
        ], env=env, cwd=Path(__file__).parent)
    except KeyboardInterrupt:
        print("\nShutting down monitoring dashboard...")

if __name__ == "__main__":
    main()
