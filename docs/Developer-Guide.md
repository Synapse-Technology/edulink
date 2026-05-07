# EduLink — Developer Guide

## Overview
EduLink is an internship management platform built with a Django backend and a React (Vite + TypeScript) frontend. It supports multiple roles (students, employers, institutions, supervisors) and includes features such as profile management, internship posting, applications, document uploads, trust verification, and reporting.

This guide summarizes repository layout, architecture, developer setup, key components, coding conventions, testing, and deployment steps.

---

## Repository Layout (high level)

- `/edulink/` — Django backend project (settings, urls, wsgi/asgi entrypoints).
- `/edulink_app/` — Mobile app (Flutter) workspace (if present).
- `/edulink-frontend/` — React + Vite frontend (TypeScript).
- `/docs/` — Additional documentation and blueprints.
- `/nginx/` — Nginx config for deployment.
- `docker-compose.prod.yml`, `backend.Dockerfile`, `frontend.Dockerfile` — Containerization artifacts.
- `requirements.txt` — Backend Python dependencies.
- `package.json` (inside `edulink-frontend`) — Frontend dependencies and scripts.


## Tech Stack

- Backend: Python, Django >= 4.2 (project uses Django 5.0.4 in requirements), Django REST Framework, Celery (or django-q2), Redis, PostgreSQL.
- Frontend: React 19, Vite, TypeScript, Tailwind + Bootstrap hybrids, react-query, lucide-react icons.
- Mobile: Flutter project present in `edulink_app/`.
- Storage: Supabase-compatible S3 via `django-storages` and `boto3` (or direct Supabase storage).
- Messaging/Realtime: Pusher / pusher-js.
- PDF: reportlab / xhtml2pdf / jsPDF for report generation in backend/frontend.
- Containerization: Docker + docker-compose.


## Development Setup

Prerequisites (selected): Python 3.9+, Node 16+, PostgreSQL, Redis, Git.

1. Backend
  - Create and activate virtualenv

  ```bash
  python -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
  ```

  - Copy `.env.example` → `.env` and fill DB/Redis/secrets.
  - Run migrations:

  ```bash
  python manage.py migrate
  python manage.py createsuperuser
  ```

  - Run dev server:

  ```bash
  python manage.py runserver
  ```

2. Frontend

  ```bash
  cd edulink-frontend
  npm install
  npm run dev
  ```

  Frontend runs on Vite (default `http://localhost:5173`). Proxy or CORS configuration is controlled by the Django CORS settings and/or Vite proxy.


## Key Developer Workflows

- Feature branch workflow: fork → branch `feature/...` → implement → tests → PR → code review → merge.
- Lint & format: `npm run lint` / `npm run format` for frontend, `black`, `isort`, `flake8` for backend.
- Type-check frontend: `npm run type-check`.
- Run backend tests: `python manage.py test` or `pytest`.


## Architecture & Patterns

### Backend
- Django + DRF for REST API.
- JWT auth via `djangorestframework-simplejwt`.
- Services modules (e.g., `services/student/studentService`) abstract API/backend operations for the frontend codebase.
- Celery/django-q/Redis for background tasks and real-time features.
- Storage uses `django-storages` configured for S3 / Supabase storage.

### Frontend
- Vite + TypeScript app with `react-query` for server data fetching and caching.
- Centralized `ThemeContext` (`useTheme`) controls dark/light mode; pages should consume `useTheme()` instead of local matchMedia.
- Services layer (e.g., `services/student`) encapsulates API calls; components call these services.
- Pages and components use modular CSS tokens defined in `index.css`; prefer existing CSS tokens like `--accent-color` for brand consistency.


## Notable Components (where to look)

- `src/contexts/ThemeContext.tsx` — theme provider and `useTheme()` hook.
- `src/components/dashboard/StudentSidebar.tsx` — student sidebar and shell styling.
- `src/components/student/ProfileWizard.tsx` — multi-step profile setup (documents upload).
- `src/pages/student/StudentArtifacts.tsx` — artifacts / vault page.
- `src/pages/student/StudentInternship.tsx` — internship details and actions.
- `src/pages/student/StudentDashboardPage.tsx` — student dashboard entry.
- `docs/blueprints/` — architecture rules and API blueprints.


## Configuration & Environment

- `.env` controls secrets and integration endpoints.
- `settings.py` reads from env vars (via `python-dotenv` and `dj-database-url`).
- For production, ensure `DEBUG=False` and `SECURE_*` flags enabled.


## Running in Docker (quick)

1. Build images

```bash
# Backend
docker build -f backend.Dockerfile -t edulink-backend .
# Frontend
docker build -f frontend.Dockerfile -t edulink-frontend .
```

2. Start services

```bash
docker compose -f docker-compose.prod.yml up -d
```


## Testing & CI

- Unit tests: `pytest` or `python manage.py test`.
- Frontend tests: `vitest` / `@testing-library/react`.
- CI pipeline exists (check repository Actions) — ensures lint, test, and build steps.


## Troubleshooting & Common Fixes

- Dark mode forced on reload: check pages for local `window.matchMedia` or `document.body.classList` usage. Use central `ThemeContext` instead.
- Missing documents: ensure `MEDIA_ROOT` / storage settings and S3 credentials are correct.
- Frontend type errors: run `npm run type-check` to find TypeScript issues.


## Where to Add New Features

- Backend: add APIs in `edulink/apps/*` or `edulink/<app>/views.py` and wire to `urls.py`.
- Frontend: add new pages under `edulink-frontend/src/pages/` and services in `edulink-frontend/src/services/`.


## Appendix — Useful Commands

- Backend local run: `python manage.py runserver`
- Frontend dev: `npm run dev` (inside `edulink-frontend`)
- Build frontend: `npm run build`
- Lint frontend: `npm run lint`


---

*This document was auto-generated as a starting developer guide. Expand sections with code examples, API references, and architecture diagrams as needed.*
