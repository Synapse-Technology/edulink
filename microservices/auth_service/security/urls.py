from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'security'

urlpatterns = [
    # Security Events
    path('events/', views.SecurityEventListCreateView.as_view(), name='security-event-list'),
    path('events/<uuid:pk>/', views.SecurityEventDetailView.as_view(), name='security-event-detail'),
    path('events/bulk-action/', views.BulkSecurityEventActionView.as_view(), name='security-event-bulk-action'),
    
    # Audit Logs
    path('audit-logs/', views.AuditLogListCreateView.as_view(), name='audit-log-list'),
    path('audit-logs/<uuid:pk>/', views.AuditLogDetailView.as_view(), name='audit-log-detail'),
    
    # User Sessions
    path('sessions/', views.UserSessionListView.as_view(), name='user-session-list'),
    path('sessions/<uuid:pk>/', views.UserSessionDetailView.as_view(), name='user-session-detail'),
    
    # Failed Login Attempts
    path('failed-logins/', views.FailedLoginAttemptListView.as_view(), name='failed-login-list'),
    
    # Security Configuration
    path('config/', views.SecurityConfigurationListView.as_view(), name='security-config-list'),
    path('config/<uuid:pk>/', views.SecurityConfigurationDetailView.as_view(), name='security-config-detail'),
    
    # Dashboard and Reports
    path('dashboard/', views.SecurityDashboardView.as_view(), name='security-dashboard'),
    path('reports/', views.SecurityReportView.as_view(), name='security-report'),
    
    # Health Check
    path('health/', views.security_health_check, name='security-health'),
    
    # Service-to-Service Endpoints
    path('log-event/', views.log_security_event, name='log-security-event'),
    path('log-audit/', views.log_audit_event, name='log-audit-event'),
]