from django.urls import path
from .views import (
    LogbookEntryListCreateView,
    LogbookEntryRetrieveUpdateView,
    SupervisorFeedbackCreateView,
    SupervisorFeedbackListView,
    InternshipProgressCalculationView,
)

urlpatterns = [
    path('logbook/', LogbookEntryListCreateView.as_view(), name='logbook-list-create'),
    path('logbook/<int:pk>/', LogbookEntryRetrieveUpdateView.as_view(), name='logbook-detail'),
    path('logbook/<int:log_entry_id>/feedback/', SupervisorFeedbackListView.as_view(), name='feedback-list'),
    path('logbook/feedback/add/', SupervisorFeedbackCreateView.as_view(), name='feedback-create'),
    path('progress/', InternshipProgressCalculationView.as_view(), name='progress-calculation'),
]