# EduLink Demo Runbook

This runbook prepares the Django backend and React web app for a smooth bootcamp demo/prototype walkthrough. The Flutter mobile app is intentionally out of scope.

## Demo Objective

Show EduLink as a working multi-role internship trust platform:

1. Students discover verified internships and track applications.
2. Institutions verify students and monitor placements.
3. Employers publish opportunities and supervise interns.
4. Supervisors review logbook evidence and resolve placement issues.
5. Public visitors see live success stories from backend data.

## One-Time Local Setup

From the repository root:

```bash
.venv/bin/python -m pip install -r requirements.txt
cd edulink-frontend && npm install
```

For a local demo without depending on remote PostgreSQL, use the SQLite demo database:

```bash
EDULINK_TEST_SQLITE=1 .venv/bin/python edulink/manage.py migrate
EDULINK_TEST_SQLITE=1 .venv/bin/python edulink/manage.py seed_demo_data
```

All seeded demo accounts use this password by default:

```text
DemoPass12345!
```

## Demo Accounts

| Role | Email | Route |
| --- | --- | --- |
| System admin | `demo.admin@edulink.test` | `/admin/login` |
| Institution admin | `demo.institution@jkuat.ac.ke` | `/institution/login` |
| Employer admin | `demo.employer@greenbyte.co.ke` | `/employer/login` |
| Employer supervisor | `demo.supervisor@greenbyte.co.ke` | `/employer/login` |
| Student | `demo.student@students.jkuat.ac.ke` | `/login` |

## Running The Demo

Terminal 1, backend:

```bash
EDULINK_TEST_SQLITE=1 .venv/bin/python edulink/manage.py runserver 8000
```

Terminal 2, frontend:

```bash
cd edulink-frontend
VITE_API_BASE_URL=http://localhost:8000 VITE_SHOW_DEMO_CREDENTIALS=true npm run dev
```

Open `http://localhost:5173`.

For a hosted public demo, set `VITE_SHOW_DEMO_CREDENTIALS=true` in the frontend deployment environment before building. Turn it off after the demo if you do not want shared walkthrough accounts visible on public login screens.

## Walkthrough Flow

1. Public homepage: show the value proposition and navigation.
2. Success stories: open `/success-stories` and show that stories load from seeded backend data, not hard-coded page content.
3. Opportunities: open `/opportunities`, filter/search, then open a placement detail.
4. Student flow: log in as `demo.student@students.jkuat.ac.ke`, show dashboard, applications, active internship, logbook evidence, and certificate/artifact areas.
5. Institution flow: log in as `demo.institution@jkuat.ac.ke`, show verified affiliation data, departments/cohorts, internships, reports, and student monitoring.
6. Employer flow: log in as `demo.employer@greenbyte.co.ke`, show opportunity ownership, applications, interns, supervisors, and profile controls.
7. Supervisor flow: log in as `demo.supervisor@greenbyte.co.ke`, show logbook review and incident supervision.
8. System admin flow: log in as `demo.admin@edulink.test`, show platform health, user management, institution/employer oversight, support/contact management, and audit logs.

## Pre-Demo Verification

Run these before presenting:

```bash
cd edulink-frontend && npm run lint
cd edulink-frontend && npm run build
EDULINK_TEST_SQLITE=1 .venv/bin/python -m pytest --tb=short -q
EDULINK_TEST_SQLITE=1 .venv/bin/python edulink/manage.py check
```

## Demo Risks To Avoid

- Use the seeded SQLite demo database when internet access or Supabase connectivity is unreliable.
- Do not demo with an empty database; run `seed_demo_data` after migrations.
- Keep the browser logged out at the start so each role transition is explicit.
- Avoid changing demo account passwords before the presentation.
- If the success stories page is empty, reseed the database and refresh the page.
