# Authentication & Authorization System Implementation

## Overview

This document outlines the complete authentication and authorization system for EduLink, covering role-based access control (RBAC), JWT token management, permission systems, and security measures for all user types: students, supervisors, institution admins, and system administrators.

## 1. User Role Hierarchy

### Role Definitions

```python
# users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    USER_TYPES = [
        ('STUDENT', 'Student'),
        ('SUPERVISOR', 'Supervisor'),
        ('INSTITUTION_ADMIN', 'Institution Admin'),
        ('SYSTEM_ADMIN', 'System Admin'),
        ('EMPLOYER', 'Employer'),
    ]
    
    user_type = models.CharField(max_length=20, choices=USER_TYPES)
    institution = models.ForeignKey('institutions.Institution', on_delete=models.CASCADE, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(auto_now_add=True)
    two_factor_enabled = models.BooleanField(default=False)
    
    def has_role(self, role):
        """Check if user has specific role"""
        return self.user_type == role
    
    def is_institution_member(self, institution):
        """Check if user belongs to specific institution"""
        return self.institution == institution
    
    def can_access_department(self, department):
        """Check if user can access specific department"""
        if self.user_type == 'SYSTEM_ADMIN':
            return True
        
        if self.user_type == 'INSTITUTION_ADMIN':
            return department.institution == self.institution
        
        if self.user_type == 'SUPERVISOR':
            return hasattr(self, 'supervisor') and self.supervisor.department == department
        
        if self.user_type == 'STUDENT':
            return hasattr(self, 'student') and self.student.major and self.student.major.department == department
        
        return False
    
    def get_accessible_institutions(self):
        """Get institutions user can access"""
        if self.user_type == 'SYSTEM_ADMIN':
            return Institution.objects.all()
        
        if self.institution:
            return Institution.objects.filter(pk=self.institution.pk)
        
        return Institution.objects.none()

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone = models.CharField(max_length=20, blank=True)
```

## 2. Permission System

### Custom Permissions

```python
# permissions/models.py
class Permission(models.Model):
    PERMISSION_TYPES = [
        ('CREATE', 'Create'),
        ('READ', 'Read'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('APPROVE', 'Approve'),
        ('ASSIGN', 'Assign'),
    ]
    
    RESOURCE_TYPES = [
        ('DEPARTMENT', 'Department'),
        ('COURSE', 'Course'),
        ('STUDENT', 'Student'),
        ('SUPERVISOR', 'Supervisor'),
        ('APPLICATION', 'Application'),
        ('INTERNSHIP', 'Internship'),
        ('REPORT', 'Report'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    codename = models.CharField(max_length=50, unique=True)
    permission_type = models.CharField(max_length=10, choices=PERMISSION_TYPES)
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPES)
    description = models.TextField()
    
    class Meta:
        unique_together = ['permission_type', 'resource_type']
    
    def __str__(self):
        return f"{self.permission_type}_{self.resource_type}"

class RolePermission(models.Model):
    """Maps permissions to user roles"""
    user_type = models.CharField(max_length=20, choices=User.USER_TYPES)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    scope = models.CharField(max_length=20, choices=[
        ('GLOBAL', 'Global'),
        ('INSTITUTION', 'Institution'),
        ('DEPARTMENT', 'Department'),
        ('SELF', 'Self Only'),
    ])
    
    class Meta:
        unique_together = ['user_type', 'permission', 'scope']

# permissions/utils.py
class PermissionManager:
    
    @staticmethod
    def setup_default_permissions():
        """Create default permission structure"""
        permissions_config = {
            'STUDENT': {
                'READ': ['COURSE', 'INTERNSHIP', 'APPLICATION'],
                'create': ['APPLICATION'],
                'update': ['APPLICATION'],
                'delete': ['APPLICATION'],
            },
            'SUPERVISOR': {
                'read': ['STUDENT', 'APPLICATION', 'COURSE', 'INTERNSHIP'],
                'create': ['INTERNSHIP'],
                'update': ['STUDENT', 'APPLICATION', 'INTERNSHIP'],
                'approve': ['APPLICATION'],
                'assign': ['STUDENT'],
            },
            'INSTITUTION_ADMIN': {
                'read': ['DEPARTMENT', 'COURSE', 'STUDENT', 'SUPERVISOR', 'APPLICATION', 'INTERNSHIP'],
                'create': ['DEPARTMENT', 'COURSE', 'SUPERVISOR'],
                'update': ['DEPARTMENT', 'COURSE', 'STUDENT', 'SUPERVISOR'],
                'delete': ['DEPARTMENT', 'COURSE'],
                'assign': ['SUPERVISOR', 'STUDENT'],
            },
            'SYSTEM_ADMIN': {
                'read': ['*'],
                'create': ['*'],
                'update': ['*'],
                'delete': ['*'],
                'approve': ['*'],
                'assign': ['*'],
            }
        }
        
        for user_type, perms in permissions_config.items():
            for perm_type, resources in perms.items():
                for resource in resources:
                    if resource == '*':
                        # Grant all permissions for system admin
                        for res_type in Permission.RESOURCE_TYPES:
                            permission, created = Permission.objects.get_or_create(
                                permission_type=perm_type.upper(),
                                resource_type=res_type[0],
                                defaults={
                                    'name': f"{perm_type.title()} {res_type[1]}",
                                    'codename': f"{perm_type}_{res_type[0].lower()}",
                                    'description': f"Can {perm_type} {res_type[1].lower()}"
                                }
                            )
                            RolePermission.objects.get_or_create(
                                user_type=user_type,
                                permission=permission,
                                scope='GLOBAL'
                            )
                    else:
                        permission, created = Permission.objects.get_or_create(
                            permission_type=perm_type.upper(),
                            resource_type=resource,
                            defaults={
                                'name': f"{perm_type.title()} {resource.title()}",
                                'codename': f"{perm_type}_{resource.lower()}",
                                'description': f"Can {perm_type} {resource.lower()}"
                            }
                        )
                        
                        scope = 'INSTITUTION' if user_type in ['INSTITUTION_ADMIN', 'SUPERVISOR'] else 'SELF'
                        if user_type == 'SYSTEM_ADMIN':
                            scope = 'GLOBAL'
                        
                        RolePermission.objects.get_or_create(
                            user_type=user_type,
                            permission=permission,
                            scope=scope
                        )
    
    @staticmethod
    def user_has_permission(user, permission_type, resource_type, target_object=None):
        """Check if user has specific permission"""
        # System admin has all permissions
        if user.user_type == 'SYSTEM_ADMIN':
            return True
        
        # Get user's role permissions
        role_permissions = RolePermission.objects.filter(
            user_type=user.user_type,
            permission__permission_type=permission_type,
            permission__resource_type=resource_type
        )
        
        if not role_permissions.exists():
            return False
        
        # Check scope-based access
        for role_perm in role_permissions:
            if role_perm.scope == 'GLOBAL':
                return True
            
            if role_perm.scope == 'INSTITUTION' and target_object:
                if hasattr(target_object, 'institution'):
                    return target_object.institution == user.institution
                elif hasattr(target_object, 'department'):
                    return target_object.department.institution == user.institution
            
            if role_perm.scope == 'DEPARTMENT' and target_object:
                if hasattr(target_object, 'department'):
                    if user.user_type == 'SUPERVISOR':
                        return target_object.department == user.supervisor.department
            
            if role_perm.scope == 'SELF' and target_object:
                if hasattr(target_object, 'user'):
                    return target_object.user == user
                elif hasattr(target_object, 'student'):
                    return target_object.student.user == user
        
        return False
```

## 3. JWT Authentication System

### JWT Token Management

```python
# authentication/jwt_auth.py
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

class JWTAuthentication(BaseAuthentication):
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user = User.objects.get(id=payload['user_id'])
            
            # Check if account is locked
            if user.account_locked_until and user.account_locked_until > timezone.now():
                raise AuthenticationFailed('Account is temporarily locked')
            
            # Check if user is active
            if not user.is_active:
                raise AuthenticationFailed('User account is disabled')
            
            # Update last login IP
            user.last_login_ip = self.get_client_ip(request)
            user.save(update_fields=['last_login_ip'])
            
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found')
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class TokenManager:
    
    @staticmethod
    def generate_tokens(user):
        """Generate access and refresh tokens"""
        access_payload = {
            'user_id': user.id,
            'user_type': user.user_type,
            'institution_id': user.institution.id if user.institution else None,
            'exp': datetime.utcnow() + timedelta(hours=1),
            'iat': datetime.utcnow(),
            'type': 'access'
        }
        
        refresh_payload = {
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(days=7),
            'iat': datetime.utcnow(),
            'type': 'refresh'
        }
        
        access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm='HS256')
        refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm='HS256')
        
        # Store refresh token
        RefreshToken.objects.create(
            user=user,
            token=refresh_token,
            expires_at=refresh_payload['exp']
        )
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': 3600,
            'token_type': 'Bearer'
        }
    
    @staticmethod
    def refresh_access_token(refresh_token):
        """Generate new access token from refresh token"""
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=['HS256'])
            
            if payload['type'] != 'refresh':
                raise AuthenticationFailed('Invalid token type')
            
            # Check if refresh token exists and is valid
            token_obj = RefreshToken.objects.get(
                token=refresh_token,
                user_id=payload['user_id'],
                is_revoked=False
            )
            
            if token_obj.expires_at < timezone.now():
                token_obj.is_revoked = True
                token_obj.save()
                raise AuthenticationFailed('Refresh token has expired')
            
            user = User.objects.get(id=payload['user_id'])
            
            # Generate new access token
            access_payload = {
                'user_id': user.id,
                'user_type': user.user_type,
                'institution_id': user.institution.id if user.institution else None,
                'exp': datetime.utcnow() + timedelta(hours=1),
                'iat': datetime.utcnow(),
                'type': 'access'
            }
            
            access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm='HS256')
            
            return {
                'access_token': access_token,
                'expires_in': 3600,
                'token_type': 'Bearer'
            }
            
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, RefreshToken.DoesNotExist):
            raise AuthenticationFailed('Invalid refresh token')
    
    @staticmethod
    def revoke_token(refresh_token):
        """Revoke refresh token"""
        try:
            token_obj = RefreshToken.objects.get(token=refresh_token)
            token_obj.is_revoked = True
            token_obj.save()
            return True
        except RefreshToken.DoesNotExist:
            return False

class RefreshToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refresh_tokens')
    token = models.TextField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_revoked = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
```

## 4. Custom Permission Decorators

### API Permission Decorators

```python
# permissions/decorators.py
from functools import wraps
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import status
from .utils import PermissionManager

def require_permission(permission_type, resource_type, get_target_object=None):
    """Decorator to check permissions for API views"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            target_object = None
            if get_target_object:
                target_object = get_target_object(request, *args, **kwargs)
            
            has_permission = PermissionManager.user_has_permission(
                request.user, permission_type, resource_type, target_object
            )
            
            if not has_permission:
                return Response(
                    {'error': 'Insufficient permissions'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def require_role(*allowed_roles):
    """Decorator to check user roles"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            if request.user.user_type not in allowed_roles:
                return Response(
                    {'error': f'Access denied. Required roles: {", ".join(allowed_roles)}'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def require_institution_access(get_institution=None):
    """Decorator to check institution access"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            if request.user.user_type == 'SYSTEM_ADMIN':
                return view_func(request, *args, **kwargs)
            
            institution = None
            if get_institution:
                institution = get_institution(request, *args, **kwargs)
            
            if institution and not request.user.is_institution_member(institution):
                return Response(
                    {'error': 'Access denied to this institution'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
```

## 5. Authentication Views

### Login and Registration

```python
# authentication/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from .serializers import LoginSerializer, RegisterSerializer
from .jwt_auth import TokenManager
from .models import LoginAttempt

class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # Check for account lockout
        user = User.objects.filter(email=email).first()
        if user and user.account_locked_until and user.account_locked_until > timezone.now():
            return Response({
                'error': 'Account is temporarily locked due to multiple failed login attempts'
            }, status=status.HTTP_423_LOCKED)
        
        # Authenticate user
        user = authenticate(request, username=email, password=password)
        
        if user:
            if not user.is_verified:
                return Response({
                    'error': 'Please verify your email address before logging in'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Reset failed attempts
            user.failed_login_attempts = 0
            user.account_locked_until = None
            user.save()
            
            # Generate tokens
            tokens = TokenManager.generate_tokens(user)
            
            # Log successful login
            LoginAttempt.objects.create(
                user=user,
                ip_address=self.get_client_ip(request),
                success=True
            )
            
            return Response({
                'success': True,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'user_type': user.user_type,
                    'institution': user.institution.name if user.institution else None
                },
                'tokens': tokens
            })
        else:
            # Handle failed login
            if user:
                user.failed_login_attempts += 1
                
                # Lock account after 5 failed attempts
                if user.failed_login_attempts >= 5:
                    user.account_locked_until = timezone.now() + timedelta(minutes=30)
                
                user.save()
            
            # Log failed attempt
            LoginAttempt.objects.create(
                user=user,
                ip_address=self.get_client_ip(request),
                success=False
            )
            
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class RefreshTokenView(APIView):
    def post(self, request):
        refresh_token = request.data.get('refresh_token')
        
        if not refresh_token:
            return Response({
                'error': 'Refresh token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            tokens = TokenManager.refresh_access_token(refresh_token)
            return Response(tokens)
        except AuthenticationFailed as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.data.get('refresh_token')
        
        if refresh_token:
            TokenManager.revoke_token(refresh_token)
        
        return Response({
            'success': True,
            'message': 'Successfully logged out'
        })

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.save()
        
        # Send verification email
        EmailService.send_verification_email(user)
        
        return Response({
            'success': True,
            'message': 'Registration successful. Please check your email for verification.'
        }, status=status.HTTP_201_CREATED)
```

## 6. Frontend Authentication Integration

### Authentication Service

```javascript
// js/auth/auth-service.js
class AuthService {
  constructor() {
    this.baseURL = '/api/auth';
    this.tokenKey = 'edulink_access_token';
    this.refreshTokenKey = 'edulink_refresh_token';
    this.userKey = 'edulink_user';
  }
  
  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.tokens);
        this.setUser(data.user);
        this.setupTokenRefresh();
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }
  
  async logout() {
    const refreshToken = this.getRefreshToken();
    
    try {
      await fetch(`${this.baseURL}/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAccessToken()}`
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    this.clearTokens();
    this.clearUser();
    window.location.href = '/login.html';
  }
  
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      this.logout();
      return null;
    }
    
    try {
      const response = await fetch(`${this.baseURL}/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.setAccessToken(data.access_token);
        return data.access_token;
      } else {
        this.logout();
        return null;
      }
    } catch (error) {
      this.logout();
      return null;
    }
  }
  
  setupTokenRefresh() {
    // Refresh token 5 minutes before expiry
    const refreshInterval = 55 * 60 * 1000; // 55 minutes
    
    setInterval(async () => {
      if (this.isAuthenticated()) {
        await this.refreshToken();
      }
    }, refreshInterval);
  }
  
  isAuthenticated() {
    const token = this.getAccessToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch (error) {
      return false;
    }
  }
  
  hasRole(role) {
    const user = this.getCurrentUser();
    return user && user.user_type === role;
  }
  
  hasPermission(permission, resource) {
    // This would typically be validated on the backend
    // Frontend checks are for UX only
    const user = this.getCurrentUser();
    if (!user) return false;
    
    const rolePermissions = {
      'STUDENT': {
        'read': ['course', 'internship', 'application'],
        'create': ['application'],
        'update': ['application']
      },
      'SUPERVISOR': {
        'read': ['student', 'application', 'course', 'internship'],
        'create': ['internship'],
        'update': ['student', 'application', 'internship'],
        'approve': ['application']
      },
      'INSTITUTION_ADMIN': {
        'read': ['department', 'course', 'student', 'supervisor', 'application'],
        'create': ['department', 'course', 'supervisor'],
        'update': ['department', 'course', 'student', 'supervisor'],
        'delete': ['department', 'course']
      },
      'SYSTEM_ADMIN': {
        '*': ['*']
      }
    };
    
    const userPerms = rolePermissions[user.user_type] || {};
    
    if (userPerms['*'] && userPerms['*'].includes('*')) {
      return true; // System admin has all permissions
    }
    
    return userPerms[permission] && userPerms[permission].includes(resource);
  }
  
  // Token management methods
  setTokens(tokens) {
    localStorage.setItem(this.tokenKey, tokens.access_token);
    localStorage.setItem(this.refreshTokenKey, tokens.refresh_token);
  }
  
  setAccessToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }
  
  getAccessToken() {
    return localStorage.getItem(this.tokenKey);
  }
  
  getRefreshToken() {
    return localStorage.getItem(this.refreshTokenKey);
  }
  
  clearTokens() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }
  
  setUser(user) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }
  
  getCurrentUser() {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }
  
  clearUser() {
    localStorage.removeItem(this.userKey);
  }
}

// Global auth service instance
const authService = new AuthService();

// Auto-setup token refresh on page load
if (authService.isAuthenticated()) {
  authService.setupTokenRefresh();
}

// Export for use in other modules
window.AuthService = authService;
```

### Permission-Based UI Components

```javascript
// js/components/permission-wrapper.js
class PermissionWrapper {
  static hideElementsWithoutPermission() {
    const elements = document.querySelectorAll('[data-permission]');
    
    elements.forEach(element => {
      const permission = element.dataset.permission;
      const resource = element.dataset.resource;
      
      if (!authService.hasPermission(permission, resource)) {
        element.style.display = 'none';
      }
    });
  }
  
  static showElementsForRole(role) {
    const elements = document.querySelectorAll(`[data-role="${role}"]`);
    
    elements.forEach(element => {
      if (authService.hasRole(role)) {
        element.style.display = 'block';
      } else {
        element.style.display = 'none';
      }
    });
  }
  
  static initializePermissionBasedUI() {
    this.hideElementsWithoutPermission();
    
    const user = authService.getCurrentUser();
    if (user) {
      this.showElementsForRole(user.user_type);
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  PermissionWrapper.initializePermissionBasedUI();
});
```

### API Request Interceptor

```javascript
// js/api/api-interceptor.js
class APIInterceptor {
  static async makeAuthenticatedRequest(url, options = {}) {
    const token = authService.getAccessToken();
    
    if (!token) {
      authService.logout();
      return null;
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      if (response.status === 401) {
        // Try to refresh token
        const newToken = await authService.refreshToken();
        
        if (newToken) {
          // Retry request with new token
          headers['Authorization'] = `Bearer ${newToken}`;
          return await fetch(url, {
            ...options,
            headers
          });
        } else {
          authService.logout();
          return null;
        }
      }
      
      if (response.status === 403) {
        throw new Error('Insufficient permissions');
      }
      
      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

// Global API function
window.apiCall = APIInterceptor.makeAuthenticatedRequest;
```

This comprehensive authentication and authorization system provides secure, role-based access control with JWT token management, permission validation, and seamless frontend integration for the EduLink platform.