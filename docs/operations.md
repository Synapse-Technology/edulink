# Operations

## Routine Admin Work

- Create the first platform super admin using the genesis management command.
- Invite platform staff through the System Admin staff page.
- Keep platform staff roles least-privileged.
- Review institution and employer onboarding requests from platform admin workflows.
- Monitor support/contact queues through moderator-capable roles.

## Migrations

Run migrations before deploying backend code that depends on schema changes:

```bash
python edulink/manage.py migrate
```

Recent supervision check-in migrations:

- `0024_supervision_checkin`: creates the shared check-in model.
- `0025_backfill_supervision_checkin_owner_side`: infers `metadata.owner_side` for existing records.

## Monitoring

Watch these areas after each release:

- Login and token refresh failures.
- `401` and `403` rates.
- Support ticket and contact submission errors.
- Supervisor check-in create/complete/cancel failures.
- Notification delivery failures.
- Ledger event creation failures.

## Incident Response

1. Confirm the affected portal and user role.
2. Check recent backend logs for authorization, validation, or token refresh errors.
3. Check ledger events for the affected entity.
4. Verify whether a notification was created and delivered.
5. Patch through services/policies, not directly in views.

## Documentation Maintenance

When behavior changes, update the matching maintained doc in this directory during the same change. Do not add temporary audit reports or duplicate guides.
