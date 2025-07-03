# internships/urls.py

from django.urls import path
# Assuming views for internships are in internships/views/api_views.py
from internships.views import InternshipListView, InternshipDetailView, EmployerInternshipListView

urlpatterns = [
    # API to list/create internships (employers can create, all can view listings)
    path('', InternshipListView.as_view(), name='internship-list-create'),

    # API to retrieve, update, or delete a specific internship listing
    path('<uuid:pk>/', InternshipDetailView.as_view(), name='internship-detail'),

    # API to list internships posted by the currently authenticated employer
    path('my/', EmployerInternshipListView.as_view(), name='my-posted-internships'),

    # Add other internship-specific URLs like search, filter, approval, etc.
    # path('search/', views.InternshipSearchView.as_view(), name='internship-search'),
]