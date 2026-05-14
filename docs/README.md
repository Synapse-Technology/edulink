# Edulink Documentation

This directory contains the maintained documentation for Edulink. Avoid adding phase reports, temporary audits, or one-off implementation notes here. If a document is not useful for building, running, operating, or reviewing the system, keep it out of the repository.

## Maintained Docs

- [Architecture](architecture.md): system boundaries, backend apps, frontend structure, and event model.
- [Authentication](authentication.md): login, refresh, logout, token handling, and frontend auth state.
- [RBAC and Supervision](rbac-and-supervision.md): platform staff roles, domain roles, and supervisor check-in ownership.
- [Development](development.md): local setup, test commands, and engineering rules.
- [Deployment](deployment.md): production configuration and release checks.
- [Operations](operations.md): routine admin operations, migrations, monitoring, and incident response.

## Documentation Rules

- Prefer updating an existing maintained doc over creating a new one.
- Use short, durable explanations tied to current code.
- Do not keep dated phase summaries, duplicate guides, screenshots, or generated PDFs in this directory.
- If a feature needs deeper documentation, add a section to the closest existing doc first.
