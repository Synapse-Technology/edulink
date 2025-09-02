from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Count, Q
import json
import csv
import os
from io import StringIO

from security.models import (
    SecurityEvent,
    AuditLog,
    UserSession,
    FailedLoginAttempt,
    SecurityEventType,
    SeverityLevel
)
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Generate security reports for specified time periods'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date (YYYY-MM-DD format)'
        )
        
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date (YYYY-MM-DD format)'
        )
        
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to include in report (default: 7)'
        )
        
        parser.add_argument(
            '--format',
            choices=['json', 'csv', 'text'],
            default='text',
            help='Output format (default: text)'
        )
        
        parser.add_argument(
            '--output',
            type=str,
            help='Output file path (prints to stdout if not specified)'
        )
        
        parser.add_argument(
            '--include-details',
            action='store_true',
            help='Include detailed event information'
        )
        
        parser.add_argument(
            '--severity',
            choices=['low', 'medium', 'high', 'critical'],
            help='Filter by severity level'
        )
        
        parser.add_argument(
            '--event-type',
            type=str,
            help='Filter by event type'
        )
    
    def parse_date(self, date_str):
        """Parse date string in YYYY-MM-DD format."""
        try:
            return datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            raise CommandError(f'Invalid date format: {date_str}. Use YYYY-MM-DD format.')
    
    def get_date_range(self, options):
        """Get start and end dates for the report."""
        if options['start_date'] and options['end_date']:
            start_date = self.parse_date(options['start_date'])
            end_date = self.parse_date(options['end_date'])
        elif options['start_date']:
            start_date = self.parse_date(options['start_date'])
            end_date = start_date + timedelta(days=options['days'])
        elif options['end_date']:
            end_date = self.parse_date(options['end_date'])
            start_date = end_date - timedelta(days=options['days'])
        else:
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=options['days'])
        
        return start_date, end_date
    
    def get_filtered_events(self, start_date, end_date, options):
        """Get filtered security events."""
        events = SecurityEvent.objects.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date
        )
        
        if options['severity']:
            severity_map = {
                'low': SeverityLevel.LOW,
                'medium': SeverityLevel.MEDIUM,
                'high': SeverityLevel.HIGH,
                'critical': SeverityLevel.CRITICAL
            }
            events = events.filter(severity=severity_map[options['severity']])
        
        if options['event_type']:
            events = events.filter(event_type=options['event_type'])
        
        return events
    
    def generate_summary_data(self, start_date, end_date, options):
        """Generate summary statistics."""
        events = self.get_filtered_events(start_date, end_date, options)
        
        # Basic counts
        total_events = events.count()
        
        # Events by severity
        events_by_severity = events.values('severity').annotate(
            count=Count('id')
        ).order_by('severity')
        
        # Events by type
        events_by_type = events.values('event_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Events by day
        events_by_day = events.extra(
            select={'day': 'date(timestamp)'}
        ).values('day').annotate(
            count=Count('id')
        ).order_by('day')
        
        # Authentication metrics
        failed_logins = FailedLoginAttempt.objects.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date
        ).count()
        
        successful_logins = events.filter(
            event_type=SecurityEventType.LOGIN_SUCCESS
        ).count()
        
        new_users = events.filter(
            event_type=SecurityEventType.USER_CREATED
        ).count()
        
        locked_accounts = events.filter(
            event_type=SecurityEventType.ACCOUNT_LOCKED
        ).count()
        
        # High-risk events
        high_risk_events = events.filter(
            severity__in=[SeverityLevel.HIGH, SeverityLevel.CRITICAL]
        ).count()
        
        # Top IPs by failed attempts
        top_failed_ips = FailedLoginAttempt.objects.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date
        ).values('ip_address').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Active sessions (current)
        active_sessions = UserSession.objects.filter(
            is_active=True
        ).count()
        
        # Audit log summary
        audit_logs = AuditLog.objects.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date
        )
        
        audit_by_action = audit_logs.values('action').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': (end_date - start_date).days + 1
            },
            'summary': {
                'total_events': total_events,
                'high_risk_events': high_risk_events,
                'successful_logins': successful_logins,
                'failed_logins': failed_logins,
                'new_users': new_users,
                'locked_accounts': locked_accounts,
                'active_sessions': active_sessions,
                'total_audit_logs': audit_logs.count()
            },
            'events_by_severity': {
                item['severity']: item['count'] for item in events_by_severity
            },
            'events_by_type': [
                {'type': item['event_type'], 'count': item['count']}
                for item in events_by_type
            ],
            'events_by_day': [
                {'date': item['day'], 'count': item['count']}
                for item in events_by_day
            ],
            'top_failed_ips': [
                {'ip': item['ip_address'], 'attempts': item['count']}
                for item in top_failed_ips
            ],
            'audit_by_action': [
                {'action': item['action'], 'count': item['count']}
                for item in audit_by_action
            ]
        }
    
    def format_text_report(self, data, include_details=False):
        """Format data as text report."""
        output = StringIO()
        
        # Header
        output.write("SECURITY REPORT\n")
        output.write("=" * 50 + "\n\n")
        
        # Period
        period = data['period']
        output.write(f"Report Period: {period['start_date']} to {period['end_date']} ({period['days']} days)\n\n")
        
        # Summary
        summary = data['summary']
        output.write("SUMMARY\n")
        output.write("-" * 20 + "\n")
        output.write(f"Total Security Events: {summary['total_events']}\n")
        output.write(f"High-Risk Events: {summary['high_risk_events']}\n")
        output.write(f"Successful Logins: {summary['successful_logins']}\n")
        output.write(f"Failed Logins: {summary['failed_logins']}\n")
        output.write(f"New Users: {summary['new_users']}\n")
        output.write(f"Locked Accounts: {summary['locked_accounts']}\n")
        output.write(f"Active Sessions: {summary['active_sessions']}\n")
        output.write(f"Audit Log Entries: {summary['total_audit_logs']}\n\n")
        
        # Events by severity
        if data['events_by_severity']:
            output.write("EVENTS BY SEVERITY\n")
            output.write("-" * 20 + "\n")
            for severity, count in data['events_by_severity'].items():
                output.write(f"{severity.title()}: {count}\n")
            output.write("\n")
        
        # Top event types
        if data['events_by_type']:
            output.write("TOP EVENT TYPES\n")
            output.write("-" * 20 + "\n")
            for item in data['events_by_type'][:10]:
                output.write(f"{item['type']}: {item['count']}\n")
            output.write("\n")
        
        # Top failed IPs
        if data['top_failed_ips']:
            output.write("TOP IPs BY FAILED ATTEMPTS\n")
            output.write("-" * 30 + "\n")
            for item in data['top_failed_ips']:
                output.write(f"{item['ip']}: {item['attempts']} attempts\n")
            output.write("\n")
        
        # Daily breakdown
        if data['events_by_day']:
            output.write("DAILY BREAKDOWN\n")
            output.write("-" * 20 + "\n")
            for item in data['events_by_day']:
                output.write(f"{item['date']}: {item['count']} events\n")
            output.write("\n")
        
        # Audit actions
        if data['audit_by_action']:
            output.write("TOP AUDIT ACTIONS\n")
            output.write("-" * 20 + "\n")
            for item in data['audit_by_action'][:10]:
                output.write(f"{item['action']}: {item['count']}\n")
            output.write("\n")
        
        return output.getvalue()
    
    def format_csv_report(self, data):
        """Format data as CSV."""
        output = StringIO()
        writer = csv.writer(output)
        
        # Summary section
        writer.writerow(['Section', 'Metric', 'Value'])
        writer.writerow(['Period', 'Start Date', data['period']['start_date']])
        writer.writerow(['Period', 'End Date', data['period']['end_date']])
        writer.writerow(['Period', 'Days', data['period']['days']])
        
        summary = data['summary']
        for key, value in summary.items():
            writer.writerow(['Summary', key.replace('_', ' ').title(), value])
        
        # Events by severity
        writer.writerow([])
        writer.writerow(['Severity', 'Count'])
        for severity, count in data['events_by_severity'].items():
            writer.writerow([severity.title(), count])
        
        # Events by type
        writer.writerow([])
        writer.writerow(['Event Type', 'Count'])
        for item in data['events_by_type']:
            writer.writerow([item['type'], item['count']])
        
        # Top failed IPs
        writer.writerow([])
        writer.writerow(['IP Address', 'Failed Attempts'])
        for item in data['top_failed_ips']:
            writer.writerow([item['ip'], item['attempts']])
        
        return output.getvalue()
    
    def handle(self, *args, **options):
        try:
            # Get date range
            start_date, end_date = self.get_date_range(options)
            
            self.stdout.write(
                f"Generating security report for {start_date} to {end_date}..."
            )
            
            # Generate report data
            data = self.generate_summary_data(start_date, end_date, options)
            
            # Format output
            output_format = options['format']
            if output_format == 'json':
                output_content = json.dumps(data, indent=2, default=str)
            elif output_format == 'csv':
                output_content = self.format_csv_report(data)
            else:  # text
                output_content = self.format_text_report(
                    data, 
                    options['include_details']
                )
            
            # Output to file or stdout
            if options['output']:
                output_path = options['output']
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(output_content)
                
                self.stdout.write(
                    self.style.SUCCESS(f"Report saved to {output_path}")
                )
            else:
                self.stdout.write(output_content)
            
            # Summary message
            total_events = data['summary']['total_events']
            high_risk = data['summary']['high_risk_events']
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nReport generated: {total_events} total events, "
                    f"{high_risk} high-risk events"
                )
            )
            
        except Exception as e:
            raise CommandError(f'Report generation failed: {e}')