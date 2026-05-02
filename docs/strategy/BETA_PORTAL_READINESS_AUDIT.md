# EduLink Beta Portal Readiness Audit

Date: 2026-05-02

## Product Thesis Checked

Target beta product:

> EduLink helps Kenyan institutions run trusted student attachment and internship programs with verified employers, structured supervision, evidence, and outcome reporting.

## Current Code Support

The codebase mostly supports the thesis at the architecture level.

Supported:

- Institution onboarding and activation.
- Employer onboarding, tracking, approval, activation, and supervisor invites.
- Student affiliation verification, including institution-owned departments and cohorts.
- Internship/opportunity creation, publishing, applications, application processing, withdrawal, and external placement declarations.
- Employer and institution supervisor roles.
- Logbook/evidence submission and dual review.
- Incidents, final feedback, completion, certification, and public artifact verification.
- Trust progress for institutions and employers.
- Reporting endpoints for placement success, time-to-placement, quality control, department performance, and exports.
- Notifications and email templates for many lifecycle events.

## Strategic Fit

What fits well:

- EduLink is already more than a listing board.
- The strongest value is the verified workflow: institution -> student -> employer -> supervisor -> evidence -> certification.
- Institution-controlled academic structure is a major advantage for reporting and trust.
- External placement declarations are important because Kenyan students often find attachments outside the official platform.

What did not fit before this pass:

- Public homepage messaging still sounded too close to a general internship/job marketplace.
- Institution and employer dashboards did not clearly tell pilot operators what must be ready before a beta cycle.
- The portal had many features but no operational checklist for "one institution, one cohort, 10-20 employers."

## Implemented Updates

### 1. Beta Readiness Panel

Added:

- `edulink-frontend/src/components/pilot/PilotReadinessPanel.tsx`

This reusable component shows:

- Readiness percentage.
- Complete/incomplete checklist items.
- Action links to the relevant portal areas.

### 2. Institution Dashboard Pilot Checklist

Updated:

- `edulink-frontend/src/pages/admin/Institution/InstitutionDashboard.tsx`

The institution dashboard now evaluates:

- Academic structure configured.
- Pilot students onboarded.
- Opportunity/application pipeline active.
- Supervision and evidence loop visible.
- Reporting baseline available.
- Completion/certification path ready.

This aligns institution admins around the actual pilot workflow.

### 3. Employer Dashboard Pilot Checklist

Updated:

- `edulink-frontend/src/pages/admin/Employer/EmployerDashboard.tsx`

The employer dashboard now evaluates:

- Employer profile verification.
- Supervisor capacity.
- Candidate pipeline.
- Application response loop.
- Active supervision evidence.
- Completion outcomes.

This makes it clear that employer participation means more than posting an opportunity.

### 4. Public Homepage Repositioning

Updated:

- `edulink-frontend/src/pages/Home.tsx`

Changed positioning from broad internship/job discovery to:

- Trusted attachments.
- Verified outcomes.
- Institution-led work-based learning.
- Employer verification.
- Logbooks/evidence.
- Completion reporting.

The primary CTA now points to institution pilot onboarding, with employer onboarding as the second CTA.

### 5. Public Trust & Pilot Policy

Added:

- `edulink-frontend/src/pages/TrustPolicy.tsx`

Updated:

- `edulink-frontend/src/App.tsx`
- `edulink-frontend/src/components/layout/Footer.tsx`

The new `/trust-policy` page makes the beta trust model explicit:

- Institutions control academic truth.
- Employers are verified before scale.
- Every placement needs evidence.
- Students should not pay to apply.
- Red flags are listed for scam prevention and pilot escalation.

## Verification

Frontend production build passed:

```bash
npm run build
```

Build warnings:

- Browserslist/caniuse-lite was updated and the warning is resolved.

Bundle comparison:

- Before lazy loading: main app chunk was about 2,826.33 kB / 729.58 kB gzip.
- After route-level lazy loading: main app chunk is about 559.61 kB / 162.78 kB gzip.
- Reduction: about 80.2% raw and 77.7% gzip for the main app chunk.

Backend checks:

```bash
./.venv/bin/python edulink/manage.py check
./.venv/bin/python edulink/manage.py test edulink.apps.shared.tests.test_middleware edulink.apps.shared.tests.test_exception_handler
```

Both passed.

Backend log diagnosis:

- The repeated `/api/internships/success-stories/`, `/api/employers/employers/`, and `/api/internships/` failures were caused by `django.db.utils.OperationalError: [Errno -3] Temporary failure in name resolution`.
- This is a PostgreSQL host DNS/connectivity failure, not a serializer or success-story model bug.
- The API now maps `OperationalError`/`DatabaseError` to `503 DATABASE_UNAVAILABLE` instead of generic `500 INTERNAL_ERROR`.
- This keeps public endpoints honest during transient database outages and gives clients a retryable error class.

Frontend error UX review:

- User-facing errors are now normalized through `getUserFacingErrorMessage`.
- Technical patterns such as stack traces, Django/Psycopg errors, SQL text, file paths, and JavaScript runtime internals are replaced with friendly recovery messages.
- The API client keeps the raw backend payload on `error.data.raw_message` for diagnostics, while `error.message` is safe to show to users.
- Feedback modal technical details are hidden in production and only visible in development builds.
- Public opportunity, opportunity detail, password reset, external placement, withdrawal, and logbook flows were patched where they rendered raw `error.message` directly.

## Remaining Beta Risks

These should be handled during the pilot rather than hidden:

- Messaging/status transparency is still not strong enough for anxious students unless notifications and status explanations are consistently surfaced.
- Employer adoption may require assisted posting and high-touch support.
- The system should enforce a visible trust policy for employer verification and suspicious opportunity reporting.
- The institution dashboard depends on live data; empty states must be tested with a fresh pilot tenant.
- Production readiness still needs seeded pilot data, role walkthroughs, and end-to-end QA across student, institution, employer, and supervisor accounts.

## Recommended Next Engineering Steps

Before inviting pilot users:

1. Create a pilot seed dataset or demo tenant with:
   - 1 institution.
   - 2 departments.
   - 1-2 cohorts.
   - 20-50 students.
   - 5-10 employers.
   - A few opportunities and applications in different statuses.
2. Run role walkthrough QA:
   - Student applies and tracks status.
   - Institution verifies student and reviews reports.
   - Employer reviews application and assigns supervisor.
   - Supervisor reviews logbook.
   - Institution certifies completion.
3. Add a simple trust policy page or admin-visible checklist:
   - Employer verification rules.
   - No-fee opportunity rule.
   - Scam reporting path.
   - Data consent note.
4. Add route-level lazy loading to reduce the large production chunk.
