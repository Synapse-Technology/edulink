from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import logging

from registration_requests.models import (
    RegistrationRequest,
    RegistrationStatus,
    RiskLevel
)
from registration_requests.services import (
    RegistrationService,
    EmailVerificationService,
    InstitutionalVerificationService,
    RiskAssessmentService
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process registration requests - cleanup, verification, and automated actions'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--action',
            type=str,
            choices=[
                'cleanup_expired',
                'send_verifications',
                'process_verifications',
                'auto_approve',
                'update_risk_scores',
                'send_reminders',
                'stats'
            ],
            help='Action to perform'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without actually doing it'
        )
        
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Limit number of requests to process'
        )
        
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days for time-based operations'
        )
        
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force action even if conditions are not met'
        )
    
    def handle(self, *args, **options):
        action = options['action']
        dry_run = options['dry_run']
        limit = options['limit']
        days = options['days']
        force = options['force']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made')
            )
        
        try:
            if action == 'cleanup_expired':
                self.cleanup_expired_requests(dry_run, limit)
            elif action == 'send_verifications':
                self.send_verification_emails(dry_run, limit)
            elif action == 'process_verifications':
                self.process_institutional_verifications(dry_run, limit)
            elif action == 'auto_approve':
                self.auto_approve_requests(dry_run, limit, force)
            elif action == 'update_risk_scores':
                self.update_risk_scores(dry_run, limit)
            elif action == 'send_reminders':
                self.send_review_reminders(dry_run, days)
            elif action == 'stats':
                self.show_statistics()
            else:
                raise CommandError('No action specified. Use --action parameter.')
                
        except Exception as e:
            logger.error(f"Command failed: {e}")
            raise CommandError(f"Command failed: {e}")
    
    def cleanup_expired_requests(self, dry_run, limit):
        """Clean up expired registration requests."""
        now = timezone.now()
        expired_requests = RegistrationRequest.objects.filter(
            expires_at__lt=now,
            status__in=[
                RegistrationStatus.PENDING,
                RegistrationStatus.EMAIL_VERIFICATION_SENT,
                RegistrationStatus.EMAIL_VERIFIED,
                RegistrationStatus.DOMAIN_VERIFICATION_PENDING,
                RegistrationStatus.DOMAIN_VERIFIED,
                RegistrationStatus.INSTITUTIONAL_VERIFICATION_PENDING,
                RegistrationStatus.INSTITUTIONAL_VERIFIED,
                RegistrationStatus.UNDER_REVIEW
            ]
        )[:limit]
        
        count = expired_requests.count()
        
        if dry_run:
            self.stdout.write(
                f"Would expire {count} registration requests"
            )
            for request in expired_requests:
                self.stdout.write(
                    f"  - {request.request_number} ({request.email}) - "
                    f"expired {(now - request.expires_at).days} days ago"
                )
        else:
            expired_count = 0
            for request in expired_requests:
                request.status = RegistrationStatus.EXPIRED
                request.save(update_fields=['status'])
                expired_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(f"Expired {expired_count} registration requests")
            )
    
    def send_verification_emails(self, dry_run, limit):
        """Send verification emails to pending requests."""
        pending_requests = RegistrationRequest.objects.filter(
            status=RegistrationStatus.PENDING,
            email_verified=False
        )[:limit]
        
        count = pending_requests.count()
        
        if dry_run:
            self.stdout.write(
                f"Would send verification emails to {count} requests"
            )
            for request in pending_requests:
                self.stdout.write(
                    f"  - {request.request_number} ({request.email})"
                )
        else:
            email_service = EmailVerificationService()
            sent_count = 0
            
            for request in pending_requests:
                try:
                    email_service.send_verification_email(request)
                    sent_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to send verification to {request.email}: {e}"
                        )
                    )
            
            self.stdout.write(
                self.style.SUCCESS(f"Sent verification emails to {sent_count} requests")
            )
    
    def process_institutional_verifications(self, dry_run, limit):
        """Process institutional verifications."""
        pending_verifications = RegistrationRequest.objects.filter(
            status=RegistrationStatus.INSTITUTIONAL_VERIFICATION_PENDING
        )[:limit]
        
        count = pending_verifications.count()
        
        if dry_run:
            self.stdout.write(
                f"Would process {count} institutional verifications"
            )
            for request in pending_verifications:
                self.stdout.write(
                    f"  - {request.request_number} ({request.organization_name})"
                )
        else:
            verification_service = InstitutionalVerificationService()
            processed_count = 0
            
            for request in pending_verifications:
                try:
                    verification_service.verify_institution(request.id)
                    processed_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to verify institution for {request.request_number}: {e}"
                        )
                    )
            
            self.stdout.write(
                self.style.SUCCESS(f"Processed {processed_count} institutional verifications")
            )
    
    def auto_approve_requests(self, dry_run, limit, force):
        """Auto-approve eligible requests."""
        # Get requests that are fully verified and low risk
        eligible_requests = RegistrationRequest.objects.filter(
            status=RegistrationStatus.INSTITUTIONAL_VERIFIED,
            email_verified=True,
            domain_verified=True,
            institutional_verified=True,
            risk_level__in=[RiskLevel.LOW, RiskLevel.MEDIUM]
        )[:limit]
        
        if not force:
            # Additional safety checks
            eligible_requests = eligible_requests.filter(
                risk_score__lte=30  # Only very low risk
            )
        
        count = eligible_requests.count()
        
        if dry_run:
            self.stdout.write(
                f"Would auto-approve {count} requests"
            )
            for request in eligible_requests:
                self.stdout.write(
                    f"  - {request.request_number} ({request.email}) - "
                    f"Risk: {request.risk_level} ({request.risk_score})"
                )
        else:
            registration_service = RegistrationService()
            approved_count = 0
            
            for request in eligible_requests:
                try:
                    registration_service.approve_request(
                        request.id,
                        approved_by='system',
                        admin_notes='Auto-approved via management command'
                    )
                    approved_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to approve {request.request_number}: {e}"
                        )
                    )
            
            self.stdout.write(
                self.style.SUCCESS(f"Auto-approved {approved_count} requests")
            )
    
    def update_risk_scores(self, dry_run, limit):
        """Update risk scores for pending requests."""
        pending_requests = RegistrationRequest.objects.filter(
            status__in=[
                RegistrationStatus.PENDING,
                RegistrationStatus.EMAIL_VERIFIED,
                RegistrationStatus.DOMAIN_VERIFIED,
                RegistrationStatus.UNDER_REVIEW
            ]
        )[:limit]
        
        count = pending_requests.count()
        
        if dry_run:
            self.stdout.write(
                f"Would update risk scores for {count} requests"
            )
        else:
            risk_service = RiskAssessmentService()
            updated_count = 0
            
            for request in pending_requests:
                try:
                    old_score = request.risk_score
                    risk_data = risk_service.assess_registration_risk(
                        email=request.email,
                        organization_website=request.organization_website,
                        role=request.role,
                        organization_type=request.organization_type
                    )
                    
                    if abs(old_score - risk_data['risk_score']) > 5:
                        request.risk_score = risk_data['risk_score']
                        request.risk_level = risk_data['risk_level']
                        request.risk_factors = risk_data['risk_factors']
                        request.save(update_fields=['risk_score', 'risk_level', 'risk_factors'])
                        updated_count += 1
                        
                        self.stdout.write(
                            f"Updated {request.request_number}: {old_score} -> {risk_data['risk_score']}"
                        )
                        
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to update risk score for {request.request_number}: {e}"
                        )
                    )
            
            self.stdout.write(
                self.style.SUCCESS(f"Updated risk scores for {updated_count} requests")
            )
    
    def send_review_reminders(self, dry_run, days):
        """Send review reminders for overdue requests."""
        cutoff_date = timezone.now() - timedelta(days=days)
        overdue_requests = RegistrationRequest.objects.filter(
            status=RegistrationStatus.UNDER_REVIEW,
            review_started_at__lt=cutoff_date
        )
        
        count = overdue_requests.count()
        
        if dry_run:
            self.stdout.write(
                f"Would send reminders for {count} overdue reviews"
            )
            for request in overdue_requests:
                days_overdue = (timezone.now() - request.review_started_at).days
                self.stdout.write(
                    f"  - {request.request_number} - {days_overdue} days overdue"
                )
        else:
            from registration_requests.tasks import send_review_reminder
            sent_count = 0
            
            for request in overdue_requests:
                try:
                    send_review_reminder.delay(request.id)
                    sent_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to send reminder for {request.request_number}: {e}"
                        )
                    )
            
            self.stdout.write(
                self.style.SUCCESS(f"Scheduled reminders for {sent_count} overdue reviews")
            )
    
    def show_statistics(self):
        """Show registration statistics."""
        total_requests = RegistrationRequest.objects.count()
        
        # Status breakdown
        status_counts = {}
        for status, _ in RegistrationStatus.choices:
            count = RegistrationRequest.objects.filter(status=status).count()
            status_counts[status] = count
        
        # Risk level breakdown
        risk_counts = {}
        for risk, _ in RiskLevel.choices:
            count = RegistrationRequest.objects.filter(risk_level=risk).count()
            risk_counts[risk] = count
        
        # Recent activity (last 7 days)
        week_ago = timezone.now() - timedelta(days=7)
        recent_requests = RegistrationRequest.objects.filter(created_at__gte=week_ago).count()
        recent_approvals = RegistrationRequest.objects.filter(
            status=RegistrationStatus.APPROVED,
            approved_at__gte=week_ago
        ).count()
        
        # Pending actions
        pending_email_verification = RegistrationRequest.objects.filter(
            status=RegistrationStatus.PENDING,
            email_verified=False
        ).count()
        
        pending_review = RegistrationRequest.objects.filter(
            status=RegistrationStatus.UNDER_REVIEW
        ).count()
        
        # Display statistics
        self.stdout.write(self.style.SUCCESS("\n=== Registration Statistics ==="))
        self.stdout.write(f"Total Requests: {total_requests}")
        
        self.stdout.write("\nStatus Breakdown:")
        for status, count in status_counts.items():
            self.stdout.write(f"  {status}: {count}")
        
        self.stdout.write("\nRisk Level Breakdown:")
        for risk, count in risk_counts.items():
            self.stdout.write(f"  {risk}: {count}")
        
        self.stdout.write("\nRecent Activity (Last 7 days):")
        self.stdout.write(f"  New Requests: {recent_requests}")
        self.stdout.write(f"  Approvals: {recent_approvals}")
        
        self.stdout.write("\nPending Actions:")
        self.stdout.write(f"  Email Verification: {pending_email_verification}")
        self.stdout.write(f"  Admin Review: {pending_review}")
        
        # Warnings for high numbers
        if pending_review > 50:
            self.stdout.write(
                self.style.WARNING(f"\nWARNING: {pending_review} requests pending review!")
            )
        
        if pending_email_verification > 100:
            self.stdout.write(
                self.style.WARNING(f"\nWARNING: {pending_email_verification} requests need email verification!")
            )