"""
Authentication and user management services.
Follows architecture rules: pure business logic, no HTTP handling, triggers events.
"""

from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import uuid

from .models import User
from edulink.apps.ledger.services import record_event
from edulink.apps.students.services import preregister_student
from edulink.apps.notifications.services import (
    create_email_verification_token,
    create_password_reset_token,
    use_password_reset_token,
    send_email_verification_notification,
    send_password_reset_notification,
    send_welcome_notification,
    send_password_changed_notification
)


def create_user(*, email: str, password: str, username: str = None, role: str = User.ROLE_STUDENT, **kwargs) -> User:
    """
    Create a new user with the given email and password.
    Records USER_CREATED event in ledger.
    Sends email verification notification via notifications service.
    Handles institution_id for student registration (passed to student service).
    """
    if not email:
        raise ValueError("Email is required")
    
    if not username:
        username = email.split('@')[0]  # Use email prefix as default username
    
    # Remove fields that don't belong to User model
    kwargs.pop('password_confirm', None)
    institution_id = kwargs.pop('institution_id', None)
    registration_number = kwargs.pop('registration_number', None)
    
    # Validate password
    try:
        validate_password(password)
    except ValidationError as e:
        raise ValueError(f"Invalid password: {', '.join(e.messages)}")
    
    # Create user
    user = User.objects.create_user(
        email=email,
        username=username,
        password=password,
        role=role,
        **kwargs,
    )
    
    # Automatically preregister student profile for student users
    if role == User.ROLE_STUDENT:
        try:
            preregister_student(
                user_id=user.id, 
                email=email,
                institution_id=institution_id,
                registration_number=registration_number
            )
        except Exception as e:
            record_event(
                event_type="STUDENT_PREREGISTRATION_FAILED",
                actor_id=user.id,
                entity_type="User",
                entity_id=user.id,
                payload={
                    "email": email,
                    "institution_id": institution_id,
                    "registration_number": registration_number,
                    "error": str(e),
                    "failed_at": timezone.now().isoformat(),
                },
            )
    
    # Record user creation event
    record_event(
        event_type="USER_CREATED",
        actor_id=user.id,
        entity_type="User",
        entity_id=user.id,
        payload={
            "email": email,
            "role": role,
            "created_at": timezone.now().isoformat(),
        },
    )
    
    # Create email verification token
    try:
        verification_token = create_email_verification_token(
            user_id=str(user.id),
            email=user.email
        )
        
        # Build verification URL (this should be configured based on frontend)
        verification_url = f"{settings.FRONTEND_URL}/verify-email/{verification_token}/"
        
        # Send email verification notification
        success = send_email_verification_notification(
            user_id=str(user.id),
            email=user.email,
            verification_token=verification_token,
            verification_url=verification_url
        )
        
        if success:
            # Record email verification sent event
            record_event(
                event_type="EMAIL_VERIFICATION_SENT",
                actor_id=user.id,
                entity_type="User",
                entity_id=user.id,
                payload={
                    "email": email,
                    "sent_at": timezone.now().isoformat()
                }
            )
        else:
            raise Exception("Failed to send verification email (check logs for details)")
            
    except Exception as e:
        # Log the error but don't fail user creation
        # Email verification can be retried later
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Email verification trigger failed for user {user.id}: {e}")
        
        record_event(
            event_type="EMAIL_VERIFICATION_FAILED",
            actor_id=user.id,
            entity_type="User",
            entity_id=user.id,
            payload={
                "email": email,
                "error": str(e),
                "failed_at": timezone.now().isoformat()
            }
        )
    
    return user


def authenticate_user(*, email: str, password: str) -> User:
    """
    Authenticate user with email and password.
    Records USER_LOGIN_SUCCESS or USER_LOGIN_FAILED event.
    """
    user = authenticate(username=email, password=password)
    
    if user is not None:
        # Update last login
        update_last_login(None, user)
        
        # Record successful login
        record_event(
            event_type="USER_LOGIN_SUCCESS",
            actor_id=user.id,
            entity_type="User",
            entity_id=user.id,
            payload={
                "email": email,
                "login_at": timezone.now().isoformat()
            }
        )
        return user
    else:
        # Try to find user for failed login recording
        try:
            user = User.objects.get(email=email)
            record_event(
                event_type="USER_LOGIN_FAILED",
                actor_id=user.id,
                entity_type="User",
                entity_id=user.id,
                payload={
                    "email": email,
                    "failed_at": timezone.now().isoformat()
                }
            )
        except User.DoesNotExist:
            # Don't record events for non-existent users (security)
            pass
        
        raise ValueError("Invalid email or password")


def change_user_password(*, user_id: str, old_password: str, new_password: str) -> User:
    """
    Change user password after validating old password.
    Records USER_PASSWORD_CHANGED event.
    Sends password changed notification via notifications service.
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValueError("User not found")
    
    # Validate old password
    if not user.check_password(old_password):
        raise ValueError("Current password is incorrect")
    
    # Validate new password
    try:
        validate_password(new_password, user)
    except ValidationError as e:
        raise ValueError(f"Invalid new password: {', '.join(e.messages)}")
    
    # Change password
    user.set_password(new_password)
    user.save()
    
    # Record password change event
    record_event(
        event_type="USER_PASSWORD_CHANGED",
        actor_id=user.id,
        entity_type="User",
        entity_id=user.id,
        payload={
            "changed_at": timezone.now().isoformat()
        }
    )
    
    # Send password changed notification
    try:
        send_password_changed_notification(
            user_id=str(user.id),
            email=user.email
        )
    except Exception as e:
        # Log the error but don't fail the password change
        record_event(
            event_type="PASSWORD_CHANGED_NOTIFICATION_FAILED",
            actor_id=user.id,
            entity_type="User",
            entity_id=user.id,
            payload={
                "email": user.email,
                "error": str(e),
                "failed_at": timezone.now().isoformat()
            }
        )
    
    return user


def reset_user_password(*, email: str) -> str:
    """
    Initiate password reset process.
    Creates reset token via notifications service.
    Records USER_PASSWORD_RESET_REQUESTED event.
    """
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Don't reveal whether user exists (security)
        # Still create a dummy token for consistent behavior
        dummy_token = str(uuid.uuid4())
        record_event(
            event_type="USER_PASSWORD_RESET_REQUESTED_NONEXISTENT",
            actor_id=None,
            entity_type="User",
            entity_id="unknown",
            payload={
                "email": email,
                "requested_at": timezone.now().isoformat()
            }
        )
        return dummy_token
    
    # Create reset token via notifications service
    try:
        reset_token = create_password_reset_token(email=email)
        
        # Build reset URL (this should be configured based on frontend)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token}/"
        
        # Send password reset notification
        send_password_reset_notification(
            user_id=str(user.id),
            email=email,
            reset_token=reset_token,
            reset_url=reset_url
        )
        
        # Record reset request event
        record_event(
            event_type="USER_PASSWORD_RESET_REQUESTED",
            actor_id=user.id,
            entity_type="User",
            entity_id=user.id,
            payload={
                "email": email,
                "reset_token": reset_token,
                "requested_at": timezone.now().isoformat(),
                "expires_at": (timezone.now() + timedelta(hours=1)).isoformat()
            }
        )
        
        return reset_token
        
    except Exception as e:
        # Log the error but still return a dummy token for security
        record_event(
            event_type="USER_PASSWORD_RESET_FAILED",
            actor_id=user.id,
            entity_type="User",
            entity_id=user.id,
            payload={
                "email": email,
                "error": str(e),
                "failed_at": timezone.now().isoformat()
            }
        )
        return str(uuid.uuid4())  # Return dummy token


def update_user_profile(*, user_id: str, actor_id: str | None = None, **kwargs) -> User:
    """
    Update user profile fields.
    Records USER_PROFILE_UPDATED event.
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValueError("User not found")
    
    allowed_fields = ["first_name", "last_name", "phone_number", "avatar_url", "email"]
    updated_fields = []
    
    for field in allowed_fields:
        if field in kwargs:
            if field == "email":
                new_email = kwargs[field]
                if new_email and new_email != user.email:
                    if User.objects.filter(email=new_email).exclude(id=user.id).exists():
                        raise ValueError("Email already in use")
                    user.email = new_email
                    updated_fields.append("email")
                continue
            old_value = getattr(user, field)
            new_value = kwargs[field]
            if old_value != new_value:
                setattr(user, field, new_value)
                updated_fields.append(field)
    
    if updated_fields:
        user.save()
        
        record_event(
            event_type="USER_PROFILE_UPDATED",
            actor_id=actor_id or user.id,
            entity_type="User",
            entity_id=user.id,
            payload={
                "updated_fields": updated_fields,
                "updated_at": timezone.now().isoformat()
            }
        )
    
    return user


def assign_user_role(*, user_id: str, new_role: str) -> User:
    """
    Assign a new role to user.
    Records USER_ROLE_CHANGED event.
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValueError("User not found")
    
    # Validate role
    valid_roles = [choice[0] for choice in User.ROLE_CHOICES]
    if new_role not in valid_roles:
        raise ValueError(f"Invalid role. Valid roles: {valid_roles}")
    
    old_role = user.role
    if old_role == new_role:
        return user  # No change needed
    
    # Change role
    user.role = new_role
    user.save()
    
    # Record role change event
    record_event(
        event_type="USER_ROLE_CHANGED",
        actor_id=None,
        entity_type="User",
        entity_id=user.id,
        payload={
            "old_role": old_role,
            "new_role": new_role,
            "changed_at": timezone.now().isoformat()
        }
    )
    
    return user


def get_user_by_id(*, user_id: str) -> User:
    """
    Get user by ID.
    No events recorded for simple queries.
    """
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValueError("User not found")


def get_user_by_email(*, email: str) -> User:
    """
    Get user by email.
    No events recorded for simple queries.
    """
    try:
        return User.objects.get(email=email)
    except User.DoesNotExist:
        raise ValueError("User not found")


def list_users(*, role: str = None, is_active: bool = None) -> list[User]:
    """
    List users with optional filters.
    No events recorded for queries.
    """
    queryset = User.objects.all()
    
    if role:
        queryset = queryset.filter(role=role)
    
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)
    
    return list(queryset)


def deactivate_own_account(*, user_id: str, reason: str = "") -> User:
    """
    User deactivates their own account.
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValueError("User not found")
        
    if not user.is_active:
        return user
        
    user.is_active = False
    user.save()
    
    record_event(
        event_type="USER_DEACTIVATED_SELF",
        actor_id=user.id,
        entity_type="User",
        entity_id=user.id,
        payload={
            "reason": reason,
            "deactivated_at": timezone.now().isoformat()
        }
    )
    
    return user
