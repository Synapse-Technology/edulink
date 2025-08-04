import re
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from django.utils import timezone
from django.db.models import Count, Q
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.conf import settings
from .models import SecurityEvent, FailedLoginAttempt, UserSession, AuditLog

User = get_user_model()


class SecurityAnalyzer:
    """Utility class for security analysis and scoring."""
    
    def __init__(self):
        self.weights = {
            'failed_logins': 0.3,
            'security_events': 0.4,
            'session_security': 0.2,
            'configuration': 0.1
        }
    
    def calculate_security_score(self) -> float:
        """Calculate overall security score (0-100)."""
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        
        # Failed login score (lower is better)
        failed_logins = FailedLoginAttempt.objects.filter(
            timestamp__gte=week_ago
        ).count()
        failed_login_score = max(0, 100 - (failed_logins * 2))
        
        # Security events score (lower is better)
        critical_events = SecurityEvent.objects.filter(
            timestamp__gte=week_ago,
            severity__in=['high', 'critical'],
            resolved=False
        ).count()
        security_event_score = max(0, 100 - (critical_events * 10))
        
        # Session security score
        active_sessions = UserSession.objects.filter(is_active=True).count()
        old_sessions = UserSession.objects.filter(
            is_active=True,
            last_activity__lt=now - timedelta(hours=24)
        ).count()
        session_score = max(0, 100 - (old_sessions * 5))
        
        # Configuration score (placeholder)
        config_score = 85  # This would be based on security configuration analysis
        
        # Calculate weighted score
        total_score = (
            failed_login_score * self.weights['failed_logins'] +
            security_event_score * self.weights['security_events'] +
            session_score * self.weights['session_security'] +
            config_score * self.weights['configuration']
        )
        
        return round(total_score, 2)
    
    def get_security_score_trend(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get security score trend over specified days."""
        trend = []
        now = timezone.now()
        
        for i in range(days):
            date = (now - timedelta(days=days-i-1)).date()
            # This is a simplified calculation - in practice, you'd store daily scores
            score = self.calculate_security_score() + (i % 10 - 5)  # Mock variation
            trend.append({
                'date': date.isoformat(),
                'score': max(0, min(100, score))
            })
        
        return trend
    
    def generate_report(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Generate comprehensive security report."""
        # Event summary
        events = SecurityEvent.objects.filter(
            timestamp__range=[start_date, end_date]
        )
        event_summary = {
            'total_events': events.count(),
            'by_severity': dict(events.values('severity').annotate(count=Count('id')).values_list('severity', 'count')),
            'by_type': dict(events.values('event_type').annotate(count=Count('id')).values_list('event_type', 'count')),
            'resolved': events.filter(resolved=True).count(),
            'unresolved': events.filter(resolved=False).count()
        }
        
        # User activity analysis
        user_activity = []
        active_users = User.objects.filter(
            security_events__timestamp__range=[start_date, end_date]
        ).distinct()
        
        for user in active_users[:20]:  # Top 20 users
            user_events = events.filter(user=user)
            user_activity.append({
                'user_email': user.email,
                'total_events': user_events.count(),
                'critical_events': user_events.filter(severity='critical').count(),
                'last_activity': user_events.order_by('-timestamp').first().timestamp if user_events.exists() else None
            })
        
        # Threat analysis
        threat_analysis = {
            'failed_logins': FailedLoginAttempt.objects.filter(
                timestamp__range=[start_date, end_date]
            ).count(),
            'suspicious_ips': self._get_suspicious_ips(start_date, end_date),
            'attack_patterns': self._analyze_attack_patterns(start_date, end_date)
        }
        
        # Recommendations
        recommendations = self._generate_recommendations(event_summary, threat_analysis)
        
        return {
            'start_date': start_date,
            'end_date': end_date,
            'event_summary': event_summary,
            'user_activity': user_activity,
            'threat_analysis': threat_analysis,
            'recommendations': recommendations
        }
    
    def _get_suspicious_ips(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Identify suspicious IP addresses."""
        suspicious_ips = []
        
        # IPs with high failed login attempts
        failed_login_ips = FailedLoginAttempt.objects.filter(
            timestamp__range=[start_date, end_date]
        ).values('ip_address').annotate(
            count=Count('id')
        ).filter(count__gte=10).order_by('-count')
        
        for ip_data in failed_login_ips:
            suspicious_ips.append({
                'ip_address': ip_data['ip_address'],
                'failed_attempts': ip_data['count'],
                'threat_level': 'high' if ip_data['count'] > 50 else 'medium'
            })
        
        return suspicious_ips
    
    def _analyze_attack_patterns(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Analyze attack patterns in the given time range."""
        events = SecurityEvent.objects.filter(
            timestamp__range=[start_date, end_date]
        )
        
        # Time-based analysis
        hourly_distribution = {}
        for event in events:
            hour = event.timestamp.hour
            hourly_distribution[hour] = hourly_distribution.get(hour, 0) + 1
        
        # Peak attack hours
        peak_hours = sorted(hourly_distribution.items(), key=lambda x: x[1], reverse=True)[:3]
        
        return {
            'hourly_distribution': hourly_distribution,
            'peak_attack_hours': [hour for hour, count in peak_hours],
            'total_attack_events': events.filter(
                event_type__in=['csrf_attack', 'sql_injection', 'xss_attempt']
            ).count()
        }
    
    def _generate_recommendations(self, event_summary: Dict, threat_analysis: Dict) -> List[str]:
        """Generate security recommendations based on analysis."""
        recommendations = []
        
        if event_summary['unresolved'] > 10:
            recommendations.append("Review and resolve pending security events")
        
        if threat_analysis['failed_logins'] > 100:
            recommendations.append("Implement stronger rate limiting for login attempts")
        
        if len(threat_analysis['suspicious_ips']) > 5:
            recommendations.append("Consider implementing IP-based blocking for suspicious addresses")
        
        if event_summary['by_severity'].get('critical', 0) > 0:
            recommendations.append("Immediate attention required for critical security events")
        
        return recommendations


class ThreatDetector:
    """Utility class for threat detection and analysis."""
    
    def __init__(self):
        self.threat_patterns = {
            'sql_injection': [
                r"('|(\-\-)|(;)|(\||\|)|(\*|\*))",
                r"\b(union\s+select|insert\s+into|delete\s+from|update\s+set|drop\s+table|create\s+table|alter\s+table)\b",
                r"(script|javascript|vbscript|onload|onerror)"
            ],
            'xss': [
                r"<script[^>]*>.*?</script>",
                r"javascript:",
                r"on\w+\s*="
            ],
            'path_traversal': [
                r"\.\./",
                r"\.\.\\",
                r"%2e%2e%2f",
                r"%2e%2e%5c"
            ]
        }
    
    def detect_threats(self, request_data: str, ip_address: str) -> List[Dict[str, Any]]:
        """Detect potential threats in request data."""
        threats = []
        
        for threat_type, patterns in self.threat_patterns.items():
            for pattern in patterns:
                if re.search(pattern, request_data, re.IGNORECASE):
                    threats.append({
                        'type': threat_type,
                        'pattern': pattern,
                        'severity': self._get_threat_severity(threat_type),
                        'ip_address': ip_address
                    })
        
        return threats
    
    def detect_sql_injection(self, request) -> bool:
        """Detect SQL injection attempts in request."""
        request_data = str(request.GET) + str(request.POST) + str(request.body)
        
        for pattern in self.threat_patterns['sql_injection']:
            if re.search(pattern, request_data, re.IGNORECASE):
                return True
        return False
    
    def detect_xss(self, request) -> bool:
        """Detect XSS attempts in request."""
        request_data = str(request.GET) + str(request.POST) + str(request.body)
        
        for pattern in self.threat_patterns['xss']:
            if re.search(pattern, request_data, re.IGNORECASE):
                return True
        return False
    
    def detect_path_traversal(self, request) -> bool:
        """Detect path traversal attempts in request."""
        request_data = str(request.GET) + str(request.POST) + str(request.body)
        
        for pattern in self.threat_patterns['path_traversal']:
            if re.search(pattern, request_data, re.IGNORECASE):
                return True
        return False
    
    def check_brute_force(self, email: str, ip_address: str, time_window: int = 300) -> bool:
        """Check for brute force attack patterns."""
        now = timezone.now()
        window_start = now - timedelta(seconds=time_window)
        
        # Check failed attempts from this IP
        ip_attempts = FailedLoginAttempt.objects.filter(
            ip_address=ip_address,
            timestamp__gte=window_start
        ).count()
        
        # Check failed attempts for this email
        email_attempts = FailedLoginAttempt.objects.filter(
            email=email,
            timestamp__gte=window_start
        ).count()
        
        return ip_attempts >= 10 or email_attempts >= 5
    
    def get_top_threats(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get top threats in the specified time period."""
        now = timezone.now()
        start_date = now - timedelta(days=days)
        
        # Get threat events
        threat_events = SecurityEvent.objects.filter(
            timestamp__gte=start_date,
            event_type__in=[
                'csrf_attack', 'sql_injection', 'xss_attempt',
                'suspicious_activity', 'rate_limit_exceeded'
            ]
        ).values('event_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        top_threats = []
        for threat in threat_events:
            top_threats.append({
                'threat_type': threat['event_type'],
                'count': threat['count'],
                'severity': self._get_threat_severity(threat['event_type'])
            })
        
        return top_threats
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get currently active security alerts."""
        alerts = []
        now = timezone.now()
        
        # Check for recent critical events
        critical_events = SecurityEvent.objects.filter(
            severity='critical',
            resolved=False,
            timestamp__gte=now - timedelta(hours=24)
        )
        
        for event in critical_events:
            alerts.append({
                'alert_type': event.event_type,
                'severity': 'critical',
                'message': f"Critical security event: {event.description}",
                'timestamp': event.timestamp,
                'affected_users': [event.user.email] if event.user else []
            })
        
        # Check for brute force patterns
        recent_failed_logins = FailedLoginAttempt.objects.filter(
            timestamp__gte=now - timedelta(hours=1)
        ).values('ip_address').annotate(
            count=Count('id')
        ).filter(count__gte=20)
        
        for ip_data in recent_failed_logins:
            alerts.append({
                'alert_type': 'brute_force',
                'severity': 'high',
                'message': f"Potential brute force attack from IP: {ip_data['ip_address']}",
                'timestamp': now,
                'recommended_actions': ['Block IP address', 'Review login attempts']
            })
        
        return alerts
    
    def process_alert(self, alert_data: Dict[str, Any]) -> None:
        """Process and handle a security alert."""
        # Create security event
        SecurityEvent.objects.create(
            event_type=alert_data['alert_type'],
            severity=alert_data['severity'],
            description=alert_data['message'],
            ip_address='127.0.0.1',  # Default IP, should be provided
            metadata={
                'alert_data': alert_data,
                'auto_generated': True
            }
        )
        
        # Additional processing based on alert type
        if alert_data['alert_type'] == 'brute_force':
            self._handle_brute_force_alert(alert_data)
        elif alert_data['alert_type'] == 'data_breach':
            self._handle_data_breach_alert(alert_data)
    
    def _get_threat_severity(self, threat_type: str) -> str:
        """Get severity level for threat type."""
        severity_map = {
            'sql_injection': 'critical',
            'xss_attempt': 'high',
            'csrf_attack': 'high',
            'path_traversal': 'medium',
            'brute_force': 'high',
            'suspicious_activity': 'medium',
            'rate_limit_exceeded': 'low'
        }
        return severity_map.get(threat_type, 'medium')
    
    def _handle_brute_force_alert(self, alert_data: Dict[str, Any]) -> None:
        """Handle brute force attack alert."""
        # In a real implementation, this might:
        # - Temporarily block the IP
        # - Send notifications to admins
        # - Increase monitoring for the IP
        pass
    
    def _handle_data_breach_alert(self, alert_data: Dict[str, Any]) -> None:
        """Handle data breach alert."""
        # In a real implementation, this might:
        # - Lock affected accounts
        # - Send breach notifications
        # - Initiate incident response
        pass


class SecurityMiddleware:
    """Custom security middleware for additional protection."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.threat_detector = ThreatDetector()
    
    def __call__(self, request):
        # Pre-process request
        self._check_request_security(request)
        
        response = self.get_response(request)
        
        # Post-process response
        self._add_security_headers(response)
        
        return response
    
    def _check_request_security(self, request):
        """Check request for security threats."""
        ip_address = self._get_client_ip(request)
        
        # Check for threat patterns in request data
        request_data = str(request.GET) + str(request.POST) + str(request.body)
        threats = self.threat_detector.detect_threats(request_data, ip_address)
        
        # Log threats
        for threat in threats:
            SecurityEvent.objects.create(
                event_type=threat['type'],
                severity=threat['severity'],
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                description=f"Threat detected: {threat['type']} pattern: {threat['pattern']}",
                metadata={'threat_data': threat}
            )
    
    def _add_security_headers(self, response):
        """Add security headers to response."""
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PasswordValidator:
    """Custom password validator with security checks."""
    
    def __init__(self):
        self.common_passwords = self._load_common_passwords()
    
    def validate(self, password: str, user=None) -> List[str]:
        """Validate password strength and security."""
        errors = []
        
        # Length check
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        # Complexity checks
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        # Common password check
        if password.lower() in self.common_passwords:
            errors.append("Password is too common")
        
        # User-specific checks
        if user:
            if user.email and user.email.split('@')[0].lower() in password.lower():
                errors.append("Password cannot contain parts of your email")
        
        return errors
    
    def _load_common_passwords(self) -> set:
        """Load common passwords list."""
        # In a real implementation, this would load from a file
        return {
            'password', '123456', 'password123', 'admin', 'qwerty',
            'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
        }


class SecurityUtils:
    """General security utility functions."""
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate a cryptographically secure random token."""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def hash_sensitive_data(data: str) -> str:
        """Hash sensitive data for storage."""
        return hashlib.sha256(data.encode()).hexdigest()
    
    @staticmethod
    def is_safe_redirect_url(url: str, allowed_hosts: List[str]) -> bool:
        """Check if redirect URL is safe."""
        if not url:
            return False
        
        # Check for absolute URLs
        if url.startswith(('http://', 'https://')):
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.netloc in allowed_hosts
        
        # Relative URLs are generally safe
        return url.startswith('/')
    
    @staticmethod
    def sanitize_input(input_string: str) -> str:
        """Sanitize user input to prevent XSS."""
        import html
        return html.escape(input_string)
    
    @staticmethod
    def rate_limit_key(identifier: str, action: str) -> str:
        """Generate cache key for rate limiting."""
        return f"rate_limit:{action}:{identifier}"
    
    @staticmethod
    def check_rate_limit(identifier: str, action: str, limit: int, window: int) -> bool:
        """Check if action is rate limited."""
        key = SecurityUtils.rate_limit_key(identifier, action)
        current = cache.get(key, 0)
        
        if current >= limit:
            return True  # Rate limited
        
        cache.set(key, current + 1, window)
        return False  # Not rate limited
