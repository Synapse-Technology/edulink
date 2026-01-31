

# EDUlink — PRIMARY INTERNSHIP FLOW BLUEPRINT

*(Student → Employer)*

Good — this is the **primary money flow** of EduLink. If this breaks or feels slow, *everything else becomes irrelevant*. This is a **clean, non-destructive blueprint** that **plugs into what you already built**, not a redesign fantasy.

## Structure

1. Primary flow contract (lock this in)
2. Internship page: functional blueprint (backend + frontend)
3. Application flow (student → employer)
4. Employer review & selection logic (touchpoints only)
5. Featured employers & success stories (real, not mock data)
6. Access control & policies (hard rules)
7. What NOT to add (to avoid distortion)

---

## 1. PRIMARY FLOW CONTRACT (DO NOT VIOLATE)

This flow must always be true:

```
Student applies
→ Employer reviews
→ Employer selects
→ System transitions state
```

Key rule:

> **The opportunity page is not a brochure. It is a transaction surface.**

Every feature you add must either:

* Increase applications
* Increase employer confidence
* Reduce time-to-selection

Anything else is noise.

---

## 2. OPPORTUNITY PAGE — FUNCTIONAL BLUEPRINT

### 2.1 Core responsibilities of the opportunity page

The opportunity page must do **five things only**:

1. List internships clearly
2. Enable fast filtering
3. Communicate employer credibility
4. Enable *one-click* application (students only)
5. Signal application state

Nothing else.

---

### 2.2 Internship listing (backend contract)

Each internship MUST expose:

**Public fields**

* `title`
* `employer_name`
* `employer_verified` (badge)
* `location` (remote / on-site / hybrid)
* `duration`
* `application_deadline`
* `slots_available`
* `institution_restricted?`
* `created_at`

**Derived fields**

* `is_featured`
* `applications_count`
* `is_open` (deadline + slots)
* `student_has_applied` (viewer-specific)

This allows the frontend to be **stateless, fast, and predictable**.

---

### 2.3 Filters (keep them sharp, not bloated)

You only need filters that affect **employer intent**.

**Primary filters**

* Field / category
* Location
* Duration
* Employer type (company / institution)
* Verified employer only (toggle)

**Secondary filters**

* Institution preference (optional)
* Trust tier required (if employer enabled)

❌ Do NOT add:

* GPA filters
* Year-of-study filters
* Skill sliders

Those belong in **employer review**, not internship discovery.

---

### 2.4 Opportunity detail page (apply surface)

This page answers **one question only**:

> “Should I apply *right now*?”

**Sections (strict order):**

1. **Opportunity summary (above the fold)**

   * Title
   * Employer
   * Verified badge
   * Deadline
   * Slots
   * Apply CTA

2. **Requirements** (bullet, scannable)

3. **What you’ll do** (practical, not marketing)

4. **Supervision model**

   * Employer supervisor **OR** institution supervisor
   * This is **critical clarity**

5. **Employer credibility**

   * Featured badge (if applicable)
   * Success stories count (metrics, not testimonials)

6. **Application status**

   * Applied / Accepted / Closed

---

## 3. APPLICATION FLOW (STUDENT → EMPLOYER)

### 3.1 Who can apply (policy enforcement)

**Hard rule**

```python
Only role == STUDENT
AND student_account_active == True
```

Even verified institutions **cannot apply on behalf of students**.

Policy example:

```python
can_apply(internship, user):
    return user.role == STUDENT
```

Enforce at:

* API
* Service
* UI (button hidden)

Defense in depth.

---

### 3.2 Application submission (minimal friction)

**Student clicks Apply**
→ modal or inline panel opens

Student submits:

* Optional note
* Select existing documents

System actions:

* Snapshot student profile
* Create `Application`
* State = `APPLIED`

❌ No redirects.
Remain on the **opportunity page** and update UI instantly.

---

### 3.3 Application state visibility

**Student sees:**

* Applied
* Under review
* Accepted / Rejected

**Employer sees:**

* New
* Shortlisted
* Accepted

Same application object, different role-based lens.

---

## 4. EMPLOYER REVIEW & SELECTION (TOUCHPOINTS ONLY)

Employer lifecycle already exists — do **not** rework it.

**Employer actions triggered by applications:**

* View applicants

* Filter by:

  * Institution verification
  * Course
  * Trust tier

* Accept / Reject applicants

**On acceptance:**

* Internship slot decremented
* Student internship state transitions
* Supervisor assigned

Students cannot interfere at this stage.

---

## 5. FEATURED EMPLOYERS (REAL, NOT MOCK DATA)

Most platforms fake this. Don’t.

### 5.1 What qualifies an employer as “featured”

Derived — never manual.

Example criteria:

* Employer verified
* ≥ X completed internships
* ≥ Y successful completions
* No misconduct flags

Stored as:

```python
employer.is_featured = True
```

---

### 5.2 Where featured employers appear

* Top of internship listing (clearly marked)
* Employer profile page
* Homepage carousel (optional)

❌ No fake testimonials
❌ No quotes
✅ Metrics only

---

## 6. SUCCESS STORIES (REAL & SAFE)

Success stories are **system-generated**, not editorial.

Each success story includes:

* Employer
* Institution
* Cohort
* Completion count

Example display:

> “12 students successfully completed internships at Safaricom (2024)”

No student names unless **explicit consent** exists.

---

## 7. ACCESS CONTROL & POLICIES (NON-NEGOTIABLE)

### 7.1 Application policies

* Only students can apply
* One active application per internship per student
* Withdrawal allowed only before acceptance
* No re-application unless employer reopens internship

---

### 7.2 UI role gating

**Apply button hidden for:**

* Employers
* Institutions
* Supervisors

Backend must **still enforce**.

---

## 8. WHAT NOT TO ADD (THIS WILL SAVE YOU)

Do NOT add:

* Chat before acceptance
* Employer ratings by students
* Public applicant counts per internship
* “50 students applied” social proof

These:

* Create anxiety
* Reduce application rates
* Encourage system gaming

---

## FINAL DEVIL’S ADVOCATE CHECK

If this flow:

* Takes more than **30 seconds** to apply → ❌ fail
* Hides employer credibility → ❌ fail
* Blocks unverified students completely → ❌ adoption killer
* Lets non-students apply → ❌ governance failure

This blueprint **extends** your existing system without breaking:

* Role models
* Lifecycle logic
* UI structure

---

