# Architecture

Edulink is split into a Django REST backend and a React frontend. The backend follows domain-oriented Django apps; the frontend follows portal-oriented pages and shared services.

## Backend Domains

- `accounts`: user identity, registration, authentication, profile updates, password flows.
- `students`: student records, affiliation, trust profile, documents, student-facing data.
- `institutions`: institution onboarding, staff, academic structure, departments, cohorts.
- `employers`: employer onboarding, employer staff, employer supervisors.
- `internships`: opportunities, applications, placements, evidence, incidents, supervisor assignments, check-ins, final feedback.
- `platform_admin`: platform staff, system admin roles, admin dashboards, onboarding review.
- `notifications`: in-app/email notifications and delivery status.
- `ledger`: append-oriented audit events.
- `reports`: artifacts, certificates, PDF generation, report verification.
- `support` and `contact`: user support and public contact workflows.
- `trust`: trust-tier rules and scoring.

## Backend Rules

- Views handle HTTP only: authenticate, validate, call services, return responses.
- Services own business workflows and event creation.
- Policies own authorization decisions.
- Queries own reusable read models and filtering.
- Cross-domain references should use UUIDs or owning-app query/service functions.
- Important state changes should record ledger events.

## Frontend Structure

- `src/pages`: route-level pages grouped by portal.
- `src/components`: reusable layouts, portal shells, dashboard widgets, and UI components.
- `src/services`: API clients and domain service wrappers.
- `src/stores`: Zustand auth and shared app state.
- `src/utils`: formatting, validation, routing, permissions, and user-facing error helpers.

## Event And Notification Model

Business actions should generally follow this sequence:

1. Policy check.
2. Service transition.
3. Database write.
4. Ledger event.
5. Notification or Pusher update when user-facing state changed.

This keeps auditability separate from UI delivery while still supporting real-time updates.
