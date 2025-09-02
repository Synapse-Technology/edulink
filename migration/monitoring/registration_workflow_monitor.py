#!/usr/bin/env python3
"""
Student Registration Workflow Monitoring and Logging

This module provides comprehensive monitoring and logging for the
cross-service student registration workflow in the microservices architecture.

Features:
1. Real-time workflow monitoring
2. Performance metrics collection
3. Error tracking and alerting
4. Service health monitoring
5. Registration success/failure analytics
6. Cross-service communication tracking
7. Dashboard for workflow visualization
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import httpx
import os
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('workflow_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class WorkflowEvent:
    """Represents a workflow event"""
    event_id: str
    event_type: str  # 'registration_start', 'auth_complete', 'profile_created', etc.
    service_name: str
    user_email: str
    timestamp: datetime
    duration_ms: Optional[float] = None
    status: str = 'success'  # 'success', 'error', 'warning'
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class ServiceMetrics:
    """Service performance metrics"""
    service_name: str
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    average_response_time: float = 0.0
    last_health_check: Optional[datetime] = None
    health_status: str = 'unknown'  # 'healthy', 'unhealthy', 'unknown'
    error_rate: float = 0.0

@dataclass
class RegistrationWorkflowMetrics:
    """Overall registration workflow metrics"""
    total_registrations: int = 0
    successful_registrations: int = 0
    failed_registrations: int = 0
    average_workflow_duration: float = 0.0
    success_rate: float = 0.0
    most_common_errors: List[str] = None
    peak_registration_times: List[str] = None

class WorkflowMonitor:
    """Monitors the student registration workflow across microservices"""
    
    def __init__(self, config: Dict[str, str]):
        self.config = config
        self.api_gateway_url = config.get('API_GATEWAY_URL', 'http://localhost:8000')
        self.auth_service_url = config.get('AUTH_SERVICE_URL', 'http://localhost:8001')
        self.user_service_url = config.get('USER_SERVICE_URL', 'http://localhost:8002')
        self.institution_service_url = config.get('INSTITUTION_SERVICE_URL', 'http://localhost:8003')
        self.notification_service_url = config.get('NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
        
        # Event storage (in production, this would be a database)
        self.workflow_events: deque = deque(maxlen=10000)
        self.service_metrics: Dict[str, ServiceMetrics] = {
            'api_gateway': ServiceMetrics('api_gateway'),
            'auth_service': ServiceMetrics('auth_service'),
            'user_service': ServiceMetrics('user_service'),
            'institution_service': ServiceMetrics('institution_service'),
            'notification_service': ServiceMetrics('notification_service')
        }
        
        # Workflow tracking
        self.active_workflows: Dict[str, Dict[str, Any]] = {}
        self.completed_workflows: deque = deque(maxlen=1000)
        
        # Alerting thresholds
        self.error_rate_threshold = 0.1  # 10%
        self.response_time_threshold = 5000  # 5 seconds
        self.health_check_interval = 30  # 30 seconds
        
        # Monitoring state
        self.is_monitoring = False
        self.last_health_check = None
    
    async def start_monitoring(self):
        """Start the monitoring process"""
        logger.info("Starting workflow monitoring")
        self.is_monitoring = True
        
        # Start monitoring tasks
        tasks = [
            asyncio.create_task(self._health_check_loop()),
            asyncio.create_task(self._metrics_collection_loop()),
            asyncio.create_task(self._workflow_tracking_loop()),
            asyncio.create_task(self._alerting_loop())
        ]
        
        try:
            await asyncio.gather(*tasks)
        except Exception as e:
            logger.error(f"Monitoring error: {str(e)}")
            self.is_monitoring = False
    
    async def stop_monitoring(self):
        """Stop the monitoring process"""
        logger.info("Stopping workflow monitoring")
        self.is_monitoring = False
    
    async def _health_check_loop(self):
        """Continuously check service health"""
        while self.is_monitoring:
            try:
                await self._check_all_services_health()
                await asyncio.sleep(self.health_check_interval)
            except Exception as e:
                logger.error(f"Health check loop error: {str(e)}")
                await asyncio.sleep(5)
    
    async def _check_all_services_health(self):
        """Check health of all services"""
        services = {
            'api_gateway': f"{self.api_gateway_url}/health",
            'auth_service': f"{self.auth_service_url}/health/",
            'user_service': f"{self.user_service_url}/health/",
            'institution_service': f"{self.institution_service_url}/health/",
            'notification_service': f"{self.notification_service_url}/health/"
        }
        
        async with httpx.AsyncClient() as client:
            for service_name, health_url in services.items():
                start_time = time.time()
                try:
                    response = await client.get(health_url, timeout=10.0)
                    response_time = (time.time() - start_time) * 1000  # Convert to ms
                    
                    metrics = self.service_metrics[service_name]
                    metrics.last_health_check = datetime.now()
                    metrics.health_status = 'healthy' if response.status_code == 200 else 'unhealthy'
                    
                    # Update response time metrics
                    if metrics.total_requests > 0:
                        metrics.average_response_time = (
                            (metrics.average_response_time * metrics.total_requests + response_time) /
                            (metrics.total_requests + 1)
                        )
                    else:
                        metrics.average_response_time = response_time
                    
                    metrics.total_requests += 1
                    if response.status_code == 200:
                        metrics.successful_requests += 1
                    else:
                        metrics.failed_requests += 1
                    
                    # Calculate error rate
                    metrics.error_rate = metrics.failed_requests / metrics.total_requests
                    
                    logger.debug(f"Health check {service_name}: {metrics.health_status} ({response_time:.2f}ms)")
                    
                except Exception as e:
                    metrics = self.service_metrics[service_name]
                    metrics.last_health_check = datetime.now()
                    metrics.health_status = 'unhealthy'
                    metrics.total_requests += 1
                    metrics.failed_requests += 1
                    metrics.error_rate = metrics.failed_requests / metrics.total_requests
                    
                    logger.error(f"Health check failed for {service_name}: {str(e)}")
    
    async def _metrics_collection_loop(self):
        """Collect and aggregate metrics"""
        while self.is_monitoring:
            try:
                await self._collect_workflow_metrics()
                await self._save_metrics_snapshot()
                await asyncio.sleep(60)  # Collect metrics every minute
            except Exception as e:
                logger.error(f"Metrics collection error: {str(e)}")
                await asyncio.sleep(10)
    
    async def _collect_workflow_metrics(self):
        """Collect workflow-specific metrics"""
        # Analyze recent workflow events
        recent_events = [e for e in self.workflow_events if e.timestamp > datetime.now() - timedelta(hours=1)]
        
        # Count registrations
        registration_starts = [e for e in recent_events if e.event_type == 'registration_start']
        registration_completions = [e for e in recent_events if e.event_type == 'registration_complete']
        registration_failures = [e for e in recent_events if e.event_type == 'registration_failed']
        
        # Calculate workflow durations
        workflow_durations = []
        for completion in registration_completions:
            start_event = next(
                (e for e in registration_starts if e.user_email == completion.user_email),
                None
            )
            if start_event:
                duration = (completion.timestamp - start_event.timestamp).total_seconds() * 1000
                workflow_durations.append(duration)
        
        # Update workflow metrics
        total_registrations = len(registration_starts)
        successful_registrations = len(registration_completions)
        failed_registrations = len(registration_failures)
        
        workflow_metrics = RegistrationWorkflowMetrics(
            total_registrations=total_registrations,
            successful_registrations=successful_registrations,
            failed_registrations=failed_registrations,
            average_workflow_duration=sum(workflow_durations) / len(workflow_durations) if workflow_durations else 0,
            success_rate=(successful_registrations / total_registrations * 100) if total_registrations > 0 else 0
        )
        
        logger.info(f"Workflow metrics: {workflow_metrics.success_rate:.2f}% success rate, "
                   f"{workflow_metrics.average_workflow_duration:.2f}ms avg duration")
    
    async def _workflow_tracking_loop(self):
        """Track individual workflow progress"""
        while self.is_monitoring:
            try:
                await self._check_workflow_timeouts()
                await asyncio.sleep(30)  # Check every 30 seconds
            except Exception as e:
                logger.error(f"Workflow tracking error: {str(e)}")
                await asyncio.sleep(10)
    
    async def _check_workflow_timeouts(self):
        """Check for workflows that have timed out"""
        timeout_threshold = datetime.now() - timedelta(minutes=5)  # 5 minute timeout
        
        timed_out_workflows = [
            workflow_id for workflow_id, workflow_data in self.active_workflows.items()
            if workflow_data['start_time'] < timeout_threshold
        ]
        
        for workflow_id in timed_out_workflows:
            workflow_data = self.active_workflows.pop(workflow_id)
            logger.warning(f"Workflow timeout detected: {workflow_id} for user {workflow_data.get('user_email')}")
            
            # Record timeout event
            timeout_event = WorkflowEvent(
                event_id=f"{workflow_id}_timeout",
                event_type='workflow_timeout',
                service_name='monitor',
                user_email=workflow_data.get('user_email', 'unknown'),
                timestamp=datetime.now(),
                status='error',
                error_message='Workflow exceeded timeout threshold'
            )
            self.workflow_events.append(timeout_event)
    
    async def _alerting_loop(self):
        """Monitor for alert conditions"""
        while self.is_monitoring:
            try:
                await self._check_alert_conditions()
                await asyncio.sleep(60)  # Check alerts every minute
            except Exception as e:
                logger.error(f"Alerting loop error: {str(e)}")
                await asyncio.sleep(10)
    
    async def _check_alert_conditions(self):
        """Check for conditions that should trigger alerts"""
        alerts = []
        
        # Check service health
        for service_name, metrics in self.service_metrics.items():
            if metrics.health_status == 'unhealthy':
                alerts.append(f"Service {service_name} is unhealthy")
            
            if metrics.error_rate > self.error_rate_threshold:
                alerts.append(f"High error rate for {service_name}: {metrics.error_rate:.2%}")
            
            if metrics.average_response_time > self.response_time_threshold:
                alerts.append(f"High response time for {service_name}: {metrics.average_response_time:.2f}ms")
        
        # Check workflow success rate
        recent_events = [e for e in self.workflow_events if e.timestamp > datetime.now() - timedelta(minutes=10)]
        registration_starts = [e for e in recent_events if e.event_type == 'registration_start']
        registration_failures = [e for e in recent_events if e.event_type == 'registration_failed']
        
        if len(registration_starts) > 0:
            failure_rate = len(registration_failures) / len(registration_starts)
            if failure_rate > 0.2:  # 20% failure rate threshold
                alerts.append(f"High registration failure rate: {failure_rate:.2%}")
        
        # Log alerts
        for alert in alerts:
            logger.warning(f"ALERT: {alert}")
            await self._send_alert(alert)
    
    async def _send_alert(self, alert_message: str):
        """Send alert notification"""
        # In production, this would send to Slack, email, PagerDuty, etc.
        alert_data = {
            'timestamp': datetime.now().isoformat(),
            'message': alert_message,
            'severity': 'warning',
            'source': 'workflow_monitor'
        }
        
        # Save alert to file for now
        alert_file = 'workflow_alerts.json'
        alerts = []
        if os.path.exists(alert_file):
            with open(alert_file, 'r') as f:
                alerts = json.load(f)
        
        alerts.append(alert_data)
        
        with open(alert_file, 'w') as f:
            json.dump(alerts[-100:], f, indent=2)  # Keep last 100 alerts
    
    async def _save_metrics_snapshot(self):
        """Save current metrics snapshot"""
        snapshot = {
            'timestamp': datetime.now().isoformat(),
            'service_metrics': {name: asdict(metrics) for name, metrics in self.service_metrics.items()},
            'active_workflows': len(self.active_workflows),
            'total_events': len(self.workflow_events)
        }
        
        # Save to file (in production, this would go to a time-series database)
        metrics_file = f"metrics_snapshot_{datetime.now().strftime('%Y%m%d')}.json"
        snapshots = []
        if os.path.exists(metrics_file):
            with open(metrics_file, 'r') as f:
                snapshots = json.load(f)
        
        snapshots.append(snapshot)
        
        with open(metrics_file, 'w') as f:
            json.dump(snapshots[-1440:], f, indent=2)  # Keep 24 hours of minute-by-minute data
    
    def record_workflow_event(self, event: WorkflowEvent):
        """Record a workflow event"""
        self.workflow_events.append(event)
        
        # Track workflow progress
        if event.event_type == 'registration_start':
            self.active_workflows[event.event_id] = {
                'user_email': event.user_email,
                'start_time': event.timestamp,
                'events': [event]
            }
        elif event.event_id in self.active_workflows:
            self.active_workflows[event.event_id]['events'].append(event)
            
            if event.event_type in ['registration_complete', 'registration_failed']:
                # Move to completed workflows
                workflow_data = self.active_workflows.pop(event.event_id)
                workflow_data['end_time'] = event.timestamp
                workflow_data['status'] = event.status
                self.completed_workflows.append(workflow_data)
        
        logger.debug(f"Recorded event: {event.event_type} for {event.user_email}")
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get data for monitoring dashboard"""
        # Calculate recent metrics
        recent_events = [e for e in self.workflow_events if e.timestamp > datetime.now() - timedelta(hours=1)]
        
        registration_events = [e for e in recent_events if 'registration' in e.event_type]
        error_events = [e for e in recent_events if e.status == 'error']
        
        return {
            'service_health': {
                name: {
                    'status': metrics.health_status,
                    'response_time': metrics.average_response_time,
                    'error_rate': metrics.error_rate,
                    'last_check': metrics.last_health_check.isoformat() if metrics.last_health_check else None
                }
                for name, metrics in self.service_metrics.items()
            },
            'workflow_stats': {
                'active_workflows': len(self.active_workflows),
                'completed_workflows_last_hour': len([w for w in self.completed_workflows 
                                                     if w['end_time'] > datetime.now() - timedelta(hours=1)]),
                'recent_registrations': len(registration_events),
                'recent_errors': len(error_events),
                'error_rate': (len(error_events) / len(registration_events) * 100) if registration_events else 0
            },
            'recent_events': [
                {
                    'event_type': e.event_type,
                    'service': e.service_name,
                    'timestamp': e.timestamp.isoformat(),
                    'status': e.status,
                    'user_email': e.user_email[:20] + '...' if len(e.user_email) > 20 else e.user_email
                }
                for e in list(self.workflow_events)[-20:]  # Last 20 events
            ]
        }
    
    async def generate_monitoring_report(self) -> Dict[str, Any]:
        """Generate comprehensive monitoring report"""
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=24)  # 24-hour report
        
        # Filter events for the reporting period
        period_events = [e for e in self.workflow_events if start_time <= e.timestamp <= end_time]
        
        # Analyze events
        registration_starts = [e for e in period_events if e.event_type == 'registration_start']
        registration_completions = [e for e in period_events if e.event_type == 'registration_complete']
        registration_failures = [e for e in period_events if e.event_type == 'registration_failed']
        error_events = [e for e in period_events if e.status == 'error']
        
        # Calculate metrics
        total_registrations = len(registration_starts)
        successful_registrations = len(registration_completions)
        failed_registrations = len(registration_failures)
        success_rate = (successful_registrations / total_registrations * 100) if total_registrations > 0 else 0
        
        # Service performance
        service_performance = {}
        for service_name, metrics in self.service_metrics.items():
            service_performance[service_name] = {
                'total_requests': metrics.total_requests,
                'success_rate': ((metrics.total_requests - metrics.failed_requests) / metrics.total_requests * 100) if metrics.total_requests > 0 else 0,
                'average_response_time': metrics.average_response_time,
                'current_health': metrics.health_status
            }
        
        # Error analysis
        error_types = defaultdict(int)
        for event in error_events:
            if event.error_message:
                error_types[event.error_message] += 1
        
        report = {
            'report_period': {
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'duration_hours': 24
            },
            'registration_metrics': {
                'total_registrations': total_registrations,
                'successful_registrations': successful_registrations,
                'failed_registrations': failed_registrations,
                'success_rate': success_rate
            },
            'service_performance': service_performance,
            'error_analysis': {
                'total_errors': len(error_events),
                'error_types': dict(error_types),
                'most_common_errors': sorted(error_types.items(), key=lambda x: x[1], reverse=True)[:5]
            },
            'recommendations': self._generate_monitoring_recommendations(success_rate, service_performance, error_events)
        }
        
        # Save report
        report_file = f"monitoring_report_{end_time.strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Monitoring report saved to: {report_file}")
        return report
    
    def _generate_monitoring_recommendations(self, success_rate: float, service_performance: Dict, error_events: List) -> List[str]:
        """Generate recommendations based on monitoring data"""
        recommendations = []
        
        if success_rate < 95:
            recommendations.append(f"Registration success rate is {success_rate:.2f}% - investigate common failure causes")
        
        for service_name, perf in service_performance.items():
            if perf['success_rate'] < 95:
                recommendations.append(f"{service_name} has low success rate: {perf['success_rate']:.2f}%")
            
            if perf['average_response_time'] > 2000:
                recommendations.append(f"{service_name} has high response time: {perf['average_response_time']:.2f}ms")
            
            if perf['current_health'] != 'healthy':
                recommendations.append(f"{service_name} is currently {perf['current_health']} - immediate attention required")
        
        if len(error_events) > 100:  # More than 100 errors in 24 hours
            recommendations.append("High error volume detected - review error patterns and implement fixes")
        
        if not recommendations:
            recommendations.append("All systems operating within normal parameters")
        
        return recommendations

async def main():
    """Main monitoring execution"""
    config = {
        'API_GATEWAY_URL': os.getenv('API_GATEWAY_URL', 'http://localhost:8000'),
        'AUTH_SERVICE_URL': os.getenv('AUTH_SERVICE_URL', 'http://localhost:8001'),
        'USER_SERVICE_URL': os.getenv('USER_SERVICE_URL', 'http://localhost:8002'),
        'INSTITUTION_SERVICE_URL': os.getenv('INSTITUTION_SERVICE_URL', 'http://localhost:8003'),
        'NOTIFICATION_SERVICE_URL': os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
    }
    
    monitor = WorkflowMonitor(config)
    
    try:
        # Start monitoring
        print("Starting workflow monitoring...")
        print("Press Ctrl+C to stop")
        
        await monitor.start_monitoring()
        
    except KeyboardInterrupt:
        print("\nStopping monitoring...")
        await monitor.stop_monitoring()
        
        # Generate final report
        report = await monitor.generate_monitoring_report()
        print(f"\nFinal monitoring report generated")
        print(f"Registration success rate: {report['registration_metrics']['success_rate']:.2f}%")
        
    except Exception as e:
        logger.error(f"Monitoring failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())