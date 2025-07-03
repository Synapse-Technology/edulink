# users/urls.py

from django.urls import path
from users.views.student_views import StudentProfileDetailView
from users.views.institution_views import InstitutionProfileDetailView
from users.views.employer_views import EmployerProfileDetailView
from users.views.admin_views import (
    CreateInstitutionProfileView,
    CreateEmployerProfileView,
)

urlpatterns = [
    # Student
    path('student/profile/', StudentProfileDetailView.as_view(), name='student-profile'),

    # Institution
    path('institution/profile/', InstitutionProfileDetailView.as_view(), name='institution-profile'),
    path('admin/create-institution-profile/', CreateInstitutionProfileView.as_view(), name='create-institution-profile'),

    # Employer
    path('employer/profile/', EmployerProfileDetailView.as_view(), name='employer-profile'),
    path('admin/create-employer-profile/', CreateEmployerProfileView.as_view(), name='create-employer-profile'),
]
