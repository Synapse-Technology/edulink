# Edulink Django Architecture Constitution (v0.1)

## Purpose

This document defines non‑negotiable architectural rules for the Edulink platform. Its goal is to prevent architectural decay, preserve modularity, maintain auditability, and enable future service extraction.

If a change violates these rules, it is incorrect even if it appears to work.

---

## 1. Domain Boundaries

### 1.1 One App = One Domain

Each Django app owns:

* Its models
* Its business rules
* Its permissions
* Its service layer

A generic `core` app is forbidden.

Rationale: Shared core apps become uncontrolled dumping grounds that collapse boundaries.

---

### 1.2 No Cross‑App Model Imports (Default: Forbidden)

Forbidden:

```python
from students.models import Student
```

Allowed patterns:

* Reference by UUID
* Access via the owning app’s service layer

Example:

```python
student_id = UUID(...)
```

or

```python
students.services.get_student(student_id)
```

Exceptions must be documented and strictly one‑directional.

Rationale: Direct model imports create hidden coupling and make future service extraction painful.

---

## 2. Service Layer (Mandatory)

### 2.1 Views Contain No Business Logic

Views may:

* Authenticate
* Validate input
* Call services
* Return responses

Forbidden:

```python
def approve_logbook(request):
    logbook.status = "approved"
```

Required:

```python
ledger.services.approve_logbook(...)
```

Rationale: Views are delivery mechanisms, not decision‑makers.

---

### 2.2 Every App Must Expose `services.py`

Required structure:

```
students/services.py
institutions/services.py
ledger/services.py
```

Services enforce rules, trigger events, and coordinate workflows.

---

## 3. Models Are Dumb by Design

### 3.1 Models Store Data, Not Truth

Mutable flags must never represent authoritative state.

Forbidden:

```python
internship.status = "completed"
```

Required:

* State derived from ledger events

---

### 3.2 No Business Logic in `save()` or Signals

Forbidden:

```python
def save(self):
    if condition:
        do_business_logic()
```

Rationale: Hidden behavior destroys predictability and auditability.

---

## 4. Events Over Flags

### 4.1 All State Changes Are Events

Forbidden:

```python
is_verified = True
```

Required:

```
EVENT: STUDENT_VERIFIED_BY_INSTITUTION
```

---

### 4.2 Ledger Is Append‑Only

* No updates
* No deletes
* Corrections are new events

Rationale: Auditability and non‑repudiation.

---

## 5. Database Rules

### 5.1 UUIDs Everywhere

* Primary keys
* Cross‑domain references

Rationale: Safe exposure, scalability, and service extraction readiness.

---

### 5.2 Avoid Deep Foreign‑Key Chains

Forbidden:

```
Student → Department → Institution → University
```

Preferred:

```
Student → institution_id (UUID)
```

---

## 6. Async & Background Work

### 6.1 Sync First, Async Later

* MVP uses synchronous workflows
* Celery/Django‑Q introduced only when justified

---

## 7. Authority & Permissions

### 7.1 Authority Flows via Roles and Events

* Students submit claims
* Supervisors review
* Institutions certify

No role may bypass another.

---

## 8. Code Discipline

### 8.1 No Quick Fixes Across Domains

* No bypassing services
* No silent overrides

---

### 8.2 No Shared Utility Dumping Grounds

Forbidden:

```
utils.py
helpers.py
common.py
```

Allowed:

* Domain‑specific helpers inside each app

---

## 9. System Scope

Edulink is NOT:

* A social network
* A chat system
* A real‑time platform
* A generic marketplace

---

## 10. Enforcement

These rules are enforced by:

* Code reviews
* Refactoring instead of exceptions
* Deleting bad code instead of patching it

Architecture discipline is social before it is technical.

---

## Final Note

Django will not protect the system from bad decisions.
This document will.
