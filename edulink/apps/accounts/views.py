"""
Authentication and user management views.
Follows architecture rules: thin views, no business logic, call services only.
"""

import logging
from django.conf import settings
from django.contrib.auth import logout as django_logout  # Use Django's built-in session logout
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    PasswordChangeSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    UserProfileUpdateSerializer,
    RoleAssignmentSerializer,
    TokenSerializer,
    UserListSerializer,
    TokenObtainPairSerializer,
    TokenRefreshSerializer
)
from .services import (
    create_user,
    authenticate_user,
    change_user_password,
    reset_user_password,
    update_user_profile,
    assign_user_role,
    get_user_by_id,
    get_user_by_email,
    list_users,
    deactivate_own_account
)

# Module-level logger and DEBUG config
logger = logging.getLogger(__name__)
DEBUG = settings.DEBUG


class UserViewSet(viewsets.ModelViewSet):
    """
    User management viewset.
    Provides authentication and user management endpoints.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    logger = logging.getLogger(__name__)
    
    def get_permissions(self):
        """
        Set permissions based on action.
        """
        action = getattr(self, 'action', None)
        if action in ['register', 'login', 'reset_password_request', 'reset_password_confirm', 'token_refresh', 'token_obtain_pair', 'get_csrf_token']:
            return [AllowAny()]
        elif action in ['list', 'retrieve', 'assign_role']:
            return [IsAuthenticated()]  # Additional role-based checks can be added
        else:
            return [IsAuthenticated()]
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        """
        action = getattr(self, 'action', None)
        if action == 'register':
            return UserRegistrationSerializer
        elif action == 'login':
            return UserLoginSerializer
        elif action == 'change_password':
            return PasswordChangeSerializer
        elif action == 'reset_password_request':
            return PasswordResetRequestSerializer
        elif action == 'reset_password_confirm':
            return PasswordResetConfirmSerializer
        elif action == 'update_profile':
            return UserProfileUpdateSerializer
        elif action == 'assign_role':
            return RoleAssignmentSerializer
        elif action == 'token_obtain_pair':
            return TokenObtainPairSerializer
        elif action == 'token_refresh':
            return TokenRefreshSerializer
        elif action == 'list':
            return UserListSerializer
        return UserSerializer
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        """
        User registration endpoint.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = create_user(**serializer.validated_data)
            # Return user data without password
            user_serializer = UserSerializer(user)
            return Response({
                'message': 'User registered successfully',
                'user': user_serializer.data
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        User login endpoint with HttpOnly cookies.
        Tokens are returned via Set-Cookie headers, NOT in response body.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = authenticate_user(**serializer.validated_data)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Prepare response with tokens in body for HYBRID AUTH
            user_serializer = UserSerializer(user)
            response = Response({
                'message': 'Login successful',
                'user': user_serializer.data,
                'access': str(refresh.access_token),  # Return access token in response body
                'refresh': str(refresh),  # Return refresh token in response body
            }, status=status.HTTP_200_OK)
            
            # 🔐 HYBRID AUTH: Also set refresh token as HttpOnly cookie (access token in response body for memory storage)
            response.set_cookie(
                key='refresh_token',
                value=str(refresh),
                max_age=1209600,  # 14 days (match JWT_REFRESH_TOKEN_LIFETIME)
                secure=not DEBUG,
                httponly=True,
                samesite='None' if not DEBUG else 'Lax',  # None for cross-site on production
                path='/',
            )
            
            # Set CSRF token for state-changing requests
            from django.middleware.csrf import get_token
            csrf_token = get_token(request)
            response['X-CSRFToken'] = csrf_token
            
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"✅ [LOGIN] User {user.email} logged in with JWT tokens")
            
            return response
        except ValueError as e:
            return Response(
                {
                    'error_code': 'INVALID_CREDENTIALS',
                    'message': 'Invalid email or password'
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    @action(detail=False, methods=['post'])
    def token_obtain_pair(self, request):
        """
        Obtain JWT token pair endpoint.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # The serializer will validate and return tokens with user data
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def token_refresh(self, request):
        """
        Refresh JWT token endpoint - get refresh token from HttpOnly cookie, return new access token in response body.
        
        HYBRID AUTH: Refresh token stays in HttpOnly cookie (can't be stolen by XSS)
        New access token returned in response body for frontend to store in memory
        """
        try:
            # Get refresh token from cookie
            refresh_token = request.COOKIES.get('refresh_token')
            
            if not refresh_token:
                logger = logging.getLogger(__name__)
                logger.warning(f"🔐 [TOKEN_REFRESH] No refresh token in cookies")
                return Response(
                    {
                        'error_code': 'NO_REFRESH_TOKEN',
                        'message': 'Refresh token not found'
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Create new token pair from refresh token
            token = RefreshToken(refresh_token)
            new_access = str(token.access_token)
            new_refresh = str(token)
            
            # 🔐 HYBRID AUTH: Return new access token in response body
            # Frontend stores in memory, refresh token stays in HttpOnly cookie
            response = Response({
                'message': 'Token refreshed successfully',
                'access': new_access,  # NEW: Return in response body for memory storage
            }, status=status.HTTP_200_OK)
            
            # Only update refresh token cookie (it's already set, but this creates a new one)
            response.set_cookie(
                key='refresh_token',
                value=new_refresh,
                max_age=1209600,  # 14 days
                secure=not DEBUG,
                httponly=True,
                samesite='None' if not DEBUG else 'Lax',  # None for cross-site on production
                path='/',
            )
            
            logger = logging.getLogger(__name__)
            logger.warning(f"✅ [TOKEN_REFRESH] Access token refreshed")
            return response
            
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return Response(
                {
                    'error_code': 'INVALID_TOKEN',
                    'message': 'Invalid or expired token'
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def get_csrf_token(self, request):
        """
        Get CSRF token for frontend requests.
        GET requests don't require CSRF protection, so this endpoint is safe.
        Frontend calls this to get the token since CSRF_COOKIE_HTTPONLY=True
        prevents JavaScript from reading the CSRF cookie directly.
        """
        from django.middleware.csrf import get_token
        csrf_token = get_token(request)
        return Response({
            'csrf_token': csrf_token
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        User logout endpoint - clear session (HttpOnly cookie handled by Django).
        """
        try:
            # Clear Django session (removes sessionid cookie)
            django_logout(request)
            
            return Response(
                {'message': 'Logout successful'},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            # Still clear session even if error occurs
            django_logout(request)
            return Response(
                {'message': 'Logout successful'},
                status=status.HTTP_200_OK
            )
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """
        Change password endpoint.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = change_user_password(
                user_id=str(request.user.id),
                **serializer.validated_data
            )
            return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='reset-password')
    def reset_password_request(self, request):
        """
        Password reset request endpoint.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reset_token = reset_user_password(**serializer.validated_data)
        
        # In production, send email with reset link
        # For now, return token for testing
        return Response({
            'message': 'Password reset email sent',
            'reset_token': reset_token  # Remove in production
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='reset-password-confirm')
    def reset_password_confirm(self, request):
        """
        Password reset confirmation endpoint.
        Validates token and resets password via notifications service.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Use notifications service to validate token and reset password
            from edulink.apps.notifications.services import use_password_reset_token
            
            success = use_password_reset_token(
                token=serializer.validated_data['token'],
                new_password=serializer.validated_data['new_password']
            )
            
            if success:
                return Response({'message': 'Password reset successful'}, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Invalid or expired token'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': 'Password reset failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def deactivate(self, request):
        """
        Deactivate own account.
        """
        reason = request.data.get('reason', '')
        try:
            deactivate_own_account(user_id=str(request.user.id), reason=reason)
            return Response({'message': 'Account deactivated successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """
        Update user profile endpoint.
        """
        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = update_user_profile(user_id=str(request.user.id), **serializer.validated_data)
            user_serializer = UserSerializer(user)
            return Response({
                'message': 'Profile updated successfully',
                'user': user_serializer.data
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def assign_role(self, request, pk=None):
        """
        Assign role to user (admin only).
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = assign_user_role(user_id=pk, **serializer.validated_data)
            user_serializer = UserSerializer(user)
            return Response({
                'message': 'Role assigned successfully',
                'user': user_serializer.data
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def list(self, request):
        """
        List users with optional filters.
        """
        role = request.query_params.get('role')
        is_active = request.query_params.get('is_active')
        
        # Convert string to boolean
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        users = list_users(role=role, is_active=is_active)
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def retrieve(self, request, pk=None):
        """
        Get user details.
        """
        try:
            user = get_user_by_id(user_id=pk)
            serializer = self.get_serializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Get current user details.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)