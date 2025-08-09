from django.urls import path
from .views import (
    ApplyToInternshipView,
    StudentApplicationListView,
    ApplicationDetailView,
    SupervisorFeedbackView,
    EmployerApplicationListView,
    InternshipApplicationListView,
    ApplicationStatusUpdateView,
    ApplicationWithdrawView,
    ApplicationStatisticsView,
    InstitutionApplicationListView,
)

urlpatterns = [
    path("apply/", ApplyToInternshipView.as_view(), name="apply-to-internship"),
    path(
        "my-applications/",
        StudentApplicationListView.as_view(),
        name="student-applications",
    ),
    path(
        "application/<int:pk>/",
        ApplicationDetailView.as_view(),
        name="application-detail",
    ),
    path("feedback/", SupervisorFeedbackView.as_view(), name="supervisor-feedback"),
    path(
        "applications/employer/",
        EmployerApplicationListView.as_view(),
        name="employer-applications",
    ),
    path(
        "internships/<int:internship_id>/applications/",
        InternshipApplicationListView.as_view(),
        name="internship-applications",
    ),
    path(
        "application/<int:pk>/status/",
        ApplicationStatusUpdateView.as_view(),
        name="application-status-update",
    ),
    path(
        "application/<int:pk>/withdraw/",
        ApplicationWithdrawView.as_view(),
        name="application-withdraw",
    ),
    path(
        "statistics/",
        ApplicationStatisticsView.as_view(),
        name="application-statistics",
    ),
    path(
        "applications/institution/",
        InstitutionApplicationListView.as_view(),
        name="institution-applications",
    ),
]
