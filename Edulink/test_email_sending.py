#!/usr/bin/env python
"""
Email sending test script for Edulink project.
This script tests the email configuration with the provided credentials.
"""

import os
import sys
import django
from pathlib import Path
import ssl

# Bypass SSL verification for testing
ssl._create_default_https_context = ssl._create_unverified_context

# Add the project directory to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.core.mail import send_mail
from django.conf import settings
from django.core.mail import EmailMessage

def test_basic_email():
    """Test basic email sending functionality."""
    print("Testing basic email sending...")
    print(f"Email Backend: {settings.EMAIL_BACKEND}")
    print(f"Email Host: {settings.EMAIL_HOST}")
    print(f"Email Port: {settings.EMAIL_PORT}")
    print(f"Email Host User: {settings.EMAIL_HOST_USER}")
    print(f"Email Use TLS: {settings.EMAIL_USE_TLS}")
    print(f"Email Use SSL: {settings.EMAIL_USE_SSL}")
    print(f"Default From Email: {settings.DEFAULT_FROM_EMAIL}")
    print("-" * 50)
    
    try:
        # Test basic send_mail function
        result = send_mail(
            subject='Edulink Email Test - Basic',
            message='This is a test email from Edulink platform to verify email configuration.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['bokwaro@edulink.jhubafrica.com'],  # Send to same email for testing
            fail_silently=False,
        )
        print(f"✅ Basic email sent successfully! Result: {result}")
        return True
    except Exception as e:
        print(f"❌ Failed to send basic email: {str(e)}")
        return False

def test_html_email():
    """Test HTML email sending functionality."""
    print("\nTesting HTML email sending...")
    
    try:
        # Test HTML email
        email = EmailMessage(
            subject='Edulink Email Test - HTML',
            body='<h2>Edulink Platform</h2><p>This is a <strong>HTML test email</strong> from Edulink platform.</p><p>Email configuration is working correctly!</p>',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['bokwaro@edulink.jhubafrica.com'],
        )
        email.content_subtype = 'html'  # Set content type to HTML
        result = email.send()
        print(f"✅ HTML email sent successfully! Result: {result}")
        return True
    except Exception as e:
        print(f"❌ Failed to send HTML email: {str(e)}")
        return False

def test_email_with_attachment():
    """Test email with attachment functionality."""
    print("\nTesting email with attachment...")
    
    try:
        # Create a simple text file as attachment
        attachment_content = "This is a test attachment from Edulink platform.\nEmail functionality is working correctly!"
        
        email = EmailMessage(
            subject='Edulink Email Test - With Attachment',
            body='This email contains a test attachment to verify email functionality.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['bokwaro@edulink.jhubafrica.com'],
        )
        email.attach('edulink_test.txt', attachment_content, 'text/plain')
        result = email.send()
        print(f"✅ Email with attachment sent successfully! Result: {result}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email with attachment: {str(e)}")
        return False

def main():
    """Main function to run all email tests."""
    print("=" * 60)
    print("EDULINK EMAIL CONFIGURATION TEST")
    print("=" * 60)
    
    # Run all tests
    tests = [
        test_basic_email,
        test_html_email,
        test_email_with_attachment,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 60)
    print(f"TEST RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All email tests passed! Email functionality is working correctly.")
    else:
        print("⚠️  Some email tests failed. Please check the configuration.")
    
    print("=" * 60)

if __name__ == '__main__':
    main()