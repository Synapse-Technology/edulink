from django.urls import path
from . import views

app_name = 'supervisors'

urlpatterns = [
    # Dashboard API
    path('api/dashboard/', views.SupervisorDashboardAPIView.as_view(), name='dashboard-api'),
    
    # Logbook Review API
    path('api/logbook-review/', views.SupervisorLogbookReviewAPIView.as_view(), name='logbook-review-api'),
    
    # Students Management API
    path('api/students/', views.SupervisorStudentsAPIView.as_view(), name='students-api'),
    
    # Profile Management API
    path('api/profile/', views.SupervisorProfileAPIView.as_view(), name='profile-api'),
    
    # Analytics API
    path('api/analytics/', views.supervisor_analytics, name='analytics-api'),
]