from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for ViewSets
router = DefaultRouter()

# URL patterns for security app
urlpatterns = [
    # Dashboard and overview
    path('dashboard/', views.SecurityDashboardView.as_view(), name='security-dashboard'),
    path('metrics/', views.security_metrics, name='security-metrics'),
    
    # Security Events
    path('events/', views.SecurityEventListCreateView.as_view(), name='security-events-list'),
    path('events/<int:pk>/', views.SecurityEventDetailView.as_view(), name='security-event-detail'),
    path('events/bulk-action/', views.BulkSecurityEventActionView.as_view(), name='security-events-bulk-action'),
    
    # User Sessions
    path('sessions/', views.UserSessionListView.as_view(), name='user-sessions-list'),
    path('sessions/<int:pk>/terminate/', views.TerminateSessionView.as_view(), name='terminate-session'),
    
    # Failed Login Attempts
    path('failed-logins/', views.FailedLoginAttemptListView.as_view(), name='failed-logins-list'),
    
    # Security Configuration
    path('config/', views.SecurityConfigurationListView.as_view(), name='security-config-list'),
    path('config/<int:pk>/', views.SecurityConfigurationDetailView.as_view(), name='security-config-detail'),
    path('config/reset/', views.reset_security_settings, name='reset-security-settings'),
    
    # Audit Logs
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit-logs-list'),
    
    # Reports and Analytics
    path('reports/', views.SecurityReportView.as_view(), name='security-reports'),
    path('reports/export/', views.SecurityReportView.as_view(), {'format': 'export'}, name='security-reports-export'),
    
    # Alerts and Notifications
    path('alerts/', views.SecurityAlertView.as_view(), name='security-alerts'),
    path('alerts/active/', views.SecurityAlertView.as_view(), {'active_only': True}, name='active-security-alerts'),
    
    # Include router URLs
    path('api/', include(router.urls)),
]

# Additional URL patterns for specific security features
security_patterns = [
    # Note: Additional views can be implemented as needed
    # Currently only including implemented views to avoid import errors
]

# Combine all URL patterns
urlpatterns += security_patterns

# App name for namespacing
app_name = 'security'