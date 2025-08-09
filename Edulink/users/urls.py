# users/urls.py

from django.urls import path
from users.views.student_views import StudentProfileDetailView
from users.views.institution_views import InstitutionProfileDetailView, InstitutionStudentsView, InstitutionAnalyticsView
from users.views.employer_views import EmployerProfileDetailView
from users.views.admin_views import (
    CreateInstitutionProfileView,
    CreateEmployerProfileView,
    AllUsersView,
    AllInstitutionsView,
    AllEmployersView,
    AllStudentsView,
    SecurityLogListView,
    UserCreateView,
    UserDetailView,
    InstitutionCreateView,
    InstitutionDetailView,
    EmployerCreateView,
    EmployerDetailView,
    StudentCreateView,
    StudentDetailView,
    UserRoleUpdateView,
    SystemAnalyticsView,
    ImpersonateUserView,
    InstitutionVerifyView,
    EmployerVerifyView,
    SystemSettingListCreateView,
    SystemSettingDetailView
)
from security.serializers import SecurityLogSerializer

urlpatterns = [
    # Student
    path('student/profile/', StudentProfileDetailView.as_view(), name='student-profile'),
    path('profile/', StudentProfileDetailView.as_view(), name='student-profile-detail'),

    # Institution
    path('institution/profile/', InstitutionProfileDetailView.as_view(), name='institution-profile'),
    path('admin/create-institution-profile/', CreateInstitutionProfileView.as_view(), name='create-institution-profile'),
    path('institution/students/', InstitutionStudentsView.as_view(), name='institution-students'),
    path('institution/analytics/', InstitutionAnalyticsView.as_view(), name='institution-analytics'),

    # Employer
    path('employer/profile/', EmployerProfileDetailView.as_view(), name='employer-profile'),
    path('admin/create-employer-profile/', CreateEmployerProfileView.as_view(), name='create-employer-profile'),

    # Super Admin
    path('admin/all-users/', AllUsersView.as_view(), name='admin-all-users'),
    path('admin/all-institutions/', AllInstitutionsView.as_view(), name='admin-all-institutions'),
    path('admin/all-employers/', AllEmployersView.as_view(), name='admin-all-employers'),
    path('admin/all-students/', AllStudentsView.as_view(), name='admin-all-students'),
    path('admin/security-logs/', SecurityLogListView.as_view(), name='admin-security-logs'),

    # CRUD
    path('admin/users/create/', UserCreateView.as_view(), name='admin-user-create'),
    path('admin/users/<int:pk>/', UserDetailView.as_view(), name='admin-user-detail'),
    path('admin/institutions/create/', InstitutionCreateView.as_view(), name='admin-institution-create'),
    path('admin/institutions/<int:pk>/', InstitutionDetailView.as_view(), name='admin-institution-detail'),
    path('admin/employers/create/', EmployerCreateView.as_view(), name='admin-employer-create'),
    path('admin/employers/<int:pk>/', EmployerDetailView.as_view(), name='admin-employer-detail'),
    path('admin/students/create/', StudentCreateView.as_view(), name='admin-student-create'),
    path('admin/students/<int:pk>/', StudentDetailView.as_view(), name='admin-student-detail'),

    # Role management
    path('admin/users/<int:pk>/update-role/', UserRoleUpdateView.as_view(), name='admin-user-update-role'),

    # Analytics
    path('admin/analytics/', SystemAnalyticsView.as_view(), name='admin-analytics'),

    # Impersonation
    path('admin/impersonate/<int:pk>/', ImpersonateUserView.as_view(), name='admin-impersonate-user'),

    # Verification
    path('admin/institutions/<int:pk>/verify/', InstitutionVerifyView.as_view(), name='admin-institution-verify'),
    path('admin/employers/<int:pk>/verify/', EmployerVerifyView.as_view(), name='admin-employer-verify'),

    # System settings
    path('admin/settings/', SystemSettingListCreateView.as_view(), name='admin-settings-list-create'),
    path('admin/settings/<int:pk>/', SystemSettingDetailView.as_view(), name='admin-settings-detail'),
]
