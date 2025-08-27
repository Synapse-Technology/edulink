import asyncio
import httpx
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
import json
import os

# Setup logging
logger = logging.getLogger(__name__)

# Setup templates
templates = Jinja2Templates(directory="templates")

# Monitoring router
monitoring_router = APIRouter(prefix="/monitoring", tags=["monitoring"])

class ServiceMonitor:
    """Centralized service monitoring for API Gateway."""
    
    def __init__(self):
        self.services = {
            'auth': 'http://localhost:8001',
            'user': 'http://localhost:8002',
            'internship': 'http://localhost:8003',
            'application': 'http://localhost:8004'
        }
        self.timeout = 10.0
        self.cache = {}
        self.cache_ttl = 60  # Cache for 60 seconds
    
    async def get_service_metrics(self, service_name: str) -> Optional[Dict[str, Any]]:
        """Get metrics from a specific service."""
        if service_name not in self.services:
            return None
        
        # Check cache first
        cache_key = f"{service_name}_metrics"
        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < timedelta(seconds=self.cache_ttl):
                return cached_data
        
        try:
            base_url = self.services[service_name]
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{base_url}/monitoring/metrics/")
                
                if response.status_code == 200:
                    data = response.json()
                    # Cache the result
                    self.cache[cache_key] = (data, datetime.now())
                    return data
                else:
                    logger.warning(f"Failed to get metrics from {service_name}: {response.status_code}")
                    return None
        
        except Exception as e:
            logger.error(f"Error getting metrics from {service_name}: {e}")
            return None
    
    async def get_service_status(self, service_name: str) -> Optional[Dict[str, Any]]:
        """Get status from a specific service."""
        if service_name not in self.services:
            return None
        
        try:
            base_url = self.services[service_name]
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{base_url}/monitoring/status/")
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return {
                        'service': service_name,
                        'status': 'unhealthy',
                        'error': f'HTTP {response.status_code}'
                    }
        
        except Exception as e:
            logger.error(f"Error getting status from {service_name}: {e}")
            return {
                'service': service_name,
                'status': 'unreachable',
                'error': str(e)
            }
    
    async def get_service_alerts(self, service_name: str) -> Optional[Dict[str, Any]]:
        """Get alerts from a specific service."""
        if service_name not in self.services:
            return None
        
        try:
            base_url = self.services[service_name]
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{base_url}/monitoring/alerts/")
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return None
        
        except Exception as e:
            logger.error(f"Error getting alerts from {service_name}: {e}")
            return None
    
    async def get_all_services_overview(self) -> Dict[str, Any]:
        """Get overview of all services."""
        overview = {
            'timestamp': datetime.now().isoformat(),
            'total_services': len(self.services),
            'healthy_services': 0,
            'unhealthy_services': 0,
            'unreachable_services': 0,
            'services': {},
            'alerts': {
                'total': 0,
                'critical': 0,
                'warning': 0
            }
        }
        
        # Get status for all services concurrently
        tasks = []
        for service_name in self.services.keys():
            tasks.append(self.get_service_status(service_name))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, result in enumerate(results):
            service_name = list(self.services.keys())[i]
            
            if isinstance(result, Exception):
                overview['services'][service_name] = {
                    'status': 'error',
                    'error': str(result)
                }
                overview['unreachable_services'] += 1
            elif result:
                overview['services'][service_name] = result
                
                # Count service status
                status = result.get('status', 'unknown')
                if status == 'healthy':
                    overview['healthy_services'] += 1
                elif status in ['unhealthy', 'degraded']:
                    overview['unhealthy_services'] += 1
                else:
                    overview['unreachable_services'] += 1
                
                # Count alerts
                alerts = result.get('alerts', {})
                if alerts:
                    overview['alerts']['total'] += alerts.get('count', 0)
                    overview['alerts']['critical'] += alerts.get('critical', 0)
                    overview['alerts']['warning'] += alerts.get('warning', 0)
        
        return overview

# Global monitor instance
service_monitor = ServiceMonitor()

@monitoring_router.get("/overview")
async def get_monitoring_overview():
    """Get overview of all services monitoring data."""
    try:
        overview = await service_monitor.get_all_services_overview()
        return JSONResponse(content=overview)
    except Exception as e:
        logger.error(f"Error getting monitoring overview: {e}")
        raise HTTPException(status_code=500, detail="Failed to get monitoring overview")

@monitoring_router.get("/services/{service_name}/metrics")
async def get_service_metrics(service_name: str):
    """Get metrics for a specific service."""
    try:
        metrics = await service_monitor.get_service_metrics(service_name)
        if metrics is None:
            raise HTTPException(status_code=404, detail=f"Service {service_name} not found or unreachable")
        return JSONResponse(content=metrics)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting metrics for {service_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service metrics")

@monitoring_router.get("/services/{service_name}/status")
async def get_service_status(service_name: str):
    """Get status for a specific service."""
    try:
        status = await service_monitor.get_service_status(service_name)
        if status is None:
            raise HTTPException(status_code=404, detail=f"Service {service_name} not found")
        return JSONResponse(content=status)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting status for {service_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service status")

@monitoring_router.get("/services/{service_name}/alerts")
async def get_service_alerts(service_name: str):
    """Get alerts for a specific service."""
    try:
        alerts = await service_monitor.get_service_alerts(service_name)
        if alerts is None:
            raise HTTPException(status_code=404, detail=f"Service {service_name} not found or unreachable")
        return JSONResponse(content=alerts)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting alerts for {service_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service alerts")

@monitoring_router.get("/dashboard")
async def get_dashboard_data(
    time_range: str = Query(default="1h", description="Time range for metrics (1h, 6h, 24h, 7d)")
):
    """Get aggregated dashboard data for all services."""
    try:
        dashboard_data = {
            'timestamp': datetime.now().isoformat(),
            'time_range': time_range,
            'services': {}
        }
        
        # Get dashboard data for each service
        tasks = []
        for service_name in service_monitor.services.keys():
            tasks.append(get_service_dashboard_data(service_name, time_range))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, result in enumerate(results):
            service_name = list(service_monitor.services.keys())[i]
            
            if isinstance(result, Exception):
                dashboard_data['services'][service_name] = {
                    'error': str(result)
                }
            else:
                dashboard_data['services'][service_name] = result
        
        return JSONResponse(content=dashboard_data)
    
    except Exception as e:
        logger.error(f"Error getting dashboard data: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard data")

async def get_service_dashboard_data(service_name: str, time_range: str) -> Dict[str, Any]:
    """Get dashboard data for a specific service."""
    try:
        base_url = service_monitor.services[service_name]
        async with httpx.AsyncClient(timeout=service_monitor.timeout) as client:
            response = await client.get(
                f"{base_url}/monitoring/dashboard/",
                params={'range': time_range}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {'error': f'HTTP {response.status_code}'}
    
    except Exception as e:
        return {'error': str(e)}

@monitoring_router.get("/health")
async def monitoring_health_check():
    """Health check for the monitoring system itself."""
    try:
        # Quick health check - just verify we can reach at least one service
        overview = await service_monitor.get_all_services_overview()
        
        healthy_count = overview.get('healthy_services', 0)
        total_count = overview.get('total_services', 0)
        
        if healthy_count > 0:
            status = 'healthy'
        elif total_count > 0:
            status = 'degraded'
        else:
            status = 'unhealthy'
        
        return JSONResponse(content={
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'services_healthy': healthy_count,
            'services_total': total_count
        })
    
    except Exception as e:
        logger.error(f"Error in monitoring health check: {e}")
        return JSONResponse(
            content={
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            },
            status_code=503
        )

@monitoring_router.get("/dashboard/view", response_class=HTMLResponse)
async def monitoring_dashboard_view():
    """Serve the monitoring dashboard HTML page."""
    try:
        # Read the HTML file directly since we're not using request context
        dashboard_path = os.path.join(os.path.dirname(__file__), "templates", "monitoring_dashboard.html")
        with open(dashboard_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dashboard template not found")
    except Exception as e:
        logger.error(f"Error serving dashboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to serve dashboard")