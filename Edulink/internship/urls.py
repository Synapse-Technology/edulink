from django.urls import path
from internship.views.internship_views import (
    InternshipListView,
    InternshipDetailView,
    InternshipCreateView,
    InternshipUpdateView,
    InternshipDeleteView,
    EmployerInternshipListView,
    InternshipVerificationView,
    SkillTagListView,
    InternshipSearchView,
    InternshipAnalyticsView,
)

app_name = 'internship'

urlpatterns = [
    # Internship endpoints
    path('', InternshipListView.as_view(), name='internship-list'),
    path('create/', InternshipCreateView.as_view(), name='internship-create'),
    path('<int:pk>/', InternshipDetailView.as_view(), name='internship-detail'),
    path('<int:pk>/update/', InternshipUpdateView.as_view(), name='internship-update'),
    path('<int:pk>/delete/', InternshipDeleteView.as_view(), name='internship-delete'),
    path('<int:pk>/verify/', InternshipVerificationView.as_view(), name='internship-verify'),

    # Employer-specific endpoints
    path('my-internships/', EmployerInternshipListView.as_view(), name='employer-internships'),

    # Search and filtering
    path('search/', InternshipSearchView.as_view(), name='internship-search'),
    path('skill-tags/', SkillTagListView.as_view(), name='skill-tags'),
    path('analytics/', InternshipAnalyticsView.as_view(), name='internship-analytics'),
]
