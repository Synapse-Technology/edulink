"""
Admin app URL configuration.
"""

from django.urls import path
from . import views

app_name = 'admin'

urlpatterns = [
    # System management
    path('system/activity/', views.SystemActivityView.as_view(), name='system-activity'),
    
    # Authentication
    path('auth/login/', views.AdminLoginView.as_view(), name='admin-login'),
    path('auth/token/refresh/', views.AdminTokenRefreshView.as_view(), name='admin-token-refresh'),
    
    # Dashboard
    path('dashboard/', views.AdminDashboardView.as_view(), name='dashboard'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    
    # User management
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<uuid:user_id>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<uuid:user_id>/suspend/', views.SuspendUserView.as_view(), name='user-suspend'),
    path('users/<uuid:user_id>/reactivate/', views.ReactivateUserView.as_view(), name='user-reactivate'),
    path('users/<uuid:user_id>/role/', views.AssignUserRoleView.as_view(), name='user-assign-role'),
    path('users/bulk-action/', views.BulkUserActionView.as_view(), name='user-bulk-action'),
    
    # Institution management
    path('institutions/', views.InstitutionListView.as_view(), name='institution-list'),
    path('institutions/<uuid:institution_id>/', views.InstitutionDetailView.as_view(), name='institution-detail'),
    path('institutions/<uuid:institution_id>/verify/', views.VerifyInstitutionView.as_view(), name='institution-verify'),
    path('institutions/pending/', views.PendingInstitutionsView.as_view(), name='pending-institutions'),
    path('institution-requests/<uuid:request_id>/review/', views.ReviewInstitutionRequestView.as_view(), name='review-institution-request'),
    
    # System management
    path('system/stats/', views.SystemStatsView.as_view(), name='system-stats'),
    path('system/health/', views.SystemHealthView.as_view(), name='system-health'),
    path('system/institution-interest/', views.InstitutionInterestAnalyticsView.as_view(), name='institution-interest'),
    path('system/institution-interest/outreach/', views.SendInstitutionInterestOutreachView.as_view(), name='institution-interest-outreach'),
    
    # Staff management
    path('staff/', views.PlatformStaffListView.as_view(), name='staff-list'),
    path('staff/invites/', views.StaffInviteListView.as_view(), name='staff-invites'),
    path('staff/accept/', views.AcceptStaffInviteView.as_view(), name='staff-invite-accept'),
]