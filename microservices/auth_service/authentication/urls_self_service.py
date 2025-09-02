from django.urls import path
from .views_self_service import (
    StudentSelfRegistrationView,
    InstitutionAdminSelfRegistrationView,
    EmployerSelfRegistrationView,
    RegistrationStatusView,
    ResendVerificationEmailView,
    complete_email_verification
)

urlpatterns = [
    # Self-service registration endpoints
    path('register/student/', StudentSelfRegistrationView.as_view(), name='student_self_registration'),
    path('register/institution-admin/', InstitutionAdminSelfRegistrationView.as_view(), name='institution_admin_self_registration'),
    path('register/employer/', EmployerSelfRegistrationView.as_view(), name='employer_self_registration'),
    
    # Registration status and verification
    path('registration/status/', RegistrationStatusView.as_view(), name='registration_status'),
    path('verification/resend/', ResendVerificationEmailView.as_view(), name='resend_verification'),
    path('verification/complete/', complete_email_verification, name='complete_email_verification'),
]