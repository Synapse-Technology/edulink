# Development

## Backend Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python edulink/manage.py migrate
python edulink/manage.py runserver
```

## Frontend Setup

```bash
cd edulink-frontend
npm install
npm run dev
```

## Checks

Backend:

```bash
python -m pytest
python -m py_compile edulink/apps/accounts/views.py
```

Frontend:

```bash
cd edulink-frontend
npm run type-check
npm run build
```

## Engineering Rules

- Put business behavior in services, not views.
- Put authorization in policies, not components or serializers.
- Use query modules for reusable read access.
- Record ledger events for meaningful state changes.
- Prefer backend-returned permission flags over duplicated frontend logic.
- Do not add new documentation unless it belongs in the maintained docs set.

## Current Test Note

The repository includes `pytest` and `pytest-django` in `requirements.txt`. If `python -m pytest` fails with `No module named pytest`, install backend dependencies in the active environment before validating backend changes.
