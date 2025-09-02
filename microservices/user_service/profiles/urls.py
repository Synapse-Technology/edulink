from django.urls import path
from . import views

app_name = 'profiles'

urlpatterns = [
    # Student profiles
    path(
        'students/',
        views.StudentProfileListCreateView.as_view(),
        name='student-list-create'
    ),
    path(
        'students/<int:user_id>/',
        views.StudentProfileDetailView.as_view(),
        name='student-detail'
    ),
    
    # Employer profiles
    path(
        'employers/',
        views.EmployerProfileListCreateView.as_view(),
        name='employer-list-create'
    ),
    path(
        'employers/<int:user_id>/',
        views.EmployerProfileDetailView.as_view(),
        name='employer-detail'
    ),
    
    # Institution profiles
    path(
        'institutions/',
        views.InstitutionProfileListCreateView.as_view(),
        name='institution-list-create'
    ),
    path(
        'institutions/<int:user_id>/',
        views.InstitutionProfileDetailView.as_view(),
        name='institution-detail'
    ),
    
    # Profile invitations
    path(
        'invitations/',
        views.ProfileInvitationListCreateView.as_view(),
        name='invitation-list-create'
    ),
    path(
        'invitations/<int:pk>/',
        views.ProfileInvitationDetailView.as_view(),
        name='invitation-detail'
    ),
    path(
        'invitations/<str:token>/use/',
        views.use_invitation,
        name='use-invitation'
    ),
    
    # Profile utilities
    path(
        'stats/',
        views.ProfileStatsView.as_view(),
        name='profile-stats'
    ),
    path(
        '<int:user_id>/completion/',
        views.profile_completion,
        name='profile-completion'
    ),
    path(
        '<int:user_id>/verify/',
        views.verify_profile,
        name='verify-profile'
    ),
]