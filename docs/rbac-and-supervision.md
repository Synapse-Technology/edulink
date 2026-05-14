# RBAC And Supervision

This document defines the current role separation for platform staff and supervision check-ins.

## Platform Staff Roles

Platform staff authority is represented by `PlatformStaffProfile.role`.

### Super Admin

Root authority for staff lifecycle, emergency controls, system configuration, privileged operations, user management, institution/employer management, moderation, and audit visibility.

### Platform Admin

Day-to-day operations authority for users, institutions, employers, support, and moderation. Platform admins do not manage platform staff, system configuration, emergency actions, or audit export.

### Moderator

Support and moderation authority. Moderators can work contact/support/moderation queues, but cannot manage users, institutions, employers, staff, audit logs, or system settings.

### Auditor

Read-only compliance authority. Auditors can view analytics, audit logs, ledger audits, and user activity. They cannot perform support responses, moderation decisions, account changes, or system changes.

## Permission Source

The backend permission matrix in `edulink/apps/platform_admin/policies.py` is the source of truth. The frontend should consume permission keys returned by the backend rather than hardcoding role checks.

## Supervisor Check-In Ownership

Supervision check-ins are shared placement records but their lifecycle belongs to the side that scheduled them.

- `EMPLOYER`: employer supervisor or employer admin scheduled the check-in.
- `INSTITUTION`: institution supervisor or institution admin scheduled the check-in.
- `PLATFORM`: system admin scheduled the check-in.

The owner side is stored in `SupervisionCheckIn.metadata.owner_side`.

## Check-In Rules

- Students can view and confirm their own check-ins.
- Employer and institution lanes can view check-ins they are allowed to monitor.
- Only the scheduler, the same owner side, or a system admin can complete/cancel a scheduled check-in.
- Cross-side supervisors can see shared context but cannot cancel or complete another side's scheduled session.

The API exposes `can_complete` and `can_cancel` so the frontend can hide actions the current user cannot perform.
