# Session Authentication Fix - Deployment Guide

## Problem Summary
Production authentication failure: Users can log in (200 OK) but immediately get logged out with 403 Forbidden errors on all API calls.

**Symptoms:**
```
POST /api/students/auth/login/          → 200 OK ✅
GET /api/students/current/             → 403 Forbidden ❌
GET /api/notifications/unread-count/   → 403 Forbidden ❌
All authenticated endpoints             → 403 Forbidden ❌
```

## Root Cause
Session cookies are not being sent across Render.com subdomains because `SESSION_COOKIE_DOMAIN` was not configured in Django settings.

**Why this happens:**
- Frontend: `https://edulink-frontend-mb63.onrender.com`
- Backend: `https://edulink-backend-2ren.onrender.com`

Without explicit `SESSION_COOKIE_DOMAIN`, Django sets cookies for the backend domain only. The browser refuses to send cookies across different subdomains (security feature), so authentication fails on the frontend's requests.

## Code Fix (Already Applied)
Commit: `ce707bf`

File: `/edulink/config/settings/base.py`

**Changes:**
```python
# Line 265 - Added CSRF domain
CSRF_COOKIE_DOMAIN = os.getenv("CSRF_COOKIE_DOMAIN", None)

# Line 275 - Added Session domain  
SESSION_COOKIE_DOMAIN = os.getenv("SESSION_COOKIE_DOMAIN", None)
```

Both are configurable via environment variables so the same code works for:
- Local development (`None`)
- Custom domains (specific domain)
- Shared subdomains (parent domain like `.onrender.com`)

## Deployment Steps

### 1. Update Render.com Backend Environment Variables

Go to [Render Dashboard](https://dashboard.render.com/) → edulink-backend service → Environment

Add these four variables:

```
SESSION_COOKIE_DOMAIN=.onrender.com
CSRF_COOKIE_DOMAIN=.onrender.com
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true
```

**Why each variable:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `SESSION_COOKIE_DOMAIN` | `.onrender.com` | Allows session cookies to be sent to any `*.onrender.com` subdomain |
| `CSRF_COOKIE_DOMAIN` | `.onrender.com` | Allows CSRF tokens to be shared across subdomains |
| `SESSION_COOKIE_SECURE` | `true` | Enforces HTTPS-only cookies in production |
| `CSRF_COOKIE_SECURE` | `true` | Enforces HTTPS-only CSRF cookies in production |

### 2. Save and Restart Service

1. Click "Save" on environment variables
2. Render will automatically detect changes and restart the backend service
3. Wait for restart to complete (usually 1-2 minutes)

### 3. Test the Fix

Open your application and test:

**Step 1: Log in**
```
POST /api/students/auth/login/
Status: Should be 200 OK
Browser stores sessionid cookie
```

**Step 2: Access protected endpoint**
```
GET /api/students/current/
Status: Should be 200 OK (NOT 403)
Request includes sessionid cookie in headers
```

**Step 3: Verify persistence**
- Refresh the page
- User should still be logged in
- No automatic logout

**Step 4: Test logout**
```
POST /api/auth/logout/
Status: Should be 200 OK
Session cookie is cleared
```

## Verification Checklist

After deployment, verify:

- [ ] Login successful (200 response)
- [ ] Session persists across page reloads
- [ ] GET `/api/students/current/` returns 200 (not 403)
- [ ] GET `/api/notifications/unread-count/` returns 200
- [ ] Profile/dashboard pages load without auth errors
- [ ] No 403 Forbidden in network tab after login
- [ ] Logout still works correctly
- [ ] Test with different user roles (student, employer, institution)

## Technical Details

### How Django Session Authentication Works

1. **Login:**
   - User POSTs credentials to `/api/students/auth/login/`
   - Backend authenticates user
   - Backend calls `django_login()` which creates a session in database
   - Backend sets `sessionid` cookie (HTTPOnly, Secure)

2. **Subsequent Requests:**
   - Browser includes `sessionid` cookie (if domain matches)
   - Django middleware reads cookie from request
   - Middleware fetches session from database using cookie ID
   - Attaches user to `request.user`
   - API checks `request.user.is_authenticated`

3. **Cookie Domain Rules:**
   - Cookie set by `backend.example.com` is only sent to `backend.example.com`
   - Cookie set with domain `.example.com` is sent to any `*.example.com` subdomain
   - `SESSION_COOKIE_DOMAIN=.example.com` allows cross-subdomain sharing

### CORS and Credentials

Frontend configuration (already correct):
```typescript
// axios with credentials
axios.create({
  withCredentials: true  // ✅ Sends cookies
})
```

Backend configuration:
```python
CORS_ALLOW_CREDENTIALS = True      # ✅ Allows credentials
CORS_ALLOWED_ORIGINS = [...]       # ✅ Frontend URL included
SESSION_COOKIE_DOMAIN = ".onrender.com"  # ✅ Now set
```

## Troubleshooting

### Still Getting 403 After Restart

1. **Verify environment variables were saved:**
   - Render dashboard → Environment
   - Confirm all 4 variables are present

2. **Check browser cookies:**
   - Open DevTools → Application → Cookies
   - Look for `sessionid` cookie after login
   - Verify Domain is `.onrender.com` (not specific backend domain)

3. **Check backend logs:**
   - Render dashboard → Logs
   - Look for session creation logs after login
   - Verify no errors during session handling

4. **Clear browser cache:**
   - Clear all cookies and cache
   - Try logging in again fresh

### Local Development Issues

For local development, `SESSION_COOKIE_DOMAIN` should be `None`:

```python
# .env.local or environment
SESSION_COOKIE_DOMAIN=
CSRF_COOKIE_DOMAIN=
SESSION_COOKIE_SECURE=false
CSRF_COOKIE_SECURE=false
```

This allows Django to default to single-domain mode (correct for localhost).

## Rollback (If Needed)

If issues occur:

1. Remove the environment variables from Render dashboard
2. Backend will restart with defaults
3. Both variables default to `None` if not set
4. Original behavior restored

## Next Steps

After verifying the fix works:

1. **Monitor production logs** - Watch for any remaining 403 errors
2. **Test all user roles** - Verify students, employers, institutions can authenticate
3. **Update deployment docs** - Document this requirement for future deployments
4. **Test custom domain** - If moving to custom domain, update `SESSION_COOKIE_DOMAIN` accordingly

## Reference Commits

- `ce707bf` - Session cookie domain configuration fix
- `df3974f` - StudentAffiliation features and TypeScript fixes

## Questions or Issues?

Check the backend logs on Render dashboard for detailed error messages. Common issues:

- **403 on every request:** Cookie domain not set correctly
- **403 only on cross-domain requests:** CORS not allowing credentials
- **Session lost after restart:** Session backend configuration issue
- **CSRF token errors:** `CSRF_COOKIE_DOMAIN` not set on frontend domain

---

**Status:** ✅ Code fix ready for deployment  
**Action Required:** Set environment variables on Render backend service  
**Expected Outcome:** Users stay logged in across page refreshes and API calls
