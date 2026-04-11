"""
Structured Logging System for EduLink

Provides:
- Structured JSON logging for all errors
- Enriched context (user_id, resource, error_code, etc.)
- Integration-ready for log aggregation (CloudWatch, DataDog, Splunk, etc.)
- Error rate monitoring by type
- Audit trail for all domain errors
"""

import json
import logging
import traceback
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from .error_handling import EduLinkError


class JSONFormatter(logging.Formatter):
    """
    Custom formatter that outputs structured JSON logs.
    
    Useful for log aggregation platforms (CloudWatch, DataDog, Splunk, etc.)
    that can parse and index JSON fields automatically.
    """

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add extra fields if present
        if hasattr(record, "extra_data") and record.extra_data:
            log_data.update(record.extra_data)

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info),
            }

        return json.dumps(log_data, default=str)


class EduLinkErrorLogger:
    """
    Specialized logger for EduLink domain errors.
    
    Automatically enriches error logs with:
    - Error code and type
    - User context (user_id, roles)
    - Resource context (entity type, ID)
    - HTTP status code
    - Developer message details
    """

    def __init__(self, logger: logging.Logger):
        """Initialize with a logger instance."""
        self.logger = logger

    def log_error(
        self, 
        exc: EduLinkError, 
        request_path: Optional[str] = None,
        request_method: Optional[str] = None,
        user_id: Optional[UUID] = None,
        **additional_context
    ) -> None:
        """
        Log an EduLink error with structured context.
        
        Args:
            exc: The EduLinkError to log
            request_path: HTTP request path
            request_method: HTTP request method
            user_id: Authenticated user ID
            **additional_context: Any other context to include
        """
        log_data = {
            "error_code": exc.error_code,
            "error_type": exc.__class__.__name__,
            "status_code": exc.http_status,
            "user_message": exc.user_message,
            "developer_message": exc.developer_message,
            "timestamp": exc.timestamp.isoformat(),
        }

        # Add request context
        if request_path:
            log_data["request_path"] = request_path
        if request_method:
            log_data["request_method"] = request_method

        # Add user context
        if user_id:
            log_data["user_id"] = str(user_id)

        # Add error context
        if exc.context:
            log_data["error_context"] = exc.context

        # Add additional context
        log_data.update(additional_context)

        # Log at appropriate level
        if exc.is_retrievable():
            # 4xx errors are client errors, log at INFO/WARNING
            if exc.http_status == 400:
                self.logger.warning(
                    f"Validation error: {exc.user_message}",
                    extra={"extra_data": log_data},
                )
            elif exc.http_status == 403:
                self.logger.warning(
                    f"Authorization denied: {exc.user_message}",
                    extra={"extra_data": log_data},
                )
            elif exc.http_status == 404:
                self.logger.info(
                    f"Resource not found: {exc.user_message}",
                    extra={"extra_data": log_data},
                )
            elif exc.http_status == 409:
                self.logger.warning(
                    f"Conflict error: {exc.user_message}",
                    extra={"extra_data": log_data},
                )
            else:
                self.logger.info(
                    f"Client error ({exc.error_code}): {exc.user_message}",
                    extra={"extra_data": log_data},
                )
        else:
            # 5xx errors are server errors, log at ERROR
            self.logger.error(
                f"Server error ({exc.error_code}): {exc.user_message}",
                extra={"extra_data": log_data},
            )

    def log_error_rate_spike(
        self,
        error_code: str,
        error_count: int,
        time_window_seconds: int,
        threshold: int,
    ) -> None:
        """
        Log when error rate exceeds threshold (for monitoring/alerting).
        
        Args:
            error_code: The error code that spiked
            error_count: Number of errors in the window
            time_window_seconds: Time window measured
            threshold: Configured threshold
        """
        log_data = {
            "alert_type": "error_rate_spike",
            "error_code": error_code,
            "error_count": error_count,
            "time_window_seconds": time_window_seconds,
            "threshold": threshold,
            "rate_per_minute": round((error_count / time_window_seconds) * 60, 2),
        }

        self.logger.warning(
            f"Error rate spike detected: {error_code} "
            f"({error_count} errors in {time_window_seconds}s)",
            extra={"extra_data": log_data},
        )


class ErrorMetricsCollector:
    """
    Collects metrics on error occurrences for monitoring and alerting.
    
    Can be used to track:
    - Error counts by type
    - Error trends over time
    - Spike detection
    """

    def __init__(self):
        """Initialize metrics collector."""
        self._counters: Dict[str, int] = {}
        self._timestamps: Dict[str, list] = {}

    def record_error(self, error_code: str) -> None:
        """Record an error occurrence."""
        self._counters[error_code] = self._counters.get(error_code, 0) + 1

        # Keep timestamp history for trend analysis
        if error_code not in self._timestamps:
            self._timestamps[error_code] = []
        self._timestamps[error_code].append(datetime.utcnow())

        # Clean old timestamps (older than 1 hour)
        cutoff = datetime.utcnow().timestamp() - 3600
        self._timestamps[error_code] = [
            ts for ts in self._timestamps[error_code]
            if ts.timestamp() > cutoff
        ]

    def get_count(self, error_code: str) -> int:
        """Get total count for an error code."""
        return self._counters.get(error_code, 0)

    def get_rate_in_window(
        self, 
        error_code: str, 
        window_seconds: int = 60
    ) -> int:
        """Get error count in the specified time window (seconds)."""
        if error_code not in self._timestamps:
            return 0

        cutoff = datetime.utcnow().timestamp() - window_seconds
        return len([
            ts for ts in self._timestamps[error_code]
            if ts.timestamp() > cutoff
        ])

    def reset(self) -> None:
        """Reset all counters (useful for testing)."""
        self._counters.clear()
        self._timestamps.clear()


# Global metrics collector instance
error_metrics = ErrorMetricsCollector()


def get_error_logger(logger_name: str = "edulink.errors") -> EduLinkErrorLogger:
    """
    Get a configured error logger instance.
    
    Args:
        logger_name: Name of the logger to use
        
    Returns:
        Configured EduLinkErrorLogger instance
    """
    logger = logging.getLogger(logger_name)
    return EduLinkErrorLogger(logger)


# Example usage:
# error_logger = get_error_logger()
# error_logger.log_error(
#     exc=not_found_error,
#     request_path="/api/users/123",
#     request_method="GET",
#     user_id=user.id,
#     additional_context="User tried to access deleted resource",
# )
