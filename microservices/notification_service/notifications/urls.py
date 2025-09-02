from django.urls import path, include
from . import views

urlpatterns = [
    # Notification management
    path('notifications/', views.NotificationListCreateView.as_view(), name='notification-list-create'),
    path('notifications/<uuid:pk>/', views.NotificationDetailView.as_view(), name='notification-detail'),
    
    # Template management
    path('templates/', views.NotificationTemplateListCreateView.as_view(), name='template-list-create'),
    path('templates/<uuid:pk>/', views.NotificationTemplateDetailView.as_view(), name='template-detail'),
    
    # Notification logs
    path('notifications/<uuid:notification_id>/logs/', views.NotificationLogListView.as_view(), name='notification-logs'),
    
    # User preferences
    path('preferences/<str:user_id>/', views.NotificationPreferenceView.as_view(), name='notification-preferences'),
    
    # Batch operations
    path('batches/', views.NotificationBatchListCreateView.as_view(), name='batch-list-create'),
    path('batches/<uuid:pk>/', views.NotificationBatchDetailView.as_view(), name='batch-detail'),
    path('bulk-send/', views.send_bulk_notifications_view, name='bulk-send'),
    
    # Status updates and retries
    path('notifications/<uuid:notification_id>/status/', views.update_notification_status, name='update-status'),
    path('notifications/<uuid:notification_id>/retry/', views.retry_failed_notification, name='retry-notification'),
    
    # Statistics and monitoring
    path('stats/', views.notification_stats, name='notification-stats'),
    
    # Health check
    path('health/', views.health_check, name='health-check'),
    
    # Webhook endpoints for external providers
    path('webhooks/status/', views.update_notification_status, name='webhook-status'),
]

app_name = 'notifications'