# 🔧 Session Auth Fix - Quick Reference

## Problem
```
✅ Login works: POST /api/students/auth/login/ → 200
❌ Everything else fails: GET /api/students/current/ → 403 Forbidden
```

## Root Cause
Session cookies not sent across Render.com subdomains  
Missing: `SESSION_COOKIE_DOMAIN` in Django settings

## Solution
✅ Code fixed: Commit `ce707bf` pushed to GitHub  
⏳ Action required: Set environment variables on Render.com backend

## Set These 4 Environment Variables on Render Backend:

```
SESSION_COOKIE_DOMAIN=.onrender.com
CSRF_COOKIE_DOMAIN=.onrender.com
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true
```

**Steps:**
1. Go to Render Dashboard → edulink-backend
2. Settings → Environment
3. Add 4 variables above
4. Save (auto-restart in 1-2 minutes)

## Test After Deployment

```bash
# 1. Login
POST /api/students/auth/login/
→ 200 OK ✅
→ Browser stores sessionid cookie ✅

# 2. Verify persistence
GET /api/students/current/
→ 200 OK ✅ (should NOT be 403)

# 3. Refresh page
→ Still logged in ✅

# 4. Logout works
POST /api/auth/logout/
→ 200 OK ✅
```

## Files Changed
- `edulink/config/settings/base.py` (lines 265, 275)
  - Added `SESSION_COOKIE_DOMAIN = os.getenv("SESSION_COOKIE_DOMAIN", None)`
  - Added `CSRF_COOKIE_DOMAIN = os.getenv("CSRF_COOKIE_DOMAIN", None)`

## Why This Works
- Cookie set by `edulink-backend-2ren.onrender.com`
- With domain `.onrender.com`, sent to ANY `*.onrender.com` subdomain
- Frontend at `edulink-frontend-mb63.onrender.com` receives cookie
- Authentication persists ✅

## If Still Getting 403
1. Check environment variables saved on Render
2. Backend service restarted?
3. Browser cookies cleared?
4. Check `sessionid` domain in DevTools

---
**Commit:** `ce707bf` - Session auth fix  
**Docs:** `SESSION_AUTH_FIX_DEPLOYMENT.md` - Full guide  
**Status:** Code ready, pending env var deployment
