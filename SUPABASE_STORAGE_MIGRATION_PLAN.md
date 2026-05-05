# Cloudinary → Supabase Storage Migration Plan

**Status**: Analysis & Planning Phase  
**Date**: May 5, 2026  
**Impact**: Production Storage Abstraction

---

## 1. Project Analysis

### Current Architecture
Edulink strictly follows the **APP LAYER BLUEPRINT** (per `.trae/rules/apprules.md`):
- **models.py** → State only (no behavior)
- **queries.py** → Read-only logic
- **services.py** → Write/business logic (where storage happens)
- **views.py** → Delivery mechanism, calls services

### Current Storage Usage (Cloudinary)

**File Types & Locations:**

| App | Model | Field | Upload Path | Type |
|-----|-------|-------|-------------|------|
| students | Student | profile_picture | `students/profile_pictures/` | ImageField |
| students | Student | cv | `students/cvs/` | FileField |
| students | Student | admission_letter | `students/admission_letters/` | FileField |
| students | Student | id_document | `students/id_documents/` | FileField |
| employers | Employer | logo | `employer_logos/` | ImageField |
| institutions | Institution | logo | `institution_logos/` | ImageField |
| institutions | InstitutionRequest | supporting_document | `institution_requests/` | FileField |
| internships | InternshipEvidence | file | `internships/evidence/` | FileField |
| internships | ExternalPlacement | proof_document | `internships/external_placement_proofs/` | FileField |
| support | SupportTicket | file | `support/attachments/` | FileField |
| reports | Artifact | file | `artifacts/%Y/%m/` | FileField |

**Total Upload Paths**: 11 distinct paths across 6 apps

### Current Cloudinary Issues

1. **401 Unauthorized on Private Resources** (just fixed)
   - Files stored as private by default
   - Unsigned URLs fail for authentication
   - Requires signed URL generation with API secrets
   - Workaround: Complex URL signing logic in `services.py`

2. **Missing Row-Level Security (RLS)**
   - No built-in access control
   - Authorization logic scattered across views/services
   - Hard to audit who can access what files

3. **Operational Complexity**
   - Separate API credentials to manage
   - Need for URL signing/expiration
   - Fallback error handling required
   - No native integration with Supabase auth

---

## 2. Why Supabase Storage?

### Advantages Over Cloudinary

| Aspect | Cloudinary | Supabase Storage |
|--------|-----------|------------------|
| **Cost** | Paid tier for storage | Included in Supabase plan |
| **RLS** | None (policy in code) | Native bucket policies |
| **Auth Integration** | Separate credentials | Uses JWT from Supabase |
| **Protocol** | REST API | S3-compatible + REST |
| **URL Security** | Manual signing required | RLS handles authorization |
| **File Access** | Public/private per URL | Per-bucket policies |
| **Maintenance** | External vendor | Integrated with DB |

### Architecture Benefits

**Before (Cloudinary):**
```
Views → Services → Cloudinary API
         ↓
    Custom URL signing
    Manual authorization checks
    Separate error handling
```

**After (Supabase Storage):**
```
Views → Services → Supabase Storage
                   (RLS policies enforce access)
```

---

## 3. Implementation Strategy

### Phase 1: Storage Setup (No Code Changes)

1. **Supabase Buckets**
   ```
   - students/
   - employers/
   - institutions/
   - internships/
   - support/
   - reports/
   ```

2. **RLS Policies Per Bucket**
   - `students/*` → Only student can read/write their own files
   - `employers/*` → Only employer staff can read/write
   - `institutions/*` → Only institution admins can read/write
   - `internships/*` → Only involved parties (student/supervisor/employer)
   - `support/*` → Only ticket creator/assignee
   - `reports/*` → Only student can read generated artifacts

### Phase 2: Django Configuration (1 dependency change)

**Install:**
```bash
pip install django-storages[s3]
```

**Update `requirements.txt`:**
```diff
- cloudinary==1.40.0
- django-cloudinary-storage==0.3.0
+ boto3==1.28.85
+ django-storages[s3]==1.14.2
```

**Update `prod.py` settings:**
```python
# Replace Cloudinary config with Supabase S3

STORAGES["default"] = {
    "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    "OPTIONS": {
        "access_key": os.environ.get("SUPABASE_S3_ACCESS_KEY"),
        "secret_key": os.environ.get("SUPABASE_S3_SECRET_KEY"),
        "storage_bucket_name": os.environ.get("SUPABASE_S3_BUCKET"),
        "endpoint_url": os.environ.get("SUPABASE_S3_ENDPOINT"),
        "region_name": "auto",  # Supabase uses 'auto'
        "use_ssl": True,
        "verify": True,
    }
}
```

### Phase 3: Service Layer Adjustments (if needed)

**Current code in `reports/services.py`:**
```python
# _get_signed_cloudinary_url() → DELETE (Supabase handles this)
# _get_artifact_url() → SIMPLIFY (direct URL, RLS enforces access)
# resolve_artifact_file_for_download() → SIMPLIFY (no signing logic)
```

**New simplified version:**
```python
def resolve_artifact_file_for_download(*, artifact):
    """
    Resolve artifact binary content from Supabase Storage.
    RLS policies automatically enforce access control.
    """
    if not artifact.file or not artifact.file.name:
        raise NotFoundError(user_message="File not found")
    
    try:
        # Direct file access - RLS policy enforces authorization
        return "stream", artifact.file.storage.open(artifact.file.name, mode="rb")
    except FileNotFoundError:
        raise NotFoundError(user_message="File not found")
    except Exception as exc:
        logger.exception(f"Failed to read artifact {artifact.id}")
        raise
```

---

## 4. Adherence to Project Rules

### ✅ `apprules.md` Compliance

**models.py** (No changes needed)
- Files stored as FileField/ImageField (state only) ✓
- No business logic in models ✓

**queries.py** (No changes needed)
- Read-only operations unaffected ✓

**services.py** (Minor cleanup)
- Storage logic stays here ✓
- Remove URL signing complexity ✓
- Lean on RLS instead of manual checks ✓

**views.py** (No changes needed)
- Views still call services, unaware of storage backend ✓

### ✅ `backend.md` Compliance

**Domain Boundaries**
- Each app keeps its own upload paths ✓
- Storage is a shared utility (like ledger) ✓

**Service Layer**
- All file operations remain in services.py ✓
- Views unchanged ✓

**Events Over Flags**
- No status changes from storage migration ✓
- Ledger events unaffected ✓

---

## 5. Migration Steps

### Step 1: Supabase Setup (One-time)

```bash
# 1. Login to Supabase dashboard
# 2. Go to Storage section
# 3. Create buckets: students, employers, institutions, internships, support, reports
# 4. Go to Settings → API → S3 Config
# 5. Copy access keys (provided in API keys section)
# 6. Set environment variables:

export SUPABASE_S3_ACCESS_KEY="your_key"
export SUPABASE_S3_SECRET_KEY="your_secret"
export SUPABASE_S3_BUCKET="your_bucket"
export SUPABASE_S3_ENDPOINT="https://zpxwwmjczotdbzupesqv.storage.supabase.co/storage/v1/s3"
```

### Step 2: Prepare Django (Local Testing)

```bash
# 1. Update requirements.txt
# 2. Install dependencies
pip install -r requirements.txt

# 3. Test with local settings
DJANGO_SETTINGS_MODULE=edulink.config.settings.dev python manage.py shell
>>> from django.core.files.storage import storages
>>> default_storage = storages['default']
>>> # Should connect to Supabase
```

### Step 3: Migration Script (Existing Files)

Create `edulink/management/commands/migrate_cloudinary_to_supabase.py`:

```python
from django.core.management.base import BaseCommand
from django.core.files.storage import storages
import io

class Command(BaseCommand):
    def handle(self, *args, **options):
        """Migrate all files from Cloudinary to Supabase Storage"""
        new_storage = storages['default']
        
        # Student files
        students = Student.objects.exclude(
            profile_picture='', cv='', admission_letter='', id_document=''
        )
        
        for student in students:
            for field_name in ['profile_picture', 'cv', 'admission_letter', 'id_document']:
                file_field = getattr(student, field_name)
                if file_field:
                    self._migrate_file(file_field, new_storage)
        
        # Similar for: Employer.logo, Institution.logo, 
        #             InternshipEvidence.file, ExternalPlacement.proof_document,
        #             SupportTicket.file, Artifact.file
        
        self.stdout.write("Migration complete!")
    
    def _migrate_file(self, file_field, storage):
        """Copy file from old storage to new storage"""
        old_name = file_field.name
        if not old_name:
            return
        
        try:
            with file_field.open('rb') as f:
                content = f.read()
            storage.save(old_name, io.BytesIO(content))
            self.stdout.write(f"✓ Migrated {old_name}")
        except Exception as e:
            self.stdout.write(f"✗ Failed {old_name}: {e}")
```

### Step 4: Deploy

```bash
# 1. Commit code changes
git add requirements.txt edulink/config/settings/prod.py
git commit -m "Migrate storage from Cloudinary to Supabase

- Replace cloudinary-storage with django-storages S3 backend
- Add Supabase S3 configuration to prod settings
- Simplify artifact download (RLS handles authorization)
- Remove signed URL logic (no longer needed)"

# 2. Deploy to staging/production
git push origin staging

# 3. On production server:
# - Set environment variables (SUPABASE_S3_*)
# - Create Supabase buckets with RLS policies
# - Run migration: python manage.py migrate_cloudinary_to_supabase
# - Verify file access
# - Cut over DNS/load balancer
```

---

## 6. Code Changes Summary

### Files to Modify

1. **`requirements.txt`**
   - Remove: `cloudinary`, `django-cloudinary-storage`
   - Add: `boto3`, `django-storages[s3]`

2. **`config/settings/prod.py`**
   - Remove: `CLOUDINARY_STORAGE` config
   - Add: Supabase S3 storage backend
   - Remove: `cloudinary_storage`, `cloudinary` from INSTALLED_APPS

3. **`apps/reports/services.py`** (Optional cleanup)
   - Remove: `_get_signed_cloudinary_url()` function
   - Simplify: `resolve_artifact_file_for_download()`
   - Keep: `_get_artifact_url()` for fallback

4. **New file: `management/commands/migrate_cloudinary_to_supabase.py`**
   - Batch migrate existing files
   - Log progress and errors

### Files NO CHANGE Needed

- All model definitions (FileField/ImageField paths stay the same)
- All serializers (file handling unchanged)
- All views (storage is abstracted)
- All queries (read-only, unaffected)

---

## 7. RLS Policy Examples

### Supabase Storage → SQL Editor

```sql
-- Policy 1: Students can only read/write their own files
CREATE POLICY "Students own data"
ON storage.objects FOR ALL
USING (
  bucket_id = 'students' 
  AND auth.uid()::text = (
    SELECT id FROM students WHERE profile_id = auth.uid()::text LIMIT 1
  )
);

-- Policy 2: Employers can read their own files
CREATE POLICY "Employers own data"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employers' 
  AND auth.uid()::text = (
    SELECT id FROM employers WHERE user_id = auth.uid()::text LIMIT 1
  )
);

-- Similar patterns for all buckets...
```

---

## 8. Rollback Plan

If issues arise:

```bash
# Quick rollback (keep Supabase setup, switch storage backend):
git revert <commit-hash>
# Or manually restore prod.py to use Cloudinary
INSTALLED_APPS restore cloudinary_storage, cloudinary
pip install cloudinary django-cloudinary-storage
# Redeploy
```

**Data Safety**: 
- Old Cloudinary files remain in Cloudinary (not deleted)
- Supabase files are copies
- Dual-write period possible if needed

---

## 9. Testing Checklist

- [ ] Supabase buckets created
- [ ] RLS policies configured correctly
- [ ] Environment variables set
- [ ] Local dev environment tests file upload/download
- [ ] Staging environment tests all file operations
- [ ] Migration script runs without errors
- [ ] File permissions verified (can't access unauthorized files)
- [ ] URLs resolve correctly
- [ ] Reports can be generated and downloaded
- [ ] Student documents upload successfully

---

## 10. Timeline Estimate

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Supabase bucket/policy setup | 30 min |
| 2 | Code updates (requirements, settings, services) | 1-2 hours |
| 3 | Local testing | 1-2 hours |
| 4 | Migration script development & testing | 2-3 hours |
| 5 | Staging deployment & verification | 1-2 hours |
| 6 | Production deployment | 30 min - 1 hour |
| **Total** | | **6-11 hours** |

---

## Next Steps

1. ✅ Review this plan
2. ⏳ Set up Supabase buckets (confirm you have project at `zpxwwmjczotdbzupesqv`)
3. ⏳ Generate S3 access keys in Supabase dashboard
4. ⏳ Proceed with Step-by-step implementation

