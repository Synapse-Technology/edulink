from django.urls import path
from . import views

app_name = 'roles'

urlpatterns = [
    # User Role endpoints
    path('user-roles/', views.UserRoleListCreateView.as_view(), name='user-role-list-create'),
    path('user-roles/<int:pk>/', views.UserRoleDetailView.as_view(), name='user-role-detail'),
    
    # Role Permission endpoints
    path('permissions/', views.RolePermissionListCreateView.as_view(), name='permission-list-create'),
    path('permissions/<int:pk>/', views.RolePermissionDetailView.as_view(), name='permission-detail'),
    
    # Role Assignment History endpoints
    path('history/', views.RoleAssignmentHistoryListView.as_view(), name='assignment-history'),
    
    # Role Invitation endpoints
    path('invitations/', views.RoleInvitationListCreateView.as_view(), name='invitation-list-create'),
    path('invitations/<int:pk>/', views.RoleInvitationDetailView.as_view(), name='invitation-detail'),
    path('invitations/<uuid:token>/use/', views.use_role_invitation, name='use-invitation'),
    
    # Role Management endpoints
    path('assign/', views.assign_role, name='assign-role'),
    path('bulk-assign/', views.bulk_assign_roles, name='bulk-assign-roles'),
    path('<int:role_id>/revoke/', views.revoke_role, name='revoke-role'),
    
    # Utility endpoints
    path('stats/', views.UserRoleStatsView.as_view(), name='role-stats'),
    path('users/<int:user_id>/permissions/', views.user_permissions, name='user-permissions'),
]