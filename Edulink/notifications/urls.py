from django.urls import path
from . import views

urlpatterns = [
    path('', views.UserNotificationList.as_view(), name='user-notification-list'),
    path('<int:pk>/read/', views.mark_notification_as_read, name='mark-notification-read'),
    path('<int:pk>/delete/', views.delete_notification, name='delete-notification'),
    path('mark-all-read/', views.mark_all_notifications_as_read, name='mark-all-notifications-read'),
    path('delete-all/', views.delete_all_notifications, name='delete-all-notifications'),
    path('send_internal/', views.send_notification_internal, name='send-notification-internal'),
]
