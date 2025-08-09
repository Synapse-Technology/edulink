from django.urls import path
from .views import (
    EmployerProfileDetailView,
    EmployerInternshipListView,
    InternshipApplicationListView,
)

urlpatterns = [
    path('profile/', EmployerProfileDetailView.as_view(), name='employer-profile'),
    path('my-internships/', EmployerInternshipListView.as_view(), name='employer-internships'),
    path('internship/<int:internship_id>/applicants/', InternshipApplicationListView.as_view(), name='internship-applicants'),
]
