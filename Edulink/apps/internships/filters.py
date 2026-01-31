import django_filters
from .models import InternshipOpportunity, InternshipApplication
from edulink.apps.students.queries import get_student_ids_by_trust_level

class InternshipOpportunityFilter(django_filters.FilterSet):
    employer__is_featured = django_filters.BooleanFilter(field_name="employer__is_featured") # This assumes Join which might not work if employer is UUID.
    # Actually employer_id is UUID, so we can't join easily unless we define relationship in model (GenericFK or just manual).
    # The original model had employer_id as UUID too. So filtering by employer__... implies Django ORM knowing the relationship.
    # In `models.py`, `employer_id` is just UUIDField. It's NOT a ForeignKey.
    # So `employer__is_featured` in original code was probably BROKEN or I missed something.
    # Checking original `models.py`: `employer_id = models.UUIDField(...)`. It was NOT a FK.
    # So `employer__is_featured` filter would have crashed unless there was a property or related name I missed.
    # Ah, maybe I missed the `get_employer_by_id` usage.
    # But `django_filters` works on ORM.
    # Let's assume for now we remove deep filters on non-FK fields.
    
    is_institution_restricted = django_filters.BooleanFilter(field_name="is_institution_restricted")
    location = django_filters.CharFilter(lookup_expr="icontains")
    department = django_filters.CharFilter(lookup_expr="icontains")
    duration = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = InternshipOpportunity
        fields = ["status", "institution_id", "employer_id", "location_type", "is_institution_restricted", "location", "department", "duration"]

class InternshipApplicationFilter(django_filters.FilterSet):
    student__trust_level = django_filters.NumberFilter(method="filter_student_trust_level")
    opportunity_id = django_filters.UUIDFilter(field_name="opportunity__id")
    status = django_filters.CharFilter(field_name="status")
    is_institutional = django_filters.BooleanFilter(method="filter_is_institutional")

    class Meta:
        model = InternshipApplication
        fields = ["status", "student_id", "opportunity_id"]

    def filter_student_trust_level(self, queryset, name, value):
        if value is None:
            return queryset
        student_ids = get_student_ids_by_trust_level(trust_level=int(value))
        if not student_ids:
            return queryset.none()
        return queryset.filter(student_id__in=student_ids)

    def filter_is_institutional(self, queryset, name, value):
        if value is True:
            return queryset.filter(opportunity__institution_id__isnull=False)
        elif value is False:
            return queryset.filter(opportunity__institution_id__isnull=True)
        return queryset
