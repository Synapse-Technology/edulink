from django.urls import path
from internship.views.internship_views import (
    InternshipListView,
    InternshipDetailView,
    InternshipCreateView,
    InternshipUpdateView,
    InternshipDeleteView,
    PublicInternshipSearchView,
    InternshipVerifyView,
)

urlpatterns = [
    # Internship endpoints
    path('internships/', InternshipListView.as_view(), name='internship-list'),
    path('internships/<int:pk>/', InternshipDetailView.as_view(), name='internship-detail'),
    path('internships/create/', InternshipCreateView.as_view(), name='internship-create'),
    path('internships/<int:pk>/update/', InternshipUpdateView.as_view(), name='internship-update'),
    path('internships/<int:pk>/delete/', InternshipDeleteView.as_view(), name='internship-delete'),
    path('internships/public-search/', PublicInternshipSearchView.as_view(), name='public-internship-search'),
    path('internships/<int:pk>/verify/', InternshipVerifyView.as_view(), name='internship-verify'),
]
