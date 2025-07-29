from django.urls import path
from .views import (
    CreateInstitutionView,
    InstitutionStudentListView,
    InstitutionApplicationListView,
    ApplicationStatusUpdateView,
    InstitutionDashboardStatsView,
    InstitutionDepartmentsView,
    InstitutionInternshipsView,
    InstitutionReportsView,
    institution_dashboard_view,
    institution_login_view
)

app_name = 'institutions'

urlpatterns = [
    # Authentication
    path('login/', institution_login_view, name='login'),
    
    # Dashboard HTML view
    path('dashboard/', institution_dashboard_view, name='dashboard'),
    
    # API endpoints
    path('api/dashboard/stats/', InstitutionDashboardStatsView.as_view(), name='dashboard_stats'),
    path('api/departments/', InstitutionDepartmentsView.as_view(), name='departments'),
    path('api/internships/', InstitutionInternshipsView.as_view(), name='internships'),
    path('api/reports/', InstitutionReportsView.as_view(), name='reports'),
    
    # Other endpoints
    path('create/', CreateInstitutionView.as_view(), name='create_institution'),
    path('api/my-students/', InstitutionStudentListView.as_view(), name='my_students'),
    path('applications/', InstitutionApplicationListView.as_view(), name='applications'),
    path('applications/<int:application_id>/status/', ApplicationStatusUpdateView.as_view(), name='update_application_status'),
]
