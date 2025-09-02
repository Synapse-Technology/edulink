from django.urls import path, include
from . import views

app_name = 'institutions'

urlpatterns = [
    # Institution CRUD
    path('', views.InstitutionListCreateView.as_view(), name='institution-list-create'),
    path('<int:pk>/', views.InstitutionDetailView.as_view(), name='institution-detail'),
    
    # Institution verification
    path('<int:pk>/verify/', views.verify_institution, name='institution-verify'),
    path('<int:pk>/unverify/', views.unverify_institution, name='institution-unverify'),
    
    # Institution departments
    path('<int:institution_id>/departments/', 
         views.InstitutionDepartmentListCreateView.as_view(), 
         name='institution-department-list-create'),
    path('<int:institution_id>/departments/<int:pk>/', 
         views.InstitutionDepartmentDetailView.as_view(), 
         name='institution-department-detail'),
    
    # Institution programs
    path('<int:institution_id>/programs/', 
         views.InstitutionProgramListCreateView.as_view(), 
         name='institution-program-list-create'),
    path('<int:institution_id>/programs/<int:pk>/', 
         views.InstitutionProgramDetailView.as_view(), 
         name='institution-program-detail'),
    
    # Department-specific programs
    path('<int:institution_id>/departments/<int:department_id>/programs/', 
         views.InstitutionProgramListCreateView.as_view(), 
         name='department-program-list-create'),
    
    # Institution settings
    path('<int:institution_id>/settings/', 
         views.InstitutionSettingsView.as_view(), 
         name='institution-settings'),
    
    # Institution invitations
    path('invitations/', 
         views.InstitutionInvitationListCreateView.as_view(), 
         name='institution-invitation-list-create'),
    path('invitations/<int:pk>/', 
         views.InstitutionInvitationDetailView.as_view(), 
         name='institution-invitation-detail'),
    path('invitations/<str:token>/use/', 
         views.use_institution_invitation, 
         name='use-institution-invitation'),
    
    # University registration codes
    path('registration-codes/', 
         views.UniversityRegistrationCodeListCreateView.as_view(), 
         name='registration-code-list-create'),
    path('registration-codes/<int:pk>/', 
         views.UniversityRegistrationCodeDetailView.as_view(), 
         name='registration-code-detail'),
    
    # University code validation (for Auth Service)
    path('validate-code/', views.validate_university_code, name='validate-university-code'),
    path('use-code/', views.use_university_code, name='use-university-code'),
    
    # Utility endpoints
    path('stats/', views.institution_stats, name='institution-stats'),
    path('search/', views.search_institutions, name='search-institutions'),
    
    # Master Institution endpoints (for registration verification)
    path('master/', views.MasterInstitutionSearchView.as_view(), name='master-institution-search'),
    path('master/<int:id>/', views.MasterInstitutionDetailView.as_view(), name='master-institution-detail'),
    path('master/verify/<str:accreditation_number>/', views.master_institution_verify, name='master-institution-verify'),
]