from django.urls import path
from . import views

app_name = 'health_check'

urlpatterns = [
    path('health/', views.health_check, name='health'),
    path('ready/', views.readiness_check, name='readiness'),
    path('live/', views.liveness_check, name='liveness'),
]