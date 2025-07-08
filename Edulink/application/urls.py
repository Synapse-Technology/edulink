from django.urls import path
from .views import (
    ApplicationCreateView,
    ApplicationHistoryView,
    EmployerInternshipApplicationsView,
    EmployerUpdateApplicationView,
    EmployerApplicantProfilesView,
    InstitutionAcceptedApplicationsView,
    SupervisorFeedbackView,
)

urlpatterns = [
    path('applications/', ApplicationHistoryView.as_view(), name='application-history'),
    path('applications/submit/', ApplicationCreateView.as_view(), name='application-submit'),
    path('employer/applications/', EmployerInternshipApplicationsView.as_view(), name='employer-applications'),
    path('employer/applications/<int:pk>/update/', EmployerUpdateApplicationView.as_view(), name='employer-update-application'),
    path('employer/applicants/', EmployerApplicantProfilesView.as_view(), name='employer-applicant-profiles'),
    path('institution/accepted-applications/', InstitutionAcceptedApplicationsView.as_view(), name='institution-accepted-applications'),
    path('supervisor-feedback/', SupervisorFeedbackView.as_view(), name='supervisor-feedback'),
]