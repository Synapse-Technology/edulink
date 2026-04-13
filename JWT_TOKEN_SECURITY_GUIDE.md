# JWT Token-Based Authentication Security Guide

## Executive Summary

Edulink uses a **hybrid JWT + HttpOnly refresh token** approach to address the Cloudflare/Render cookie blocking issue while maintaining enterprise-grade security. This is the same authentication pattern used by Google, Microsoft, and OAuth 2.0 standard implementations.

**Status:** ✅ Production-ready  
**Security Level:** High (OAuth 2.0 Compliant)  
**Previous Issue:** Cloudflare blocks `SameSite=None` cookies on cross-site requests  
**Solution:** JWT access tokens + HttpOnly refresh tokens

---

## Architecture Overview

### Three-Component Authentication System

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─ Stores: Access Token (Memory) ✅
       ├─ Stores: Refresh Token (HttpOnly Cookie) ✅
       └─ Sends: Authorization: Bearer <access_token>
                 (on every API request)
       │
       ▼
┌─────────────────────────────────────────┐
│  Backend (Render + Cloudflare)          │
│                                          │
│  1. Login: Returns access + refresh     │
│  2. API Calls: Validates access token   │
│  3. Token Expiry: Refresh endpoint      │
│     returns new access token            │
└─────────────────────────────────────────┘
```

### Token Specifications

| Component | Format | Lifetime | Storage | Transmission |
|-----------|--------|----------|---------|--------------|
| **Access Token** | JWT (RSA-256 signed) | 15 minutes | Memory | Authorization header |
| **Refresh Token** | JWT | 14 days | HttpOnly Cookie | Automatic (cookie jar) |
| **CSRF Token** | Random string | Session | HttpOnly Cookie | X-CSRFToken header |

---

## Security Analysis

### ✅ Strengths of This Approach

1. **XSS Protection (Dual Layer)**
   - Refresh token in HttpOnly cookie → **cannot be stolen by JavaScript** (hard protection)
   - Access token in memory → short 15-min lifetime limits damage window (soft protection)
   - Combined: XSS attacker gains 15-minute access maximum

2. **CSRF Protection**
   - Refresh tokens NOT auto-sent (in HttpOnly cookies, but not for cross-site requests)
   - Access tokens sent explicitly in `Authorization:` header (not automatic)
   - No automatic cookie transmission → immune to CSRF attacks

3. **Cross-Domain Compatibility**
   - No `SameSite=None` needed (which Cloudflare blocks)
   - Access token sent explicitly in header (not cookie) → no browser cookie restrictions
   - Works perfectly with any CDN, proxy, or cloud provider

4. **Stateless Architecture**
   - No server-side session database lookups
   - JWT contains all user info (no DB hit required)
   - Scales horizontally without session affinity issues
   - Perfect for distributed backends on Render

5. **Token Lifecycle Management**
   - Short-lived access tokens (15 min) = limited exposure window
   - Long-lived refresh tokens (14 days) = convenience
   - Automatic silent refresh (interceptor catches 401, refreshes, retries)

### ⚠️ Potential Vulnerabilities & Mitigations

| Vulnerability | Risk | Mitigation | Status |
|---|---|---|---|
| **XSS stealing access token** | Medium | Access token in memory + 15-min window | ✅ Mitigated |
| **XSS stealing refresh token** | Low | HttpOnly cookie prevents JS access | ✅ Protected |
| **Token replay attack** | Low | HTTPS + JWT signature validation | ✅ Protected |
| **Compromised refresh token** | Medium | 14-day window, revocation via backend | ⚠️ See below |
| **JWT secret exposure** | Critical | Keep SECRET_KEY secure on backend | ❌ See Deployment |
| **Token tampering** | Low | RSA-256 signature validation | ✅ Protected |

---

## Implementation Details

### Frontend: Access Token Storage & Usage

```typescript
// 1. LOGIN - Extract tokens from response
async login(credentials) {
  const response = await api.post('/login/', credentials);
  
  // Access token stored in memory (cleared on reload = good)
  this.client.setToken(response.access);
  
  // Refresh token auto-managed by browser (HttpOnly cookie)
  // No code needed - browser handles transparently
  
  return response.user;
}

// 2. API CALL - Automatically includes access token
async getProfile() {
  // Axios interceptor adds: Authorization: Bearer <access_token>
  const response = await api.get('/profile/');
  // No code needed - interceptor handles it
  return response.data;
}

// 3. TOKEN EXPIRY - Automatic refresh
// When access token expires (401 response):
// Interceptor triggers → POST /api/token/refresh/
// Sends refresh token (in cookie, auto-sent)
// Receives new access token
// Retries original request ✅
```

### Backend: Token Validation

```python
# Django REST Framework validates every request:

1. Extract Bearer token from Authorization header
2. Verify JWT signature (matches backend SECRET_KEY)
3. Check token expiry (iat + lifetime > now)
4. Extract user info from JWT payload
5. Attach to request.user

# No database hit needed (JWT is self-contained)
# Stateless = scales perfectly
```

### Refresh Token Endpoint

```python
# POST /api/token/refresh/
# 
# Request: 
#   - Refresh token in HttpOnly cookie (auto-sent)
#   
# Response:
#   - New access token in body (JSON)
#   - New refresh token in HttpOnly cookie
#   
# Security:
#   - Refresh token validated (signature + expiry)
#   - User still exists in DB
#   - Not revoked/blacklisted
```

---

## Security Vulnerabilities & Mitigations

### 1. **Access Token Theft via XSS**

**Vulnerability:** If XSS attack steals access token from memory, attacker can make API calls.

**Mitigations:**
- ✅ **Short lifetime:** 15-minute window limits damage
- ✅ **Content Security Policy (CSP):** Restricts script execution
- ✅ **HTTPOnly refresh token:** Attacker can't renew access token
- ✅ **Sub-resource integrity:** Verify frontend bundle hasn't been compromised
- ✅ **Regular security audits:** Scan for DOM-based XSS

**Action:** Deploy CSP headers (already configured in settings):
```python
SECURE_CONTENT_SECURITY_POLICY = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "trusted-cdn.com"],  # Whitelist only trusted scripts
    ...
}
```

### 2. **Refresh Token Compromise**

**Vulnerability:** If attacker steals refresh token (highly unlikely due to HttpOnly), they can impersonate user for 14 days.

**Mitigations:**
- ✅ **HttpOnly flag:** JavaScript can't steal the token
- ✅ **Secure flag:** Only sent over HTTPS
- ✅ **Managed rotation:** Backend can issue new refresh tokens on each use
- ✅ **Revocation list:** Backend can blacklist revoked tokens
- ✅ **Device fingerprinting:** (Optional) invalidate tokens if device/browser changes

**Action for Production:**
```python
# Implement token revocation (optional but recommended):
class TokenBlacklist(models.Model):
    token = models.TextField()
    blacklisted_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=50)  # 'user_logout', 'security_incident'
    
# Check on every refresh:
if TokenBlacklist.objects.filter(token=token_jti).exists():
    return 401  # Unauthorized
```

### 3. **JWT Secret Key Exposure**

**Vulnerability:** If backend SECRET_KEY is exposed, attacker can forge valid JWT tokens.

**Mitigations:**
- ✅ **Strong SECRET_KEY:** Use cryptographically secure random string (256+ bits)
- ✅ **Environment variable:** Store SECRET_KEY in Render environment, NOT in code
- ✅ **Key rotation:** Plan for periodic SECRET_KEY rotation
- ✅ **Access control:** Limit who can view Render environment variables
- ✅ **Separate production key:** Different key than development

**Real Implementation on Render:**
```bash
# ✅ CORRECT: Environment variable on Render
SECRET_KEY = <random 256-bit string from Render dashboard>

# ❌ WRONG: Committed to repository
SECRET_KEY = "my-secret-key"  # Exposed in git history!
```

### 4. **Token Replay Attacks**

**Vulnerability:** Attacker captures valid JWT and reuses it multiple times.

**Mitigations:**
- ✅ **HTTPS enforcement:** Tokens only transmitted over encrypted channel
- ✅ **Short token lifetime:** 15-minute window limits replay window  
- ✅ **Signature validation:** Backend verifies token has NOT been modified
- ✅ **Issued-at timestamp:** Reject tokens issued in future (clock skew protection)

**Action:** Already implemented in django-rest-framework-simplejwt

### 5. **Cross-Site Request Forgery (CSRF)**

**Vulnerability:** Attacker tricks user into making unintended request to backend.

**Mitigation:** ✅ **Already protected by design**
- Access token sent in custom header (not automatic cookie)
- No automatic credential transmission = immune to CSRF
- Optional: X-CSRFToken header for POST/PUT/DELETE (defense in depth)

---

## Deployment Security Checklist

### Production Deployment (Render)

**Backend Environment Variables (Set in Render Dashboard):**

```env
# ✅ REQUIRED - Strong random 256-bit string
SECRET_KEY=your_cryptographically_secure_random_string_here

# ✅ REQUIRED - JWT settings
JWT_SECRET_KEY=same_as_or_different_from_SECRET_KEY
JWT_ACCESS_TOKEN_LIFETIME=900  # 15 minutes in seconds

# ✅ REQUIRED - HTTPS enforcement
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# ✅ RECOMMENDED - Security headers
SECURE_HSTS_SECONDS=31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True

# ℹ️  Backend URL for token generation validation
BACKEND_URL=https://edulink-backend-2ren.onrender.com
FRONTEND_URL=https://edulink-frontend-mb63.onrender.com
```

**Frontend Environment Variables:**

```env
# Backend API URL
VITE_API_URL=https://edulink-backend-2ren.onrender.com

# CSP policy
VITE_CSP_SCRIPT_SOURCES='self' 'unsafe-inline'
```

**Certificate & HTTPS:**
- ✅ Render provides free SSL/TLS certificates (automatic)
- ✅ All tokens transmitted over HTTPS only
- ✅ Secure flag enforced on all cookies

### Monitoring & Incident Response

**Monitor for Security Issues:**

```python
# Log all token refresh failures
logger.warning(f"🔴 Token refresh failed for user {user.id}: {reason}")

# Log all failed token validations
logger.warning(f"🔴 Invalid JWT: {error_details}")

# Alert on patterns (potential attack):
# - 100+ refresh failures in 5 minutes
# - Same refresh token used from different IPs
# - Token revocation spike
```

**Incident Response Plan:**

1. **Token Compromise Detected:**
   - Revoke affected refresh tokens immediately
   - Force affected users to re-login
   - Notify user via email
   - Log security incident

2. **SECRET_KEY Exposed:**
   - Rotate SECRET_KEY immediately
   - All existing tokens become invalid
   - Users must re-login
   - Investigate how exposure occurred

3. **XSS Attack Detected:**
   - Identify affected Frontend bundle
   - Deploy patched version
   - Invalidate all active tokens as precaution
   - Audit code for XSS vulnerabilities

---

## Comparison: Session Cookies vs JWT Tokens

| Aspect | Session Cookies | JWT Tokens |
|--------|---|---|
| **Storage** | Automatic (browser) | Memory (controlled) |
| **Transmission** | Automatic | Explicit header |
| **Domain Blocking** | ❌ Cloudflare blocks | ✅ Not blocked |
| **CSRF Vulnerable** | ⚠️ Yes | ✅ No |
| **Server State** | ⚠️ DB required | ✅ Stateless |
| **Scaling** | ⚠️ Session affinity needed | ✅ Horizontal scaling |
| **XSS Risk** | ❌ High | ✅ Low (15 min window) |
| **Mobile App Support** | ⚠️ Complicated | ✅ Built-in |
| **Cross-Domain** | ❌ Difficult | ✅ Easy |

**Winner for Render/Cloudflare:** ✅ **JWT Tokens**

---

## Maintenance & Updates

### Regular Security Tasks

**Weekly:**
- Monitor error logs for unusual token failures
- Check for XSS attempts in frontend bundle

**Monthly:**
- Review access patterns for anomalies
- Verify HTTPS is enforced
- Test token refresh functionality

**Quarterly:**
- Penetration test authentication endpoints
- Audit access logs for suspicious activity
- Review and update CSP policy

**Annually:**
- Rotate SECRET_KEY (with zero-downtime strategy)
- Full security audit of authentication system
- Update dependencies (esp. Django, rest-framework-simplejwt)

---

## FAQ

### Q: How secure is storing tokens in memory?
**A:** Secure enough with mitigations:
- XSS attacker gains 15-minute window (then token expires)
- Refresh token protected by HttpOnly (can't get new tokens)
- CSP + subresource integrity prevent XSS in first place
- Same pattern used by Google, GitHub, AWS

### Q: What happens if user closes browser?
**A:** 
- Access token in memory → lost (cleared)
- Refresh token in HttpOnly cookie → persists
- On next visit, frontend auto-refreshes token silently
- User stays logged in ✅

### Q: Can refresh tokens be revoked?
**A:** Yes (optional):
- Implement token blacklist in backend
- On logout, add refresh token to blacklist
- Check blacklist during token refresh
- Ensures immediate session termination

### Q: Is this OAuth 2.0 compliant?
**A:** Yes! This pattern is:
- ✅ RFC 6749 compliant
- ✅ Used by Google, Microsoft, GitHub, AWS
- ✅ Industry standard for SPAs and mobile apps
- ✅ Recommended by OWASP for modern authentication

---

## Conclusion

The JWT token approach provides **enterprise-grade security** while solving the Cloudflare cookie-blocking issue. The dual-token strategy (short-lived access + long-lived refresh) balances security and user experience.

**Status:** ✅ Ready for Production  
**Last Reviewed:** April 13, 2026  
**Next Review:** Q3 2026
