# Edulink

Edulink is a Django and React platform for managing industrial attachment and internship workflows between students, institutions, employers, supervisors, and platform administrators.

## What The System Does

- Students manage profiles, institution affiliation, applications, placements, logbooks, evidence, incidents, check-ins, and certification records.
- Institutions verify students, manage academic structure, supervise placements, review evidence, certify completion, and monitor reports.
- Employers publish opportunities, review applications, assign supervisors, supervise interns, review evidence, and submit final feedback.
- Supervisors manage assigned students, logbooks, incidents, milestones, and supervision check-ins.
- Platform staff manage user access, institution/employer onboarding, moderation, support, audit, and system health.

## Stack

- Backend: Django 5, Django REST Framework, SimpleJWT, PostgreSQL, Django Q2, Pusher, ReportLab/xhtml2pdf.
- Frontend: React 19, TypeScript, Vite, React Query, Zustand, Bootstrap, styled-components.
- Deployment: Dockerfiles and Render configuration are included.

## Repository Layout

```text
edulink/              Django project and backend apps
edulink-frontend/     React frontend
edulink_app/          Flutter/mobile project
docs/                 Maintained project documentation
formats/              Institution report/logbook reference formats
```

## Quick Start

Backend:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python edulink/manage.py migrate
python edulink/manage.py runserver
```

Frontend:

```bash
cd edulink-frontend
npm install
npm run dev
```

Useful checks:

```bash
python -m pytest
cd edulink-frontend && npm run type-check && npm run build
```

## Documentation

Start with [docs/README.md](docs/README.md). The maintained docs are intentionally small:

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [RBAC and Supervision](docs/rbac-and-supervision.md)
- [Development](docs/development.md)
- [Deployment](docs/deployment.md)
- [Operations](docs/operations.md)

Historical phase reports and one-off planning documents were removed to keep the project documentation usable.
