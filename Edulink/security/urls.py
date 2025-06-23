from django.urls import path
from . import views

app_name = 'security'

urlpatterns = [
    # User's own login history
    path('my-login-history/', views.MyLoginHistoryView.as_view(), name='my_login_history'),
] 