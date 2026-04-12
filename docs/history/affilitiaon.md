 DEPARTMENTS & COHORTS — INSTITUTION AUTHORITY BLUEPRINT

## 1. Lock the Principle First (Non-Negotiable)

> **Departments and cohorts are controlled vocabularies owned by the institution.**
> Students may *suggest* labels. Institutions *decide* structure.

Students never create canonical departments. Ever.

---

## 2. Correct Creation Order (This Matters)

### ✅ The only sane order

1. **Institution is approved**
2. **Institution admin defines departments**
3. **Institution admin defines cohorts within departments**
4. **Students are assigned during verification (or later)**

Not the other way around.

Why?

* Prevents fuzzy duplication
* Preserves institutional naming
* Enables clean reporting

---

## 3. Department Creation (Institution Admin)

### Institution Admin Dashboard → “Academic Structure”

**Create Department**
Fields:

* Official name (required) → “Computer Science”
* Code (optional) → “CS”
* Aliases (optional) → `["computer technology", "comp sci", "cs"]`
* Active / inactive

📌 Aliases are critical. This is how you tame fuzzy student input.

Ledger:

```
DEPARTMENT_CREATED
```

---

## 4. Cohort Creation (Scoped to Department)

Cohorts belong to a department.

**Create Cohort**
Fields:

* Department
* Cohort name → “2023”
* Start year
* End year (optional)
* Intake label (optional: “September Intake”)

Ledger:

```
COHORT_CREATED
```

---

## 5. What Happens When Students Submit Fuzzy Departments?

### Student claim example:

> Department: “computer technology”

System behavior:

* Store raw student input (never discard)
* Do NOT auto-map
* Mark affiliation as `CLAIMED`

Data:

```text
raw_department_input = "computer technology"
```

This becomes **input evidence**, not truth.

---

## 6. Institution Admin Verification Screen (Critical UX)

### “Pending Student Affiliation Claims” Table

Columns:

* Student
* Claimed department (raw)
* Claimed cohort (raw)
* Uploaded docs
* Suggested matches (if any)

#### Smart assist (optional, non-binding)

* Show suggested department based on alias similarity
* Admin must confirm

Example UI:

> Claimed: “computer technology”
> Suggested match: “Computer Science” (alias)

Admin actions:

* Select official department
* Select cohort
* Approve / Reject

Ledger:

```
STUDENT_AFFILIATION_VERIFIED
STUDENT_ASSIGNED_TO_DEPARTMENT
STUDENT_ASSIGNED_TO_COHORT
```

---

## 7. Bulk Verification & Grouping (Where You Win Admins)

This is crucial for adoption.

### Bulk Flow

Admin selects 50 students:

* Filter by raw department input
* Map all to:

  * Department: Computer Science
  * Cohort: CS-2023

One action.
One ledger batch.

This is how real registrars think.

---

## 8. What If Departments Don’t Exist Yet?

Two valid cases:

### Case A: Early phase institution

* Students submit claims
* Admin sees raw inputs
* Admin creates departments first
* Then bulk assigns

### Case B: Mature institution

* Departments already exist
* Admin maps immediately

No data loss either way.

---

## 9. Can Admin Change Department Later?

Yes — but **never silently**.

Rules:

* Department reassignment creates a new event
* Old assignment remains historical

Ledger:

```
STUDENT_DEPARTMENT_REASSIGNED
reason
```

This protects against disputes.

---

## 10. Preventing Garbage Departments (Important)

What NOT to do:
❌ Auto-create department from student input
❌ Let supervisors create departments
❌ Let platform admins rename departments

Only Institution Admin can.

---

## 11. How This Affects Reports & Analytics

Because departments are canonical:

* Completion rates per department
* Employer success per cohort
* Dropout analysis
* Supervisor load

If you let students create departments, all of this dies.

---

## 12. Special Case — “Med”, “CS”, “IT”, etc.

Handled cleanly via:

* Aliases
* Admin confirmation
* Bulk assignment

No AI magic required.
No guessing.

---

## 13. Backend Objects (Conceptual)

```text
Department
- id
- institution_id
- name
- aliases[]
- is_active

Cohort
- id
- department_id
- label
- start_year
- end_year

StudentAffiliation
- student_id
- institution_id
- department_id (nullable until verified)
- cohort_id (nullable)
- raw_department_input
- raw_cohort_input
- status
```

---

## 14. Devil’s Advocate: Why This Is the Only Safe Way

If you:

* Trust student labels → trash data
* Auto-map fuzzy names → silent errors
* Force structure early → adoption friction

This model:

* Preserves student intent
* Gives institutions control
* Scales across countries
* Survives audits

---

## 15. What You Should Implement Next (Concrete)

1. Department + Cohort models
2. Admin CRUD for departments/cohorts
3. Alias matching helper (non-binding)
4. Affiliation verification UI
5. Bulk assignment flow
6. Ledger events for assignments

---

### Bottom line

Students **suggest** structure.
Institutions **define** structure.
The system **records evidence**.



---

# 🎓 STUDENT ↔ INSTITUTION LINKING — CORRECT GOVERNANCE MODEL

## 1. First: Kill the Wrong Ideas Early

Let’s explicitly reject bad patterns:

❌ Auto-link by email domain
❌ Force institution selection at signup
❌ Silent retroactive linking
❌ Admin-only manual linking without student intent
❌ “Pick from list of Kenyan institutions” as a required field

Why these fail:

* Students use Gmail/Yahoo (very common)
* Alumni keep institutional emails
* Institutions onboard late
* Silent linking creates legal and trust problems
* Forced selection creates bad data

So: **no assumptions, only claims + verification.**

---

## 2. Core Principle (Lock This In)

> **Students never “belong” to an institution by default.**
> They **claim affiliation**, institutions **verify it**, and the system **records evidence**.

Everything flows from this.

---

## 3. Student Affiliation as a Claim (Not a Field)

### Data model concept

```text
StudentInstitutionAffiliation
- student_id
- institution_id
- department_id (nullable)
- cohort_id (nullable)
- status: CLAIMED | VERIFIED | REJECTED
- claimed_at
- verified_at
- evidence_ref (documents)
```

This is **not** embedded in `Student`.

Why:

* A student can change institutions
* A student can have multiple historical affiliations
* Verification must be auditable

---

## 4. How Students Claim an Institution (Frontend UX)

### Student Dashboard → “Institution Status” Card

States:

#### A. No institution linked

Show:

> “You are not linked to any institution yet.”

CTA:
**“Claim institution affiliation”**

---

### Claim Institution Flow (Student-Initiated)

Form fields:

* Institution name (search or free text)
* Department (optional)
* Cohort / Year (optional)
* Upload evidence (optional at Level 0)
* Notes (optional)

Backend:

* If institution exists → create affiliation claim
* If institution does NOT exist → create *pending claim* linked to a future institution

Ledger:

```
STUDENT_INSTITUTION_CLAIMED
```

⚠️ No auto-verification.

---

## 5. Institution Onboards Later — What Happens?

This is the tricky case you asked about.

### Scenario

* Student registered early
* Claimed institution X
* Institution X onboarded **later**

### Correct System Behavior

When institution is verified:

1. System scans pending affiliation claims
2. Matches by institution name (fuzzy, admin-reviewed)
3. Institution admin sees:

   > “Pending student affiliation claims (17)”

No auto-approval.

Institution admin must:

* Review claims
* Verify or reject individually or in bulk

Ledger:

```
STUDENT_AFFILIATION_VERIFIED
```

This preserves:

* Student intent
* Institutional authority
* Auditability

---

## 6. Bulk Linking to Departments & Cohorts (Institution Authority)

### Departments & Cohorts Are Institution-Owned

Students **cannot create departments or cohorts**.

Institution Admin defines:

* Departments
* Programs
* Cohorts (e.g. CS–2023)

Then during verification:

* Admin assigns department + cohort

This avoids garbage data.

---

## 7. Student Registration Without Institution (Perfectly Valid)

At registration:

* Institution is OPTIONAL
* Email domain is irrelevant
* Trust Tier = Level 0

Student can:

* Browse internships
* Apply (if allowed)
* Store logbooks
* Claim institution later

No penalties.

---

## 8. Manual Linking — Where & Who?

### Student Side

✔ Can initiate claim
✔ Can see status
❌ Cannot force link

### Institution Side

✔ Can approve/reject claims
✔ Can bulk verify
❌ Cannot silently link students

### Platform Admin

❌ Does not link students
✔ Only oversees disputes

This prevents abuse.

---

## 9. Department & Cohort Assignment Rules

### Assignment Timing

Only allowed when:

* Affiliation is being verified
* Or later via institution admin action

Ledger:

```
STUDENT_ASSIGNED_TO_DEPARTMENT
STUDENT_ASSIGNED_TO_COHORT
```

Never overwrite silently.

---

## 10. Special Case — Student Changes Institution

Handled cleanly:

1. Student submits new affiliation claim
2. Old affiliation becomes historical
3. New institution verifies
4. Trust tier recalculated

No deletions.

---

## 11. Student Full Lifecycle (High-Level)

```text
REGISTERED
↓
SELF-REGISTERED (Trust 0)
↓
UPLOAD DOCUMENTS (Trust 1)
↓
CLAIM INSTITUTION
↓
INSTITUTION VERIFIED (Trust 2)
↓
INTERNSHIP COMPLETED
↓
CERTIFIED (Trust 3)
```

Every arrow = ledger event.

---

## 12. Frontend Pages You’ll Need (Student)

* Dashboard (trust status, affiliation status)
* Claim Institution
* Upload Documents
* Internship Applications
* Active Internship
* Logbook
* Evidence History
* Certifications

---

## 13. Devil’s Advocate: What If You Don’t Do This?

If you:

* Auto-link → disputes
* Force institution selection → fake data
* Hide affiliation status → confusion
* Allow admins to link silently → lawsuits

This model:

* Matches real university processes
* Handles late onboarding
* Scales internationally
* Survives audits

---

## 14. What You Should Implement Next (Concrete)

1. `StudentInstitutionAffiliation` model
2. Student claim flow (UI + API)
3. Institution verification dashboard
4. Bulk verification logic
5. Trust tier recalculation
6. Ledger events

---

### Bottom line

**Linking is a conversation, not a checkbox.**
Claims → verification → authority.


