#!/usr/bin/env python3
"""
Student Registration Workflow Monitoring Dashboard

A web-based dashboard for visualizing the student registration workflow
monitoring data across microservices.

Features:
1. Real-time service health status
2. Registration workflow metrics
3. Error tracking and analysis
4. Performance charts and graphs
5. Alert management
6. Historical data visualization
"""

import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn

from registration_workflow_monitor import WorkflowMonitor, WorkflowEvent

app = FastAPI(title="Registration Workflow Monitor Dashboard")

# Setup templates and static files
templates = Jinja2Templates(directory="templates")

# Global monitor instance
monitor: WorkflowMonitor = None
connected_websockets: List[WebSocket] = []

@app.on_event("startup")
async def startup_event():
    """Initialize monitoring on startup"""
    global monitor
    
    config = {
        'API_GATEWAY_URL': os.getenv('API_GATEWAY_URL', 'http://localhost:8000'),
        'AUTH_SERVICE_URL': os.getenv('AUTH_SERVICE_URL', 'http://localhost:8001'),
        'USER_SERVICE_URL': os.getenv('USER_SERVICE_URL', 'http://localhost:8002'),
        'INSTITUTION_SERVICE_URL': os.getenv('INSTITUTION_SERVICE_URL', 'http://localhost:8003'),
        'NOTIFICATION_SERVICE_URL': os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
    }
    
    monitor = WorkflowMonitor(config)
    
    # Start monitoring in background
    asyncio.create_task(monitor.start_monitoring())
    
    # Start WebSocket broadcast task
    asyncio.create_task(broadcast_updates())

@app.get("/", response_class=HTMLResponse)
async def dashboard_home(request: Request):
    """Main dashboard page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/api/dashboard-data")
async def get_dashboard_data():
    """Get current dashboard data"""
    if not monitor:
        return JSONResponse({"error": "Monitor not initialized"}, status_code=503)
    
    return JSONResponse(monitor.get_dashboard_data())

@app.get("/api/service-health")
async def get_service_health():
    """Get service health status"""
    if not monitor:
        return JSONResponse({"error": "Monitor not initialized"}, status_code=503)
    
    health_data = {}
    for service_name, metrics in monitor.service_metrics.items():
        health_data[service_name] = {
            "status": metrics.health_status,
            "response_time": metrics.average_response_time,
            "error_rate": metrics.error_rate * 100,  # Convert to percentage
            "total_requests": metrics.total_requests,
            "last_check": metrics.last_health_check.isoformat() if metrics.last_health_check else None
        }
    
    return JSONResponse(health_data)

@app.get("/api/workflow-metrics")
async def get_workflow_metrics():
    """Get workflow performance metrics"""
    if not monitor:
        return JSONResponse({"error": "Monitor not initialized"}, status_code=503)
    
    # Calculate metrics for different time periods
    now = datetime.now()
    periods = {
        "last_hour": now - timedelta(hours=1),
        "last_24h": now - timedelta(hours=24),
        "last_week": now - timedelta(days=7)
    }
    
    metrics = {}
    for period_name, start_time in periods.items():
        period_events = [e for e in monitor.workflow_events if e.timestamp >= start_time]
        
        registration_starts = [e for e in period_events if e.event_type == 'registration_start']
        registration_completions = [e for e in period_events if e.event_type == 'registration_complete']
        registration_failures = [e for e in period_events if e.event_type == 'registration_failed']
        
        total = len(registration_starts)
        successful = len(registration_completions)
        failed = len(registration_failures)
        
        metrics[period_name] = {
            "total_registrations": total,
            "successful_registrations": successful,
            "failed_registrations": failed,
            "success_rate": (successful / total * 100) if total > 0 else 0,
            "failure_rate": (failed / total * 100) if total > 0 else 0
        }
    
    return JSONResponse(metrics)

@app.get("/api/error-analysis")
async def get_error_analysis():
    """Get error analysis data"""
    if not monitor:
        return JSONResponse({"error": "Monitor not initialized"}, status_code=503)
    
    # Analyze errors from the last 24 hours
    start_time = datetime.now() - timedelta(hours=24)
    error_events = [e for e in monitor.workflow_events 
                   if e.timestamp >= start_time and e.status == 'error']
    
    # Group errors by type and service
    error_by_service = {}
    error_by_type = {}
    
    for event in error_events:
        # By service
        if event.service_name not in error_by_service:
            error_by_service[event.service_name] = 0
        error_by_service[event.service_name] += 1
        
        # By error message
        error_msg = event.error_message or "Unknown error"
        if error_msg not in error_by_type:
            error_by_type[error_msg] = 0
        error_by_type[error_msg] += 1
    
    # Get recent errors for timeline
    recent_errors = [
        {
            "timestamp": e.timestamp.isoformat(),
            "service": e.service_name,
            "event_type": e.event_type,
            "error_message": e.error_message,
            "user_email": e.user_email[:20] + "..." if len(e.user_email) > 20 else e.user_email
        }
        for e in sorted(error_events, key=lambda x: x.timestamp, reverse=True)[:20]
    ]
    
    return JSONResponse({
        "total_errors": len(error_events),
        "errors_by_service": error_by_service,
        "errors_by_type": error_by_type,
        "recent_errors": recent_errors
    })

@app.get("/api/performance-trends")
async def get_performance_trends():
    """Get performance trend data"""
    if not monitor:
        return JSONResponse({"error": "Monitor not initialized"}, status_code=503)
    
    # Load historical metrics snapshots
    today = datetime.now().strftime('%Y%m%d')
    metrics_file = f"metrics_snapshot_{today}.json"
    
    trends = {
        "timestamps": [],
        "service_response_times": {service: [] for service in monitor.service_metrics.keys()},
        "service_error_rates": {service: [] for service in monitor.service_metrics.keys()},
        "registration_rates": []
    }
    
    if os.path.exists(metrics_file):
        try:
            with open(metrics_file, 'r') as f:
                snapshots = json.load(f)
            
            # Get last 24 hours of data (1440 minutes)
            recent_snapshots = snapshots[-1440:] if len(snapshots) > 1440 else snapshots
            
            for snapshot in recent_snapshots:
                trends["timestamps"].append(snapshot["timestamp"])
                
                # Service metrics
                for service_name in monitor.service_metrics.keys():
                    if service_name in snapshot["service_metrics"]:
                        service_data = snapshot["service_metrics"][service_name]
                        trends["service_response_times"][service_name].append(
                            service_data.get("average_response_time", 0)
                        )
                        trends["service_error_rates"][service_name].append(
                            service_data.get("error_rate", 0) * 100
                        )
                    else:
                        trends["service_response_times"][service_name].append(0)
                        trends["service_error_rates"][service_name].append(0)
        
        except Exception as e:
            print(f"Error loading metrics file: {e}")
    
    return JSONResponse(trends)

@app.get("/api/alerts")
async def get_alerts():
    """Get current alerts"""
    alerts = []
    alert_file = 'workflow_alerts.json'
    
    if os.path.exists(alert_file):
        try:
            with open(alert_file, 'r') as f:
                all_alerts = json.load(f)
            
            # Get alerts from last 24 hours
            cutoff_time = datetime.now() - timedelta(hours=24)
            recent_alerts = [
                alert for alert in all_alerts
                if datetime.fromisoformat(alert['timestamp']) >= cutoff_time
            ]
            
            alerts = sorted(recent_alerts, key=lambda x: x['timestamp'], reverse=True)
        
        except Exception as e:
            print(f"Error loading alerts: {e}")
    
    return JSONResponse(alerts)

@app.post("/api/simulate-registration")
async def simulate_registration(request: Request):
    """Simulate a registration workflow for testing"""
    if not monitor:
        return JSONResponse({"error": "Monitor not initialized"}, status_code=503)
    
    data = await request.json()
    user_email = data.get('email', 'test@example.com')
    registration_type = data.get('type', 'university_code')
    
    # Generate workflow events
    workflow_id = f"sim_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_email.split('@')[0]}"
    
    events = [
        WorkflowEvent(
            event_id=workflow_id,
            event_type='registration_start',
            service_name='api_gateway',
            user_email=user_email,
            timestamp=datetime.now(),
            metadata={'registration_type': registration_type}
        ),
        WorkflowEvent(
            event_id=workflow_id,
            event_type='auth_validation',
            service_name='auth_service',
            user_email=user_email,
            timestamp=datetime.now() + timedelta(milliseconds=100),
            duration_ms=100
        ),
        WorkflowEvent(
            event_id=workflow_id,
            event_type='profile_creation',
            service_name='user_service',
            user_email=user_email,
            timestamp=datetime.now() + timedelta(milliseconds=300),
            duration_ms=200
        ),
        WorkflowEvent(
            event_id=workflow_id,
            event_type='institution_validation',
            service_name='institution_service',
            user_email=user_email,
            timestamp=datetime.now() + timedelta(milliseconds=500),
            duration_ms=200
        ),
        WorkflowEvent(
            event_id=workflow_id,
            event_type='notification_sent',
            service_name='notification_service',
            user_email=user_email,
            timestamp=datetime.now() + timedelta(milliseconds=700),
            duration_ms=200
        ),
        WorkflowEvent(
            event_id=workflow_id,
            event_type='registration_complete',
            service_name='api_gateway',
            user_email=user_email,
            timestamp=datetime.now() + timedelta(milliseconds=800),
            duration_ms=800
        )
    ]
    
    # Record events
    for event in events:
        monitor.record_workflow_event(event)
    
    return JSONResponse({
        "message": "Registration workflow simulated successfully",
        "workflow_id": workflow_id,
        "events_created": len(events)
    })

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    connected_websockets.append(websocket)
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_websockets.remove(websocket)

async def broadcast_updates():
    """Broadcast updates to connected WebSocket clients"""
    while True:
        if connected_websockets and monitor:
            try:
                # Get current dashboard data
                dashboard_data = monitor.get_dashboard_data()
                
                # Broadcast to all connected clients
                disconnected = []
                for websocket in connected_websockets:
                    try:
                        await websocket.send_json({
                            "type": "dashboard_update",
                            "data": dashboard_data,
                            "timestamp": datetime.now().isoformat()
                        })
                    except Exception:
                        disconnected.append(websocket)
                
                # Remove disconnected clients
                for ws in disconnected:
                    if ws in connected_websockets:
                        connected_websockets.remove(ws)
                
            except Exception as e:
                print(f"Broadcast error: {e}")
        
        await asyncio.sleep(5)  # Update every 5 seconds

if __name__ == "__main__":
    uvicorn.run(
        "dashboard:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info"
    )