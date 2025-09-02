import django_filters
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

from .models import (
    RegistrationRequest,
    RegistrationStatus,
    UserRole,
    InstitutionType,
    RiskLevel,
    VerificationSource
)


class RegistrationRequestFilter(django_filters.FilterSet):
    """Filter set for registration requests."""
    
    # Status filters
    status = django_filters.ChoiceFilter(
        choices=RegistrationStatus.choices,
        help_text="Filter by registration status"
    )
    
    status_in = django_filters.MultipleChoiceFilter(
        field_name='status',
        choices=RegistrationStatus.choices,
        help_text="Filter by multiple statuses"
    )
    
    # Role filters
    role = django_filters.ChoiceFilter(
        choices=UserRole.choices,
        help_text="Filter by user role"
    )
    
    # Institution type filters
    organization_type = django_filters.ChoiceFilter(
        choices=InstitutionType.choices,
        help_text="Filter by institution type"
    )
    
    # Risk level filters
    risk_level = django_filters.ChoiceFilter(
        choices=RiskLevel.choices,
        help_text="Filter by risk level"
    )
    
    risk_score_min = django_filters.NumberFilter(
        field_name='risk_score',
        lookup_expr='gte',
        help_text="Minimum risk score"
    )
    
    risk_score_max = django_filters.NumberFilter(
        field_name='risk_score',
        lookup_expr='lte',
        help_text="Maximum risk score"
    )
    
    # Date filters
    created_after = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='gte',
        help_text="Filter requests created after this date"
    )
    
    created_before = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='lte',
        help_text="Filter requests created before this date"
    )
    
    created_date = django_filters.DateFilter(
        field_name='created_at',
        lookup_expr='date',
        help_text="Filter requests created on specific date"
    )
    
    # Time-based filters
    created_today = django_filters.BooleanFilter(
        method='filter_created_today',
        help_text="Filter requests created today"
    )
    
    created_this_week = django_filters.BooleanFilter(
        method='filter_created_this_week',
        help_text="Filter requests created this week"
    )
    
    created_this_month = django_filters.BooleanFilter(
        method='filter_created_this_month',
        help_text="Filter requests created this month"
    )
    
    # Verification status filters
    email_verified = django_filters.BooleanFilter(
        help_text="Filter by email verification status"
    )
    
    domain_verified = django_filters.BooleanFilter(
        help_text="Filter by domain verification status"
    )
    
    institutional_verified = django_filters.BooleanFilter(
        help_text="Filter by institutional verification status"
    )
    
    # Verification source filters
    institutional_verification_source = django_filters.ChoiceFilter(
        choices=VerificationSource.choices,
        help_text="Filter by institutional verification source"
    )
    
    domain_verification_method = django_filters.ChoiceFilter(
        choices=VerificationSource.choices,
        help_text="Filter by domain verification method"
    )
    
    # Review status filters
    assigned_reviewer = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text="Filter by assigned reviewer"
    )
    
    has_reviewer = django_filters.BooleanFilter(
        method='filter_has_reviewer',
        help_text="Filter requests with or without assigned reviewer"
    )
    
    # Approval/Rejection filters
    approved_by = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text="Filter by approver"
    )
    
    rejected_by = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text="Filter by rejector"
    )
    
    # Organization filters
    organization_name = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text="Filter by organization name (case-insensitive)"
    )
    
    organization_website = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text="Filter by organization website"
    )
    
    # Email domain filter
    email_domain = django_filters.CharFilter(
        method='filter_email_domain',
        help_text="Filter by email domain"
    )
    
    # Expiration filters
    expired = django_filters.BooleanFilter(
        method='filter_expired',
        help_text="Filter expired requests"
    )
    
    expires_soon = django_filters.BooleanFilter(
        method='filter_expires_soon',
        help_text="Filter requests expiring within 7 days"
    )
    
    # User account creation status
    user_account_created = django_filters.BooleanFilter(
        help_text="Filter by user account creation status"
    )
    
    # Search filter
    search = django_filters.CharFilter(
        method='filter_search',
        help_text="Search across multiple fields"
    )
    
    # Pending actions filter
    pending_action = django_filters.ChoiceFilter(
        method='filter_pending_action',
        choices=[
            ('email_verification', 'Email Verification'),
            ('domain_verification', 'Domain Verification'),
            ('institutional_verification', 'Institutional Verification'),
            ('admin_review', 'Admin Review'),
        ],
        help_text="Filter by pending action type"
    )
    
    class Meta:
        model = RegistrationRequest
        fields = {
            'email': ['exact', 'icontains'],
            'first_name': ['exact', 'icontains'],
            'last_name': ['exact', 'icontains'],
            'phone_number': ['exact', 'icontains'],
            'request_number': ['exact', 'icontains'],
            'ip_address': ['exact'],
        }
    
    def filter_created_today(self, queryset, name, value):
        """Filter requests created today."""
        if value:
            today = timezone.now().date()
            return queryset.filter(created_at__date=today)
        return queryset
    
    def filter_created_this_week(self, queryset, name, value):
        """Filter requests created this week."""
        if value:
            week_start = timezone.now().date() - timedelta(days=timezone.now().weekday())
            return queryset.filter(created_at__date__gte=week_start)
        return queryset
    
    def filter_created_this_month(self, queryset, name, value):
        """Filter requests created this month."""
        if value:
            month_start = timezone.now().replace(day=1).date()
            return queryset.filter(created_at__date__gte=month_start)
        return queryset
    
    def filter_has_reviewer(self, queryset, name, value):
        """Filter requests with or without assigned reviewer."""
        if value:
            return queryset.exclude(assigned_reviewer__isnull=True).exclude(assigned_reviewer='')
        else:
            return queryset.filter(Q(assigned_reviewer__isnull=True) | Q(assigned_reviewer=''))
    
    def filter_email_domain(self, queryset, name, value):
        """Filter by email domain."""
        if value:
            return queryset.filter(email__iendswith=f'@{value}')
        return queryset
    
    def filter_expired(self, queryset, name, value):
        """Filter expired requests."""
        if value:
            now = timezone.now()
            return queryset.filter(expires_at__lt=now)
        else:
            now = timezone.now()
            return queryset.filter(Q(expires_at__gte=now) | Q(expires_at__isnull=True))
    
    def filter_expires_soon(self, queryset, name, value):
        """Filter requests expiring within 7 days."""
        if value:
            now = timezone.now()
            week_from_now = now + timedelta(days=7)
            return queryset.filter(
                expires_at__gte=now,
                expires_at__lte=week_from_now
            )
        return queryset
    
    def filter_search(self, queryset, name, value):
        """Search across multiple fields."""
        if value:
            return queryset.filter(
                Q(email__icontains=value) |
                Q(first_name__icontains=value) |
                Q(last_name__icontains=value) |
                Q(organization_name__icontains=value) |
                Q(request_number__icontains=value) |
                Q(phone_number__icontains=value)
            )
        return queryset
    
    def filter_pending_action(self, queryset, name, value):
        """Filter by pending action type."""
        if value == 'email_verification':
            return queryset.filter(
                status__in=[
                    RegistrationStatus.PENDING,
                    RegistrationStatus.EMAIL_VERIFICATION_SENT
                ]
            )
        elif value == 'domain_verification':
            return queryset.filter(
                status=RegistrationStatus.DOMAIN_VERIFICATION_PENDING
            )
        elif value == 'institutional_verification':
            return queryset.filter(
                status=RegistrationStatus.INSTITUTIONAL_VERIFICATION_PENDING
            )
        elif value == 'admin_review':
            return queryset.filter(
                status=RegistrationStatus.UNDER_REVIEW
            )
        return queryset


class RegistrationRequestAdminFilter(RegistrationRequestFilter):
    """Extended filter set for admin users with additional filters."""
    
    # IP-based filters
    suspicious_ip = django_filters.BooleanFilter(
        method='filter_suspicious_ip',
        help_text="Filter requests from suspicious IP addresses"
    )
    
    # Bulk action filters
    bulk_actionable = django_filters.BooleanFilter(
        method='filter_bulk_actionable',
        help_text="Filter requests that can be bulk processed"
    )
    
    # Priority filters
    high_priority = django_filters.BooleanFilter(
        method='filter_high_priority',
        help_text="Filter high priority requests"
    )
    
    # Review time filters
    review_overdue = django_filters.BooleanFilter(
        method='filter_review_overdue',
        help_text="Filter requests with overdue reviews"
    )
    
    def filter_suspicious_ip(self, queryset, name, value):
        """Filter requests from suspicious IP addresses."""
        if value:
            # This would implement actual suspicious IP detection logic
            # For now, we'll filter requests with missing IP addresses
            return queryset.filter(Q(ip_address__isnull=True) | Q(ip_address=''))
        return queryset
    
    def filter_bulk_actionable(self, queryset, name, value):
        """Filter requests that can be bulk processed."""
        if value:
            actionable_statuses = [
                RegistrationStatus.EMAIL_VERIFIED,
                RegistrationStatus.DOMAIN_VERIFIED,
                RegistrationStatus.INSTITUTIONAL_VERIFIED,
                RegistrationStatus.UNDER_REVIEW
            ]
            return queryset.filter(status__in=actionable_statuses)
        return queryset
    
    def filter_high_priority(self, queryset, name, value):
        """Filter high priority requests."""
        if value:
            return queryset.filter(
                Q(risk_level=RiskLevel.HIGH) |
                Q(risk_level=RiskLevel.CRITICAL) |
                Q(role=UserRole.INSTITUTION_ADMIN)
            )
        return queryset
    
    def filter_review_overdue(self, queryset, name, value):
        """Filter requests with overdue reviews."""
        if value:
            # Consider reviews overdue after 3 days
            overdue_date = timezone.now() - timedelta(days=3)
            return queryset.filter(
                status=RegistrationStatus.UNDER_REVIEW,
                review_started_at__lt=overdue_date
            )
        return queryset