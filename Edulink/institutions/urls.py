from django.urls import path
from .views import (
    InstitutionProfileDetailView,
    InstitutionStudentListView,
    InstitutionApplicationListView,
    ApplicationStatusUpdateView,
    RegisterInstitutionView,
    search_institutions,
    validate_university_code,
    get_all_institutions,
    institution_autocomplete,
)

urlpatterns = [
    path('profile/', InstitutionProfileDetailView.as_view(), name='institution-profile'),
    path('my-students/', InstitutionStudentListView.as_view(), name='institution-students'),
    path('applications/', InstitutionApplicationListView.as_view(), name='institution-applications'),
    path('application/<int:id>/status/', ApplicationStatusUpdateView.as_view(), name='application-status-update'),
    
    # New endpoints for institution search and registration
    path('all/', get_all_institutions, name='all-institutions'),
    path('search/', search_institutions, name='institution-search'),
    path('autocomplete/', institution_autocomplete, name='institution-autocomplete'),
    path('validate-code/', validate_university_code, name='validate-university-code'),
    path('register/', RegisterInstitutionView.as_view(), name='register-institution'),
]
