# Phase 1: Supabase Storage Setup & File Migration

**Date**: May 5, 2026  
**Project ID**: `zpxwwmjczotdbzupesqv`  
**Status**: In Progress

---

## Step 1: Create Supabase Storage Buckets

You'll need to create 6 buckets in your Supabase dashboard.

### Instructions:

1. **Go to Supabase Dashboard**
   - URL: https://app.supabase.com
   - Select your project: `zpxwwmjczotdbzupesqv`

2. **Navigate to Storage**
   - Left sidebar → Storage

3. **Create Bucket: `students`**
   - Click "New bucket"
   - Name: `students`
   - Access: Private (important - RLS will control access)
   - Create

4. **Create Bucket: `employers`**
   - Name: `employers`
   - Access: Private
   - Create

5. **Create Bucket: `institutions`**
   - Name: `institutions`
   - Access: Private
   - Create

6. **Create Bucket: `internships`**
   - Name: `internships`
   - Access: Private
   - Create

7. **Create Bucket: `support`**
   - Name: `support`
   - Access: Private
   - Create

8. **Create Bucket: `reports`**
   - Name: `reports`
   - Access: Private
   - Create

✅ **Result**: You should see 6 buckets in Storage panel

---

## Step 2: Generate S3 API Credentials

1. **Go to Settings**
   - Left sidebar → Settings

2. **Click on "API"**
   - Tab: Configuration

3. **Find "S3 Object Storage" Section**
   - Click "S3 Configuration"

4. **Generate Access Keys**
   - Click "Generate new key"
   - Copy and save:
     - **Access Key ID** (looks like `a1b2c3d4e5...`)
     - **Secret Access Key** (long string)

5. **Copy Endpoint**
   - Look for: `Endpoint`
   - Should be: `https://zpxwwmjczotdbzupesqv.storage.supabase.co/storage/v1/s3`

✅ **Result**: You have 3 credentials ready:
- Access Key
- Secret Key  
- Endpoint URL

---

## Step 3: Set Environment Variables

Replace with your actual credentials from Step 2:

```bash
export SUPABASE_S3_ACCESS_KEY="your_access_key_id"
export SUPABASE_S3_SECRET_KEY="your_secret_access_key"
export SUPABASE_S3_ENDPOINT="https://zpxwwmjczotdbzupesqv.storage.supabase.co/storage/v1/s3"
export SUPABASE_S3_BUCKET="edulink-files"
```

### To Persist (Optional - for future sessions):

Add to `~/.zshrc`:
```bash
export SUPABASE_S3_ACCESS_KEY="your_access_key_id"
export SUPABASE_S3_SECRET_KEY="your_secret_access_key"
export SUPABASE_S3_ENDPOINT="https://zpxwwmjczotdbzupesqv.storage.supabase.co/storage/v1/s3"
export SUPABASE_S3_BUCKET="edulink-files"
```

Then reload:
```bash
source ~/.zshrc
```

---

## Step 4: Verify Configuration (Dry Run)

```bash
cd /home/bouric/Documents/projects/edulink
source .venv/bin/activate

# Test with dry-run (no changes)
python edulink/manage.py migrate_to_supabase_storage --dry-run
```

**Expected output:**
```
🔍 Dry-run mode (no changes will be made)
Target storage: S3Boto3Storage

📦 STUDENTS
  📄 Student.profile_picture: 1 file(s) → WOULD MIGRATE
  📄 Student.cv: 1 file(s) → WOULD MIGRATE

📦 REPORTS
  📄 Artifact.file: 16 file(s) → WOULD MIGRATE

✓ Migration Summary:
  📋 Would migrate: 18 files
  ⊘ Skipped: 0
  ✗ Failed: 0
```

---

## Step 5: Execute Migration

Once dry-run looks good:

```bash
python edulink/manage.py migrate_to_supabase_storage
```

**Expected:**
```
✓ Migration in progress...
📦 STUDENTS
  📄 Student.profile_picture: 1 file(s)
    ✓ Progress: 1/1

📦 REPORTS
  📄 Artifact.file: 16 file(s)
    ✓ Progress: 5/16
    ✓ Progress: 10/16
    ✓ Progress: 15/16

==================================================
✓ Migration Summary:
  ✓ Migrated: 18
  ⊘ Skipped: 0
  ✗ Failed: 0
==================================================
```

---

## Step 6: Verify Files in Supabase

1. **Go to Supabase Storage**
2. **Check each bucket** for files:
   - `students/` → profile_pictures/, cvs/
   - `reports/` → artifacts/2026/05/, artifacts/2026/04/

3. **Download test**
   - Click on a file
   - Try "Download" to verify access

---

## Step 7: Test in Application

1. **Upload a new file** (e.g., student CV)
   - Should go to Supabase automatically

2. **Download artifact** from app
   - Should work without 401 errors

3. **Check old Cloudinary files**
   - Still there (migration didn't delete them)

---

## Troubleshooting

### Error: "Authentication Failed"
- ❌ Check credentials are correct
- ✅ Re-copy from Supabase dashboard

### Error: "Bucket not found"
- ❌ Check bucket names match exactly (lowercase)
- ✅ Verify all 6 buckets created

### Error: "403 Forbidden"
- ❌ Check S3 credentials permissions
- ✅ Generate new key in Supabase if needed

### Command not found: "migrate_to_supabase_storage"
- ❌ Venv not activated or code not pulled
- ✅ Run: `source .venv/bin/activate`
- ✅ Pull latest: `git pull origin staging`

### Dry-run shows 0 files
- ✅ This is fine (means migration would be empty)
- ✅ Actual files only show if they exist in current storage

---

## Rollback (if needed)

```bash
# Remove all files from Supabase
# Go to each bucket in dashboard and delete

# Or restore to Cloudinary config:
git checkout eb8c9cf -- requirements.txt edulink/config/settings/prod.py
pip install -r requirements.txt

# Files remain in Cloudinary, app switches back to using them
```

---

## Next Steps After Migration

1. ✅ Files migrated to Supabase
2. ✅ New uploads go to Supabase automatically
3. ⏳ Configure RLS policies (optional, for extra security)
4. ⏳ Deploy to production with env vars set
5. ⏳ Monitor file access for any issues

---

## Environment Variables Quick Ref

**Development** (local - uses FileSystemStorage):
- No env vars needed
- Uses local `media/` folder

**Staging/Production** (with Supabase):
```bash
SUPABASE_S3_ACCESS_KEY=<from dashboard>
SUPABASE_S3_SECRET_KEY=<from dashboard>
SUPABASE_S3_ENDPOINT=https://zpxwwmjczotdbzupesqv.storage.supabase.co/storage/v1/s3
SUPABASE_S3_BUCKET=edulink-files
```

---

**Status**: Ready to execute Phase 1

