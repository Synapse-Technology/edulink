from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployerRequestViewSet, 
    EmployerInviteViewSet, 
    EmployerViewSet, 
    EmployerSupervisorViewSet, 
    EmployerStaffProfileRequestViewSet,
    EmployerLoginView
)

router = DefaultRouter()
router.register(r'employers', EmployerViewSet, basename='employers')
router.register(r'employer-requests', EmployerRequestViewSet, basename='employer-requests')
router.register(r'employer-invites', EmployerInviteViewSet, basename='employer-invites')
router.register(r'employer-supervisors', EmployerSupervisorViewSet, basename='employer-supervisors')
router.register(r'employer-staff-profile-requests', EmployerStaffProfileRequestViewSet, basename='employer-staff-profile-requests')

urlpatterns = [
    path('auth/login/', EmployerLoginView.as_view(), name='employer-login'),
    path('', include(router.urls)),
]
