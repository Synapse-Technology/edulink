#!/usr/bin/env python
"""
Test script for email functionality with Mailtrap integration.
This script tests the email sending functionality to ensure Mailtrap configuration works correctly.
"""

import os
import sys
import django
import uuid

# Add the project directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edulink.config.settings.base')
django.setup()

from edulink.apps.notifications.services import (
    send_email_notification,
    send_email_verification_notification
)

def test_basic_email():
    """Test basic email sending functionality."""
    print("Testing basic email sending...")
    
    try:
        test_uuid = str(uuid.uuid4())
        success = send_email_notification(
            recipient_email="test@example.com",
            subject="Test Email from Edulink",
            template_name="generic_notification",
            context={
                "title": "Test Notification",
                "body": "This is a test email to verify that the email system is working correctly.",
                "user_name": "Test User",
                "site_name": "Edulink",
                "support_email": "support@edulink.com",
                "user_id": test_uuid
            }
        )
        
        if success:
            print("✅ Basic email test passed!")
            return True
        else:
            print("❌ Basic email test failed!")
            return False
            
    except Exception as e:
        print(f"❌ Basic email test failed with error: {e}")
        return False

def test_verification_email():
    """Test email verification notification."""
    print("\nTesting email verification notification...")
    
    try:
        test_uuid = str(uuid.uuid4())
        success = send_email_verification_notification(
            user_id=test_uuid,
            email="test@example.com",
            verification_token="abc123def456",
            verification_url="http://localhost:8000/verify-email?token=abc123def456"
        )
        
        if success:
            print("✅ Email verification test passed!")
            return True
        else:
            print("❌ Email verification test failed!")
            return False
            
    except Exception as e:
        print(f"❌ Email verification test failed with error: {e}")
        return False

def main():
    """Run all email tests."""
    print("🚀 Starting Edulink Email System Tests")
    print("=" * 50)
    
    # Test basic email functionality
    basic_test = test_basic_email()
    
    # Test verification email
    verification_test = test_verification_email()
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print(f"Basic Email: {'✅ PASS' if basic_test else '❌ FAIL'}")
    print(f"Email Verification: {'✅ PASS' if verification_test else '❌ FAIL'}")
    
    total_tests = 2
    passed_tests = sum([basic_test, verification_test])
    
    print(f"\n📈 Overall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! Email system is working correctly.")
        print("\n💡 Check your Mailtrap inbox to see the test emails.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the configuration.")
        return 1

if __name__ == "__main__":
    sys.exit(main())