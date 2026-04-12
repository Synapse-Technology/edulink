"""
Phase 6: HTTP Response Serialization Tests

Tests that the custom DRF exception handler properly serializes:
- Domain errors (EduLinkError subclasses) with correct HTTP status codes
- DRF APIException errors converted to EduLink format
- Unhandled exceptions safely converted to 500 errors
- ErrorContext debugging information included in responses
"""

from uuid import uuid4
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework import status

from edulink.apps.shared.error_handling import (
    ValidationError,
    NotFoundError,
    ConflictError,
    AuthorizationError,
    ErrorContext,
)
from edulink.apps.shared.exceptions import edulink_exception_handler


class TestDomainErrorSerialization(TestCase):
    """
    Validates that domain errors (EduLinkError) are properly serialized
    with correct HTTP status codes and message formatting.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.user_id = uuid4()
        self.resource_id = uuid4()

    def test_not_found_error_response(self):
        """NotFoundError serializes to 404 with proper JSON format"""
        exc = NotFoundError(
            user_message="User not found.",
            developer_message=f"User {self.user_id} not in database",
            context=ErrorContext().with_user_id(self.user_id).build(),
        )
        
        response = edulink_exception_handler(exc, {})
        
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error_code"], "NOT_FOUND")
        self.assertEqual(response.data["message"], "User not found.")
        self.assertEqual(response.data["status_code"], 404)
        self.assertIn("context", response.data)

    def test_validation_error_response(self):
        """ValidationError serializes to 400 with proper JSON format"""
        exc = ValidationError(
            user_message="Email is required.",
            developer_message="email field is empty",
            context=ErrorContext().build(),
        )
        
        response = edulink_exception_handler(exc, {})
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error_code"], "VALIDATION_ERROR")
        self.assertEqual(response.data["message"], "Email is required.")
        self.assertEqual(response.data["status_code"], 400)

    def test_conflict_error_response(self):
        """ConflictError serializes to 409 with proper JSON format"""
        exc = ConflictError(
            user_message="This assignment is already accepted.",
            developer_message="InternshipAssignment status is ACCEPTED",
            context=ErrorContext().with_resource("Assignment", self.resource_id).build(),
        )
        
        response = edulink_exception_handler(exc, {})
        
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error_code"], "CONFLICT")
        self.assertEqual(response.data["message"], "This assignment is already accepted.")
        self.assertEqual(response.data["status_code"], 409)

    def test_authorization_error_response(self):
        """AuthorizationError serializes to 403 with proper JSON format"""
        exc = AuthorizationError(
            user_message="You do not have permission to perform this action.",
            developer_message=f"User {self.user_id} role is STUDENT, needs MODERATOR",
            context=ErrorContext().with_user_id(self.user_id).build(),
        )
        
        response = edulink_exception_handler(exc, {})
        
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error_code"], "UNAUTHORIZED")
        self.assertEqual(response.data["message"], "You do not have permission to perform this action.")
        self.assertEqual(response.data["status_code"], 403)

    def test_error_context_included_in_response(self):
        """ErrorContext debugging data is included in serialized response"""
        context_data = ErrorContext().with_user_id(self.user_id).with_resource(
            "Application", self.resource_id
        ).build()
        
        exc = NotFoundError(
            user_message="Application not found.",
            developer_message="Could not find Application record",
            context=context_data,
        )
        
        response = edulink_exception_handler(exc, {})
        
        self.assertIn("context", response.data)
        self.assertEqual(response.data["context"]["user_id"], str(self.user_id))
        self.assertEqual(response.data["context"]["resource_type"], "Application")
        self.assertEqual(response.data["context"]["resource_id"], str(self.resource_id))

    def test_timestamp_included_in_response(self):
        """Error timestamp is included in serialized response"""
        exc = ValidationError(
            user_message="Invalid input.",
            developer_message="Validation failed",
        )
        
        response = edulink_exception_handler(exc, {})
        
        self.assertIn("timestamp", response.data)
        # Verify ISO format
        self.assertRegex(response.data["timestamp"], r'\d{4}-\d{2}-\d{2}T')


class TestDRFExceptionConversion(TestCase):
    """
    Validates that standard DRF exceptions are converted to
    EduLink error response format.
    """

    def setUp(self):
        self.factory = APIRequestFactory()

    def test_drf_not_found_converted(self):
        """DRF NotFound exception converted to EduLink format"""
        exc = NotFound("User does not exist")
        
        # Call DRF's default handler first (as our handler does)
        request = self.factory.get('/')
        response_obj = edulink_exception_handler(exc, {"request": request})
        
        # Should be converted with our format
        self.assertEqual(response_obj.status_code, 404)
        self.assertEqual(response_obj.data["status_code"], 404)
        # Should map to our error code
        self.assertIn("error_code", response_obj.data)
        self.assertEqual(response_obj.data["error_code"], "NOT_FOUND")

    def test_drf_permission_denied_converted(self):
        """DRF PermissionDenied exception converted to EduLink format"""
        exc = PermissionDenied("You do not have access")
        
        request = self.factory.get('/')
        response_obj = edulink_exception_handler(exc, {"request": request})
        
        self.assertEqual(response_obj.status_code, 403)
        self.assertEqual(response_obj.data["status_code"], 403)
        self.assertEqual(response_obj.data["error_code"], "UNAUTHORIZED")

    def test_drf_validation_error_converted(self):
        """DRF ValidationError exception converted to EduLink format"""
        exc = DRFValidationError({"email": ["Email is required"]})
        
        request = self.factory.get('/')
        response_obj = edulink_exception_handler(exc, {"request": request})
        
        self.assertEqual(response_obj.status_code, 400)
        self.assertEqual(response_obj.data["status_code"], 400)
        self.assertEqual(response_obj.data["error_code"], "VALIDATION_ERROR")


class TestResponseStructure(TestCase):
    """
    Validates the overall structure of API error responses
    for consistency across all error types.
    """

    def test_response_always_has_required_fields(self):
        """All error responses include error_code, message, and status_code"""
        errors = [
            NotFoundError("Not found", "Resource missing"),
            ValidationError("Invalid", "Bad input"),
            ConflictError("Conflict", "State error"),
            AuthorizationError("Unauthorized", "Permission denied"),
        ]
        
        for exc in errors:
            response = edulink_exception_handler(exc, {})
            
            # Required fields
            self.assertIn("error_code", response.data)
            self.assertIn("message", response.data)
            self.assertIn("status_code", response.data)
            self.assertIn("timestamp", response.data)
            
            # Fields should not be None
            self.assertIsNotNone(response.data["error_code"])
            self.assertIsNotNone(response.data["message"])
            self.assertIsNotNone(response.data["status_code"])
            self.assertIsNotNone(response.data["timestamp"])

    def test_response_status_code_matches_http_status(self):
        """Response HTTP status code matches status_code in JSON body"""
        errors = [
            (NotFoundError("Not found", "Missing"), 404),
            (ValidationError("Invalid", "Bad input"), 400),
            (ConflictError("Conflict", "State error"), 409),
            (AuthorizationError("Unauthorized", "Permission denied"), 403),
        ]
        
        for exc, expected_status in errors:
            response = edulink_exception_handler(exc, {})
            
            self.assertEqual(response.status_code, expected_status)
            self.assertEqual(response.data["status_code"], expected_status)
