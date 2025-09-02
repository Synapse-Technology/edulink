"""Authentication Service API Contract.

Defines the interface for authentication operations between services.
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class TokenType(Enum):
    """Token types for authentication."""
    ACCESS = "access"
    REFRESH = "refresh"
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"
    EMAIL_CHANGE = "email_change"


class AuthenticationMethod(Enum):
    """Authentication methods."""
    EMAIL_PASSWORD = "email_password"
    USERNAME_PASSWORD = "username_password"
    SOCIAL_GOOGLE = "social_google"
    SOCIAL_GITHUB = "social_github"
    TWO_FACTOR = "two_factor"


@dataclass
class TokenData:
    """Token data structure."""
    token: str
    token_type: TokenType
    expires_at: datetime
    user_id: str
    scopes: List[str]
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class AuthenticationRequest:
    """Authentication request structure."""
    identifier: str  # email or username
    password: str
    method: AuthenticationMethod
    remember_me: bool = False
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None


@dataclass
class AuthenticationResponse:
    """Authentication response structure."""
    success: bool
    user_id: Optional[str] = None
    access_token: Optional[TokenData] = None
    refresh_token: Optional[TokenData] = None
    session_id: Optional[str] = None
    requires_2fa: bool = False
    requires_email_verification: bool = False
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class TokenValidationRequest:
    """Token validation request structure."""
    token: str
    token_type: TokenType
    required_scopes: Optional[List[str]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class TokenValidationResponse:
    """Token validation response structure."""
    valid: bool
    user_id: Optional[str] = None
    scopes: Optional[List[str]] = None
    expires_at: Optional[datetime] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class RefreshTokenRequest:
    """Refresh token request structure."""
    refresh_token: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class RefreshTokenResponse:
    """Refresh token response structure."""
    success: bool
    access_token: Optional[TokenData] = None
    refresh_token: Optional[TokenData] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class LogoutRequest:
    """Logout request structure."""
    user_id: str
    session_id: Optional[str] = None
    access_token: Optional[str] = None
    logout_all_sessions: bool = False
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class LogoutResponse:
    """Logout response structure."""
    success: bool
    sessions_terminated: int = 0
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class PasswordResetRequest:
    """Password reset request structure."""
    email: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class PasswordResetResponse:
    """Password reset response structure."""
    success: bool
    reset_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class PasswordChangeRequest:
    """Password change request structure."""
    user_id: str
    current_password: Optional[str] = None  # None for reset token flow
    new_password: str
    reset_token: Optional[str] = None
    invalidate_sessions: bool = True
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class PasswordChangeResponse:
    """Password change response structure."""
    success: bool
    sessions_invalidated: int = 0
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class TwoFactorSetupRequest:
    """Two-factor authentication setup request."""
    user_id: str
    method: str  # 'totp', 'sms', 'email'
    phone_number: Optional[str] = None
    backup_codes: bool = True


@dataclass
class TwoFactorSetupResponse:
    """Two-factor authentication setup response."""
    success: bool
    secret_key: Optional[str] = None  # For TOTP
    qr_code_url: Optional[str] = None  # For TOTP
    backup_codes: Optional[List[str]] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class TwoFactorVerificationRequest:
    """Two-factor authentication verification request."""
    user_id: str
    code: str
    method: str
    backup_code: bool = False
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class TwoFactorVerificationResponse:
    """Two-factor authentication verification response."""
    success: bool
    access_token: Optional[TokenData] = None
    refresh_token: Optional[TokenData] = None
    session_id: Optional[str] = None
    backup_code_used: bool = False
    remaining_backup_codes: Optional[int] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class AuthServiceContract:
    """Authentication Service Contract Interface.
    
    This defines the methods that the authentication service must implement
    and that other services can call.
    """
    
    async def authenticate(self, request: AuthenticationRequest) -> AuthenticationResponse:
        """Authenticate a user with credentials."""
        raise NotImplementedError
    
    async def validate_token(self, request: TokenValidationRequest) -> TokenValidationResponse:
        """Validate an authentication token."""
        raise NotImplementedError
    
    async def refresh_token(self, request: RefreshTokenRequest) -> RefreshTokenResponse:
        """Refresh an access token using a refresh token."""
        raise NotImplementedError
    
    async def logout(self, request: LogoutRequest) -> LogoutResponse:
        """Logout a user and invalidate sessions."""
        raise NotImplementedError
    
    async def request_password_reset(self, request: PasswordResetRequest) -> PasswordResetResponse:
        """Request a password reset token."""
        raise NotImplementedError
    
    async def change_password(self, request: PasswordChangeRequest) -> PasswordChangeResponse:
        """Change user password."""
        raise NotImplementedError
    
    async def setup_two_factor(self, request: TwoFactorSetupRequest) -> TwoFactorSetupResponse:
        """Setup two-factor authentication for a user."""
        raise NotImplementedError
    
    async def verify_two_factor(self, request: TwoFactorVerificationRequest) -> TwoFactorVerificationResponse:
        """Verify two-factor authentication code."""
        raise NotImplementedError
    
    async def generate_token(self, user_id: str, token_type: TokenType, 
                           scopes: List[str], expires_in: int = None) -> TokenData:
        """Generate a token for a user."""
        raise NotImplementedError
    
    async def revoke_token(self, token: str, token_type: TokenType) -> bool:
        """Revoke a specific token."""
        raise NotImplementedError
    
    async def revoke_user_tokens(self, user_id: str, token_type: Optional[TokenType] = None) -> int:
        """Revoke all tokens for a user."""
        raise NotImplementedError


# Error codes for authentication service
class AuthErrorCodes:
    """Standard error codes for authentication service."""
    
    # Authentication errors
    INVALID_CREDENTIALS = "AUTH_001"
    ACCOUNT_LOCKED = "AUTH_002"
    ACCOUNT_DISABLED = "AUTH_003"
    EMAIL_NOT_VERIFIED = "AUTH_004"
    TOO_MANY_ATTEMPTS = "AUTH_005"
    
    # Token errors
    INVALID_TOKEN = "TOKEN_001"
    EXPIRED_TOKEN = "TOKEN_002"
    INSUFFICIENT_SCOPE = "TOKEN_003"
    TOKEN_REVOKED = "TOKEN_004"
    
    # Two-factor authentication errors
    INVALID_2FA_CODE = "2FA_001"
    TWO_FA_REQUIRED = "2FA_002"
    TWO_FA_NOT_SETUP = "2FA_003"
    INVALID_BACKUP_CODE = "2FA_004"
    
    # Password errors
    WEAK_PASSWORD = "PWD_001"
    PASSWORD_REUSED = "PWD_002"
    INVALID_RESET_TOKEN = "PWD_003"
    
    # General errors
    INTERNAL_ERROR = "GEN_001"
    RATE_LIMITED = "GEN_002"
    INVALID_REQUEST = "GEN_003"