# 🧪 Artifacts API Testing Guide

**Status**: ✅ Backend Ready | ✅ Frontend Built | 📝 Testing Phase

---

## ✅ Completed Setup
- [x] Backend migrations applied
- [x] Django server running on `http://localhost:8000`
- [x] Frontend successfully built
- [x] Routes properly configured

---

## Quick Test Using cURL

### Step 1: Get Authentication Token
```bash
# Login with a valid student account
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email":"student@example.com",
    "password":"your-password"
  }'

# Response:
# {
#   "tokens": {
#     "access": "eyJ0eXAiOiJKV1QiLC...",
#     "refresh": "eyJ0eXAiOiJKV1QiLC..."
#   },
#   "user": {...}
# }

# Save the access token:
export TOKEN="your-access-token-here"
```

### Step 2: Get Active Internship (Application ID)
```bash
curl -X GET http://localhost:8000/api/students/internship/ \
  -H "Authorization: Bearer $TOKEN"

# Response will show internship details with "id" field
export APP_ID="internship-uuid-here"
```

### Step 3: Generate Certificate
```bash
curl -X POST http://localhost:8000/api/reports/artifacts/generate/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"application_id\":\"$APP_ID\",
    \"artifact_type\":\"CERTIFICATE\"
  }"

# Response:
# {
#   "id": "artifact-uuid",
#   "status": "PENDING",
#   "artifact_type": "CERTIFICATE",
#   "tracking_code": "ABC123XYZ789",
#   ...
# }

export ARTIFACT_ID="artifact-uuid-here"
```

### Step 4: Poll Status (Until SUCCESS)
```bash
# Run this multiple times until status changes to SUCCESS
curl -X GET "http://localhost:8000/api/reports/artifacts/status/$ARTIFACT_ID/" \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "id": "artifact-uuid",
#   "status": "PROCESSING",
#   "completed_at": null,
#   "error_message": null,
#   "artifact_type": "CERTIFICATE"
# }
```

### Step 5: Download the PDF
```bash
curl -X GET "http://localhost:8000/api/reports/artifacts/$ARTIFACT_ID/download/" \
  -H "Authorization: Bearer $TOKEN" \
  -o /tmp/certificate.pdf

# Check file was created
ls -lh /tmp/certificate.pdf
```

### Step 6: Test Public Verification (No Login!)
```bash
# This works WITHOUT authentication - perfect for sharing
curl -X GET "http://localhost:8000/api/reports/artifacts/verify/$ARTIFACT_ID/"

# Response shows:
# {
#   "verified": true,
#   "artifact_type": "CERTIFICATE",
#   "student_name": "John Doe",
#   "generated_at": "2024-04-11T17:30:00Z",
#   "tracking_code": "ABC123XYZ789",
#   "ledger_hash": "sha256hash...",
#   "ledger_timestamp": "2024-04-11T17:30:05Z"
# }
```

---

## Frontend Testing

### 1. Start Frontend Dev Server
```bash
cd ~/Documents/projects/edulink/edulink-frontend
npm run dev
# Runs on http://localhost:5173
```

### 2. Test Complete Flow
1. **Login as Student** with completed/certified internship
2. **Navigate to** "My Internship" page
3. **Verify** "Professional Artifacts" section appears
4. **Click "Generate Certificate"**
   - Watch loading state
   - Status should change to "SUCCESS"
   - Check if auto-download triggers
5. **Certificate appears** in "Your Generated Artifacts" list
6. **Click "Share"** button
   - Modal appears
   - Copy verification link
7. **Test Verification Link**
   - Open link in incognito/private window
   - Should load without login
   - Shows all artifact details

---

## Testing Checklist

### 🔧 Backend API Tests
- [ ] Generate Certificate successfully
- [ ] Status polling returns updates
- [ ] Downloaded PDF file exists and opens
- [ ] Public verification endpoint works (no token)
- [ ] Permission denied when accessing others' artifacts
- [ ] Logbook Report generation works
- [ ] Performance Summary generation works

### 🎨 Frontend UI Tests
- [ ] StudentInternship page loads with COMPLETED status
- [ ] "Professional Artifacts" section visible
- [ ] Generate buttons are clickable
- [ ] Loading spinner shows during generation
- [ ] Toast notifications appear
- [ ] Artifacts list updates after generation
- [ ] Auto-download triggers for certificate
- [ ] Share modal opens and closes properly
- [ ] Copy button works (verify with clipboard)
- [ ] Dark mode styling works
- [ ] Mobile responsive (test on 375px, 768px, 1024px)

### 🔐 Security Tests
- [ ] Student cannot access other students' artifacts (403)
- [ ] Verification page works at `/verify/{id}` (no auth)
- [ ] Download requires authentication (401 without token)
- [ ] Rate limiting works (can't gen same artifact 3+ times)
- [ ] Public endpoint doesn't expose sensitive data

### ⚠️ Error Handling Tests
- [ ] Invalid artifact ID shows error
- [ ] Network timeout handled gracefully
- [ ] Missing internship shows proper message
- [ ] Permission denied displays correctly
- [ ] PDF generation failure shows error toast

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -i :8000

# Kill the process if needed
kill -9 <pid>

# Restart
cd ~/Documents/projects/edulink/edulink
python manage.py runserver
```

### Migrations not applied
```bash
python manage.py migrate reports --plan  # See what would be applied
python manage.py migrate reports         # Apply them
```

### PDF generation fails
```bash
# Check ReportLab is installed
pip list | grep reportlab

# Install if missing
pip install reportlab

# Test PDF generation
python manage.py shell
>>> from edulink.apps.reports.services import _generate_certificate_native
>>> # Test function in isolation
```

### Frontend build errors
```bash
cd ~/Documents/projects/edulink/edulink-frontend
npm install  # Reinstall deps
npm run build # Rebuild
```

### Verification page shows 404
```bash
# Check route is in App.tsx
grep -n "verify.*artifactId" src/App.tsx

# Should show: <Route path="/verify/:artifactId" element={<VerifyArtifact />} />
```

---

## API Endpoints Reference

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/reports/artifacts/generate/` | ✅ | Generate new artifact |
| GET | `/api/reports/artifacts/` | ✅ | List all user artifacts |
| GET | `/api/reports/artifacts/{id}/` | ✅ | Get artifact details |
| GET | `/api/reports/artifacts/{id}/download/` | ✅ | Download PDF |
| GET | `/api/reports/artifacts/status/{id}` | ✅ | Check generation status |
| GET | `/api/reports/artifacts/verify/{id}` | ❌ | Public verification (no auth) |

---

## Next After Testing

1. **Test All Three Artifact Types** (Certificate, Logbook, Performance)
2. **Permission Testing** (different user roles)
3. **Rate Limiting** (try generating same artifact 4 times)
4. **Deploy to Staging** (run against staging DB)
5. **Load Testing** (concurrent generation requests)
6. **Mobile Testing** (responsive design)

---

## Important Notes

- ⚠️ **Artifacts require COMPLETED/CERTIFIED internship status**
- ⚠️ **Verification links are permanent** (no expiry currently)
- ⚠️ **Rate limits**: Max 2x Certificate, 5x others per application
- ⚠️ **PDFs stored** in `MEDIA_ROOT` (configure in production)
- ⚠️ **Public endpoint** doesn't show PDF file content, only metadata

---

**Test Status**: Ready to begin
**Backend**: Running ✅
**Frontend**: Built ✅
**Database**: Migrated ✅
