# IMPLEMENTATION GUIDE: Frontend & Backend Security & Reliability Fixes

**Status:** In Progress  
**Phase 1 Focus:** Critical Security Fixes  
**Timeline:** 2 weeks  
**Alignment:** Full backend-frontend coordination

---

## CRITICAL ISSUE 1: Token Storage Migration (HttpOnly Cookies)

### Current State
- **Backend:** Returns tokens in JSON response body
- **Frontend:** Stores tokens in plain localStorage (XSS vulnerability)
- **Risk:** Tokens can be stolen by any JavaScript running on the page

### Target State
- **Backend:** Returns tokens via Set-Cookie headers (HttpOnly, Secure, SameSite)
- **Frontend:** Reads tokens from cookies (browser manages automatically)
- **Security:** JavaScript cannot access tokens (protected from XSS)

### BACKEND CHANGES

#### Step 1: Update Django Settings (settings/base.py)

Add cookie security configuration:

```python
# CSRF & Session cookies
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = True  # HTTPS only
CSRF_COOKIE_SAMESITE = 'Lax'

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = 'Lax'

# JWT Token Cookies
JWT_COOKIE_SECURE = True           # HTTPS only  
JWT_COOKIE_HTTP_ONLY = True        # No JS access
JWT_COOKIE_SAMESITE = 'Lax'        # CSRF protection
JWT_COOKIE_DOMAIN = os.getenv('JWT_COOKIE_DOMAIN', None)  # e.g., '.edulink.com'
JWT_COOKIE_PATH = '/'
JWT_ALGORITHM = 'HS256'
```

#### Step 2: Create Custom Token Serializer (apps/accounts/serializers.py)

Add a new serializer that includes response.set_cookie logic:

```python
class TokenObtainPairWithCookiesSerializer(BaseTokenObtainPairSerializer):
    """
    Custom token serializer that returns tokens via Set-Cookie headers
    and includes user data in response body.
    """
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims (if needed)
        token['email'] = user.email
        token['role'] = user.role
        
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Extract tokens for cookie setting
        refresh = data.get('refresh')
        access = data.get('access')
        
        # Store in request context for view layer
        self.context['tokens'] = {
            'refresh': refresh,
            'access': access
        }
        
        return data
```

#### Step 3: Update Login View (apps/accounts/views.py)

Modify login endpoint to set cookies:

```python
@action(detail=False, methods=['post'])
def login(self, request):
    """
    User login endpoint with HttpOnly cookies.
    """
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    try:
        user = authenticate_user(**serializer.validated_data)
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Prepare response
        user_serializer = UserSerializer(user)
        response = Response({
            'message': 'Login successful',
            'user': user_serializer.data
            # ✅ NO tokens in body - they're in cookies
        }, status=status.HTTP_200_OK)
        
        # ✅ Set tokens as HttpOnly cookies
        response.set_cookie(
            key='access_token',
            value=str(refresh.access_token),
            max_age=7200,  # 2 hours (match JWT_ACCESS_TOKEN_LIFETIME)
            secure=not DEBUG,  # HTTPS only in production
            httponly=True,
            samesite='Lax',
            path='/',
        )
        
        response.set_cookie(
            key='refresh_token',
            value=str(refresh),
            max_age=1209600,  # 14 days (match JWT_REFRESH_TOKEN_LIFETIME)
            secure=not DEBUG,
            httponly=True,
            samesite='Lax',
            path='/',
        )
        
        # ✅ Set CSRF token in cookie for state-changing requests
        from django.middleware.csrf import get_token
        csrf_token = get_token(request)
        response['X-CSRFToken'] = csrf_token  # Also include in header for clarity
        
        return response
        
    except ValueError as e:
        return Response(
            {'error_code': 'INVALID_CREDENTIALS', 'message': 'Invalid email or password'},
            status=status.HTTP_401_UNAUTHORIZED
        )
```

#### Step 4: Update Token Refresh View (apps/accounts/views.py)

```python
@action(detail=False, methods=['post'])
def token_refresh(self, request):
    """
    Refresh JWT token endpoint - update cookies.
    """
    try:
        # Get refresh token from cookie
        refresh_token = request.COOKIES.get('refresh_token')
        
        if not refresh_token:
            return Response(
                {'error_code': 'NO_REFRESH_TOKEN', 'message': 'Refresh token not found'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Create new token pair
        token = RefreshToken(refresh_token)
        new_access = str(token.access_token)
        new_refresh = str(token)
        
        # Prepare response
        response = Response({
            'message': 'Token refreshed successfully'
        }, status=status.HTTP_200_OK)
        
        # ✅ Update cookies with new tokens
        response.set_cookie(
            key='access_token',
            value=new_access,
            max_age=7200,
            secure=not DEBUG,
            httponly=True,
            samesite='Lax',
            path='/',
        )
        
        # ✅ Update refresh token (if rotating)
        response.set_cookie(
            key='refresh_token',
            value=new_refresh,
            max_age=1209600,
            secure=not DEBUG,
            httponly=True,
            samesite='Lax',
            path='/',
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return Response(
            {'error_code': 'INVALID_TOKEN', 'message': 'Invalid or expired token'},
            status=status.HTTP_401_UNAUTHORIZED
        )
```

#### Step 5: Update Logout View (apps/accounts/views.py)

```python
@action(detail=False, methods=['post'])
def logout(self, request):
    """
    User logout endpoint - clear cookies.
    """
    try:
        # Optionally blacklist the refresh token
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except:
                pass  # Token already invalid
        
        # Prepare response
        response = Response(
            {'message': 'Logout successful'},
            status=status.HTTP_200_OK
        )
        
        # ✅ Clear cookies by setting max_age=0
        response.delete_cookie(
            key='access_token',
            path='/',
            samesite='Lax',
        )
        
        response.delete_cookie(
            key='refresh_token',
            path='/',
            samesite='Lax',
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        # Still clear cookies even if blacklist fails
        response = Response(
            {'message': 'Logout successful'},
            status=status.HTTP_200_OK
        )
        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/')
        return response
```

#### Step 6: Update JWT Authentication (in config/settings/base.py)

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUDIENCE": None,
    "ISSUER": None,
    "AUTH_HEADER_TYPES": ("Bearer",),  # Keep for API clients (curl, postman, etc)
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
}
```

#### Step 7: Update CORS Settings (config/settings/base.py)

```python
CORS_ALLOWED_ORIGINS = [
    "https://edulink-frontend.com",
    "https://edulink-frontend-mb63.onrender.com",
    "http://localhost:3000",  # Developer
]

# Allow credentials (cookies) in CORS requests
CORS_ALLOW_CREDENTIALS = True

# Headers to expose to frontend
CORS_EXPOSE_HEADERS = [
    'X-CSRFToken',
    'Content-Length',
    'X-Request-ID',  # For error tracking
]
```

---

### FRONTEND CHANGES

#### Step 1: Update API Client Configuration (services/api/client.ts)

```typescript
// services/api/client.ts
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor(clientConfig: ApiClientConfig) {
    this.config = clientConfig;
    this.client = this.createClient();
    this.setupInterceptors();
  }

  private createClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      withCredentials: true,  // ✅ CRITICAL: Include cookies in requests
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use((config) => {
      // Handle FormData
      if (config.data instanceof FormData) {
        if (config.headers) {
          delete config.headers['Content-Type'];
        }
      }

      // ✅ NO LONGER ADD Authorization header
      // Tokens are in cookies, sent automatically by browser
      
      // ✅ Add CSRF token for state-changing requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
        const csrfToken = this.getCsrfToken();
        if (csrfToken) {
          config.headers['X-CSRFToken'] = csrfToken;
        }
      }

      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // ✅ Automatic cookie refresh handled by browser
          // Server updates refresh_token cookie on token_refresh endpoint
          // Just redirect to login
          window.location.href = '/login';
        }
        throw this.parseError(error);
      }
    );
  }

  private getCsrfToken(): string | null {
    // CSRF token in cookie (Django sets it)
    const name = 'csrftoken=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    for (let cookie of cookieArray) {
      cookie = cookie.trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length);
      }
    }
    return null;
  }
}
```

#### Step 2: Simplify Auth Store (stores/authStore.ts)

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '../services/auth/authService';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'employer' | 'institution' | 'institution_admin' | 'employer_admin' | 'supervisor';
  // ... other fields
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  refreshSession: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await authService.login(credentials);
          
          const mappedUser: User = {
            id: response.user.id,
            email: response.user.email,
            firstName: response.user.first_name,
            lastName: response.user.last_name,
            role: response.user.role,
            // ... other fields
          };

          set({
            user: mappedUser,
            isAuthenticated: true,
            isLoading: false,
            // ✅ NO accessToken or refreshToken stored!
            // They're in HttpOnly cookies now
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          // ✅ Cookies are cleared by backend response
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
        
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      updateUser: (data) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...data } });
        }
      },

      refreshSession: async () => {
        // ✅ Called when token near expiry
        try {
          await authService.refreshToken();
          // Backend updates cookies automatically
        } catch (error) {
          // Token refresh failed, redirect to login
          set({ user: null, isAuthenticated: false });
          window.location.href = '/login';
        }
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // ✅ ONLY store user data, NOT tokens
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

#### Step 3: Remove Token Sync (No Longer Needed)

Delete or deprecate `services/tokenSync.ts` since tokens are in cookies now.

```typescript
// services/tokenSync.ts - DELETE THIS FILE
// Tokens are automatically sent by browser in cookies
// No cross-tab sync needed anymore
```

#### Step 4: Update Auth Service (services/auth/authService.ts)

```typescript
// services/auth/authService.ts
import { apiClient } from '../api/client';

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>(
        '/api/users/login/',
        credentials
      );
      // ✅ Tokens now in cookies (backend sets them)
      return response;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/users/logout/');
      // ✅ Backend clears cookies
    } catch (error) {
      // Still logout locally even if backend fails
      throw error;
    }
  }

  async refreshToken(): Promise<void> {
    try {
      // ✅ Send empty POST to refresh endpoint
      // Backend reads refresh_token from cookie and sends new access_token in cookie
      await apiClient.post('/api/users/token/refresh/');
    } catch (error) {
      throw error;
    }
  }

  async register(data: RegisterData): Promise<void> {
    try {
      await apiClient.post('/api/users/register/', data);
    } catch (error) {
      throw error;
    }
  }
}

export const authService = new AuthService();
```

#### Step 5: Add Session Timeout Hook (hooks/useSessionTimeout.ts)

(This implementation already provided in the analysis - insert as shown before)

---

## CRITICAL ISSUE 2: Admin Role Normalization

### Backend Change (apps/platform_admin/admin_roles.py)

Create a helper function to ensure consistency:

```python
from edulink.apps.platform_admin.models import PlatformStaffProfile

def get_platform_admin_role(user: User) -> Optional[str]:
    """
    Get admin role for platform staff users.
    Returns None if not a platform admin.
    """
    if user.role == User.ROLE_SYSTEM_ADMIN:
        try:
            profile = PlatformStaffProfile.objects.get(user=user)
            if profile.is_active:
                return profile.role
        except PlatformStaffProfile.DoesNotExist:
            return None
    return None
```

### Backend Change (apps/accounts/serializers.py)

Update the admin login response:

```python
class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        # Authentication logic
        user = authenticate(email=attrs['email'], password=attrs['password'])
        if not user:
            raise ValidationError("Invalid credentials")
        
        # ✅ Strict role check
        if user.role != User.ROLE_SYSTEM_ADMIN:
            raise ValidationError("Not an admin user")
        
        attrs['user'] = user
        return attrs

class AdminTokenSerializer(serializers.Serializer):
    """Admin login response - normalized role field."""
    user = serializers.SerializerMethodField()
    tokens = serializers.SerializerMethodField()
    
    def get_user(self, obj):
        user = obj['user']
        admin_role = get_platform_admin_role(user)
        
        return {
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': admin_role,  # ✅ SINGLE, NORMALIZED role field
            'permissions': ['admin:read', 'admin:write'],  # Optional
            'created_at': user.date_joined.isoformat(),
        }
    
    def get_tokens(self, obj):
        user = obj['user']
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
```

### Frontend Change (Remove Admin Role Inconsistency)

```typescript
// utils/permissions.ts - Simplified
export const getAdminRole = (): string | null => {
  try {
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    // ✅ Single source of truth
    return adminUser.role || null;
  } catch {
    return null;
  }
};

export const isValidAdmin = (): boolean => {
  const role = getAdminRole();
  const validRoles = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'MODERATOR', 'AUDITOR'];
  return role !== null && validRoles.includes(role);
};
```

---

## CRITICAL ISSUE 3: CSRF Token Handling

### (Already covered in Step 5 & 6 above - Add to Base Settings)

---

## HIGH-PRIORITY ISSUE 4: Input Sanitization

### Frontend Change (utils/sanitization.ts)

```typescript
// Create NEW file: src/utils/sanitization.ts
import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirty: string, allowed: string[] = ['b', 'i', 'em', 'strong', 'a', 'br']): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: allowed,
    ALLOWED_ATTR: ['href', 'target', 'title'],
  });
};

export const sanitizeText = (text: string): string => {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
};

export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  if (url.trim().startsWith('javascript:') || url.trim().startsWith('data:')) {
    return '';
  }
  try {
    new URL(url);
    return url;
  } catch {
    return '';
  }
};
```

Install dependency:
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

### Usage Examples (components)

```typescript
// components/ProfileCard.tsx
import { sanitizeText, sanitizeUrl, sanitizeHtml } from '../utils/sanitization';

export const ProfileCard = ({ user }) => (
  <div>
    <p>{sanitizeText(user.firstName)}</p>
    <img src={sanitizeUrl(user.avatar)} alt="Avatar" />
    <div>{sanitizeHtml(user.bio)}</div>
  </div>
);
```

---

## HIGH-PRIORITY ISSUE 5: Session Timeout

### Frontend Change (hooks/useSessionTimeout.ts)

(Detailed implementation provided in analysis document - already created)

---

## MEDIUM-PRIORITY ISSUE 6: FormData Serialization

### Frontend Change (services/student/studentService.ts)

```typescript
// services/student/studentService.ts - FIX: Don't stringify arrays in FormData

// BEFORE (BROKEN):
async updateProfile(id: string, data: any, file?: File) {
  const formData = new FormData();
  formData.append('first_name', data.firstName);
  formData.append('skills', JSON.stringify(data.skills));  // ❌ WRONG
}

// AFTER (FIXED):
async updateProfile(id: string, data: any, file?: File) {
  // ✅ OPTION 1: Separate calls
  const basicData = {
    first_name: data.firstName,
    last_name: data.lastName,
  };
  
  // Update profile (JSON)
  await this.client.patch(`/api/students/${id}/profile/`, basicData);
  
  // Update skills (JSON array)
  if (data.skills) {
    await this.client.patch(`/api/students/${id}/skills/`, {
      skills: data.skills
    });
  }
  
  // Upload avatar (FormData)
  if (file) {
    const formData = new FormData();
    formData.append('avatar', file);
    await this.client.post(`/api/students/${id}/upload-avatar/`, formData);
  }
}
```

---

## MEDIUM-PRIORITY ISSUE 7: Error Message Sanitization

### Backend Change (apps/shared/exceptions.py)

```python
def _format_domain_error(exc: EduLinkError) -> Response:
    """Format EduLinkError as JSON response with proper status code."""
    
    # ✅ Never expose system internals
    data = {
        "error_code": exc.error_code,
        "message": exc.user_message,  # Already sanitized in error definition
        "status_code": exc.http_status,
        "timestamp": exc.timestamp.isoformat(),
    }
    
    # ❌ DO NOT include context in production
    # if exc.context:
    #     data["context"] = exc.context
    
    return Response(data, status=exc.http_status)
```

---

## TESTING CHECKLIST

### Backend Tests

```bash
# Run Django tests
python manage.py test apps.accounts.tests

# Test CSRF protection
curl -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass"}'

# Check Set-Cookie headers in response
curl -i -X POST http://localhost:8000/api/users/login/
```

### Frontend Tests

```bash
# Test localStorage is cleared of tokens
localStorage.getItem('auth-storage') // Should only have user, not tokens

# Test cookies are sent
document.cookie // Should show access_token and refresh_token

# Test XSS sanitization
import { sanitizeHtml } from './utils/sanitization';
sanitizeHtml('<script>alert("xss")</script>'); // Should return empty
```

---

## MIGRATION STRATEGY

### Phase 1 (Week 1):
- [ ] Backend: Update settings, add Set-Cookie in login
- [ ] Backend: Normalize admin roles
- [ ] Frontend: Add `withCredentials: true` to API client
- [ ] Frontend: Update login to not expect tokens in response

### Phase 2 (Week 2):
- [ ] Frontend: Remove localStorage token storage
- [ ] Frontend: Add CSRF token handling
- [ ] Frontend: Add input sanitization
- [ ] Backend: Sanitize error messages

### Rollback Plan:
If issues arise, both frontend and backend can coexist temporarily:
- Backend returns tokens in BOTH cookies AND body (for old clients)
- Frontend can read from either source with fallback logic

---

## SECURITY VERIFICATION

After implementation, verify:

✅ localStorage doesn't contain tokens
✅ No Authorization header in XHR requests (browser sends cookies automatically)
✅ Tokens are HttpOnly (browser can't read them)
✅ CSRF tokens are sent with state-changing requests
✅ Error messages don't leak system details
✅ Input is sanitized before rendering

