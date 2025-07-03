from django.urls import path
from .views import (
    ApplyToInternshipView,
    StudentApplicationListView,
    ApplicationDetailView,
    SupervisorFeedbackView,
)

urlpatterns = [
    path('apply/', ApplyToInternshipView.as_view(), name='apply-to-internship'),
    path('my-applications/', StudentApplicationListView.as_view(), name='student-applications'),
    path('application/<int:pk>/', ApplicationDetailView.as_view(), name='application-detail'),
    path('feedback/', SupervisorFeedbackView.as_view(), name='supervisor-feedback'),
]