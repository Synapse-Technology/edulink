"""
Phase 7: Exception Middleware Tests

Tests that the middleware properly catches and converts unhandled exceptions
at the view layer before they reach the client.
"""

import json
from uuid import uuid4
from django.test import TestCase, RequestFactory
from django.core.exceptions import PermissionDenied, ObjectDoesNotExist, ValidationError as DjangoValidationError
from django.db import IntegrityError

from edulink.apps.shared.middleware import ErrorHandlingMiddleware
from edulink.apps.shared.error_handling import (
    NotFoundError,
    ValidationError,
    ConflictError,
    AuthorizationError,
    ErrorContext,
)


class MiddlewareTestHelper:
    """Helper to create test views that raise various exceptions."""
    
    @staticmethod
    def get_response_not_found(request):
        raise NotFoundError(
            user_message="Test resource not found.",
            developer_message="Test resource missing",
        )
    
    @staticmethod
    def get_response_validation_error(request):
        raise ValidationError(
            user_message="Test validation failed.",
            developer_message="Test field is invalid",
        )
    
    @staticmethod
    def get_response_conflict_error(request):
        raise ConflictError(
            user_message="Test state conflict.",
            developer_message="Test state is ACCEPTED",
        )
    
    @staticmethod
    def get_response_authorization_error(request):
        raise AuthorizationError(
            user_message="Test access denied.",
            developer_message="Test user lacks permission",
        )
    
    @staticmethod
    def get_response_permission_denied(request):
        raise PermissionDenied("Test permission denied")
    
    @staticmethod
    def get_response_object_does_not_exist(request):
        raise ObjectDoesNotExist("Test object not found")
    
    @staticmethod
    def get_response_integrity_error(request):
        raise IntegrityError("UNIQUE constraint failed: test_table.email")
    
    @staticmethod
    def get_response_validation_error_django(request):
        raise DjangoValidationError("Test validation failed")
    
    @staticmethod
    def get_response_unhandled_error(request):
        raise ValueError("Completely unhandled error")


class TestErrorHandlingMiddlewareDomainErrors(TestCase):
    """Test middleware handling of EduLink domain errors."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_middleware_passes_through_not_found_error(self):
        """NotFoundError properly serialized by middleware"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_not_found)
        request = self.factory.get('/')
        
        response = middleware(request)
        
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.content)
        self.assertEqual(data["error_code"], "NOT_FOUND")
        self.assertEqual(data["message"], "Test resource not found.")
        self.assertEqual(data["status_code"], 404)

    def test_middleware_passes_through_validation_error(self):
        """ValidationError properly serialized by middleware"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_validation_error)
        request = self.factory.get('/')
        
        response = middleware(request)
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data["error_code"], "VALIDATION_ERROR")
        self.assertEqual(data["message"], "Test validation failed.")

    def test_middleware_passes_through_conflict_error(self):
        """ConflictError properly serialized by middleware"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_conflict_error)
        request = self.factory.get('/')
        
        response = middleware(request)
        
        self.assertEqual(response.status_code, 409)
        data = json.loads(response.content)
        self.assertEqual(data["error_code"], "CONFLICT")
        self.assertEqual(data["message"], "Test state conflict.")

    def test_middleware_passes_through_authorization_error(self):
        """AuthorizationError properly serialized by middleware"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_authorization_error)
        request = self.factory.get('/')
        
        response = middleware(request)
        
        self.assertEqual(response.status_code, 403)
        data = json.loads(response.content)
        self.assertEqual(data["error_code"], "UNAUTHORIZED")
        self.assertEqual(data["message"], "Test access denied.")


class TestErrorHandlingMiddlewareDjangoExceptions(TestCase):
    """Test middleware conversion of Django exceptions."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_middleware_converts_permission_denied(self):
        """Django PermissionDenied converted to 403 AuthorizationError"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_permission_denied)
        request = self.factory.get('/')
        
        response = middleware(request)
        
        self.assertEqual(response.status_code, 403)
        data = json.loads(response.content)
        self.assertEqual(data["error_code"], "UNAUTHORIZED")
        self.assertIn("permission", data["message"].lower())

    def test_middleware_converts_object_does_not_exist(self):
        """Django ObjectDoesNotExist converted to 404 NotFoundError"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_object_does_not_exist)
        request = self.factory.get('/')
        
        response = middleware(request)
        
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.content)
        self.assertEqual(data["error_code"], "NOT_FOUND")

    def test_middleware_converts_integrity_error_unique(self):
        """Django IntegrityError (UNIQUE) converted to 409 ConflictError"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_integrity_error)
        request = self.factory.get('/')
        
        response = middleware(request)
        
        self.assertEqual(response.status_code, 409)
        data = json.loads(response.content)
        self.assertEqual(data["error_code"], "CONFLICT")
        self.assertIn("already", data["message"].lower())

    def test_middleware_converts_validation_error(self):
        """Django ValidationError converted to 400 ValidationError"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_validation_error_django)
        request = self.factory.get('/')
        
        response = middleware(request)
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data["error_code"], "VALIDATION_ERROR")


class TestErrorHandlingMiddlewareUnhandledExceptions(TestCase):
    """Test middleware handling of unhandled exceptions."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_middleware_catches_unhandled_exception(self):
        """Unhandled exceptions caught and converted to safe 500 response"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_unhandled_error)
        request = self.factory.get('/')
        
        response = middleware(request)
        
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.content)
        self.assertEqual(data["error_code"], "INTERNAL_ERROR")
        # Never expose internal details
        self.assertNotIn("ValueError", data["message"])
        self.assertIn("unexpected error", data["message"].lower())

    def test_middleware_never_exposes_internal_details(self):
        """Internal exception details never exposed to client"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_unhandled_error)
        request = self.factory.get('/')
        
        response = middleware(request)
        data = json.loads(response.content)
        
        # Check that sensitive details are not in the response
        response_str = str(data)
        self.assertNotIn("Traceback", response_str)
        self.assertNotIn("File ", response_str)
        self.assertNotIn("line", response_str.lower())


class TestMiddlewareResponseStructure(TestCase):
    """Test that middleware responses follow standard format."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_middleware_response_has_required_fields(self):
        """All middleware error responses include required fields"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_not_found)
        request = self.factory.get('/')
        
        response = middleware(request)
        data = json.loads(response.content)
        
        # Required fields for all error responses
        self.assertIn("error_code", data)
        self.assertIn("message", data)
        self.assertIn("status_code", data)
        self.assertIn("timestamp", data)

    def test_middleware_response_is_json(self):
        """Middleware always returns JSON responses"""
        middleware = ErrorHandlingMiddleware(MiddlewareTestHelper.get_response_not_found)
        request = self.factory.get('/')
        
        response = middleware(request)
        
        # Must be JSON
        self.assertEqual(response["Content-Type"], "application/json")
        # Must be parseable
        data = json.loads(response.content)
        self.assertIsInstance(data, dict)
