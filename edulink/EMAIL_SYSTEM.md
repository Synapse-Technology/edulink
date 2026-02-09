# Edulink Email System Documentation

## Overview
The Edulink email system is built on Django's email backend and uses Mailtrap for testing and development. The system supports multiple email templates with Edulink brand theming and provides comprehensive email notification services.

## Configuration

### Mailtrap Integration
The system is configured to use Mailtrap for email testing with the following settings:

- **Host**: `smtp.mailtrap.io`
- **Port**: `2525`
- **Username**: `23ea9a80ce797f4`
- **Password**: `748639b4dbae3f`
- **Security**: TLS enabled

### Settings Location
Email configuration is located in `edulink/config/settings/base.py`:

```python
# Email Configuration
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"  # Default to console for development
DEFAULT_FROM_EMAIL = "Edulink <noreply@edulink.com>"
EMAIL_HOST = "smtp.mailtrap.io"
EMAIL_PORT = 2525
EMAIL_HOST_USER = "23ea9a80ce797f4"
EMAIL_HOST_PASSWORD = "748639b4dbae3f"
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False
EMAIL_TIMEOUT = 30

# Site Configuration
SITE_NAME = "Edulink"
SITE_URL = "http://localhost:8000"  # Update this for production
SUPPORT_EMAIL = "support@edulink.com"

# Security Settings
PASSWORD_RESET_TOKEN_EXPIRE_HOURS = 1  # Token expires in 1 hour
EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS = 24  # Token expires in 24 hours
```

## Email Templates

### Template Structure
All email templates are located in `edulink/apps/notifications/templates/notifications/emails/` and follow Django template inheritance:

- **base.html**: Base template with Edulink branding and responsive design
- **email_verification.html**: Email verification template
- **welcome.html**: Welcome email after account verification
- **password_reset.html**: Password reset notification
- **generic_notification.html**: Generic notification template

### Template Features
- **Brand Consistency**: Uses Edulink color scheme (#1ab8aa primary, #272828 footer)
- **Responsive Design**: Mobile-optimized templates
- **Professional Icons**: Formal PNG icons instead of emojis
- **Accessibility**: Proper alt text and semantic HTML
- **Social Links**: Professional social media icons in footer

## Email Services

### Core Functions
Located in `edulink/apps/notifications/services.py`:

```python
def send_email_notification(*, recipient_email: str, subject: str, template_name: str, context: dict) -> bool
```

### Available Notification Functions
1. **Email Verification**: `send_email_verification_notification()`
2. **Welcome Email**: `send_welcome_notification()`
3. **Password Reset**: `send_password_reset_notification()`

### Usage Example
```python
from edulink.apps.notifications.services import send_email_verification_notification

success = send_email_verification_notification(
    user_id="user-123",
    email="user@example.com",
    verification_token="abc123def456",
    verification_url="http://localhost:8000/verify-email?token=abc123def456"
)
```

## Testing

### Test Script
A comprehensive test script is available at `edulink/test_email_system.py` that tests:
- Basic email functionality
- Email verification notifications
- Welcome emails

### Running Tests
```bash
cd edulink
python test_email_system.py
```

### Expected Output
```
🚀 Starting Edulink Email System Tests
==================================================
Testing basic email sending...
✅ Basic email test passed!

Testing email verification notification...
✅ Email verification test passed!

==================================================
📊 Test Results Summary:
Basic Email: ✅ PASS
Email Verification: ✅ PASS

📈 Overall: 2/2 tests passed
🎉 All tests passed! Email system is working correctly.

💡 Check your Mailtrap inbox to see the test emails.
```

## Mailtrap Dashboard

### Access Instructions
1. Visit [https://mailtrap.io](https://mailtrap.io)
2. Log in with your account
3. Navigate to your inbox
4. Check for emails from "Edulink <noreply@edulink.com>"

### Demo Domain
Since you don't have your own domain yet, Mailtrap's demo domain is used for testing. In production, you'll need to configure your own domain and update the `SITE_URL` and `DEFAULT_FROM_EMAIL` settings.

## Production Considerations

### Environment Variables
For production deployment, move sensitive email settings to environment variables:

```python
EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.mailtrap.io")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
```

### Backend Selection
- **Development**: Use `django.core.mail.backends.console.EmailBackend`
- **Production**: Use `django.core.mail.backends.smtp.EmailBackend`

### Rate Limiting
Consider implementing rate limiting for email sending to prevent abuse and manage costs.

## Troubleshooting

### Common Issues
1. **Template Not Found**: Ensure templates are in the correct directory structure
2. **Static Files**: Load static files with `{% load static %}` at the top of templates
3. **SMTP Connection**: Verify Mailtrap credentials and network connectivity
4. **Template Syntax**: Check for proper Django template syntax

### Debug Mode
Enable debug logging to troubleshoot email issues:
```python
LOGGING = {
    "loggers": {
        "edulink.apps.notifications": {
            "level": "DEBUG",
        },
    },
}
```

## Security Notes
- Email tokens expire after specified hours (1 hour for password reset, 24 hours for email verification)
- All emails include proper security warnings and contact information
- Templates are designed to prevent phishing by including clear branding and contact details