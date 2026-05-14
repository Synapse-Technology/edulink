# Deployment

## Required Environment

Backend:

- `SECRET_KEY`
- `DEBUG=False`
- `DATABASE_URL`
- `ALLOWED_HOSTS`
- `FRONTEND_URL`
- `BACKEND_URL`
- `CSRF_TRUSTED_ORIGINS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_COOKIE_SECURE=True`
- `SESSION_COOKIE_SECURE=True`
- `JWT_COOKIE_SECURE=True`
- email provider settings
- storage settings if using S3/Supabase-compatible storage
- Pusher settings if realtime updates are enabled

Frontend:

- API base URL configured for the deployed backend.

## Release Checks

Run before deployment:

```bash
python -m pytest
cd edulink-frontend && npm run type-check && npm run build
```

Run migrations:

```bash
python edulink/manage.py migrate
```

Collect static files if serving Django static assets:

```bash
python edulink/manage.py collectstatic --noinput
```

## Auth Deployment Notes

- The frontend sends requests with credentials enabled.
- Refresh tokens are HttpOnly cookies.
- Access tokens are short-lived and kept in memory by the frontend.
- Cross-site deployments require secure cookies and compatible SameSite/CORS/CSRF settings.

## Rollback

- Revert the release commit.
- Re-run migrations only if the rollback requires a backward migration and the migration is safe.
- Clear stale browser sessions if the release changed auth behavior.
