"""Registration Requests App.

This app handles self-service registration requests for the Edulink platform,
including verification workflows, approval processes, and risk assessment.

Key Features:
- Self-service registration for students, employers, and institutions
- Multi-step verification (email, domain, institutional)
- Risk-based approval workflows
- Kenya-specific institutional verification
- Admin dashboard for managing requests
- Automated notifications and reminders
"""

default_app_config = 'registration_requests.apps.RegistrationRequestsConfig'