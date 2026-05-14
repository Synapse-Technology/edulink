# Authentication

Edulink uses a shared portal authentication contract for students, institutions, employers, supervisors, and platform staff.

## Contract

Login responses return:

- `user`: the authenticated user/staff profile.
- `access`: a short-lived JWT access token used by the frontend in memory.

Login responses also set:

- `refresh_token`: HttpOnly cookie, used by the backend refresh endpoint.
- `X-CSRFToken`: header for state-changing requests.

The frontend must not persist refresh tokens in `localStorage` or `sessionStorage`.

## Login Endpoints

- `POST /api/auth/users/login/`
- `POST /api/students/auth/login/`
- `POST /api/institutions/auth/login/`
- `POST /api/employers/auth/login/`
- `POST /api/admin/auth/login/`

All portal-specific login endpoints validate the portal role, then use the shared backend auth response helper.

## Refresh

Regular portals refresh through:

```text
POST /api/auth/token/refresh/
```

Platform staff can also use:

```text
POST /api/admin/auth/token/refresh/
```

The refresh token is read from the HttpOnly cookie. The response returns a new access token and rotates the refresh cookie when SimpleJWT provides a rotated token.

## Logout

Regular portals:

```text
POST /api/auth/logout/
```

Platform staff:

```text
POST /api/admin/auth/logout/
```

Logout clears the refresh cookie and local frontend auth state. The frontend also removes old legacy admin token keys for stale sessions.

## Frontend Behavior

- Access token lives only in the API client memory.
- Refresh token lives only in the backend-set HttpOnly cookie.
- Zustand persists user/admin identity only, not tokens.
- On `401`, the API client calls the refresh endpoint with credentials and retries the original request.
