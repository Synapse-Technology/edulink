import django_filters
from django.db.models import Q
from django.utils import timezone
from .models import Internship, SkillTag


class InternshipFilter(django_filters.FilterSet):
    """Filter set for internship queries"""
    
    # Text search filters
    search = django_filters.CharFilter(method='filter_search', label='Search')
    title = django_filters.CharFilter(lookup_expr='icontains')
    location = django_filters.CharFilter(lookup_expr='icontains')
    
    # Category and type filters
    category = django_filters.ChoiceFilter(choices=Internship.CATEGORY_CHOICES)
    location_type = django_filters.ChoiceFilter(choices=Internship.LOCATION_TYPE_CHOICES)
    experience_level = django_filters.ChoiceFilter(choices=Internship.EXPERIENCE_LEVEL_CHOICES)
    
    # Skill filters
    skill_tags = django_filters.ModelMultipleChoiceFilter(
        queryset=SkillTag.objects.filter(is_active=True),
        method='filter_skill_tags'
    )
    required_skills = django_filters.CharFilter(method='filter_required_skills')
    
    # Date filters
    deadline_after = django_filters.DateFilter(field_name='deadline', lookup_expr='gte')
    deadline_before = django_filters.DateFilter(field_name='deadline', lookup_expr='lte')
    start_date_after = django_filters.DateFilter(field_name='start_date', lookup_expr='gte')
    start_date_before = django_filters.DateFilter(field_name='start_date', lookup_expr='lte')
    
    # Duration filters
    duration_min = django_filters.NumberFilter(field_name='duration_weeks', lookup_expr='gte')
    duration_max = django_filters.NumberFilter(field_name='duration_weeks', lookup_expr='lte')
    
    # Stipend filters
    stipend_min = django_filters.NumberFilter(field_name='stipend', lookup_expr='gte')
    stipend_max = django_filters.NumberFilter(field_name='stipend', lookup_expr='lte')
    has_stipend = django_filters.BooleanFilter(method='filter_has_stipend')
    
    # GPA and academic filters
    min_gpa_max = django_filters.NumberFilter(field_name='min_gpa', lookup_expr='lte')
    required_year_of_study = django_filters.MultipleChoiceFilter(
        choices=Internship.YEAR_OF_STUDY_CHOICES,
        method='filter_year_of_study'
    )
    
    # Status filters
    is_active = django_filters.BooleanFilter()
    is_verified = django_filters.BooleanFilter()
    is_featured = django_filters.BooleanFilter()
    visibility = django_filters.ChoiceFilter(choices=Internship.VISIBILITY_CHOICES)
    
    # Special filters
    is_expired = django_filters.BooleanFilter(method='filter_expired')
    has_spots_available = django_filters.BooleanFilter(method='filter_spots_available')
    accepting_applications = django_filters.BooleanFilter(method='filter_accepting_applications')
    
    # Employer filters
    employer_id = django_filters.NumberFilter()
    verified_by = django_filters.NumberFilter(field_name='verified_by_id')
    
    class Meta:
        model = Internship
        fields = {
            'created_at': ['exact', 'gte', 'lte'],
            'updated_at': ['exact', 'gte', 'lte'],
            'verification_date': ['exact', 'gte', 'lte'],
        }
    
    def filter_search(self, queryset, name, value):
        """Full text search across multiple fields"""
        if not value:
            return queryset
        
        return queryset.filter(
            Q(title__icontains=value) |
            Q(description__icontains=value) |
            Q(location__icontains=value) |
            Q(required_skills__icontains=value) |
            Q(preferred_skills__icontains=value) |
            Q(benefits__icontains=value)
        ).distinct()
    
    def filter_skill_tags(self, queryset, name, value):
        """Filter by skill tags"""
        if not value:
            return queryset
        
        # Filter internships that have all the specified skill tags
        for skill_tag in value:
            queryset = queryset.filter(skill_tags=skill_tag)
        
        return queryset.distinct()
    
    def filter_required_skills(self, queryset, name, value):
        """Filter by required skills text"""
        if not value:
            return queryset
        
        return queryset.filter(
            Q(required_skills__icontains=value) |
            Q(preferred_skills__icontains=value)
        ).distinct()
    
    def filter_has_stipend(self, queryset, name, value):
        """Filter internships with or without stipend"""
        if value is True:
            return queryset.filter(stipend__gt=0)
        elif value is False:
            return queryset.filter(Q(stipend__isnull=True) | Q(stipend=0))
        return queryset
    
    def filter_year_of_study(self, queryset, name, value):
        """Filter by year of study requirements"""
        if not value:
            return queryset
        
        # Filter internships that accept any of the specified years
        year_filter = Q()
        for year in value:
            year_filter |= Q(required_year_of_study__contains=year)
        
        return queryset.filter(year_filter)
    
    def filter_expired(self, queryset, name, value):
        """Filter expired/non-expired internships"""
        now = timezone.now().date()
        
        if value is True:
            return queryset.filter(deadline__lt=now)
        elif value is False:
            return queryset.filter(deadline__gte=now)
        return queryset
    
    def filter_spots_available(self, queryset, name, value):
        """Filter internships with available spots"""
        if value is True:
            # This would require calling the application service to get application counts
            # For now, we'll use a simplified approach
            return queryset.filter(
                Q(max_applications__isnull=True) |
                Q(max_applications__gt=0)  # Simplified - would need actual application count
            )
        elif value is False:
            return queryset.filter(max_applications=0)
        return queryset
    
    def filter_accepting_applications(self, queryset, name, value):
        """Filter internships currently accepting applications"""
        now = timezone.now().date()
        
        if value is True:
            return queryset.filter(
                is_active=True,
                deadline__gte=now,
                # Would also check application count vs max_applications
            )
        elif value is False:
            return queryset.filter(
                Q(is_active=False) |
                Q(deadline__lt=now)
                # Would also check if max applications reached
            )
        return queryset