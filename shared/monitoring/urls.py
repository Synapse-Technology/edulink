from django.urls import path
from . import views

urlpatterns = [
    path('metrics/', views.metrics_endpoint, name='metrics'),
    path('alerts/', views.alerts_endpoint, name='alerts'),
    path('status/', views.service_status_endpoint, name='service_status'),
    path('reset/', views.reset_metrics_endpoint, name='reset_metrics'),
    path('dashboard/', views.metrics_dashboard_data, name='dashboard_data'),
]