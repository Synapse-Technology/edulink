from django.urls import path
from . import views

app_name = 'events'

urlpatterns = [
    # Event receiving endpoint (for other services to send events)
    path('receive/', views.EventReceiveView.as_view(), name='event-receive'),
    
    # Event publishing endpoint (for internal use)
    path('publish/', views.EventPublishView.as_view(), name='event-publish'),
    
    # Event status and monitoring
    path('status/<str:event_id>/', views.EventStatusView.as_view(), name='event-status'),
    path('stats/', views.EventStatsView.as_view(), name='event-stats'),
    
    # Event management
    path('retry/<str:event_id>/', views.retry_failed_event, name='event-retry'),
    
    # Health check
    path('health/', views.health_check, name='event-health'),
]