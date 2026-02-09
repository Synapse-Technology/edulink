import django_filters

from .models import Student, StudentInstitutionAffiliation


class StudentFilter(django_filters.FilterSet):
    department_id = django_filters.UUIDFilter(method="filter_department")
    cohort_id = django_filters.UUIDFilter(method="filter_cohort")

    class Meta:
        model = Student
        fields = ["trust_level", "is_verified", "institution_id"]

    def filter_department(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            id__in=StudentInstitutionAffiliation.objects.filter(
                department_id=value,
                status=StudentInstitutionAffiliation.STATUS_APPROVED,
            ).values("student_id")
        )

    def filter_cohort(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            id__in=StudentInstitutionAffiliation.objects.filter(
                cohort_id=value,
                status=StudentInstitutionAffiliation.STATUS_APPROVED,
            ).values("student_id")
        )

