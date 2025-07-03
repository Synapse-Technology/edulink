from django.urls import path
from internship.views.internship_views import InternshipListView, InternshipDetailView, InternshipCreateView, InternshipUpdateView, InternshipDeleteView
from internship.views.application_views import ApplicationCreateView, ApplicationHistoryView, EmployerInternshipApplicationsView, EmployerUpdateApplicationView, EmployerApplicantProfilesView, InstitutionAcceptedApplicationsView

urlpatterns = [
    path('internships/', InternshipListView.as_view(), name='internship-list'),
    path('internships/<int:pk>/', InternshipDetailView.as_view(), name='internship-detail'),
    path('applications/', ApplicationHistoryView.as_view(), name='application-history'),
    path('applications/submit/', ApplicationCreateView.as_view(), name='application-submit'),
    path('internships/create/', InternshipCreateView.as_view(), name='internship-create'),
    path('internships/<int:pk>/update/', InternshipUpdateView.as_view(), name='internship-update'),
    path('internships/<int:pk>/delete/', InternshipDeleteView.as_view(), name='internship-delete'),
    path('employer/applications/', EmployerInternshipApplicationsView.as_view(), name='employer-applications'),
    path('employer/applications/<int:pk>/update/', EmployerUpdateApplicationView.as_view(), name='employer-update-application'),
    path('employer/applicants/', EmployerApplicantProfilesView.as_view(), name='employer-applicant-profiles'),
    path('institution/accepted-applications/', InstitutionAcceptedApplicationsView.as_view(), name='institution-accepted-applications'),
]

