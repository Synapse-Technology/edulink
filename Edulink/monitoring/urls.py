from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'monitoring'

urlpatterns = [
    # Health check endpoints
    path('health/', views.HealthCheckView.as_view(), name='health_check'),
    path('health/detailed/', views.DetailedHealthCheckView.as_view(), name='detailed_health_check'),
    
    # System metrics and monitoring
    path('metrics/', views.SystemMetricsView.as_view(), name='system_metrics'),
    path('dashboard/', views.MonitoringDashboardView.as_view(), name='monitoring_dashboard'),
    
    # Alerts management
    path('alerts/', views.AlertsView.as_view(), name='alerts_list'),
    path('alerts/<uuid:pk>/', views.AlertDetailView.as_view(), name='alert_detail'),
    
    # Configuration
    path('config/', views.MonitoringConfigurationView.as_view(), name='monitoring_config'),
]