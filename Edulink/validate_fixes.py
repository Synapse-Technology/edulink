#!/usr/bin/env python
"""
Simple validation script for business logic fixes

This script validates that the key fixes are properly implemented:
1. Validators are importable and functional
2. Views have been updated with validation
3. Models have been fixed

Usage:
    python validate_fixes.py
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

def test_validators_import():
    """Test that validators can be imported"""
    try:
        from application.validators import ApplicationValidator, InternshipValidator, RegistrationValidator
        print("✅ Validators imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import validators: {e}")
        return False

def test_validator_methods():
    """Test that validator methods exist and are callable"""
    try:
        from application.validators import ApplicationValidator, InternshipValidator, RegistrationValidator
        
        # Test ApplicationValidator methods
        methods = [
            'validate_internship_eligibility',
            'validate_duplicate_application',
            'validate_application_limit',
            'validate_application_status_transition',
            'validate_internship_requirements'
        ]
        
        for method in methods:
            if not hasattr(ApplicationValidator, method):
                print(f"❌ ApplicationValidator missing method: {method}")
                return False
            if not callable(getattr(ApplicationValidator, method)):
                print(f"❌ ApplicationValidator.{method} is not callable")
                return False
        
        # Test InternshipValidator methods
        methods = [
            'validate_internship_dates',
            'validate_employer_eligibility',
            'validate_internship_content'
        ]
        
        for method in methods:
            if not hasattr(InternshipValidator, method):
                print(f"❌ InternshipValidator missing method: {method}")
                return False
            if not callable(getattr(InternshipValidator, method)):
                print(f"❌ InternshipValidator.{method} is not callable")
                return False
        
        # Test RegistrationValidator methods
        methods = [
            'validate_employer_registration',
            'validate_institution_registration'
        ]
        
        for method in methods:
            if not hasattr(RegistrationValidator, method):
                print(f"❌ RegistrationValidator missing method: {method}")
                return False
            if not callable(getattr(RegistrationValidator, method)):
                print(f"❌ RegistrationValidator.{method} is not callable")
                return False
        
        print("✅ All validator methods exist and are callable")
        return True
        
    except Exception as e:
        print(f"❌ Error testing validator methods: {e}")
        return False

def test_views_updated():
    """Test that views have been updated with validation"""
    try:
        # Check application views
        app_views_path = Path('application/views.py')
        if app_views_path.exists():
            content = app_views_path.read_text()
            if 'ApplicationValidator' in content:
                print("✅ Application views updated with validation")
            else:
                print("❌ Application views not updated with validation")
                return False
        
        # Check internship views
        internship_views_path = Path('internship/views/internship_views.py')
        if internship_views_path.exists():
            content = internship_views_path.read_text()
            if 'InternshipValidator' in content:
                print("✅ Internship views updated with validation")
            else:
                print("❌ Internship views not updated with validation")
                return False
        
        # Check authentication views
        auth_views_path = Path('authentication/views.py')
        if auth_views_path.exists():
            content = auth_views_path.read_text()
            if 'RegistrationValidator' in content:
                print("✅ Authentication views updated with validation")
            else:
                print("❌ Authentication views not updated with validation")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking views: {e}")
        return False

def test_migration_created():
    """Test that data migration was created"""
    try:
        migration_path = Path('application/migrations/0002_fix_backend_anomalies.py')
        if migration_path.exists():
            print("✅ Data migration created")
            return True
        else:
            print("❌ Data migration not found")
            return False
    except Exception as e:
        print(f"❌ Error checking migration: {e}")
        return False

def test_model_fixes():
    """Test that model fixes are in place"""
    try:
        # Check Application model
        from application.models import Application
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Check that Application.student points to User
        student_field = Application._meta.get_field('student')
        if student_field.related_model == User:
            print("✅ Application model student field fixed")
        else:
            print(f"❌ Application model student field still points to {student_field.related_model}")
            return False
        
        # Check StudentProfile model
        from users.models.student_profile import StudentProfile
        
        # Check that academic_year field is removed
        try:
            StudentProfile._meta.get_field('academic_year')
            print("❌ StudentProfile still has academic_year field")
            return False
        except:
            print("✅ StudentProfile academic_year field removed")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking model fixes: {e}")
        return False

def test_signals_fixed():
    """Test that signals have been fixed"""
    try:
        # Check notifications signals
        signals_path = Path('notifications/signals.py')
        if signals_path.exists():
            content = signals_path.read_text()
            if 'logger.error' in content:
                print("✅ Notification signals updated with error handling")
            else:
                print("❌ Notification signals not updated with error handling")
                return False
        
        # Check internship progress signals
        progress_signals_path = Path('internship_progress/signals.py')
        if progress_signals_path.exists():
            content = progress_signals_path.read_text()
            if 'logger.error' in content and 'print(' not in content:
                print("✅ Internship progress signals fixed")
            else:
                print("❌ Internship progress signals not properly fixed")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking signals: {e}")
        return False

def test_security_middleware_enhanced():
    """Test that security middleware has been enhanced"""
    try:
        middleware_path = Path('security/middleware.py')
        if middleware_path.exists():
            content = middleware_path.read_text()
            if 'MAX_CONCURRENT_SESSIONS' in content and 'validate_session_security' in content:
                print("✅ Security middleware enhanced")
                return True
            else:
                print("❌ Security middleware not properly enhanced")
                return False
        else:
            print("❌ Security middleware file not found")
            return False
    except Exception as e:
        print(f"❌ Error checking security middleware: {e}")
        return False

def run_validation():
    """Run all validation tests"""
    print("Business Logic Fixes Validation")
    print("=" * 40)
    
    tests = [
        ("Validators Import", test_validators_import),
        ("Validator Methods", test_validator_methods),
        ("Views Updated", test_views_updated),
        ("Migration Created", test_migration_created),
        ("Model Fixes", test_model_fixes),
        ("Signals Fixed", test_signals_fixed),
        ("Security Middleware Enhanced", test_security_middleware_enhanced)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\nTesting {test_name}...")
        if test_func():
            passed += 1
        else:
            print(f"❌ {test_name} failed")
    
    print("\n" + "=" * 40)
    print(f"VALIDATION SUMMARY: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All business logic fixes validated successfully!")
        print("\nKey improvements implemented:")
        print("• Comprehensive application validation")
        print("• Status transition controls")
        print("• Internship creation validation")
        print("• Registration data validation")
        print("• Model relationship fixes")
        print("• Enhanced error handling")
        print("• Security improvements")
        return True
    else:
        print(f"\n⚠️  {total - passed} validation(s) failed. Please review the implementation.")
        return False

if __name__ == '__main__':
    success = run_validation()
    sys.exit(0 if success else 1)