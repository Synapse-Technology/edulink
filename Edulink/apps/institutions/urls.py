from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    InstitutionViewSet,
    InstitutionSuggestionViewSet,
    InstitutionRequestViewSet,
    InstitutionInviteViewSet,
    InstitutionStudentVerificationViewSet,
    PlacementMonitoringViewSet,
    InstitutionReportsViewSet,
    InstitutionStaffViewSet,
    DepartmentViewSet,
    CohortViewSet,
    InstitutionDepartmentViewSet,
    InstitutionStaffProfileRequestViewSet,
    InstitutionLoginView,
)

router = DefaultRouter()
router.register(r"institutions", InstitutionViewSet, basename="institution")
router.register(r"institution-suggestions", InstitutionSuggestionViewSet, basename="institution-suggestion")
router.register(r"institution-requests", InstitutionRequestViewSet, basename="institution-request")
router.register(r"institution-invites", InstitutionInviteViewSet, basename="institution-invite")
router.register(r"institution-staff", InstitutionStaffViewSet, basename="institution-staff")
router.register(r"institution-staff-profile-requests", InstitutionStaffProfileRequestViewSet, basename="institution-staff-profile-request")
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"institution-departments", InstitutionDepartmentViewSet, basename="institution-department")
router.register(r"cohorts", CohortViewSet, basename="cohort")
router.register(r"institution-verifications", InstitutionStudentVerificationViewSet, basename="institution-verification")
router.register(r"institution-placements", PlacementMonitoringViewSet, basename="institution-placement")
router.register(r"institution-reports", InstitutionReportsViewSet, basename="institution-report")

urlpatterns = [
    path('auth/login/', InstitutionLoginView.as_view(), name='institution-login'),
    path("", include(router.urls)),
]
