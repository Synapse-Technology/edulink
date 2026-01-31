# Plan: Robust Bulk Student Verification

I have analyzed the current implementation and identified areas for improvement to make the bulk verification process more robust and aligned with the project's event-driven architecture.

## Current State Analysis
- **Frontend**: Already supports CSV upload, preview, and confirmation. It handles smart-matching for departments.
- **Backend Services**: `bulk_verify_students` exists but only handles existing student accounts. It skips students not yet registered.
- **Missing Features**: Pre-registration support for new students (Adoption Trigger) and persistence of registration numbers from the CSV.

## Implementation Strategy

### 1. Refactor Service Layer (`students/services.py`)
- **`bulk_verify_students`**: Enhance to update `registration_number` if provided in the CSV and record more granular ledger events.
- **`bulk_pre_register_students`**: Create a new service to handle emails in the CSV that don't have accounts yet. This will create "Placeholder" student records that auto-verify when the user signs up.
- **Atomicity**: Ensure all operations within a single student's processing are wrapped in a transaction, but allow the batch to continue if one student has a conflict.

### 2. Update View Layer (`institutions/views.py`)
- **`bulk_confirm`**: Update the endpoint to accept a more detailed payload (not just `student_ids`, but also `new_student_entries` containing email and reg numbers).
- **Orchestration**: Coordinate between verification of existing students and pre-registration of new ones.

### 3. Consistency & Rules
- **Ledger**: Every verification or pre-registration will emit a `STUDENT_VERIFIED` or `STUDENT_PRE_REGISTERED` event.
- **Domain Boundaries**: All `Student` and `Affiliation` writes remain inside the `students` app services.

## Technical Tasks
1. **Refactor `bulk_verify_students`** to handle `reg_number` updates.
2. **Implement `bulk_pre_register_students`** to create placeholder records.
3. **Update `InstitutionStudentVerificationViewSet`** to handle the dual-action payload.
4. **Update Serializers** to validate the new bulk confirmation payload.

Does this plan look suitable to you? If so, I will proceed with the implementation.
