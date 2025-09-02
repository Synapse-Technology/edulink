from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    RegistrationRequestViewSet,
    RegistrationRequestLogViewSet,
    RegistrationRequestAttachmentViewSet,
    EmailVerificationView,
    DomainVerificationView,
    InstitutionalVerificationView,
    ApprovalActionView,
    BulkActionView,
    RegistrationStatsView,
    EmailAvailabilityView,
    RegistrationStatusView
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'requests', RegistrationRequestViewSet, basename='registration-request')
router.register(r'logs', RegistrationRequestLogViewSet, basename='registration-log')
router.register(r'attachments', RegistrationRequestAttachmentViewSet, basename='registration-attachment')

app_name = 'registration_requests'

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Email verification endpoints
    path('verify-email/', EmailVerificationView.as_view(), name='verify-email'),
    path('verify-email/<str:token>/', EmailVerificationView.as_view(), name='verify-email-token'),
    path('resend-verification/', EmailVerificationView.as_view(), name='resend-verification'),
    
    # Domain verification endpoints
    path('verify-domain/', DomainVerificationView.as_view(), name='verify-domain'),
    path('verify-domain/<str:token>/', DomainVerificationView.as_view(), name='verify-domain-token'),
    path('domain-verification-methods/', DomainVerificationView.as_view(), name='domain-verification-methods'),
    
    # Institutional verification endpoints
    path('verify-institution/', InstitutionalVerificationView.as_view(), name='verify-institution'),
    path('institution-lookup/', InstitutionalVerificationView.as_view(), name='institution-lookup'),
    path('supported-institutions/', InstitutionalVerificationView.as_view(), name='supported-institutions'),
    
    # Approval/rejection endpoints
    path('approve/<int:request_id>/', ApprovalActionView.as_view(), name='approve-request'),
    path('reject/<int:request_id>/', ApprovalActionView.as_view(), name='reject-request'),
    path('assign-reviewer/<int:request_id>/', ApprovalActionView.as_view(), name='assign-reviewer'),
    
    # Bulk action endpoints
    path('bulk-approve/', BulkActionView.as_view(), name='bulk-approve'),
    path('bulk-reject/', BulkActionView.as_view(), name='bulk-reject'),
    path('bulk-assign/', BulkActionView.as_view(), name='bulk-assign'),
    path('bulk-export/', BulkActionView.as_view(), name='bulk-export'),
    
    # Statistics and analytics endpoints
    path('stats/', RegistrationStatsView.as_view(), name='registration-stats'),
    path('stats/summary/', RegistrationStatsView.as_view(), name='registration-stats-summary'),
    path('stats/trends/', RegistrationStatsView.as_view(), name='registration-stats-trends'),
    path('stats/risk-analysis/', RegistrationStatsView.as_view(), name='registration-stats-risk'),
    
    # Utility endpoints
    path('check-email/', EmailAvailabilityView.as_view(), name='check-email'),
    path('validate-organization/', EmailAvailabilityView.as_view(), name='validate-organization'),
    
    # Admin-specific endpoints
    path('admin/dashboard/', RegistrationStatsView.as_view(), name='admin-dashboard'),
    
    # Public endpoints (no authentication required)
    path('public/institution-types/', InstitutionalVerificationView.as_view(), name='institution-types'),
    path('public/supported-domains/', DomainVerificationView.as_view(), name='supported-domains'),
    
    # Webhook endpoints for external verification services
    path('webhooks/cue-verification/', InstitutionalVerificationView.as_view(), name='cue-webhook'),
    path('webhooks/tveta-verification/', InstitutionalVerificationView.as_view(), name='tveta-webhook'),
    
    # Health check endpoints
    path('health/', RegistrationStatsView.as_view(), name='health-check'),
    path('health/detailed/', RegistrationStatsView.as_view(), name='detailed-health-check'),
    
    # Status check endpoints
    path('institutions/status/<str:reference_number>/', RegistrationStatusView.as_view(), name='institution-status'),
    path('employers/status/<str:reference_number>/', RegistrationStatusView.as_view(), name='employer-status'),
]