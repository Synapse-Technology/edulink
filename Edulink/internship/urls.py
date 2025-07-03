from django.urls import path
from internship.views.internship_views import (
    InternshipListView,
    InternshipDetailView,
    InternshipCreateView,
    InternshipUpdateView,
    InternshipDeleteView,
    EmployerInternshipListView,
    InternshipVerificationView,
    SkillTagListView,
    InternshipSearchView,
)
from internship.views.application_views import (
    ApplicationCreateView,
    ApplicationDetailView,
    ApplicationUpdateView,
    ApplicationStatusUpdateView,
    StudentApplicationListView,
    EmployerApplicationListView,
    InternshipApplicationListView,
    ApplicationWithdrawView,
    ApplicationStatisticsView,
)

app_name = 'internship'

urlpatterns = [
    # Internship endpoints
    path('', InternshipListView.as_view(), name='internship-list'),
    path('create/', InternshipCreateView.as_view(), name='internship-create'),
    path('<int:pk>/', InternshipDetailView.as_view(), name='internship-detail'),
    path('<int:pk>/update/', InternshipUpdateView.as_view(), name='internship-update'),
    path('<int:pk>/delete/', InternshipDeleteView.as_view(), name='internship-delete'),
    path('<int:pk>/verify/', InternshipVerificationView.as_view(), name='internship-verify'),
    
    # Employer-specific endpoints
    path('my-internships/', EmployerInternshipListView.as_view(), name='employer-internships'),
    
    # Search and filtering
    path('search/', InternshipSearchView.as_view(), name='internship-search'),
    path('skill-tags/', SkillTagListView.as_view(), name='skill-tags'),
    
    # Application endpoints
    path('apply/', ApplicationCreateView.as_view(), name='application-create'),
    path('applications/', StudentApplicationListView.as_view(), name='student-applications'),
    path('applications/employer/', EmployerApplicationListView.as_view(), name='employer-applications'),
    path('applications/<int:pk>/', ApplicationDetailView.as_view(), name='application-detail'),
    path('applications/<int:pk>/update/', ApplicationUpdateView.as_view(), name='application-update'),
    path('applications/<int:pk>/status/', ApplicationStatusUpdateView.as_view(), name='application-status'),
    path('applications/<int:pk>/withdraw/', ApplicationWithdrawView.as_view(), name='application-withdraw'),
    path('internships/<int:internship_id>/applications/', InternshipApplicationListView.as_view(), name='internship-applications'),
    
    # Statistics
    path('statistics/', ApplicationStatisticsView.as_view(), name='application-statistics'),
] 
