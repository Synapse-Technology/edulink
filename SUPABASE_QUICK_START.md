# Supabase Storage Migration - Quick Reference

## Current Status
✅ **Phase 2 (Code)**: Complete  
⏳ **Phase 1 (Setup)**: Ready to begin

## Commit Hash
```
2ff5943 - Migrate storage from Cloudinary to Supabase Storage
```

## What Changed
1. **requirements.txt** - Cloudinary → django-storages[s3] + boto3
2. **prod.py** - Supabase S3 storage backend
3. **reports/services.py** - Removed URL signing logic
4. **Management command** - `migrate_to_supabase_storage` (in platform_admin)

## Files Modified
```
M  requirements.txt
M  edulink/config/settings/prod.py
M  edulink/apps/reports/services.py
+  edulink/apps/platform_admin/management/commands/migrate_to_supabase_storage.py
+  SUPABASE_STORAGE_MIGRATION_PLAN.md
+  PHASE_2_SUPABASE_MIGRATION_COMPLETE.md (this file)
```

## To Proceed with Phase 1

### Step 1: Create Supabase Buckets
Go to Supabase Dashboard → Storage → New Bucket

Create these buckets:
- `students` (for profile pictures, CVs, documents)
- `employers` (for logos)
- `institutions` (for logos, requests)
- `internships` (for evidence, proofs)
- `support` (for ticket attachments)
- `reports` (for generated PDFs)

### Step 2: Generate S3 API Keys
Settings → API → S3 Configs → Generate new key

Copy:
- Access Key
- Secret Key
- Endpoint URL (should be like: `https://zpxwwmjczotdbzupesqv.storage.supabase.co/storage/v1/s3`)

### Step 3: Set Environment Variables
```bash
export SUPABASE_S3_ACCESS_KEY="your_key"
export SUPABASE_S3_SECRET_KEY="your_secret"
export SUPABASE_S3_ENDPOINT="https://zpxwwmjczotdbzupesqv.storage.supabase.co/storage/v1/s3"
export SUPABASE_S3_BUCKET="edulink-files"
```

### Step 4: Test Locally
```bash
cd /home/bouric/Documents/projects/edulink
source .venv/bin/activate

# Dry run (preview)
python edulink/manage.py migrate_to_supabase_storage --dry-run

# If looks good, execute
python edulink/manage.py migrate_to_supabase_storage
```

### Step 5: Verify
- Check Supabase Storage buckets for files
- Test file uploads in app
- Test file downloads (artifacts, CVs, etc.)

## Rollback (if needed)
```bash
git revert 2ff5943
# or restore old config:
git checkout eb8c9cf -- requirements.txt edulink/config/settings/prod.py
```

## Key Environment Variables Required

**Local Development** (use local FileSystemStorage - fallback):
- None required, will use local media/ folder

**Staging/Production**:
```
SUPABASE_S3_ACCESS_KEY=...
SUPABASE_S3_SECRET_KEY=...
SUPABASE_S3_ENDPOINT=https://zpxwwmjczotdbzupesqv.storage.supabase.co/storage/v1/s3
SUPABASE_S3_BUCKET=edulink-files
```

## Migration Command Reference

```bash
# Preview (no changes)
python manage.py migrate_to_supabase_storage --dry-run

# Execute all
python manage.py migrate_to_supabase_storage

# Specific app only
python manage.py migrate_to_supabase_storage --app students
python manage.py migrate_to_supabase_storage --app reports

# Verbose output
python manage.py migrate_to_supabase_storage --verbose

# Dry-run + verbose
python manage.py migrate_to_supabase_storage --dry-run --verbose
```

## Files Ready to Migrate
```
18x artifacts (reports/Artifact.file)
2x student files (student CV, profile picture)
Total: 20 files ready to migrate
```

## Estimated Timeline
- Supabase setup: 15-30 min
- Test migration: 10-15 min
- Deploy to production: 10-20 min
- Total: ~1 hour

## Support
See detailed plan: `SUPABASE_STORAGE_MIGRATION_PLAN.md`
See implementation notes: `PHASE_2_SUPABASE_MIGRATION_COMPLETE.md`
