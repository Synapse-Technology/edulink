"""
Phase 8: Error Logging & Monitoring Tests

Tests that structured logging system properly captures and enriches error logs
with context information, and that metrics collection works for alerting.
"""

import json
from io import StringIO
from logging import StreamHandler, getLogger
from uuid import uuid4

from django.test import TestCase

from edulink.apps.shared.error_handling import (
    NotFoundError,
    ValidationError,
    ConflictError,
    AuthorizationError,
    ErrorContext,
)
from edulink.apps.shared.logging_config import (
    EduLinkErrorLogger,
    ErrorMetricsCollector,
    JSONFormatter,
    get_error_logger,
)


class TestJSONFormatter(TestCase):
    """Test that logs are formatted as valid JSON."""

    def setUp(self):
        """Set up test logger with JSON formatter."""
        self.logger = getLogger("test_logger")
        self.logger.setLevel("DEBUG")
        
        # Create string stream to capture output
        self.log_stream = StringIO()
        self.handler = StreamHandler(self.log_stream)
        self.handler.setFormatter(JSONFormatter())
        self.logger.addHandler(self.handler)

    def tearDown(self):
        """Clean up logger."""
        self.logger.removeHandler(self.handler)

    def test_json_formatter_outputs_valid_json(self):
        """JSON formatter should produce valid JSON output."""
        self.logger.info("Test message")
        
        log_output = self.log_stream.getvalue().strip()
        data = json.loads(log_output)
        
        self.assertEqual(data["level"], "INFO")
        self.assertEqual(data["message"], "Test message")
        self.assertIn("timestamp", data)
        self.assertIn("logger", data)

    def test_json_formatter_includes_extra_data(self):
        """JSON formatter should include extra fields."""
        extra_data = {"user_id": "123", "resource": "User"}
        self.logger.info("Test", extra={"extra_data": extra_data})
        
        log_output = self.log_stream.getvalue().strip()
        data = json.loads(log_output)
        
        self.assertEqual(data["user_id"], "123")
        self.assertEqual(data["resource"], "User")


class TestEduLinkErrorLogger(TestCase):
    """Test specialized error logger for domain errors."""

    def setUp(self):
        """Set up error logger with stream handler."""
        self.error_logger = get_error_logger("test_error_logger")
        
        # Capture logs
        self.log_stream = StringIO()
        self.handler = StreamHandler(self.log_stream)
        self.handler.setFormatter(JSONFormatter())
        self.error_logger.logger.addHandler(self.handler)
        self.error_logger.logger.setLevel("DEBUG")
        
        self.user_id = uuid4()
        self.resource_id = uuid4()

    def tearDown(self):
        """Clean up logger."""
        self.error_logger.logger.removeHandler(self.handler)

    def test_logs_not_found_error_with_context(self):
        """NotFoundError should be logged with all context."""
        exc = NotFoundError(
            user_message="User not found.",
            developer_message=f"User {self.resource_id} not in database",
            context=ErrorContext()
                .with_resource("User", self.resource_id)
                .build(),
        )
        
        self.error_logger.log_error(
            exc,
            request_path="/api/users/123",
            request_method="GET",
            user_id=self.user_id,
        )
        
        log_output = self.log_stream.getvalue().strip()
        data = json.loads(log_output)
        
        self.assertEqual(data["error_code"], "NOT_FOUND")
        self.assertEqual(data["status_code"], 404)
        self.assertEqual(data["request_path"], "/api/users/123")
        self.assertEqual(data["request_method"], "GET")
        self.assertEqual(data["user_id"], str(self.user_id))

    def test_logs_validation_error_with_context(self):
        """ValidationError should be logged with all context."""
        exc = ValidationError(
            user_message="Email is required.",
            developer_message="email field is empty",
        )
        
        self.error_logger.log_error(exc, custom_field="custom_value")
        
        log_output = self.log_stream.getvalue().strip()
        data = json.loads(log_output)
        
        self.assertEqual(data["error_code"], "VALIDATION_ERROR")
        self.assertEqual(data["status_code"], 400)
        self.assertEqual(data["custom_field"], "custom_value")

    def test_logs_authorization_error_with_user_context(self):
        """AuthorizationError should include user context."""
        exc = AuthorizationError(
            user_message="You lack permission.",
            developer_message="User role is STUDENT, needs ADMIN",
            context=ErrorContext().with_user_id(self.user_id).build(),
        )
        
        self.error_logger.log_error(
            exc,
            user_id=self.user_id,
            request_path="/api/admin/users",
        )
        
        log_output = self.log_stream.getvalue().strip()
        data = json.loads(log_output)
        
        self.assertEqual(data["error_code"], "UNAUTHORIZED")
        self.assertEqual(data["status_code"], 403)
        self.assertEqual(data["user_id"], str(self.user_id))

    def test_logs_conflict_error_details(self):
        """ConflictError should include all conflict details."""
        exc = ConflictError(
            user_message="This state is invalid.",
            developer_message="Status is ACCEPTED, cannot change",
        )
        
        self.error_logger.log_error(
            exc,
            request_path="/api/assignments/update",
            conflict_reason="Status already finalized",
        )
        
        log_output = self.log_stream.getvalue().strip()
        data = json.loads(log_output)
        
        self.assertEqual(data["error_code"], "CONFLICT")
        self.assertEqual(data["status_code"], 409)
        self.assertEqual(data["conflict_reason"], "Status already finalized")

    def test_developer_message_included_in_logs(self):
        """Developer messages should be included for debugging."""
        exc = NotFoundError(
            user_message="Resource not found.",
            developer_message="SELECT query returned no rows for id=999",
        )
        
        self.error_logger.log_error(exc)
        
        log_output = self.log_stream.getvalue().strip()
        data = json.loads(log_output)
        
        self.assertIn("SELECT query returned no rows", data["developer_message"])


class TestErrorMetricsCollector(TestCase):
    """Test error metrics collection for monitoring and alerting."""

    def setUp(self):
        """Set up metrics collector."""
        self.metrics = ErrorMetricsCollector()

    def test_records_error_count(self):
        """Should record error occurrences."""
        self.metrics.record_error("NOT_FOUND")
        self.metrics.record_error("NOT_FOUND")
        self.metrics.record_error("VALIDATION_ERROR")
        
        self.assertEqual(self.metrics.get_count("NOT_FOUND"), 2)
        self.assertEqual(self.metrics.get_count("VALIDATION_ERROR"), 1)

    def test_calculates_error_rate_in_window(self):
        """Should calculate error rate in time window."""
        # Record errors
        self.metrics.record_error("NOT_FOUND")
        self.metrics.record_error("NOT_FOUND")
        self.metrics.record_error("NOT_FOUND")
        
        # Get rate in last minute
        rate_1min = self.metrics.get_rate_in_window("NOT_FOUND", window_seconds=60)
        self.assertEqual(rate_1min, 3)

    def test_rate_window_excludes_old_errors(self):
        """Should exclude errors older than window."""
        self.metrics.record_error("CONFLICT")
        
        # Get rate in last 0 seconds (should exclude everything)
        rate = self.metrics.get_rate_in_window("CONFLICT", window_seconds=0)
        self.assertEqual(rate, 0)

    def test_unknown_error_code_returns_zero(self):
        """Should return 0 for unknown error codes."""
        self.assertEqual(self.metrics.get_count("UNKNOWN"), 0)
        self.assertEqual(self.metrics.get_rate_in_window("UNKNOWN"), 0)

    def test_reset_clears_all_metrics(self):
        """Reset should clear all counters."""
        self.metrics.record_error("NOT_FOUND")
        self.metrics.record_error("VALIDATION_ERROR")
        
        self.assertEqual(self.metrics.get_count("NOT_FOUND"), 1)
        
        self.metrics.reset()
        
        self.assertEqual(self.metrics.get_count("NOT_FOUND"), 0)
        self.assertEqual(self.metrics.get_count("VALIDATION_ERROR"), 0)


class TestErrorLogStructure(TestCase):
    """Test that error log structure is consistent across all error types."""

    def setUp(self):
        """Set up logger."""
        self.error_logger = get_error_logger("test_structure")
        
        self.log_stream = StringIO()
        self.handler = StreamHandler(self.log_stream)
        self.handler.setFormatter(JSONFormatter())
        self.error_logger.logger.addHandler(self.handler)
        self.error_logger.logger.setLevel("DEBUG")

    def tearDown(self):
        """Clean up."""
        self.error_logger.logger.removeHandler(self.handler)

    def test_all_error_types_have_required_fields(self):
        """All error logs should have required fields."""
        errors = [
            NotFoundError("Not found", "Missing resource"),
            ValidationError("Invalid", "Bad input"),
            ConflictError("Conflict", "State error"),
            AuthorizationError("Unauthorized", "No permission"),
        ]
        
        for exc in errors:
            self.log_stream.seek(0)
            self.log_stream.truncate(0)
            
            self.error_logger.log_error(exc)
            
            log_output = self.log_stream.getvalue().strip()
            data = json.loads(log_output)
            
            # Required fields
            self.assertIn("error_code", data)
            self.assertIn("error_type", data)
            self.assertIn("status_code", data)
            self.assertIn("user_message", data)
            self.assertIn("developer_message", data)
            self.assertIn("timestamp", data)

    def test_error_context_included_when_present(self):
        """Error context should be included in logs."""
        resource_id = uuid4()
        ctx = ErrorContext().with_resource("User", resource_id).build()
        
        exc = NotFoundError(
            user_message="Not found",
            developer_message="Missing",
            context=ctx,
        )
        
        self.error_logger.log_error(exc)
        
        log_output = self.log_stream.getvalue().strip()
        data = json.loads(log_output)
        
        self.assertIn("error_context", data)
        self.assertEqual(data["error_context"]["resource_type"], "User")
        self.assertEqual(data["error_context"]["resource_id"], str(resource_id))
