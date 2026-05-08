# EduLink Workspace UI Migration Plan

## Goal

Move student, employer, and institution dashboards from page-local styling to shared internal workspace systems. The target is a premium operational UI with consistent spacing, hierarchy, states, and maintenance boundaries.

## Non-Negotiables

- New dashboard UI must use workspace primitives before adding page-specific CSS.
- Page CSS is allowed only for layout or behavior that is truly unique to that page.
- Shared primitives own spacing, card structure, buttons, status badges, toolbars, empty states, form controls, and responsive grid behavior.
- Remove dead components only after import checks and a successful production build.
- Migrate one role workspace at a time: student first, employer second, institution third.

## Target Structure

```text
src/components/student/workspace/
  StudentWorkspace.tsx
  StudentWorkspace.css
  index.ts

src/components/employer/workspace/
  EmployerWorkspace.tsx
  EmployerWorkspace.css
  index.ts

src/components/institution/workspace/
  InstitutionWorkspace.tsx
  InstitutionWorkspace.css
  index.ts
```

Later, once all three role systems stabilize, extract shared neutral primitives into:

```text
src/components/workspace/
  Workspace.tsx
  Workspace.css
  tokens.css
```

Do not jump to global primitives too early. Student, employer, and institution workspaces still need slightly different product density and emphasis.

## Student Migration Order

1. Foundation
   - Add `components/student/workspace`.
   - Define shared page shell, page header, grid, card, metric, button, status, toolbar, empty state, and form classes.
   - Keep the visual language restrained and operational: clean surfaces, 8px radius, readable hierarchy, no decorative page cards inside page cards.

2. Inventory
   - Map every student page class prefix:
     - `StudentDashboardPage`
     - `StudentApplications`
     - `StudentApplicationDetail`
     - `StudentInternship`
     - `StudentLogbook`
     - `StudentLogbookDetail`
     - `StudentArtifacts`
     - `StudentNotifications`
     - `StudentProfile`
     - `StudentAffiliation`
     - `ExternalPlacement`
   - Mark classes as either shared primitive, page-specific, or obsolete.

3. First Conversion Slice
   - Convert low-risk pages first:
     - `StudentNotifications`
     - `StudentArtifacts`
     - `StudentApplications`
   - Replace local hero/card/button/status/empty-state CSS with workspace primitives.
   - Keep data fetching and business behavior untouched.

4. Core Workflow Conversion
   - Convert:
     - `StudentInternship`
     - `StudentLogbook`
     - `StudentLogbookDetail`
     - `StudentApplicationDetail`
   - Preserve attachment lifecycle behavior exactly.
   - Only page-specific CSS should remain for logbook day grids, document preview, and specialized evidence layouts.

5. Profile and Affiliation Conversion
   - Convert:
     - `StudentProfile`
     - `StudentAffiliation`
     - `AffiliationDocumentUploader`
     - `ProfileWizard`
   - Normalize upload/dropzone, verification states, document states, and profile-readiness surfaces.

6. Cleanup
   - Remove unused student-only CSS blocks after conversion.
   - Remove unused components only when:
     - `rg` finds no imports.
     - Type-check passes.
     - Production build passes.
     - Route smoke paths still render.

## Employer Migration Order

After student workspace is stable:

1. Add `components/employer/workspace`.
2. Convert employer admin pages:
   - Dashboard
   - Applications
   - Application Detail
   - Interns
   - Opportunities
   - Supervisors
   - Profile
   - Settings
3. Convert employer supervisor pages:
   - Dashboard
   - Internships
   - Logbooks
   - Incidents
   - Milestones
   - Profile
4. Delete duplicate page prefixes such as `ed-`, `ei-`, `eo-`, `eao-`, and `eset-` once replaced.

## Institution Migration Order

After employer workspace is stable:

1. Add `components/institution/workspace`.
2. Convert institution admin pages:
   - Dashboard
   - Students
   - Staff
   - Academic
   - Internships
   - Applications
   - Certifications
   - Verification
   - Reports
   - Incidents
   - Settings
3. Convert institution supervisor pages.
4. Consolidate report/analytics/table primitives only after institution data workflows are visually stable.

## Dead Code Policy

Use this sequence for every cleanup PR:

1. `rg "ComponentName|from '.*/ComponentName'|from \".*/ComponentName\""`
2. `npm run type-check`
3. `npm run build`
4. Delete only files with no imports and no route references.
5. Do not delete shared common components during role migration unless all roles are checked.

## Dynamic Import Deploy Issue

Error:

```text
TypeError: Failed to fetch dynamically imported module: https://edulinkcareer.me/assets/Login-5HEaSLlE.js
```

Most likely cause: a browser or CDN has an old `index.html` that points to an asset hash removed by the latest deploy. Vite chunk filenames are content-hashed, so `index.html` must not be cached long-term.

Required deployment rule during the migration:

- All frontend routes/assets: `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`

After the migration stabilizes, we can optimize this to short/no cache for SPA HTML routes and long immutable cache for `/assets/*`.

Also add a lazy-route error boundary later so a stale chunk can show a refresh prompt instead of a blank page.

## Acceptance Criteria

- Student pages use `components/student/workspace` primitives for common UI.
- No new role page introduces its own full button/card/status/metric system.
- `npm run type-check` and `npm run build` pass after each migration slice.
- Visual hierarchy remains consistent at mobile and desktop widths.
- Unused student-only components and CSS are removed after import/build checks.
