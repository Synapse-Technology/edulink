# Cloudinary Artifact Download 401 Error - Fix

## Problem
When downloading artifacts (logbook reports), the system returned **HTTP 500** with underlying **401 Unauthorized** from Cloudinary:

```
urllib.error.HTTPError: HTTP Error 401: Unauthorized
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: https://res.cloudinary.com/...
```

### Root Cause
- Artifacts uploaded to Cloudinary are stored as **private resources** by default
- The code attempted to fetch them using **unsigned URLs**
- Cloudinary rejected unsigned URL requests to private resources with 401

## Solution
Modified [edulink/apps/reports/services.py](edulink/apps/reports/services.py) to:

1. **Generate signed Cloudinary URLs** using API credentials before attempting download
2. **Gracefully fallback** to unsigned URLs if signing unavailable
3. **Better error handling** for HTTP 401 vs 404 scenarios

### Changes Made

#### 1. Added Cloudinary Import (lines 12-14)
```python
try:
    import cloudinary
except ImportError:
    cloudinary = None
```

#### 2. New Helper Functions

**`_get_signed_cloudinary_url(artifact)`** - Lines 96-126
- Detects if using Cloudinary storage
- Generates signed URL valid for 1 hour
- Uses cloudinary API with `sign_url=True`
- Returns None if not Cloudinary or signing fails

**`_get_artifact_url(artifact)`** - Lines 128-132
- Fallback to standard artifact.file.url
- Wrapped in try/except for safety

#### 3. Updated Main Function
**`resolve_artifact_file_for_download()`** - Lines 51-93
- Now calls `_get_signed_cloudinary_url()` first
- Falls back to `_get_artifact_url()` if signing unavailable
- Improved 401 error logging for debugging

## Deployment Steps

1. **Code Deploy**: Push changes to [edulink/apps/reports/services.py](edulink/apps/reports/services.py)

2. **No Database Migrations**: This is a code-only fix, no model changes

3. **No Environment Changes**: Uses existing Cloudinary credentials already configured:
   - `CLOUDINARY_CLOUD_NAME` ✓
   - `CLOUDINARY_API_KEY` ✓
   - `CLOUDINARY_API_SECRET` ✓

4. **Verify**: After deploy, test artifact generation and download:
   ```
   POST /api/reports/artifacts/generate/  → 201 Created
   GET /api/reports/artifacts/{id}/download/  → 200 OK (PDF download)
   ```

## How It Works

```
User requests: GET /api/reports/artifacts/{id}/download/
    ↓
Try storage.open() (local Cloudinary storage driver)
    ↓ [FAILS: 401]
Try _get_signed_cloudinary_url()
    ↓ [SUCCESS]
Generate: https://res.cloudinary.com/.../...?signature=...&expires=...
    ↓
urlopen(signed_url)
    ↓ [SUCCESS: 200]
Return PDF file
```

## Fallback Behavior
- If Cloudinary not configured → uses unsigned URL (for dev environments)
- If signing fails → tries unsigned URL as fallback
- If both fail → returns 500 with clear error message

## Testing Checklist
- [x] Code updated with signed URL generation
- [x] Backward compatible (fallback to unsigned URLs)
- [x] Error logging improved
- [x] No dependencies added (cloudinary already installed)

## Files Changed
- [edulink/apps/reports/services.py](edulink/apps/reports/services.py)
  - Added cloudinary import
  - Added `_get_signed_cloudinary_url()` helper
  - Added `_get_artifact_url()` helper
  - Updated `resolve_artifact_file_for_download()` main function
