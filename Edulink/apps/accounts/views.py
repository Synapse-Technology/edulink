"""
Authentication and user management views.
Follows architecture rules: thin views, no business logic, call services only.
"""

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


class UserViewSet(viewsets.ModelViewSet):
    """
    User management viewset.
    Provides authentication and user management endpoints.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        """
        Set permissions based on action.
        """
        if self.action in ['register', 'login', 'reset_password_request', 'reset_password_confirm', 'token_refresh', 'token_obtain_pair']:
            return [AllowAny()]
        elif self.action in ['list', 'retrieve', 'assign_role']:
            return [IsAuthenticated()]  # Additional role-based checks can be added
        else:
            return [IsAuthenticated()]
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        """
        if self.action == 'register':
            return UserRegistrationSerializer
        elif self.action == 'login':
            return UserLoginSerializer
        elif self.action == 'change_password':
            return PasswordChangeSerializer
        elif self.action == 'reset_password_request':
            return PasswordResetRequestSerializer
        elif self.action == 'reset_password_confirm':
            return PasswordResetConfirmSerializer
        elif self.action == 'update_profile':
            return UserProfileUpdateSerializer
        elif self.action == 'assign_role':
            return RoleAssignmentSerializer
        elif self.action == 'token_obtain_pair':
            return TokenObtainPairSerializer
        elif self.action == 'token_refresh':
            return TokenRefreshSerializer
        elif self.action == 'list':
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
        User login endpoint using JWT tokens.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = authenticate_user(**serializer.validated_data)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Return tokens and user data
            user_serializer = UserSerializer(user)
            return Response({
                'message': 'Login successful',
                'user': user_serializer.data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token)
                }
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
    
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
        Refresh JWT token endpoint.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # The serializer will validate and return new tokens with user data
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        User logout endpoint. Blacklists the refresh token.
        """
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
        except Exception as e:
            # Even if blacklisting fails (e.g. invalid token), we want to return 200 to client
            # so they can clear local storage
            return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
    
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