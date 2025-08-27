"""Standardized API endpoint definitions for all microservices."""

from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class HTTPMethod(Enum):
    """HTTP methods for API endpoints."""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"
    DELETE = "DELETE"


class AuthLevel(Enum):
    """Authentication levels for endpoints."""
    PUBLIC = "public"  # No authentication required
    AUTHENTICATED = "authenticated"  # Valid token required
    ADMIN = "admin"  # Admin role required
    SYSTEM = "system"  # System/service token required


@dataclass
class EndpointDefinition:
    """Definition of an API endpoint."""
    path: str
    method: HTTPMethod
    auth_level: AuthLevel
    description: str
    request_schema: Optional[Dict] = None
    response_schema: Optional[Dict] = None
    query_params: Optional[List[str]] = None
    path_params: Optional[List[str]] = None


class AuthServiceEndpoints:
    """Authentication service API endpoints."""
    
    BASE_PATH = "/api/v1"
    
    # Authentication endpoints
    LOGIN = EndpointDefinition(
        path="/auth/login",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.PUBLIC,
        description="User login with email and password",
        request_schema={
            "email": "string",
            "password": "string",
            "remember_me": "boolean"
        },
        response_schema={
            "access_token": "string",
            "refresh_token": "string",
            "user": "object",
            "expires_in": "integer"
        }
    )
    
    LOGOUT = EndpointDefinition(
        path="/auth/logout",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.AUTHENTICATED,
        description="User logout",
        request_schema={"refresh_token": "string"},
        response_schema={"message": "string"}
    )
    
    REFRESH_TOKEN = EndpointDefinition(
        path="/auth/refresh",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.PUBLIC,
        description="Refresh access token",
        request_schema={"refresh_token": "string"},
        response_schema={
            "access_token": "string",
            "expires_in": "integer"
        }
    )
    
    VALIDATE_TOKEN = EndpointDefinition(
        path="/auth/validate",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.SYSTEM,
        description="Validate token (internal use)",
        request_schema={"token": "string"},
        response_schema={
            "valid": "boolean",
            "user_id": "string",
            "role": "string"
        }
    )
    
    # User management endpoints
    REGISTER = EndpointDefinition(
        path="/auth/register",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.PUBLIC,
        description="User registration",
        request_schema={
            "email": "string",
            "password": "string",
            "first_name": "string",
            "last_name": "string",
            "role": "string"
        },
        response_schema={
            "user_id": "string",
            "message": "string"
        }
    )
    
    GET_USER = EndpointDefinition(
        path="/users/{user_id}",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Get user information",
        path_params=["user_id"],
        response_schema={
            "id": "string",
            "email": "string",
            "role": "string",
            "is_active": "boolean",
            "is_email_verified": "boolean",
            "created_at": "datetime"
        }
    )
    
    UPDATE_USER = EndpointDefinition(
        path="/users/{user_id}",
        method=HTTPMethod.PATCH,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Update user information",
        path_params=["user_id"],
        request_schema={
            "email": "string",
            "role": "string",
            "is_active": "boolean"
        },
        response_schema={"message": "string"}
    )
    
    VERIFY_EMAIL = EndpointDefinition(
        path="/users/{user_id}/verify-email",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Verify user email",
        path_params=["user_id"],
        response_schema={"message": "string"}
    )
    
    CHANGE_PASSWORD = EndpointDefinition(
        path="/users/{user_id}/change-password",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Change user password",
        path_params=["user_id"],
        request_schema={
            "current_password": "string",
            "new_password": "string"
        },
        response_schema={"message": "string"}
    )


class UserServiceEndpoints:
    """User service API endpoints."""
    
    BASE_PATH = "/api/v1"
    
    # Profile management
    GET_PROFILE = EndpointDefinition(
        path="/profiles/{user_id}",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Get user profile",
        path_params=["user_id"],
        response_schema={
            "id": "string",
            "auth_user_id": "string",
            "email": "string",
            "username": "string",
            "first_name": "string",
            "last_name": "string",
            "bio": "string",
            "phone_number": "string",
            "date_of_birth": "date",
            "profile_picture": "string",
            "is_active": "boolean",
            "role": "string"
        }
    )
    
    UPDATE_PROFILE = EndpointDefinition(
        path="/profiles/{user_id}",
        method=HTTPMethod.PATCH,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Update user profile",
        path_params=["user_id"],
        request_schema={
            "username": "string",
            "first_name": "string",
            "last_name": "string",
            "bio": "string",
            "phone_number": "string",
            "date_of_birth": "date",
            "profile_picture": "string"
        },
        response_schema={"message": "string"}
    )
    
    # Institution memberships
    GET_USER_INSTITUTIONS = EndpointDefinition(
        path="/profiles/{user_id}/institutions",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Get user's institution memberships",
        path_params=["user_id"],
        response_schema={
            "institutions": "array",
            "count": "integer"
        }
    )
    
    CREATE_MEMBERSHIP = EndpointDefinition(
        path="/memberships",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Create institution membership",
        request_schema={
            "user_profile_id": "string",
            "institution_id": "string",
            "role": "string",
            "student_id": "string",
            "department": "string",
            "year_of_study": "integer"
        },
        response_schema={
            "id": "string",
            "message": "string"
        }
    )
    
    UPDATE_MEMBERSHIP = EndpointDefinition(
        path="/memberships/{membership_id}",
        method=HTTPMethod.PATCH,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Update institution membership",
        path_params=["membership_id"],
        request_schema={
            "role": "string",
            "status": "string",
            "department": "string",
            "year_of_study": "integer"
        },
        response_schema={"message": "string"}
    )
    
    DELETE_MEMBERSHIP = EndpointDefinition(
        path="/memberships/{membership_id}",
        method=HTTPMethod.DELETE,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Delete institution membership",
        path_params=["membership_id"],
        response_schema={"message": "string"}
    )


class InstitutionServiceEndpoints:
    """Institution service API endpoints."""
    
    BASE_PATH = "/api/v1"
    
    # Institution management
    LIST_INSTITUTIONS = EndpointDefinition(
        path="/institutions",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.PUBLIC,
        description="List institutions",
        query_params=["page", "limit", "type", "status"],
        response_schema={
            "institutions": "array",
            "total": "integer",
            "page": "integer",
            "limit": "integer"
        }
    )
    
    GET_INSTITUTION = EndpointDefinition(
        path="/institutions/{institution_id}",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.PUBLIC,
        description="Get institution details",
        path_params=["institution_id"],
        response_schema={
            "id": "string",
            "name": "string",
            "type": "string",
            "description": "string",
            "website": "string",
            "email": "string",
            "phone": "string",
            "address": "object",
            "status": "string",
            "logo": "string"
        }
    )
    
    CREATE_INSTITUTION = EndpointDefinition(
        path="/institutions",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.ADMIN,
        description="Create new institution",
        request_schema={
            "name": "string",
            "type": "string",
            "description": "string",
            "website": "string",
            "email": "string",
            "phone": "string",
            "address": "object"
        },
        response_schema={
            "id": "string",
            "message": "string"
        }
    )
    
    UPDATE_INSTITUTION = EndpointDefinition(
        path="/institutions/{institution_id}",
        method=HTTPMethod.PATCH,
        auth_level=AuthLevel.ADMIN,
        description="Update institution",
        path_params=["institution_id"],
        request_schema={
            "name": "string",
            "description": "string",
            "website": "string",
            "email": "string",
            "phone": "string",
            "address": "object",
            "status": "string"
        },
        response_schema={"message": "string"}
    )
    
    SEARCH_INSTITUTIONS = EndpointDefinition(
        path="/institutions/search",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.PUBLIC,
        description="Search institutions",
        query_params=["q", "type", "location", "limit"],
        response_schema={
            "institutions": "array",
            "total": "integer"
        }
    )
    
    GET_INSTITUTION_MEMBERS = EndpointDefinition(
        path="/institutions/{institution_id}/members",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Get institution members",
        path_params=["institution_id"],
        query_params=["role", "status", "page", "limit"],
        response_schema={
            "members": "array",
            "total": "integer",
            "page": "integer",
            "limit": "integer"
        }
    )


class ApplicationServiceEndpoints:
    """Application service API endpoints."""
    
    BASE_PATH = "/api/v1"
    
    # Application management
    LIST_APPLICATIONS = EndpointDefinition(
        path="/applications",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.AUTHENTICATED,
        description="List user applications",
        query_params=["status", "type", "page", "limit"],
        response_schema={
            "applications": "array",
            "total": "integer",
            "page": "integer",
            "limit": "integer"
        }
    )
    
    GET_APPLICATION = EndpointDefinition(
        path="/applications/{application_id}",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Get application details",
        path_params=["application_id"],
        response_schema={
            "id": "string",
            "user_id": "string",
            "type": "string",
            "status": "string",
            "data": "object",
            "submitted_at": "datetime",
            "reviewed_at": "datetime",
            "reviewer_id": "string"
        }
    )
    
    CREATE_APPLICATION = EndpointDefinition(
        path="/applications",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Create new application",
        request_schema={
            "type": "string",
            "data": "object",
            "institution_id": "string"
        },
        response_schema={
            "id": "string",
            "message": "string"
        }
    )
    
    UPDATE_APPLICATION = EndpointDefinition(
        path="/applications/{application_id}",
        method=HTTPMethod.PATCH,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Update application",
        path_params=["application_id"],
        request_schema={
            "data": "object",
            "status": "string"
        },
        response_schema={"message": "string"}
    )
    
    SUBMIT_APPLICATION = EndpointDefinition(
        path="/applications/{application_id}/submit",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Submit application for review",
        path_params=["application_id"],
        response_schema={"message": "string"}
    )
    
    REVIEW_APPLICATION = EndpointDefinition(
        path="/applications/{application_id}/review",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.ADMIN,
        description="Review application",
        path_params=["application_id"],
        request_schema={
            "status": "string",
            "comments": "string",
            "feedback": "object"
        },
        response_schema={"message": "string"}
    )


class NotificationServiceEndpoints:
    """Notification service API endpoints."""
    
    BASE_PATH = "/api/v1"
    
    # Notification management
    GET_USER_NOTIFICATIONS = EndpointDefinition(
        path="/users/{user_id}/notifications",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Get user notifications",
        path_params=["user_id"],
        query_params=["read", "type", "page", "limit"],
        response_schema={
            "notifications": "array",
            "total": "integer",
            "unread_count": "integer",
            "page": "integer",
            "limit": "integer"
        }
    )
    
    SEND_NOTIFICATION = EndpointDefinition(
        path="/notifications",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.SYSTEM,
        description="Send notification (internal use)",
        request_schema={
            "user_id": "string",
            "type": "string",
            "title": "string",
            "message": "string",
            "data": "object",
            "channels": "array"
        },
        response_schema={
            "id": "string",
            "message": "string"
        }
    )
    
    SEND_EMAIL = EndpointDefinition(
        path="/notifications/email",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.SYSTEM,
        description="Send email notification",
        request_schema={
            "to": "string",
            "subject": "string",
            "body": "string",
            "template": "string",
            "data": "object"
        },
        response_schema={"message": "string"}
    )
    
    MARK_AS_READ = EndpointDefinition(
        path="/notifications/{notification_id}/read",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Mark notification as read",
        path_params=["notification_id"],
        response_schema={"message": "string"}
    )
    
    GET_NOTIFICATION_PREFERENCES = EndpointDefinition(
        path="/users/{user_id}/preferences",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Get user notification preferences",
        path_params=["user_id"],
        response_schema={
            "email_notifications": "boolean",
            "push_notifications": "boolean",
            "sms_notifications": "boolean",
            "notification_types": "object"
        }
    )
    
    UPDATE_NOTIFICATION_PREFERENCES = EndpointDefinition(
        path="/users/{user_id}/preferences",
        method=HTTPMethod.PATCH,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Update notification preferences",
        path_params=["user_id"],
        request_schema={
            "email_notifications": "boolean",
            "push_notifications": "boolean",
            "sms_notifications": "boolean",
            "notification_types": "object"
        },
        response_schema={"message": "string"}
    )


class InternshipServiceEndpoints:
    """Internship service API endpoints."""
    
    BASE_PATH = "/api/v1"
    
    # Internship management
    LIST_INTERNSHIPS = EndpointDefinition(
        path="/internships",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.PUBLIC,
        description="List available internships",
        query_params=["location", "field", "type", "company", "page", "limit"],
        response_schema={
            "internships": "array",
            "total": "integer",
            "page": "integer",
            "limit": "integer"
        }
    )
    
    GET_INTERNSHIP = EndpointDefinition(
        path="/internships/{internship_id}",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.PUBLIC,
        description="Get internship details",
        path_params=["internship_id"],
        response_schema={
            "id": "string",
            "title": "string",
            "company": "object",
            "description": "string",
            "requirements": "array",
            "location": "string",
            "type": "string",
            "duration": "string",
            "stipend": "number",
            "application_deadline": "date",
            "start_date": "date"
        }
    )
    
    CREATE_INTERNSHIP = EndpointDefinition(
        path="/internships",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Create internship posting",
        request_schema={
            "title": "string",
            "company_id": "string",
            "description": "string",
            "requirements": "array",
            "location": "string",
            "type": "string",
            "duration": "string",
            "stipend": "number",
            "application_deadline": "date",
            "start_date": "date"
        },
        response_schema={
            "id": "string",
            "message": "string"
        }
    )
    
    APPLY_FOR_INTERNSHIP = EndpointDefinition(
        path="/internships/{internship_id}/apply",
        method=HTTPMethod.POST,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Apply for internship",
        path_params=["internship_id"],
        request_schema={
            "cover_letter": "string",
            "resume_url": "string",
            "additional_documents": "array"
        },
        response_schema={
            "application_id": "string",
            "message": "string"
        }
    )
    
    GET_USER_APPLICATIONS = EndpointDefinition(
        path="/users/{user_id}/applications",
        method=HTTPMethod.GET,
        auth_level=AuthLevel.AUTHENTICATED,
        description="Get user's internship applications",
        path_params=["user_id"],
        query_params=["status", "page", "limit"],
        response_schema={
            "applications": "array",
            "total": "integer",
            "page": "integer",
            "limit": "integer"
        }
    )


# Endpoint registry for easy access
class EndpointRegistry:
    """Registry of all service endpoints."""
    
    AUTH_SERVICE = AuthServiceEndpoints
    USER_SERVICE = UserServiceEndpoints
    INSTITUTION_SERVICE = InstitutionServiceEndpoints
    APPLICATION_SERVICE = ApplicationServiceEndpoints
    NOTIFICATION_SERVICE = NotificationServiceEndpoints
    INTERNSHIP_SERVICE = InternshipServiceEndpoints
    
    @classmethod
    def get_all_endpoints(cls) -> Dict[str, Dict[str, EndpointDefinition]]:
        """Get all endpoints organized by service."""
        return {
            "auth_service": cls._get_service_endpoints(cls.AUTH_SERVICE),
            "user_service": cls._get_service_endpoints(cls.USER_SERVICE),
            "institution_service": cls._get_service_endpoints(cls.INSTITUTION_SERVICE),
            "application_service": cls._get_service_endpoints(cls.APPLICATION_SERVICE),
            "notification_service": cls._get_service_endpoints(cls.NOTIFICATION_SERVICE),
            "internship_service": cls._get_service_endpoints(cls.INTERNSHIP_SERVICE),
        }
    
    @classmethod
    def _get_service_endpoints(cls, service_class) -> Dict[str, EndpointDefinition]:
        """Extract endpoints from a service class."""
        endpoints = {}
        for attr_name in dir(service_class):
            attr = getattr(service_class, attr_name)
            if isinstance(attr, EndpointDefinition):
                endpoints[attr_name.lower()] = attr
        return endpoints


# Export the registry
endpoint_registry = EndpointRegistry()