import django_filters
from django.db import models
from institutions.models import Institution, InstitutionType


class InstitutionFilter(django_filters.FilterSet):
    """
    Filter class for Institution model.
    """
    name = django_filters.CharFilter(lookup_expr='icontains')
    institution_type = django_filters.ChoiceFilter(choices=InstitutionType.choices)
    country = django_filters.CharFilter(lookup_expr='icontains')
    city = django_filters.CharFilter(lookup_expr='icontains')
    is_verified = django_filters.BooleanFilter()
    created_at = django_filters.DateFromToRangeFilter()
    
    class Meta:
        model = Institution
        fields = ['name', 'institution_type', 'country', 'city', 'is_verified', 'created_at']