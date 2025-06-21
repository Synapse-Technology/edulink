from django.urls import path
from . import views

app_name = 'security'

urlpatterns = [
    # User's own login history
    path('my-login-history/', views.MyLoginHistoryView.as_view(), name='my_login_history'),
    # Add security-related URLs here if needed
    # For example:
    # path('login-history/', views.LoginHistoryView.as_view(), name='login_history'),
    # path('security-logs/', views.SecurityLogView.as_view(), name='security_logs'),
] 