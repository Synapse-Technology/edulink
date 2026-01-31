---
alwaysApply: true
---
# APP LAYER BLUEPRINT (NON-NEGOTIABLE)

Each app follows the **same contract** so that:

* Logic is predictable
* Authority boundaries are enforced
* No file becomes a dumping ground

If logic feels like it fits in two places, **one of them is wrong**.

---

## 1. `models.py` — **State, not behavior**

**Purpose**

* Define data structure only
* No business rules
* No side effects

**Allowed**

* Fields
* Relationships
* DB constraints
* `__str__`
* Simple computed properties (no DB writes)

**Forbidden**
❌ Creating related objects
❌ Sending emails
❌ Calling services
❌ Cross-app imports

**Rule**

> Models describe *what exists*, not *what happens*.

---

## 2. `queries.py` — **Read logic ONLY**

**Purpose**

* Encapsulate all read patterns
* Centralize filtering, joins, prefetching

**Allowed**

* `.filter()`
* `.select_related()`
* `.prefetch_related()`
* Read-only aggregations

**Forbidden**
❌ `.save()`
❌ `.create()`
❌ Side effects
❌ Event emission

**Example**

```python
def get_verified_students_by_institution(institution_id):
    return (
        Student.objects
        .filter(institution_id=institution_id, trust_level__gte=2)
        .select_related("user")
    )
```

**Rule**

> If it writes → it does NOT belong here.

---

## 3. `services.py` — **Business actions (write side)**

This is the **heart** of your system.

**Purpose**

* Execute domain actions
* Enforce invariants
* Emit ledger events
* Coordinate multiple models

**Allowed**

* Create/update/delete
* Call ledger
* Call other services
* Transactions

**Forbidden**
❌ HTTP request handling
❌ Serializing JSON
❌ Permission decisions

**Example**

```python
@transaction.atomic
def verify_student_by_institution(*, student, institution, actor):
    student.institution = institution
    student.is_verified = True
    student.save()

    record_event(
        event_type="STUDENT_VERIFIED",
        subject_id=student.id,
        actor_id=actor.id,
    )
```

**Rule**

> If something “happens” in the system, it happens here.

---

## 4. `policies.py` — **Authority & permission logic**

This file prevents **power abuse**.

**Purpose**

* Decide who *can* do something
* Enforce role-based and trust-based access

**Allowed**

* Boolean checks
* Role logic
* Trust tier gating

**Forbidden**
❌ Database writes
❌ Side effects
❌ Business logic

**Example**

```python
def can_verify_student(*, actor, student):
    return (
        actor.role == "INSTITUTION_ADMIN"
        and actor.institution_id == student.institution_id
    )
```

**Rule**

> Policies answer “may I?” — not “do it”.

---

## 5. `serializers.py` — **Input/output contracts**

**Purpose**

* Validate incoming data
* Shape outgoing responses
* Nothing else

**Allowed**

* Field validation
* Type coercion
* Simple computed output

**Forbidden**
❌ `.save()`
❌ Calling services directly
❌ Permission checks

**Correct pattern**

```python
serializer.is_valid()
service_fn(**serializer.validated_data)
```

**Rule**

> Serializers prepare data; they do not act.

---

## 6. `views.py` — **Orchestration only**

Views glue everything together — badly written views kill systems.

**Purpose**

* HTTP handling
* Call policy → service → serializer
* Return response

**Allowed**

* Calling policies
* Calling services
* Choosing serializers

**Forbidden**
❌ Business logic
❌ DB queries beyond trivial lookups
❌ Trust calculations

**Correct flow**

```
request →
  policy check →
    serializer validation →
      service execution →
        response
```

**Rule**

> Views are traffic controllers, not decision-makers.

---

## 7. `signals.py` (optional, sparingly)

Use only for:

* Cross-cutting reactions
* Async or secondary effects

**Examples**

* Send email after event
* Update cache
* Trigger notification

**Never**
❌ Core business rules
❌ Trust tier changes

---

## 8. `tasks.py` (if async)

**Purpose**

* Long-running or delayed jobs

**Examples**

* Bulk verification processing
* Email batches
* Integrity scans

---

## 9. Ledger app — special rules

Your `ledger` app is **infrastructure**, not domain logic.

### Ledger CAN:

* Record events
* Verify hashes
* Expose read-only queries

### Ledger MUST NOT:

❌ Make business decisions
❌ Change trust levels
❌ Enforce permissions

Ledger records.
Other apps interpret.

---

## 10. Where trust tier computation lives

This is important.

### NOT in:

❌ models
❌ views
❌ serializers

### Correct place:

```
trust/
  services.py  ← recompute trust
  queries.py   ← read ledger state
```

Trust is **derived**, not stored.

---

## 11. One-page mental model

| File           | Question it answers         |
| -------------- | --------------------------- |
| models.py      | What exists?                |
| queries.py     | What can we see?            |
| policies.py    | Who may act?                |
| serializers.py | Is input/output valid?      |
| services.py    | What happens?               |
| views.py       | How is it exposed?          |
| ledger         | What happened historically? |

Memorize this table. Enforce it in PRs.

---

## 12. Hard rule (enforce in reviews)

> If a file starts importing too many other app files — it’s doing too much.

That’s your early-warning system.

---

