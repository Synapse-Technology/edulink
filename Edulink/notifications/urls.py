from django.urls import path
from . import views

urlpatterns = [
    path('', views.UserNotificationList.as_view(), name='user-notification-list'),
    path('<int:pk>/read/', views.mark_notification_as_read, name='mark-notification-read'),
    path('send_internal/', views.send_notification_internal, name='send-notification-internal'),
]
