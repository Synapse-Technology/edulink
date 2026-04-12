

1. Core principles (to keep you honest)
2. Student lifecycle stages
3. State machine & logic workflow
4. Core actions mapped to backend logic
5. Frontend pages & UX intent
6. Abuse, friction, and trust controls (because students *will* lie)

---

## 1. Non-negotiable principles for the Student actor

Let’s set constraints first—this avoids bad decisions later.

* Students **create volume and urgency**, not authority
* Students **optimize for speed**, not correctness
* Students **will exaggerate, mislabel, or omit**
* Students **hate waiting** and churn fast if blocked
* Students **must never be the source of truth**

Therefore:

* Students **submit claims**, never facts
* Students **generate evidence**, never validation
* Students **see status**, not internal reasoning
* Students **cannot mutate history**

If you violate these, the system collapses under gaming.

---

## 2. Student full lifecycle stages (high level)

The student lifecycle is **not linear**, it’s a loop:

```
Register
 → Affiliation Claim
 → Internship Search & Apply
 → Placement (Active)
 → Evidence Submission (Logbooks)
 → Completion
 → Archive / Reporting
```

Overlayed with:

* Verification states
* Trust tier evolution
* Supervisor interactions

---

## 3. Student state machine (this is the backbone)

### A. Identity & Affiliation State

```
UNAFFILIATED
 → AFFILIATION_CLAIMED
 → AFFILIATION_VERIFIED | AFFILIATION_REJECTED
```

Rules:

* Student can operate in **AFFILIATION_CLAIMED**
* Some employers may filter them out
* Institutions resolve claims, students don’t push links

---

### B. Internship Application State

```
DRAFT
 → APPLIED
 → SHORTLISTED (optional)
 → ACCEPTED
 → ACTIVE
 → COMPLETED
 → ARCHIVED
```

Key constraints:

* Students cannot jump states
* Students cannot revert states
* State transitions are **employer/system-driven**

---

### C. Evidence (Logbook) State

```
DRAFT
 → SUBMITTED
 → REVIEWED
 → APPROVED | FLAGGED
```

Once `APPROVED`:

* Immutable
* Exportable
* Counted toward completion

---

## 4. Student core actions & logic workflow

### 4.1 Registration & Profile (low friction, low trust)

**Student can:**

* Register with email/phone
* Create limited profile:

  * Name
  * Course (free text)
  * Skills (tags)
  * CV upload (optional)
  * Documents upload (ID, admission letter)

**Student cannot:**

* Set institution as verified
* Choose canonical department/cohort
* Edit profile during active internship (lock sensitive fields)

**Logic note (important):**
Profile data influences:

* Employer filters
* Trust tier
  But is always treated as *self-asserted* until corroborated.

---

### 4.2 Institution affiliation claim

This deserves precision.

**Student submits:**

* Institution name (search + free text fallback)
* Department (free text)
* Cohort/year (free text)
* Supporting docs (optional)

System stores:

* Raw text
* Normalized guesses (soft)
* Status = `PENDING`

**Student UX:**

* Sees: “Pending verification”
* Sees impact: “Some employers may prefer verified students”

No manual linking. Ever.

---

### 4.3 Internship discovery (speed > perfection)

**Core UX goals:**

* Fast search
* Minimal filters
* Zero forced profile completion

**Student can:**

* Browse internships
* Filter by:

  * Location
  * Duration
  * Field
  * Institution-posted vs employer-posted
* View:

  * Requirements
  * Supervisor model (institution vs employer)
  * Verification preferences

**Critical logic:**

* Don’t block applications due to “incomplete profile”
* Surface warnings, not blockers

---

### 4.4 Apply for internship (extreme friction control)

This is where most systems fail.

**Application must be:**

* One click if profile exists
* No re-uploading of already uploaded docs
* No essays unless employer explicitly requires

**Student submits:**

* Optional note
* Select existing documents
* Confirm availability window

System:

* Creates application snapshot
* Freezes relevant profile fields for audit

**Student can:**

* Track status
* Withdraw application (before acceptance)

**Student cannot:**

* Edit application after submission

---

### 4.5 Placement & Active internship

Once accepted:

```
Internship State = ACTIVE
Student State = ATTACHED
```

System assigns:

* Employer supervisor OR institution supervisor
* Logbook schedule (weekly/biweekly)

Student dashboard changes:

* Internship timeline
* Supervisor details
* Logbook CTA becomes primary

Profile editing is **restricted** to prevent retroactive manipulation.

---

### 4.6 Logbooks & evidence submission

This is the student’s **core compliance workload**.

**Student can:**

* Create weekly logbook entries
* Save drafts
* Submit for review
* View supervisor comments

**Student cannot:**

* Edit after approval
* Delete entries
* Approve anything

**Logbook structure:**

* Week number
* Activities
* Learning outcomes
* Challenges
* Attachments (optional)

System enforces:

* Time windows (no backdating after grace period)
* Submission cadence

This discourages end-of-term dumping.

---

### 4.7 Supervisor confirmations (student is passive)

Supervisors:

* Review
* Comment
* Approve
* Flag misconduct

**Student role here is read-only.**
They respond via next logbook, not edits.

---

### 4.8 Completion & closure

When internship duration lapses AND:

* Required logbooks approved
* Supervisor confirms completion

System moves state to:

```
COMPLETED
```

Student:

* Cannot submit new evidence
* Gains access to artifact generation

---

## 5. Artifact generation (high perceived value)

This is where students *feel* the platform worked.

**Student can generate:**

* Branded logbook PDF
* Completion letter
* Offer letter (if employer provided)
* Personal activity report (read-only)

**Rules:**

* Artifacts pull from approved data only
* No customization beyond branding
* Regenerable, but immutable in content

This protects institutional trust.

---

## 6. Trust tier badges (optional but powerful)

You’re right to make this optional.

Trust tier inputs:

* Verified institution
* On-time logbooks
* No flags
* Completion confirmations

Trust tier effects:

* Employer filters
* Faster shortlisting
* Visual badges only (no guarantees)

Never let trust tiers override human review.

---

## 7. Explicit student limitations (do NOT compromise)

Students:

* ❌ cannot verify anything
* ❌ cannot edit approved or historical records
* ❌ cannot delete evidence
* ❌ cannot assign supervisors
* ❌ cannot change affiliation after verification

These are system-level guardrails.

---

## 8. Frontend pages (minimum viable but complete)

### Core student pages:

1. Registration / Login
2. Profile & Documents
3. Affiliation Status
4. Internship Marketplace
5. Application Tracker
6. Active Internship Dashboard
7. Logbook Editor & History
8. Artifacts & Reports
9. Notifications

Each page should answer **one question only**.
Students don’t explore; they react.

---

## Final devil’s-advocate warning

If you:

* Add too many required fields → churn
* Let students self-verify → fraud
* Allow retroactive edits → institutional distrust
* Over-gamify trust → badge farming

You’re designing a compliance system, not a social network.

This blueprint is solid enough to implement **without rework** if you respect the constraints.


