from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'templates', views.NotificationTemplateViewSet, basename='notificationtemplate')
router.register(r'logs', views.NotificationLogViewSet, basename='notificationlog')
router.register(r'preferences', views.NotificationPreferenceViewSet, basename='notificationpreference')
router.register(r'batches', views.NotificationBatchViewSet, basename='notificationbatch')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Notification management
    path('notifications/', views.NotificationListCreateView.as_view(), name='notification-list-create'),
    path('notifications/<uuid:pk>/', views.NotificationDetailView.as_view(), name='notification-detail'),
    
    # Bulk operations
    path('notifications/bulk/', views.BulkNotificationView.as_view(), name='bulk-notification'),
    path('notifications/bulk/status/', views.NotificationStatusUpdateView.as_view(), name='notification-status-update'),
    
    # Retry operations
    path('notifications/<uuid:pk>/retry/', views.retry_notification, name='retry-notification'),
    path('notifications/retry-failed/', views.retry_failed_notifications, name='retry-failed-notifications'),
    
    # Statistics
    path('stats/', views.NotificationStatsView.as_view(), name='notification-stats'),
    
    # Health check
    path('health/', views.health_check, name='health-check'),
    
    # Webhooks
    path('webhooks/sendgrid/', views.SendGridWebhookView.as_view(), name='sendgrid-webhook'),
    path('webhooks/twilio/', views.TwilioWebhookView.as_view(), name='twilio-webhook'),
    
    # Template validation
    path('templates/validate/', views.validate_template, name='validate-template'),
]

app_name = 'notifications'