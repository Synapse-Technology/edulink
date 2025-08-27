"""User Service API Contract.

Defines the interface for user management operations between services.
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class UserRole(Enum):
    """User roles in the system."""
    STUDENT = "student"
    EMPLOYER = "employer"
    INSTITUTION_ADMIN = "institution_admin"
    SYSTEM_ADMIN = "system_admin"


class ProfileType(Enum):
    """Profile types."""
    STUDENT = "student"
    EMPLOYER = "employer"
    INSTITUTION = "institution"


class UserStatus(Enum):
    """User account status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"
    LOCKED = "locked"


@dataclass
class UserBasicInfo:
    """Basic user information."""
    user_id: str
    email: str
    username: str
    first_name: str
    last_name: str
    is_active: bool
    is_verified: bool
    roles: List[UserRole]
    created_at: datetime
    last_login: Optional[datetime] = None


@dataclass
class UserDetailedInfo:
    """Detailed user information."""
    user_id: str
    email: str
    username: str
    first_name: str
    last_name: str
    phone_number: Optional[str]
    avatar: Optional[str]
    bio: Optional[str]
    language: str
    timezone: str
    is_active: bool
    is_verified: bool
    is_staff: bool
    roles: List[UserRole]
    permissions: List[str]
    profile_visibility: str
    notification_settings: Dict[str, Any]
    two_factor_enabled: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    last_activity: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class UserRegistrationRequest:
    """User registration request structure."""
    email: str
    username: Optional[str]
    password: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    language: str = "en"
    timezone: str = "UTC"
    profile_type: ProfileType = ProfileType.STUDENT
    institution_id: Optional[str] = None
    registration_method: str = "direct"
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class UserRegistrationResponse:
    """User registration response structure."""
    success: bool
    user_id: Optional[str] = None
    email_verification_required: bool = False
    verification_token: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class UserUpdateRequest:
    """User update request structure."""
    user_id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    profile_visibility: Optional[str] = None
    notification_settings: Optional[Dict[str, Any]] = None
    updated_by: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class UserUpdateResponse:
    """User update response structure."""
    success: bool
    user: Optional[UserDetailedInfo] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class UserSearchRequest:
    """User search request structure."""
    query: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    institution_id: Optional[str] = None
    is_verified: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    limit: int = 20
    offset: int = 0
    order_by: str = "created_at"
    order_direction: str = "desc"


@dataclass
class UserSearchResponse:
    """User search response structure."""
    users: List[UserBasicInfo]
    total_count: int
    has_more: bool
    next_offset: Optional[int] = None


@dataclass
class ProfileInfo:
    """Profile information structure."""
    profile_id: str
    user_id: str
    profile_type: ProfileType
    completion_score: int
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    data: Dict[str, Any]  # Profile-specific data


@dataclass
class ProfileUpdateRequest:
    """Profile update request structure."""
    profile_id: str
    user_id: str
    profile_type: ProfileType
    data: Dict[str, Any]
    updated_by: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class ProfileUpdateResponse:
    """Profile update response structure."""
    success: bool
    profile: Optional[ProfileInfo] = None
    completion_score: Optional[int] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class UserSessionInfo:
    """User session information."""
    session_id: str
    user_id: str
    ip_address: str
    user_agent: str
    device_type: str
    location: Optional[str]
    is_current: bool
    is_active: bool
    created_at: datetime
    last_activity: datetime
    expires_at: datetime


@dataclass
class UserActivityInfo:
    """User activity information."""
    activity_id: str
    user_id: str
    action_type: str
    description: str
    ip_address: str
    user_agent: str
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class UserStatsInfo:
    """User statistics information."""
    total_users: int
    active_users: int
    verified_users: int
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int
    users_by_role: Dict[str, int]
    users_by_status: Dict[str, int]
    users_by_institution: Dict[str, int]


@dataclass
class BulkUserActionRequest:
    """Bulk user action request structure."""
    user_ids: List[str]
    action: str  # 'activate', 'deactivate', 'verify', 'unverify', 'delete'
    reason: Optional[str] = None
    performed_by: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class BulkUserActionResponse:
    """Bulk user action response structure."""
    success: bool
    processed_count: int
    failed_count: int
    failed_users: List[Dict[str, str]]  # user_id and error_message
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class EmailChangeRequest:
    """Email change request structure."""
    user_id: str
    new_email: str
    current_password: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class EmailChangeResponse:
    """Email change response structure."""
    success: bool
    verification_required: bool = True
    verification_token: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class EmailVerificationRequest:
    """Email verification request structure."""
    token: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class EmailVerificationResponse:
    """Email verification response structure."""
    success: bool
    user_id: Optional[str] = None
    email_verified: bool = False
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class UserServiceContract:
    """User Service Contract Interface.
    
    This defines the methods that the user service must implement
    and that other services can call.
    """
    
    async def register_user(self, request: UserRegistrationRequest) -> UserRegistrationResponse:
        """Register a new user."""
        raise NotImplementedError
    
    async def get_user(self, user_id: str) -> Optional[UserDetailedInfo]:
        """Get user by ID."""
        raise NotImplementedError
    
    async def get_user_by_email(self, email: str) -> Optional[UserDetailedInfo]:
        """Get user by email."""
        raise NotImplementedError
    
    async def get_user_by_username(self, username: str) -> Optional[UserDetailedInfo]:
        """Get user by username."""
        raise NotImplementedError
    
    async def update_user(self, request: UserUpdateRequest) -> UserUpdateResponse:
        """Update user information."""
        raise NotImplementedError
    
    async def search_users(self, request: UserSearchRequest) -> UserSearchResponse:
        """Search users with filters."""
        raise NotImplementedError
    
    async def get_user_profile(self, user_id: str, profile_type: ProfileType) -> Optional[ProfileInfo]:
        """Get user profile by type."""
        raise NotImplementedError
    
    async def update_user_profile(self, request: ProfileUpdateRequest) -> ProfileUpdateResponse:
        """Update user profile."""
        raise NotImplementedError
    
    async def get_user_sessions(self, user_id: str) -> List[UserSessionInfo]:
        """Get active user sessions."""
        raise NotImplementedError
    
    async def terminate_user_session(self, user_id: str, session_id: str) -> bool:
        """Terminate a specific user session."""
        raise NotImplementedError
    
    async def get_user_activities(self, user_id: str, limit: int = 50, 
                                offset: int = 0) -> List[UserActivityInfo]:
        """Get user activity history."""
        raise NotImplementedError
    
    async def log_user_activity(self, user_id: str, action_type: str, 
                              description: str, ip_address: str, 
                              user_agent: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Log user activity."""
        raise NotImplementedError
    
    async def get_user_stats(self, institution_id: Optional[str] = None) -> UserStatsInfo:
        """Get user statistics."""
        raise NotImplementedError
    
    async def bulk_user_action(self, request: BulkUserActionRequest) -> BulkUserActionResponse:
        """Perform bulk actions on users."""
        raise NotImplementedError
    
    async def change_user_email(self, request: EmailChangeRequest) -> EmailChangeResponse:
        """Initiate email change process."""
        raise NotImplementedError
    
    async def verify_email(self, request: EmailVerificationRequest) -> EmailVerificationResponse:
        """Verify user email address."""
        raise NotImplementedError
    
    async def activate_user(self, user_id: str, activated_by: str) -> bool:
        """Activate a user account."""
        raise NotImplementedError
    
    async def deactivate_user(self, user_id: str, deactivated_by: str, reason: Optional[str] = None) -> bool:
        """Deactivate a user account."""
        raise NotImplementedError
    
    async def verify_user(self, user_id: str, verified_by: str) -> bool:
        """Verify a user account."""
        raise NotImplementedError
    
    async def unverify_user(self, user_id: str, unverified_by: str, reason: Optional[str] = None) -> bool:
        """Unverify a user account."""
        raise NotImplementedError
    
    async def delete_user(self, user_id: str, deleted_by: str, hard_delete: bool = False) -> bool:
        """Delete a user account (soft or hard delete)."""
        raise NotImplementedError
    
    async def update_last_login(self, user_id: str, ip_address: str, user_agent: str) -> bool:
        """Update user's last login information."""
        raise NotImplementedError
    
    async def check_user_permissions(self, user_id: str, permissions: List[str]) -> Dict[str, bool]:
        """Check if user has specific permissions."""
        raise NotImplementedError
    
    async def get_users_by_role(self, role: UserRole, institution_id: Optional[str] = None) -> List[UserBasicInfo]:
        """Get users by role."""
        raise NotImplementedError
    
    async def get_users_by_institution(self, institution_id: str) -> List[UserBasicInfo]:
        """Get users by institution."""
        raise NotImplementedError


# Error codes for user service
class UserErrorCodes:
    """Standard error codes for user service."""
    
    # User errors
    USER_NOT_FOUND = "USER_001"
    USER_ALREADY_EXISTS = "USER_002"
    USER_INACTIVE = "USER_003"
    USER_SUSPENDED = "USER_004"
    USER_NOT_VERIFIED = "USER_005"
    
    # Profile errors
    PROFILE_NOT_FOUND = "PROFILE_001"
    PROFILE_INCOMPLETE = "PROFILE_002"
    PROFILE_VERIFICATION_FAILED = "PROFILE_003"
    
    # Email errors
    EMAIL_ALREADY_EXISTS = "EMAIL_001"
    EMAIL_VERIFICATION_FAILED = "EMAIL_002"
    EMAIL_VERIFICATION_EXPIRED = "EMAIL_003"
    
    # Username errors
    USERNAME_ALREADY_EXISTS = "USERNAME_001"
    USERNAME_INVALID_FORMAT = "USERNAME_002"
    
    # Permission errors
    INSUFFICIENT_PERMISSIONS = "PERM_001"
    INVALID_ROLE = "PERM_002"
    
    # Session errors
    SESSION_NOT_FOUND = "SESSION_001"
    SESSION_EXPIRED = "SESSION_002"
    
    # Validation errors
    INVALID_INPUT = "VALID_001"
    REQUIRED_FIELD_MISSING = "VALID_002"
    FIELD_TOO_LONG = "VALID_003"
    FIELD_TOO_SHORT = "VALID_004"
    INVALID_FORMAT = "VALID_005"
    
    # General errors
    INTERNAL_ERROR = "GEN_001"
    RATE_LIMITED = "GEN_002"
    OPERATION_NOT_ALLOWED = "GEN_003"