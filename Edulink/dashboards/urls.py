from django.urls import path
from .views import StudentDashboardAPIView

urlpatterns = [
    path('student/', StudentDashboardAPIView.as_view(), name='student-dashboard'),
] 