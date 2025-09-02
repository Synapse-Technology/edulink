import django_filters
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Application, ApplicationDocument, SupervisorFeedback


class ApplicationFilter(django_filters.FilterSet):
    """Filter set for Application model"""
    
    # Text search
    search = django_filters.CharFilter(method='filter_search', label='Search')
    
    # Status filters
    status = django_filters.ChoiceFilter(choices=Application.STATUS_CHOICES)
    status_in = django_filters.MultipleChoiceFilter(
        field_name='status',
        choices=Application.STATUS_CHOICES,
        label='Status (multiple)'
    )
    
    # Date filters
    application_date = django_filters.DateFilter()
    application_date_after = django_filters.DateFilter(
        field_name='application_date',
        lookup_expr='gte',
        label='Applied after'
    )
    application_date_before = django_filters.DateFilter(
        field_name='application_date',
        lookup_expr='lte',
        label='Applied before'
    )
    application_date_range = django_filters.DateRangeFilter(
        field_name='application_date',
        label='Application date range'
    )
    
    # Status change date filters
    status_changed_after = django_filters.DateTimeFilter(
        field_name='status_changed_at',
        lookup_expr='gte',
        label='Status changed after'
    )
    status_changed_before = django_filters.DateTimeFilter(
        field_name='status_changed_at',
        lookup_expr='lte',
        label='Status changed before'
    )
    
    # Review filters
    reviewed = django_filters.BooleanFilter(
        field_name='reviewed_at',
        lookup_expr='isnull',
        exclude=True,
        label='Has been reviewed'
    )
    reviewed_after = django_filters.DateTimeFilter(
        field_name='reviewed_at',
        lookup_expr='gte',
        label='Reviewed after'
    )
    reviewed_before = django_filters.DateTimeFilter(
        field_name='reviewed_at',
        lookup_expr='lte',
        label='Reviewed before'
    )
    
    # Interview filters
    has_interview = django_filters.BooleanFilter(
        field_name='interview_date',
        lookup_expr='isnull',
        exclude=True,
        label='Has interview scheduled'
    )
    interview_date_after = django_filters.DateTimeFilter(
        field_name='interview_date',
        lookup_expr='gte',
        label='Interview after'
    )
    interview_date_before = django_filters.DateTimeFilter(
        field_name='interview_date',
        lookup_expr='lte',
        label='Interview before'
    )
    interview_type = django_filters.ChoiceFilter(
        choices=[
            ('in_person', 'In Person'),
            ('video_call', 'Video Call'),
            ('phone_call', 'Phone Call'),
            ('online', 'Online')
        ]
    )
    
    # Foreign key filters
    student_id = django_filters.NumberFilter()
    internship_id = django_filters.NumberFilter()
    employer_id = django_filters.NumberFilter()
    reviewed_by_id = django_filters.NumberFilter()
    status_changed_by_id = django_filters.NumberFilter()
    
    # Priority and scoring
    priority_score_min = django_filters.NumberFilter(
        field_name='priority_score',
        lookup_expr='gte',
        label='Minimum priority score'
    )
    priority_score_max = django_filters.NumberFilter(
        field_name='priority_score',
        lookup_expr='lte',
        label='Maximum priority score'
    )
    
    # Source filter
    source = django_filters.ChoiceFilter(
        choices=[
            ('web', 'Web Application'),
            ('mobile', 'Mobile App'),
            ('api', 'API'),
            ('import', 'Data Import'),
            ('admin', 'Admin Panel')
        ]
    )
    
    # Time-based filters
    applied_today = django_filters.BooleanFilter(
        method='filter_applied_today',
        label='Applied today'
    )
    applied_this_week = django_filters.BooleanFilter(
        method='filter_applied_this_week',
        label='Applied this week'
    )
    applied_this_month = django_filters.BooleanFilter(
        method='filter_applied_this_month',
        label='Applied this month'
    )
    
    # Status duration filters
    pending_too_long = django_filters.BooleanFilter(
        method='filter_pending_too_long',
        label='Pending for more than 7 days'
    )
    under_review_too_long = django_filters.BooleanFilter(
        method='filter_under_review_too_long',
        label='Under review for more than 14 days'
    )
    
    # Active status filter
    is_active = django_filters.BooleanFilter(
        method='filter_is_active',
        label='Is active (not final status)'
    )
    
    # Has documents filter
    has_documents = django_filters.BooleanFilter(
        method='filter_has_documents',
        label='Has additional documents'
    )
    
    # Has feedback filter
    has_feedback = django_filters.BooleanFilter(
        method='filter_has_feedback',
        label='Has supervisor feedback'
    )
    
    # Custom answer search
    custom_answers_search = django_filters.CharFilter(
        method='filter_custom_answers_search',
        label='Search in custom answers'
    )
    
    class Meta:
        model = Application
        fields = {
            'created_at': ['exact', 'gte', 'lte'],
            'updated_at': ['exact', 'gte', 'lte'],
        }
    
    def filter_search(self, queryset, name, value):
        """Search across multiple text fields"""
        if not value:
            return queryset
        
        return queryset.filter(
            Q(cover_letter__icontains=value) |
            Q(review_notes__icontains=value) |
            Q(interview_notes__icontains=value) |
            Q(custom_answers__icontains=value)
        )
    
    def filter_applied_today(self, queryset, name, value):
        """Filter applications submitted today"""
        if not value:
            return queryset
        
        today = timezone.now().date()
        return queryset.filter(application_date=today)
    
    def filter_applied_this_week(self, queryset, name, value):
        """Filter applications submitted this week"""
        if not value:
            return queryset
        
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        return queryset.filter(application_date__gte=week_start)
    
    def filter_applied_this_month(self, queryset, name, value):
        """Filter applications submitted this month"""
        if not value:
            return queryset
        
        today = timezone.now().date()
        month_start = today.replace(day=1)
        return queryset.filter(application_date__gte=month_start)
    
    def filter_pending_too_long(self, queryset, name, value):
        """Filter applications pending for more than 7 days"""
        if not value:
            return queryset
        
        cutoff_date = timezone.now() - timedelta(days=7)
        return queryset.filter(
            status='pending',
            status_changed_at__lt=cutoff_date
        )
    
    def filter_under_review_too_long(self, queryset, name, value):
        """Filter applications under review for more than 14 days"""
        if not value:
            return queryset
        
        cutoff_date = timezone.now() - timedelta(days=14)
        return queryset.filter(
            status='under_review',
            status_changed_at__lt=cutoff_date
        )
    
    def filter_is_active(self, queryset, name, value):
        """Filter active applications (not in final status)"""
        if value is None:
            return queryset
        
        final_statuses = ['accepted', 'rejected', 'withdrawn', 'expired']
        
        if value:
            return queryset.exclude(status__in=final_statuses)
        else:
            return queryset.filter(status__in=final_statuses)
    
    def filter_has_documents(self, queryset, name, value):
        """Filter applications with additional documents"""
        if value is None:
            return queryset
        
        if value:
            return queryset.filter(documents__isnull=False).distinct()
        else:
            return queryset.filter(documents__isnull=True)
    
    def filter_has_feedback(self, queryset, name, value):
        """Filter applications with supervisor feedback"""
        if value is None:
            return queryset
        
        if value:
            return queryset.filter(supervisor_feedback__isnull=False)
        else:
            return queryset.filter(supervisor_feedback__isnull=True)
    
    def filter_custom_answers_search(self, queryset, name, value):
        """Search in custom answers JSON field"""
        if not value:
            return queryset
        
        # For PostgreSQL with JSON field
        try:
            return queryset.filter(custom_answers__icontains=value)
        except:
            # Fallback for other databases
            return queryset.filter(
                custom_answers__contains=value
            )


class ApplicationDocumentFilter(django_filters.FilterSet):
    """Filter set for ApplicationDocument model"""
    
    # Document type filter
    document_type = django_filters.ChoiceFilter(
        choices=[
            ('resume', 'Resume'),
            ('cover_letter', 'Cover Letter'),
            ('transcript', 'Transcript'),
            ('portfolio', 'Portfolio'),
            ('recommendation', 'Recommendation Letter'),
            ('certificate', 'Certificate'),
            ('other', 'Other')
        ]
    )
    
    # Verification status
    is_verified = django_filters.BooleanFilter()
    
    # File size filters
    file_size_min = django_filters.NumberFilter(
        field_name='file_size',
        lookup_expr='gte',
        label='Minimum file size (bytes)'
    )
    file_size_max = django_filters.NumberFilter(
        field_name='file_size',
        lookup_expr='lte',
        label='Maximum file size (bytes)'
    )
    
    # Upload date filters
    uploaded_after = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='gte',
        label='Uploaded after'
    )
    uploaded_before = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='lte',
        label='Uploaded before'
    )
    
    # Application filters
    application_id = django_filters.NumberFilter()
    application_status = django_filters.CharFilter(
        field_name='application__status',
        label='Application status'
    )
    
    # Uploader filters
    uploaded_by_id = django_filters.NumberFilter()
    verified_by_id = django_filters.NumberFilter()
    
    # Filename search
    filename_search = django_filters.CharFilter(
        field_name='original_filename',
        lookup_expr='icontains',
        label='Search filename'
    )
    
    class Meta:
        model = ApplicationDocument
        fields = {
            'created_at': ['exact', 'gte', 'lte'],
            'verified_at': ['exact', 'gte', 'lte', 'isnull'],
        }


class SupervisorFeedbackFilter(django_filters.FilterSet):
    """Filter set for SupervisorFeedback model"""
    
    # Rating filters
    rating = django_filters.NumberFilter()
    rating_min = django_filters.NumberFilter(
        field_name='rating',
        lookup_expr='gte',
        label='Minimum rating'
    )
    rating_max = django_filters.NumberFilter(
        field_name='rating',
        lookup_expr='lte',
        label='Maximum rating'
    )
    
    # Detailed rating filters
    technical_skills_min = django_filters.NumberFilter(
        field_name='technical_skills_rating',
        lookup_expr='gte',
        label='Minimum technical skills rating'
    )
    communication_min = django_filters.NumberFilter(
        field_name='communication_rating',
        lookup_expr='gte',
        label='Minimum communication rating'
    )
    professionalism_min = django_filters.NumberFilter(
        field_name='professionalism_rating',
        lookup_expr='gte',
        label='Minimum professionalism rating'
    )
    
    # Recommendation filter
    would_recommend = django_filters.BooleanFilter()
    
    # Application filters
    application_id = django_filters.NumberFilter()
    application_status = django_filters.CharFilter(
        field_name='application__status',
        label='Application status'
    )
    student_id = django_filters.NumberFilter(
        field_name='application__student_id',
        label='Student ID'
    )
    internship_id = django_filters.NumberFilter(
        field_name='application__internship_id',
        label='Internship ID'
    )
    
    # Supervisor filter
    supervisor_id = django_filters.NumberFilter()
    
    # Date filters
    created_after = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='gte',
        label='Created after'
    )
    created_before = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='lte',
        label='Created before'
    )
    
    # Text search
    feedback_search = django_filters.CharFilter(
        method='filter_feedback_search',
        label='Search feedback text'
    )
    
    class Meta:
        model = SupervisorFeedback
        fields = {
            'created_at': ['exact', 'gte', 'lte'],
            'updated_at': ['exact', 'gte', 'lte'],
        }
    
    def filter_feedback_search(self, queryset, name, value):
        """Search across feedback text fields"""
        if not value:
            return queryset
        
        return queryset.filter(
            Q(feedback__icontains=value) |
            Q(improvement_areas__icontains=value) |
            Q(strengths__icontains=value)
        )