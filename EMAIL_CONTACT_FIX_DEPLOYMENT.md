# Email & Contact Form Fix: Deployment Checklist

## Problem Summary

Contact form submissions and other async email tasks were causing **worker timeouts** (30–120s blocks) on Render due to:
1. **SMTP connection issues**: SMTP socket was blocking indefinitely when the host was misconfigured or unreachable.
2. **Django Q sync mode**: Background tasks were running inline with web requests instead of asynchronously.
3. **Admin emails not routed**: Contact submissions were being sent to a default/unconfigured email instead of `synapsetechnology14@gmail.com`.
4. **No Reply-To header**: User replies could not be routed back to support.

## Changes Made

### 1. Configuration Changes (`edulink/config/settings/prod.py`)

- **SMTP fallback**: `EMAIL_HOST` now falls back to base settings instead of empty string
- **Django Q default**: `sync` mode now defaults to `False` in production (async workers process background tasks)
- **Support email default**: Added `SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "synapsetechnology14@gmail.com")`

### 2. Code Changes (`edulink/apps/notifications/services.py`)

- **Early-fail guard**: If SMTP backend is configured but no `EMAIL_HOST`, fail fast before socket operations
- **Reply-To header**: All emails now set `Reply-To` header pointing to `SUPPORT_EMAIL` so replies route to admin
- **MultiPart/Alternative**: Fixed EmailMessage to properly send HTML with plain-text fallback (multipart/alternative)

## Deployment Steps

### Step 1: Pull Latest Code
```bash
git pull origin staging
```

### Step 2: Verify/Set Environment Variables on Render

Ensure your Render environment has these set (found in **Render Dashboard → Environment**):

| Variable | Value | Notes |
|----------|-------|-------|
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend` | SMTP backend |
| `EMAIL_HOST` | `sandbox.smtp.mailtrap.io` | Mailtrap sandbox (or production SMTP host) |
| `EMAIL_PORT` | `587` or `2525` | 587 for TLS; 2525 for Mailtrap (TLS on port 587, no TLS on 2525) |
| `EMAIL_USE_TLS` | `True` | Use for port 587; set to `False` for port 2525 |
| `EMAIL_HOST_USER` | `<your-mailtrap-user>` | From Mailtrap credentials |
| `EMAIL_HOST_PASSWORD` | `<your-mailtrap-pass>` | From Mailtrap credentials |
| `DEFAULT_FROM_EMAIL` | `Edulink <no-reply@edulinkcareer.me>` | Sender address (must be verified in SMTP service) |
| `SUPPORT_EMAIL` | `synapsetechnology14@gmail.com` | **NEW**: Admin email for contact form submissions |
| `EMAIL_CONNECT_TIMEOUT` | `5` | Seconds to wait for SMTP connection (prevents infinite blocks) |
| `DJANGO_Q_SYNC` | `False` | **(OPTIONAL, now default)** Run Django Q tasks asynchronously in production |

### Step 3: Redeploy on Render

```bash
# Option A: Push to staging branch (automatic redeploy)
git push origin staging

# Option B: Manual redeploy from Render dashboard
# Visit https://dashboard.render.com → Select your API service → Click "Deploy latest"
```

### Step 4: Verify Deployment

After the service is live, test the contact form:

1. **Navigate to**: `https://edulinkcareer.me/contact`
2. **Submit the form** with test data
3. **Expected behavior**:
   - Frontend shows success message (201 response)
   - No worker timeout (service stays responsive)
   - Logs show email task queued (not run inline)
4. **Check email**:
   - Mailtrap inbox should receive 2 emails within ~10 seconds:
     - **To** `test-email@example.com`: Confirmation email
     - **To** `synapsetechnology14@gmail.com`: Admin notification
   - Both should have `Reply-To: synapsetechnology14@gmail.com` header

### Step 5: Monitor Logs

Watch Render logs for success indicators:
```bash
# On Render dashboard or via CLI:
render logs --service api
```

**Expected logs** (no errors):
```
INFO services ... Notification created: ... (confirmation email)
INFO services ... Notification created: ... (admin email)
INFO services ... Email sent successfully to test-email@example.com
INFO services ... Email sent successfully to synapsetechnology14@gmail.com
```

**Problematic logs** (indicates missing configuration):
```
ERROR services 'EmailMessage' object has no attribute 'attach_alternative'
  → Solution: Pull latest code (fix already pushed)

WARNING services Unmapped email template 'contact_submission_confirmation'
  → Non-blocking; uses default template type

CRITICAL WORKER TIMEOUT (pid: ...)
  → Solution: Ensure DJANGO_Q_SYNC=False or unset (defaults to False now)
```

## Rollback Plan

If issues occur after deployment:

```bash
# Revert to previous commit
git revert HEAD  # or git reset --soft HEAD~2

# Or deploy previous working version
git checkout main
git push origin main  # redeploy from main branch
```

## Notes

- **Contact form emails**: All admin notifications now route to `synapsetechnology14@gmail.com` (configurable via `SUPPORT_EMAIL` env var)
- **Sender address**: Ensure `DEFAULT_FROM_EMAIL` domain is verified in your SMTP service (Mailtrap should allow any sender in sandbox)
- **Async processing**: Contact notifications now queue asynchronously, keeping web workers responsive
- **Socket timeout**: Set to 5 seconds; if SMTP is still slow, increase `EMAIL_CONNECT_TIMEOUT` to 10–15 seconds

---

**Questions?** Check [EMAIL_SYSTEM.md](./edulink/EMAIL_SYSTEM.md) for full email architecture documentation.
