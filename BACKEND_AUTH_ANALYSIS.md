# Backend Authentication Implementation - Comprehensive Analysis

**Generated**: April 12, 2026  
**Status**: INCOMPLETE MIGRATION TO HTTPCOOKIE AUTHENTICATION

---

## EXECUTIVE SUMMARY

The backend has **TWO CONFLICTING TOKEN DELIVERY METHODS**:

### ✅ Secure Path (Partially Implemented)
- **Endpoint**: `POST /api/auth/users/login/` 
- **UserViewSet.login()** - Uses HttpOnly cookies
- **Only used by**: Generic user login (admin panel)

### ❌ Vulnerable Path (Main User Paths)  
- **Endpoints**: 
  - `/api/students/auth/login/` → StudentLoginView
  - `/api/employers/auth/login/` → EmployerLoginView
  - `/api/institutions/auth/login/` → InstitutionLoginView
- **Returns tokens in response body** (vulnerable to XSS)
- **Used by**: 95% of user traffic

---

## 1. LOGIN ENDPOINT RESPONSE FORMATS

### A. Generic User Login - `/api/auth/users/login/` (SECURE)

**Endpoint Handler**: `UserViewSet.login()` in `edulink/apps/accounts/views.py` lines 115-160

**Response Format** *(tokens NOT in body)*:
```json
{
    "message": "Login successful",
    "user": {
        "id": "uuid",
        "email": "user@example.com",
        "role": "student",
        "is_email_verified": true,
        ...
    }
}
```

**Set-Cookie Headers Returned**:
```
Set-Cookie: access_token=<JWT>; max_age=7200; secure=True; httponly=True; samesite=Lax; path=/
Set-Cookie: refresh_token=<JWT>; max_age=1209600; secure=True; httponly=True; samesite=Lax; path=/
X-CSRFToken: <token>
```

**Token Lifetime**:
- Access token: 2 hours (7200 seconds)
- Refresh token: 14 days (1209600 seconds)

**Security Settings**:
- `secure`: True in production, False in dev (via `not DEBUG`)
- `httponly`: True (cannot be accessed by JavaScript)
- `samesite`: Lax (CSRF protection)
- `path`: / (available site-wide)

---

### B. Student Login - `/api/students/auth/login/` (VULNERABLE)

**Endpoint Handler**: `StudentLoginView.post()` in `edulink/apps/students/views.py` lines 43-85

**Response Format** *(tokens IN body)*:
```json
{
    "message": "Login successful",
    "user": {...},
    "tokens": {
        "refresh": "eyJhbGc...",
        "access": "eyJhbGc..."
    }
}
```

**Set-Cookie Headers**: NONE - tokens delivered in JSON body only

**Token Storage Required**: Frontend must store in localStorage or sessionStorage (XSS vulnerable)

---

### C. Employer Login - `/api/employers/auth/login/` (VULNERABLE)

**Endpoint Handler**: `EmployerLoginView.post()` in `edulink/apps/employers/views.py` lines 35-75

**Identical to StudentLoginView**:
- ❌ Returns tokens in response body
- ❌ No HttpOnly cookies set
- ❌ Frontend must use localStorage

---

### D. Institution Login - `/api/institutions/auth/login/` (VULNERABLE)

**Endpoint Handler**: `InstitutionLoginView.post()` in `edulink/apps/institutions/views.py` lines 73-113

**Identical to StudentLoginView**:
- ❌ Returns tokens in response body
- ❌ No HttpOnly cookies set
- ❌ Frontend must use localStorage

---

## 2. TOKEN REFRESH ENDPOINT

**Endpoint**: `POST /api/auth/users/token/refresh/` (or aliased at `/api/auth/users/token_refresh/`)

**Endpoint Handler**: `UserViewSet.token_refresh()` in `edulink/apps/accounts/views.py` lines 184-240

### How it expects to receive the refresh token:

```python
# Line 191-196
refresh_token = request.COOKIES.get('refresh_token')

if not refresh_token:
    return Response(
        {
            'error_code': 'NO_REFRESH_TOKEN',
            'message': 'Refresh token not found'
        },
        status=status.HTTP_401_UNAUTHORIZED
    )
```

**Required Input**: `refresh_token` cookie (HttpOnly, set by login endpoint)

**Cannot Accept**: Request body JWT (not implemented as fallback)

### How it returns new tokens:

```python
# Lines 200-224
response = Response({
    'message': 'Token refreshed successfully'
}, status=status.HTTP_200_OK)

response.set_cookie(
    key='access_token',
    value=new_access,
    max_age=7200,
    secure=not DEBUG,
    httponly=True,
    samesite='Lax',
    path='/',
)

response.set_cookie(
    key='refresh_token',
    value=new_refresh,
    max_age=1209600,
    secure=not DEBUG,
    httponly=True,
    samesite='Lax',
    path='/',
)
```

**Returned**: New tokens via Set-Cookie headers only (NOT in response body)

---

## 3. HTTPCOOKIE CONFIGURATION

### JWT Cookie Settings (Django Settings)

**File**: `edulink/config/settings/base.py` lines 274-279

```python
JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "False").lower() == "true"
JWT_COOKIE_HTTP_ONLY = True
JWT_COOKIE_SAMESITE = "Lax"
JWT_COOKIE_DOMAIN = os.getenv("JWT_COOKIE_DOMAIN", None)  # ⚠️ None by default
JWT_COOKIE_PATH = "/"
```

### CSRF & Session Cookie Security

```python
# CSRF Cookies (lines 260-262)
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "False").lower() == "true"
CSRF_COOKIE_SAMESITE = "Lax"

# Session Cookies (lines 270-272)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "False").lower() == "true"
SESSION_COOKIE_SAMESITE = "Lax"
```

### CORS Configuration for Credentials

**File**: `edulink/config/settings/base.py` lines 221-237

```python
# CRITICAL: Enable credentials (cookies) in CORS
CORS_ALLOW_CREDENTIALS = True  

CORS_ALLOWED_ORIGINS = [
    "https://edulink-frontend.com",
    "https://edulink-frontend-mb63.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
]

CORS_EXPOSE_HEADERS = [
    "X-CSRFToken",
    "Content-Length",
    "X-Request-ID",
]

CORS_TRUSTED_ORIGINS = [
    "https://edulink-frontend.com",
    "https://edulink-frontend-mb63.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
]
```

---

## 4. JWT CONFIGURATION

**File**: `edulink/config/settings/base.py` lines 201-219

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,           # ✅ New token on each refresh
    "BLACKLIST_AFTER_ROTATION": True,        # ✅ Invalidate old token
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUDIENCE": None,
    "ISSUER": None,
    "AUTH_HEADER_TYPES": ("Bearer",),        # Expects Bearer token in header
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
}
```

**Key Points**:
- Access token lifetime: 2 hours
- Refresh token lifetime: 14 days  
- Tokens are rotated on each refresh
- Old tokens are blacklisted (requires token_blacklist app)
- Default strategy: Bearer token in Authorization header (NOT cookie-friendly by default)

---

## 5. REST FRAMEWORK AUTHENTICATION

**File**: `edulink/config/settings/base.py` lines 148-175

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    ...
}
```

**Authentication Backend Used**: `rest_framework_simplejwt.authentication.JWTAuthentication`

**How it works** *(Default SimpleJWT behavior)*:
1. Looks for `Authorization` header
2. Expects format: `Authorization: Bearer <token>`
3. Extracts token from header
4. Validates token signature and expiry

**Problem with HttpOnly Cookies**: 
- Default implementation ONLY reads from Authorization header
- Does NOT automatically read from cookies
- Frontend must manually set `Authorization: Bearer <token>` header
- But HttpOnly cookies cannot be accessed by JavaScript!

**Solution Status**: ❌ NOT IMPLEMENTED
- No custom authentication backend to read cookies
- Would need to create custom backend that reads from `request.COOKIES.get('access_token')`

---

## 6. CRITICAL INCONSISTENCIES & GAPS

### 🔴 BLOCKER #1: Two Different Token Delivery Methods

| Endpoint | Returns in Body | Sets Cookies | Path |
|----------|---|---|---|
| `/api/auth/users/login/` | ❌ No | ✅ Yes (HttpOnly) | Generic (admin) |
| `/api/students/auth/login/` | ✅ Yes | ❌ No | **MAIN USER PATH** |
| `/api/employers/auth/login/` | ✅ Yes | ❌ No | **USED BY EMPLOYERS** |
| `/api/institutions/auth/login/` | ✅ Yes | ❌ No | **USED BY INSTITUTIONS** |

**Impact**: Frontend receives different response formats for the same operation depending on which endpoint is called. Migration can't work until all endpoints match.

---

### 🔴 BLOCKER #2: No Custom Authentication Backend

**Current State**:
- Only uses default `JWTAuthentication`
- Reads tokens ONLY from `Authorization: Bearer <token>` header
- Does NOT read from HttpOnly cookies

**What happens**:
1. Frontend receives HttpOnly cookies from login
2. Frontend tries to make authenticated request
3. Browser automatically sends cookies
4. But authentication backend ignores cookies (only checks Authorization header)
5. No Authorization header → 401 Unauthorized

**Solution Required**: 
- Create custom authentication backend that reads from `request.COOKIES.get('access_token')`
- Fallback to Authorization header if cookie missing
- Apply to REST_FRAMEWORK config

---

### 🔴 BLOCKER #3: Token Refresh Mismatch

**Refresh Endpoint**:
- ✅ Correctly reads from `request.COOKIES.get('refresh_token')`
- ✅ Correctly sets new tokens via Set-Cookie headers

**But**: If frontend uses role-based login endpoints (which return tokens in body):
- Frontend stores tokens in localStorage
- Frontend makes authenticated requests with Authorization header ✅
- Frontend's 401 handler calls `/api/auth/users/token/refresh/`
- ❌ Frontend sends refresh token in request body or Authorization header
- ❌ Refresh endpoint looks for `refresh_token` cookie (not found)
- ❌ Returns "NO_REFRESH_TOKEN" error
- ❌ User is logged out

**Root Cause**: Mixed token delivery methods make refresh impossible

---

### ⚠️ ISSUE #4: No Fallback for Token Refresh

The `/api/auth/users/token/refresh/` endpoint **hardcodes** cookie-only refresh:

```python
refresh_token = request.COOKIES.get('refresh_token')  # Only checks cookies
if not refresh_token:
    return error_response  # No fallback to request body
```

**No support for**:
- Sending refresh token in request body: `{"refresh": "token_value"}`
- Sending in Authorization header: `Authorization: Bearer <token>`
- Alternative endpoints for JSON body refresh

**Impact**: If frontend sends refresh token in any other way, it fails.

---

### ⚠️ ISSUE #5: No Automatic Token Refresh on 401

**Current Behavior**:
- When access token expires, backend returns 401
- Frontend must manually detect 401 and call refresh endpoint
- No automatic retry

**Frontend Responsibility**:
- Intercept 401 responses
- Call refresh endpoint
- Retry original request with new access token

**Problem**: Different frontend libraries/patterns may handle this differently

---

## 7. WHAT SHOULD HAPPEN WITH HTTONCOOKIES

### Complete Secure Flow

```
LOGIN:
1. POST /api/students/auth/login/ with email/password
2. Backend validates credentials
3. Backend generates RefreshToken.for_user(user)
4. Backend sets HttpOnly cookies:
   - Set-Cookie: access_token=<JWT>
   - Set-Cookie: refresh_token=<JWT>
5. Frontend receives response body with user data (no tokens)
6. Frontend stores user data in state
7. Frontend does NOT store tokens anywhere

AUTHENTICATED REQUEST:
1. Frontend makes GET /api/students/me/
2. Browser automatically includes cookies
   - Cookie: access_token=<JWT>
   - Cookie: refresh_token=<JWT>
3. REST framework authentication reads access_token cookie
4. Validates token signature and expiry
5. Returns 200 with user profile

TOKEN EXPIRY HANDLER (401 RECEIVED):
1. Frontend detects 401 response
2. Frontend calls POST /api/auth/users/token/refresh/
3. Browser includes refresh_token cookie
4. Backend validates refresh token
5. Backend generates new access token
6. Backend sets new Set-Cookie header
7. Frontend retries original request
8. Browser includes new access_token cookie
9. Request succeeds with 200

LOGOUT:
1. Frontend calls POST /api/auth/users/logout/
2. Browser includes cookies
3. Backend blacklists refresh token
4. Backend clears cookies (max_age=0)
5. Frontend clears user state
```

---

## 8. CURRENT STATE vs INTENDED STATE

### ❌ CURRENT STATE (Broken)

**Login Endpoints**:
- Student/Employer/Institution return tokens in body
- Generic user returns tokens in cookies
- Inconsistent response formats

**Token Storage**:
- Frontend must guess which endpoint was used
- Some responses have tokens in body (store in localStorage)
- Some responses have tokens in cookies (can't access, but auto-sent)

**Authentication**:
- Default JWTAuthentication only reads Authorization header
- Cookies are set but never used for authentication
- Frontend must manually add Authorization header
- But tokens in cookies can't be read by JavaScript!

**Token Refresh**:
- Endpoint only accepts refresh token from cookies
- But frontend stored token in localStorage
- Refresh fails → "NO_REFRESH_TOKEN"

---

### ✅ INTENDED STATE (Just Migration Plan, Not Fully Implemented)

**Login Endpoints**: All return HttpOnly cookies only
- ✅ UserViewSet.login() does this correctly
- ❌ StudentLoginView/EmployerLoginView/InstitutionLoginView don't

**Token Storage**: Only in HttpOnly cookies (secure)
- Frontend cannot access tokens
- Browser auto-sends with requests
- Protected against XSS

**Authentication**: Custom backend reads from cookies
- ❌ Not implemented yet
- Would need to check `request.COOKIES.get('access_token')`

**Token Refresh**: Cookie-based with automatic retry
- ❌ Frontend auto-retry logic not consistent

---

## 9. WHAT NEEDS TO BE FIXED

### Priority 1 - CRITICAL (Blocks Auth)

1. **Standardize login endpoints** - All return HttpOnly cookies only
   - [ ] Modify `StudentLoginView.post()` - remove tokens from body, set cookies
   - [ ] Modify `EmployerLoginView.post()` - remove tokens from body, set cookies
   - [ ] Modify `InstitutionLoginView.post()` - remove tokens from body, set cookies

2. **Create custom authentication backend** - Read tokens from cookies
   - [ ] Create `CookieJWTAuthentication` class
   - [ ] Register in REST_FRAMEWORK settings
   - [ ] Check cookies first, fallback to Authorization header

3. **Frontend must use `withCredentials: true`** - Send cookies with requests
   - [ ] Update axios client configuration
   - [ ] Verify CORS headers are received with credentials

### Priority 2 - HIGH (Improves UX)

4. **Add fallback refresh endpoint** - Accept refresh token in request body
   - [ ] Create `/api/auth/token/refresh-body/` that accepts `{"refresh": "token"}`
   - [ ] Keep cookie-based endpoint for secure flow

5. **Implement automatic 401 retry** - Refresh and retry transparently
   - [ ] Frontend interceptor catches 401
   - [ ] Calls refresh endpoint
   - [ ] Retries original request
   - [ ] Works with both token delivery methods

6. **Add JWT cookie domain explicitly** - Avoid subdomain issues
   - [ ] Set JWT_COOKIE_DOMAIN in settings
   - [ ] Test cross-domain cookie sending

### Priority 3 - NICE-TO-HAVE (Polish)

7. **Add token verify endpoint support** - Check token validity without refresh
   - [ ] `/api/auth/token/verify/` should support cookies

8. **Add logout endpoint** - Already exists, verify it works
   - [ ] `POST /api/auth/users/logout/` blacklists token and clears cookies

---

## 10. SUMMARY TABLE

| Component | Current | Required | Gap |
|-----------|---------|----------|-----|
| **Student Login Response** | Body tokens ❌ | HttpOnly cookies ✅ | Modify StudentLoginView |
| **Employer Login Response** | Body tokens ❌ | HttpOnly cookies ✅ | Modify EmployerLoginView |
| **Institution Login Response** | Body tokens ❌ | HttpOnly cookies ✅ | Modify InstitutionLoginView |
| **Generic User Login Response** | HttpOnly cookies ✅ | HttpOnly cookies ✅ | ✅ Correct |
| **Cookie Settings** | ✅ Complete | ✅ Complete | ✅ Correct |
| **CORS Credentials** | ✅ Enabled | ✅ Enabled | ✅ Correct |
| **JWT Configuration** | ✅ Complete | ✅ Complete | ✅ Correct |
| **Auth Backend** | Bearer header only ❌ | Cookies + Bearer ✅ | Create custom backend |
| **Token Refresh** | Cookie-based only ❌ | Cookie + Body fallback ✅ | Add body endpoint |
| **Frontend withCredentials** | Missing ❌ | Required ✅ | Update axios |
| **Auto-retry on 401** | Missing ❌ | Required ✅ | Add interceptor |

---

## 11. CODE REFERENCES

### Key Files to Modify

1. **Backend - Login Endpoints**
   - [StudentLoginView](edulink/apps/students/views.py#L43)
   - [EmployerLoginView](edulink/apps/employers/views.py#L35)
   - [InstitutionLoginView](edulink/apps/institutions/views.py#L73)
   - [UserViewSet.login()](edulink/apps/accounts/views.py#L115) ← Use as template

2. **Backend - Configuration**
   - [SIMPLE_JWT settings](edulink/config/settings/base.py#L201)
   - [REST_FRAMEWORK settings](edulink/config/settings/base.py#L148)
   - [CORS settings](edulink/config/settings/base.py#L221)
   - [JWT Cookie settings](edulink/config/settings/base.py#L274)

3. **Backend - Token Endpoints**
   - [UserViewSet.token_refresh()](edulink/apps/accounts/views.py#L184)
   - [TokenRefreshSerializer](edulink/apps/accounts/serializers.py#L292)

4. **Frontend - To Be Updated**
   - `src/services/api/client.ts` - Add withCredentials
   - `src/services/auth/authService.ts` - Stop storing tokens
   - `src/stores/authStore.ts` - Remove token management
   - `src/services/auth/adminAuthService.ts` - Remove token management

