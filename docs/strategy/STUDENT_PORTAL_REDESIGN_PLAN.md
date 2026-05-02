# Student Portal Redesign Plan

## Product Role

The student portal should feel like a career operating system, not a school assignment dashboard. The primary job is to help a student understand what they can do next: become verified, apply, track applications, complete placement work, build evidence, and prove outcomes.

## Design Direction

- Calm, professional, compact interface inspired by career and productivity products such as LinkedIn, Handshake, Notion-style workspace density, and modern SaaS dashboards.
- Use one visual system across student pages: one sidebar treatment, one header treatment, one page heading pattern, one panel style, one table/list pattern, one empty state pattern.
- Reduce large rounded cards, heavy shadows, decorative fonts, and repeated nested cards.
- Prioritize readable hierarchy: page title, status summary, primary next action, supporting detail.
- Keep layouts compact but not cramped: denser information, fewer whitespace gaps, clearer grouping.

## Student Journey

1. Dashboard: answer "Am I ready, what needs action, and what changed?"
2. Profile and affiliation: make verification feel official and achievable.
3. Opportunities and applications: help students move from browsing to a tracked pipeline.
4. Active internship: focus on logbook, supervisor feedback, incidents, and evidence.
5. Artifacts and reports: make outputs feel credible and shareable.
6. Notifications and support: keep messages operational, not noisy.

## Current Problems Found

- Dashboard and related pages duplicate layout code instead of consistently using `StudentLayout`.
- Sidebar used a decorative font and bright single-color slab, which weakened trust and formality.
- Header was a large floating rounded card, creating too much vertical overhead on every page.
- Cards vary between `rounded-4`, inline border radius, heavy shadows, and nested card sections.
- Many student pages have independent spacing rules and inline styles, causing inconsistent density.
- The dashboard has useful product logic but too many competing panels and weak visual priority.

## Implementation Sequence

1. Foundation: shared student portal CSS, formal sidebar, compact header, consistent content width.
2. Dashboard: restructure into command-center hero, readiness section, compact stats, action queue, applications/activity.
3. Application tracker: convert to a compact pipeline/list view with filters and status clarity.
4. Profile and affiliation: use one verification flow pattern with documents and institution trust checks.
5. Internship, logbook, artifacts: make active placement work feel like a workspace with evidence and progress.
6. Notifications/support: standardize empty states, message cards, and user-friendly errors.

## Done In This Pass

- Removed duplicate employer onboarding `Next Step` button.
- Added shared student portal styling foundation.
- Updated student sidebar to a formal navigation system.
- Updated student header to a compact workspace header.
- Started dashboard restructuring with a command-center hero and consistent onboarding panel treatment.
