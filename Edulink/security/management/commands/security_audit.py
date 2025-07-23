from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import models
from datetime import timedelta
from security.models import SecurityEvent, AuditLog, FailedLoginAttempt, UserSession
from security.utils import SecurityAnalyzer, ThreatDetector
import json

User = get_user_model()


class Command(BaseCommand):
    help = 'Perform comprehensive security audit and generate reports'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to analyze (default: 7)'
        )
        parser.add_argument(
            '--output',
            type=str,
            default='console',
            choices=['console', 'json', 'file'],
            help='Output format (default: console)'
        )
        parser.add_argument(
            '--file',
            type=str,
            help='Output file path (required when output=file)'
        )
        parser.add_argument(
            '--user',
            type=str,
            help='Specific user to audit (username or email)'
        )
        parser.add_argument(
            '--severity',
            type=str,
            choices=['low', 'medium', 'high', 'critical'],
            help='Minimum severity level to include'
        )
        parser.add_argument(
            '--include-sessions',
            action='store_true',
            help='Include active session analysis'
        )
        parser.add_argument(
            '--include-threats',
            action='store_true',
            help='Include threat detection analysis'
        )
        parser.add_argument(
            '--export-events',
            action='store_true',
            help='Export security events to file'
        )
    
    def handle(self, *args, **options):
        try:
            self.stdout.write(
                self.style.SUCCESS('Starting security audit...')
            )
            
            # Calculate date range
            end_date = timezone.now()
            start_date = end_date - timedelta(days=options['days'])
            
            # Initialize analyzer
            analyzer = SecurityAnalyzer()
            
            # Perform audit
            audit_results = self.perform_audit(
                start_date, end_date, options, analyzer
            )
            
            # Output results
            self.output_results(audit_results, options)
            
            self.stdout.write(
                self.style.SUCCESS('Security audit completed successfully')
            )
            
        except Exception as e:
            raise CommandError(f'Security audit failed: {str(e)}')
    
    def perform_audit(self, start_date, end_date, options, analyzer):
        """Perform comprehensive security audit."""
        results = {
            'audit_period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': options['days']
            },
            'summary': {},
            'security_events': [],
            'failed_logins': [],
            'audit_logs': [],
            'user_sessions': [],
            'threat_analysis': {},
            'recommendations': []
        }
        
        # Filter by user if specified
        user_filter = {}
        if options['user']:
            try:
                user = User.objects.get(
                    models.Q(username=options['user']) |
                    models.Q(email=options['user'])
                )
                user_filter['user'] = user
                results['target_user'] = {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            except User.DoesNotExist:
                raise CommandError(f"User '{options['user']}' not found")
        
        # Analyze security events
        events_query = SecurityEvent.objects.filter(
            timestamp__range=[start_date, end_date],
            **user_filter
        )
        
        if options['severity']:
            events_query = events_query.filter(severity=options['severity'])
        
        security_events = list(events_query.order_by('-timestamp'))
        results['security_events'] = [
            self.serialize_security_event(event) for event in security_events
        ]
        
        # Analyze failed login attempts
        failed_logins = list(
            FailedLoginAttempt.objects.filter(
                timestamp__range=[start_date, end_date],
                **user_filter
            ).order_by('-timestamp')
        )
        results['failed_logins'] = [
            self.serialize_failed_login(attempt) for attempt in failed_logins
        ]
        
        # Analyze audit logs
        audit_logs = list(
            AuditLog.objects.filter(
                timestamp__range=[start_date, end_date],
                **user_filter
            ).order_by('-timestamp')[:100]  # Limit to recent 100
        )
        results['audit_logs'] = [
            self.serialize_audit_log(log) for log in audit_logs
        ]
        
        # Analyze active sessions if requested
        if options['include_sessions']:
            sessions_query = UserSession.objects.filter(
                created_at__range=[start_date, end_date],
                **user_filter
            )
            user_sessions = list(sessions_query.order_by('-created_at'))
            results['user_sessions'] = [
                self.serialize_user_session(session) for session in user_sessions
            ]
        
        # Perform threat analysis if requested
        if options['include_threats']:
            threat_detector = ThreatDetector()
            results['threat_analysis'] = self.analyze_threats(
                security_events, failed_logins, threat_detector
            )
        
        # Generate summary statistics
        results['summary'] = self.generate_summary(
            security_events, failed_logins, audit_logs, user_sessions if options['include_sessions'] else []
        )
        
        # Generate recommendations
        results['recommendations'] = self.generate_recommendations(
            results['summary'], security_events, failed_logins
        )
        
        return results
    
    def serialize_security_event(self, event):
        """Serialize security event for output."""
        return {
            'id': event.id,
            'event_type': event.event_type,
            'severity': event.severity,
            'description': event.description,
            'user': event.user.username if event.user else None,
            'ip_address': event.ip_address,
            'user_agent': event.user_agent,
            'timestamp': event.timestamp.isoformat(),
            'metadata': event.metadata
        }
    
    def serialize_failed_login(self, attempt):
        """Serialize failed login attempt for output."""
        return {
            'id': attempt.id,
            'username': attempt.username,
            'ip_address': attempt.ip_address,
            'user_agent': attempt.user_agent,
            'timestamp': attempt.timestamp.isoformat(),
            'reason': attempt.reason
        }
    
    def serialize_audit_log(self, log):
        """Serialize audit log for output."""
        return {
            'id': log.id,
            'action': log.action,
            'resource_type': log.resource_type,
            'resource_id': log.resource_id,
            'user': log.user.username if log.user else None,
            'ip_address': log.ip_address,
            'timestamp': log.timestamp.isoformat(),
            'changes': log.changes
        }
    
    def serialize_user_session(self, session):
        """Serialize user session for output."""
        return {
            'id': session.id,
            'user': session.user.username,
            'session_key': session.session_key[:10] + '...',  # Truncate for security
            'ip_address': session.ip_address,
            'user_agent': session.user_agent,
            'created_at': session.created_at.isoformat(),
            'last_activity': session.last_activity.isoformat() if session.last_activity else None,
            'is_active': session.is_active
        }
    
    def analyze_threats(self, security_events, failed_logins, threat_detector):
        """Analyze potential security threats."""
        threats = {
            'suspicious_ips': [],
            'brute_force_attempts': [],
            'unusual_activity': [],
            'risk_score': 0
        }
        
        # Analyze IP addresses
        ip_counts = {}
        for event in security_events:
            if event.ip_address:
                ip_counts[event.ip_address] = ip_counts.get(event.ip_address, 0) + 1
        
        for attempt in failed_logins:
            if attempt.ip_address:
                ip_counts[attempt.ip_address] = ip_counts.get(attempt.ip_address, 0) + 1
        
        # Identify suspicious IPs (high activity)
        for ip, count in ip_counts.items():
            if count > 10:  # Threshold for suspicious activity
                threats['suspicious_ips'].append({
                    'ip_address': ip,
                    'event_count': count,
                    'risk_level': 'high' if count > 50 else 'medium'
                })
        
        # Analyze brute force attempts
        username_attempts = {}
        for attempt in failed_logins:
            key = f"{attempt.username}:{attempt.ip_address}"
            username_attempts[key] = username_attempts.get(key, 0) + 1
        
        for key, count in username_attempts.items():
            if count > 5:  # Threshold for brute force
                username, ip = key.split(':')
                threats['brute_force_attempts'].append({
                    'username': username,
                    'ip_address': ip,
                    'attempt_count': count,
                    'risk_level': 'critical' if count > 20 else 'high'
                })
        
        # Calculate overall risk score
        risk_score = 0
        risk_score += len(threats['suspicious_ips']) * 10
        risk_score += len(threats['brute_force_attempts']) * 25
        risk_score += len([e for e in security_events if e.severity == 'critical']) * 50
        
        threats['risk_score'] = min(risk_score, 100)  # Cap at 100
        
        return threats
    
    def generate_summary(self, security_events, failed_logins, audit_logs, user_sessions):
        """Generate summary statistics."""
        return {
            'total_security_events': len(security_events),
            'critical_events': len([e for e in security_events if e.severity == 'critical']),
            'high_severity_events': len([e for e in security_events if e.severity == 'high']),
            'total_failed_logins': len(failed_logins),
            'unique_failed_ips': len(set(a.ip_address for a in failed_logins if a.ip_address)),
            'total_audit_logs': len(audit_logs),
            'total_user_sessions': len(user_sessions),
            'active_sessions': len([s for s in user_sessions if s.is_active]),
            'event_types': self.count_by_field(security_events, 'event_type'),
            'severity_distribution': self.count_by_field(security_events, 'severity'),
            'top_ips': self.get_top_ips(security_events + failed_logins)
        }
    
    def count_by_field(self, objects, field_name):
        """Count objects by field value."""
        counts = {}
        for obj in objects:
            value = getattr(obj, field_name, None)
            if value:
                counts[value] = counts.get(value, 0) + 1
        return counts
    
    def get_top_ips(self, objects):
        """Get top IP addresses by activity."""
        ip_counts = {}
        for obj in objects:
            ip = getattr(obj, 'ip_address', None)
            if ip:
                ip_counts[ip] = ip_counts.get(ip, 0) + 1
        
        # Return top 10 IPs
        return sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    def generate_recommendations(self, summary, security_events, failed_logins):
        """Generate security recommendations."""
        recommendations = []
        
        # Check for high failed login rates
        if summary['total_failed_logins'] > 100:
            recommendations.append({
                'type': 'security_policy',
                'priority': 'high',
                'title': 'High Failed Login Rate Detected',
                'description': f"Detected {summary['total_failed_logins']} failed login attempts. Consider implementing stronger rate limiting.",
                'action': 'Implement CAPTCHA or temporary account lockouts'
            })
        
        # Check for critical events
        if summary['critical_events'] > 0:
            recommendations.append({
                'type': 'incident_response',
                'priority': 'critical',
                'title': 'Critical Security Events Detected',
                'description': f"Found {summary['critical_events']} critical security events requiring immediate attention.",
                'action': 'Review and respond to critical events immediately'
            })
        
        # Check for suspicious IP activity
        if summary['unique_failed_ips'] > 20:
            recommendations.append({
                'type': 'network_security',
                'priority': 'medium',
                'title': 'Multiple IP Addresses with Failed Logins',
                'description': f"Detected failed logins from {summary['unique_failed_ips']} different IP addresses.",
                'action': 'Consider implementing IP-based blocking or monitoring'
            })
        
        # Check session management
        if summary.get('active_sessions', 0) > summary.get('total_user_sessions', 0) * 0.8:
            recommendations.append({
                'type': 'session_management',
                'priority': 'low',
                'title': 'High Number of Active Sessions',
                'description': 'Large number of active sessions detected.',
                'action': 'Review session timeout policies'
            })
        
        return recommendations
    
    def output_results(self, results, options):
        """Output audit results in specified format."""
        if options['output'] == 'json':
            self.stdout.write(json.dumps(results, indent=2, default=str))
        elif options['output'] == 'file':
            if not options['file']:
                raise CommandError('File path required when output=file')
            
            with open(options['file'], 'w') as f:
                json.dump(results, f, indent=2, default=str)
            
            self.stdout.write(
                self.style.SUCCESS(f"Audit results saved to {options['file']}")
            )
        else:  # console output
            self.output_console_report(results)
    
    def output_console_report(self, results):
        """Output formatted console report."""
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("SECURITY AUDIT REPORT"))
        self.stdout.write("=" * 60)
        
        # Audit period
        period = results['audit_period']
        self.stdout.write(f"\nAudit Period: {period['start']} to {period['end']} ({period['days']} days)")
        
        # Summary
        summary = results['summary']
        self.stdout.write("\n" + "-" * 40)
        self.stdout.write(self.style.WARNING("SUMMARY"))
        self.stdout.write("-" * 40)
        self.stdout.write(f"Total Security Events: {summary['total_security_events']}")
        self.stdout.write(f"Critical Events: {summary['critical_events']}")
        self.stdout.write(f"High Severity Events: {summary['high_severity_events']}")
        self.stdout.write(f"Failed Login Attempts: {summary['total_failed_logins']}")
        self.stdout.write(f"Unique IPs with Failed Logins: {summary['unique_failed_ips']}")
        
        # Threat analysis
        if 'threat_analysis' in results:
            threats = results['threat_analysis']
            self.stdout.write("\n" + "-" * 40)
            self.stdout.write(self.style.ERROR("THREAT ANALYSIS"))
            self.stdout.write("-" * 40)
            self.stdout.write(f"Risk Score: {threats['risk_score']}/100")
            self.stdout.write(f"Suspicious IPs: {len(threats['suspicious_ips'])}")
            self.stdout.write(f"Brute Force Attempts: {len(threats['brute_force_attempts'])}")
        else:
            self.stdout.write("\n" + "-" * 40)
            self.stdout.write(self.style.NOTICE("THREAT ANALYSIS"))
            self.stdout.write("-" * 40)
            self.stdout.write("Threat analysis not performed (use --include-threats flag)")
        
        # Recommendations
        recommendations = results['recommendations']
        if recommendations:
            self.stdout.write("\n" + "-" * 40)
            self.stdout.write(self.style.WARNING("RECOMMENDATIONS"))
            self.stdout.write("-" * 40)
            for i, rec in enumerate(recommendations, 1):
                priority_style = {
                    'critical': self.style.ERROR,
                    'high': self.style.WARNING,
                    'medium': self.style.NOTICE,
                    'low': self.style.SUCCESS
                }.get(rec['priority'], self.style.SUCCESS)
                
                self.stdout.write(f"\n{i}. {priority_style(rec['title'])} [{rec['priority'].upper()}]")
                self.stdout.write(f"   {rec['description']}")
                self.stdout.write(f"   Action: {rec['action']}")
        
        self.stdout.write("\n" + "=" * 60)