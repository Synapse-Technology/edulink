# Student-Institution Affiliation & Verification Workflow Review

## 1. Analysis of Current State & Anomalies

We need to audit the existing connection between `Student` and `Institution`. The observed anomaly is that while a student *claims* an affiliation (via `institution_id` in their profile snapshot), the active internship record shows `institution_id: null`. This suggests the link is not being formalized or propagated correctly.

### Key Areas to Investigate:

1. **Affiliation Claim (Student Side):** How does a student select an institution? Is it just a string or a foreign key?
2. **Verification Request (Backend):** Does claiming an affiliation create a `StudentAffiliation` request object?
3. **Approval (Institution Side):** How does the institution see and approve this request?
4. **Propagation (Internship):** Once approved, does the system update the student's active internship to reflect this verified `institution_id`?

## 2. Proposed Correct Workflow (The "Happy Path")

### Phase A: Student Initiation

1. Student goes to **Profile/Settings**.
2. Selects "Claim Affiliation".
3. Searches for their University/College from a verified list.
4. Enters `Registration Number` and uploads `Admission Letter`.
5. **Action:** Submits Request.

   * *System State:* Creates `StudentAffiliation` record with status `PENDING`.

### Phase B: Institution Verification

1. Institution Admin logs in.
2. Navigates to **"Student Verification"** or **"Pending Affiliations"**.
3. Sees list of students claiming to belong to their institution.
4. Reviews `Registration Number` and `Admission Letter`.
5. **Action:** Clicks "Verify/Approve".

   * *System State:*

     * `StudentAffiliation` status -> `APPROVED`.

     * `Student.institution_id` -> Updated with Institution UUID.

     * `Student.trust_level` -> Increased (e.g., Tier 2).

### Phase C: Internship Linkage (The Missing Link)

* **Scenario:** Student already has an active internship *before* verification, or gets one *after*.

* **Logic:**

  * **If Active Internship Exists:** The system must strictly **back-propagate** the verified `institution_id` to the `InternshipApplication` record.

  * **If New Application:** The system must **auto-inject** the verified `institution_id` into the new application snapshot.

## 3. Implementation Plan

### Step 1: Audit & Fix Backend Models

* Check `StudentAffiliation` model structure.

* Ensure `Student` model has `institution` ForeignKey (or UUID).

* Verify `InternshipApplication` has `institution_id`.

### Step 2: Frontend "Claim Affiliation" Flow (Student)

* Build/Refine `StudentAffiliation.tsx`.

* Ensure it calls the correct endpoint to create a `StudentAffiliation` request.

### Step 3: Frontend "Verification" Flow (Institution)

* Build/Refine `StudentVerification.tsx` for Institution Admin.

* Ensure "Approve" action triggers the necessary state updates.

### Step 4: Bridge the Gap (Service Layer)

* **CRITICAL:** In `students/services.py` (specifically `verify_student_affiliation`), add logic to:

  1. Update the `Student` profile.
  2. **Find any active** **`InternshipApplication`** **for this student and update its** **`institution_id`.** This is the likely point of failure causing your `null` issue.

## 4. Next Actions

I will start by analyzing the current `students/models.py` and `students/services.py` to confirm my hypothesis about the missing propagation logic.

all implementations must adhere to the project rules **MUST**

