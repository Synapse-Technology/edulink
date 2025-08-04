from django.urls import path
from . import views

urlpatterns = [
    path('logbook/', views.LogbookEntryListCreateView.as_view(), name='logbook-list-create'),
    path('logbook/<int:pk>/', views.LogbookEntryRetrieveUpdateView.as_view(), name='logbook-detail-update'),
    path('logbook/<int:log_entry_id>/feedback/', views.SupervisorFeedbackListView.as_view(), name='logbook-feedback-list'),
    path('logbook/feedback/add/', views.SupervisorFeedbackCreateView.as_view(), name='logbook-feedback-create'),
] 