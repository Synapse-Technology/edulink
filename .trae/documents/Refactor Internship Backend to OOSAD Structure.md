# Refactor Internship Module to OOSAD Standards

## 1. Model Refactoring (`apps/internships/models.py`)
- **Rename/Clarify `Internship`**: 
  - Ideally rename to `InternshipOpportunity`.
  - Remove fields related to specific student applications (e.g., `application_snapshot` should move).
- **Create `InternshipApplication`**:
  - **Fields**:
    - `opportunity`: ForeignKey to `InternshipOpportunity`.
    - `student`: ForeignKey to `Student`.
    - `status`: Enum (`APPLIED`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`, `CERTIFIED`).
    - `application_snapshot`: JSONField (stores CV/Skills at time of application).
    - `created_at`, `updated_at`.
  - **Constraints**: Unique constraint on `(opportunity, student)`.

## 2. Service Layer Split (`apps/internships/services.py`)
- **`OpportunityService`**:
  - `create_opportunity(provider, data)`
  - `close_opportunity(opportunity_id)`
- **`ApplicationService`**:
  - `apply(student, opportunity_id)` -> Creates `InternshipApplication`.
  - `update_status(application_id, new_status, actor)` -> Handles transitions (Shortlist, Accept).

## 3. Selector/Query Layer Update (`apps/internships/selectors.py`)
- Create dedicated selectors:
  - `get_opportunities_for_provider(provider_id)`
  - `get_applications_for_opportunity(opportunity_id)`
  - `get_student_applications(student_id)`

## 4. API/View Layer Adaptation (`apps/internships/views.py`)
- **`OpportunityViewSet`**: CRUD for posting jobs.
- **`ApplicationViewSet`**:
  - `POST /apply`: Student applies.
  - `POST /{id}/status`: Provider updates status.

## 5. Migration Strategy
- Since this is a dev environment, we can likely reset the DB or write a migration script to move existing "Student Internships" to the new "InternshipApplication" table.
