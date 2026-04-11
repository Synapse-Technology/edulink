# Beta Testing Guide: Error Handling System

## Overview

This guide instructs beta testers on how to verify the error handling system works correctly across all portals (Student, Employer, Institution, Admin) and scenarios.

---

## Section 1: Login Page Testing

### Test 1.1: Invalid Credentials (401 Error)

**What to test**: Authentication failure handling

**Steps**:
1. Navigate to Student Login page
2. Enter: email = `invalid@example.com`, password = `wrongpassword`
3. Click "Login"

**Expected Result**:
- ✅ See error message: "Incorrect email or password"
- ✅ Message appears in centered error box
- ✅ Form remains visible (not cleared)
- ✅ Login button is re-enabled

**Actual Result**: ___________

**Portal-Specific Check**:
- [ ] Student Portal: "Incorrect email or password"
- [ ] Employer Portal: "Invalid employer email or password"
- [ ] Institution Portal: "Invalid institution email or password"  
- [ ] Admin Portal: "Invalid admin email or password"

---

### Test 1.2: Validation Error - Missing Email (400 Error)

**What to test**: Client-side + backend validation

**Steps**:
1. Navigate to Student Registration
2. Leave email field empty
3. Enter password = `TestPass123`
4. Click "Register"

**Expected Result**:
- ✅ See field-level error: "Email is required."
- ✅ Email input highlighted/bordered in red
- ✅ Error appears below the email field
- ✅ Form not submitted to backend

**Actual Result**: ___________

**Screenshot**: [Attach screenshot of error display]

---

### Test 1.3: Validation Error - Invalid Email Format (400 Error)

**What to test**: Email format validation

**Steps**:
1. Navigate to Student Registration
2. Enter email = `notanemail`
3. Enter password = `TestPass123`
4. Click "Register"

**Expected Result**:
- ✅ See error: "Email must be valid"
- ✅ Form not submitted

**Actual Result**: ___________

---

### Test 1.4: Multiple Field Errors (400 Error)

**What to test**: Handling multiple validation errors

**Steps**:
1. Navigate to Student Registration
2. Leave all fields empty
3. Click "Register"

**Expected Result**:
- ✅ See errors displayed for each empty field:
  - Email: "Email is required."
  - Password: "Password is required."
  - Confirm Password: "Please confirm your password."
- ✅ All errors visible simultaneously
- ✅ Easy to identify which fields need correction

**Actual Result**: ___________

---

## Section 2: CRUD Operations Testing

### Test 2.1: Create Internship (Success Case)

**What to test**: Success path for form submission

**Steps**:
1. Login as Employer
2. Navigate to "Create Internship"
3. Fill all required fields
4. Click "Create"

**Expected Result**:
- ✅ See success toast: "Internship created successfully"
- ✅ Toast appears at top of page for 3 seconds
- ✅ Page redirects to internship detail page
- ✅ New internship visible in list

**Actual Result**: ___________

---

### Test 2.2: Create Internship with Validation Error (400 Error)

**What to test**: Form validation with backend error

**Steps**:
1. Login as Employer
2. Navigate to "Create Internship"
3. Enter invalid data (e.g., negative salary)
4. Click "Create"

**Expected Result**:
- ✅ See error fields highlighted
- ✅ Field-specific error messages shown
- ✅ Example: "Salary must be greater than 0"
- ✅ Form not cleared (allows user to fix)

**Actual Result**: ___________

---

### Test 2.3: Edit Internship - Conflict Error (409 Error)

**What to test**: Handling concurrent edits

**Scenario**: Two users editing same internship simultaneously

**Steps**:
1. Login as Employer in Browser A
2. Login as Employer2 in Browser B (same internship access)
3. In Browser A: Edit internship title to "New Title A"
4. In Browser B: Edit same internship title to "New Title B"
5. In Browser B: Click "Save" first
6. In Browser A: Click "Save"

**Expected Result**:
- ✅ Browser A shows dialog: "Data Changed"
- ✅ Dialog message: "The resource was modified. Please review the updated version."
- ✅ New data loads showing "New Title B"
- ✅ User can review and decide whether to re-apply their changes

**Actual Result**: ___________

---

### Test 2.4: Delete Resource - 404 Not Found

**What to test**: Handling deleted resources

**Steps**:
1. Login as Employer
2. Open internship detail page (keep it open)
3. In another tab, delete the same internship
4. In original tab, click any action button (Edit, Delete, etc.)

**Expected Result**:
- ✅ See error: "Internship no longer exists"
- ✅ Redirected to internship list page
- ✅ Resource removed from list

**Actual Result**: ___________

---

## Section 3: Authorization Testing

### Test 3.1: Insufficient Permissions (403 Error)

**What to test**: Authorization enforcement

**Steps**:
1. Login as Student account
2. Try to access Admin Dashboard (via URL: `/admin/dashboard`)
3. Or try to edit another user's profile

**Expected Result**:
- ✅ See error: "You don't have permission to access this resource"
- ✅ Redirected to appropriate page (login or home)
- ✅ No sensitive data exposed

**Actual Result**: ___________

---

### Test 3.2: Session Expired (401 + Redirect)

**What to test**: Session timeout handling

**Steps**:
1. Login successfully
2. Wait for token expiration (or manually clear localStorage token)
3. Try to perform any action (view, edit, create)

**Expected Result**:
- ✅ See message: "Session expired. Please log in again."
- ✅ Redirected to login page
- ✅ Original destination remembered (redirects back after login)

**Actual Result**: ___________

---

## Section 4: Server Error Testing

### Test 4.1: Server Error (500)

**What to test**: Graceful handling of unexpected errors

**Trigger** (Development Only):
- Temporarily modify backend to throw exception for specific action
- Or use network inspection to trigger error

**Steps**:
1. Attempt action that will cause 500 error
2. Observe response

**Expected Result**:
- ✅ See error: "Something went wrong. Please try again later."
- ✅ Retry button available
- ✅ Action can be retried

**Actual Result**: ___________

---

### Test 4.2: Network Error (Connection Timeout)

**What to test**: Network failure handling

**Tools**: Browser DevTools → Network → Throttle

**Steps**:
1. Open DevTools
2. Go to Network tab → Throttle to "Offline"
3. Try to perform any action
4. Resume network

**Expected Result**:
- ✅ See error: "Network error. Please check your connection."
- ✅ After network resumes, can retry
- ✅ No hung requests or warnings in console

**Actual Result**: ___________

---

## Section 5: Portal-Specific Testing

### Test 5.1: Student Portal - Apply to Internship (400)

**What to test**: Portal-specific error handling

**Steps**:
1. Login as Student
2. Find internship and click "Apply"
3. Leave required fields empty (portfolio, cover letter)
4. Click "Submit Application"

**Expected Result**:
- ✅ See student portal-specific error message
- ✅ Field errors indicate which items needed
- ✅ Not generic message, but specific to student context

**Actual Result**: ___________

---

### Test 5.2: Institution Portal - Approve Internship

**What to test**: Institution portal error handling

**Steps**:
1. Login as Institution
2. Go to "Internships Pending Approval"
3. Try to approve internship (simulate backend error)

**Expected Result**:
- ✅ Error message reflects institution context
- ✅ Approval list remains visible
- ✅ Can retry

**Actual Result**: ___________

---

## Section 6: Loading States

### Test 6.1: Loading Skeleton Display

**What to test**: User experiences smooth loading

**Steps**:
1. Login to Student Portal
2. Navigate to "My Applications"
3. Watch component load

**Expected Result**:
- ✅ See skeleton/placeholder while loading
- ✅ Skeleton looks like actual component structure
- ✅ No flash of unstyled content (FOUC)
- ✅ Real data replaces skeleton smoothly
- ⏱️ Load should take < 2 seconds

**Actual Result**: ___________

---

### Test 6.2: Loading State on Form Submission

**What to test**: Button state during submission

**Steps**:
1. Go to login page
2. Enter credentials
3. Click "Login"
4. **Watch the button immediately**: 

**Expected Result**:
- ✅ Button shows loading state (spinner or disabled)
- ✅ Button text changes to "Logging in..."
- ✅ Button is disabled (no double-submit)
- ✅ After success, button returns to normal

**Actual Result**: ___________

---

## Section 7: Accessibility Testing

### Test 7.1: Keyboard Navigation

**What to test**: Can use app without mouse

**Steps**:
1. Go to Login page
2. Press `Tab` key repeatedly
3. Navigate through: Email → Password → Remember Me → Login button
4. Try pressing `Enter` on Login button

**Expected Result**:
- ✅ Can reach all interactive elements via Tab
- ✅ Focus indicator visible on each element
- ✅ Can submit form via `Enter`
- ✅ No focus traps (can always Tab forward/backward)

**Actual Result**: ___________

---

### Test 7.2: Screen Reader - Error Messages

**What to test**: Screen reader announces errors properly

**Tools**: NVDA (Windows) or VoiceOver (Mac)

**Steps**:
1. Enable screen reader
2. Submit form with validation errors
3. Tab to error message

**Expected Result**:
- ✅ Screen reader announces: "Error: Email is required"
- ✅ Associated with form field properly
- ✅ Error announced when field focused

**Actual Result**: ___________

---

## Section 8: Cross-Browser Testing

### Test Matrix

| Browser | Login Test | Form Validation | Error Display | Loading State |
|---------|-----------|-----------------|---------------|---------------|
| Chrome Latest | ⬜ | ⬜ | ⬜ | ⬜ |
| Firefox Latest | ⬜ | ⬜ | ⬜ | ⬜ |
| Safari Latest | ⬜ | ⬜ | ⬜ | ⬜ |
| Mobile Safari | ⬜ | ⬜ | ⬜ | ⬜ |
| Chrome Mobile | ⬜ | ⬜ | ⬜ | ⬜ |

**Instructions**:
- ⬜ = Not tested
- ✅ = Works correctly
- ❌ = Issue found (note details below)

**Issues Found**:
```
Browser: _______
Issue: _______
Steps to reproduce: _______
Expected vs actual: _______
```

---

## Section 9: Performance Testing

### Test 9.1: Page Load Performance

**Tool**: DevTools → Lighthouse

**Steps**:
1. Open DevTools
2. Go to Lighthouse tab
3. Run audit for mobile + desktop

**Expected Results**:
- ⏱️ First Contentful Paint (FCP) < 1.5s
- ⏱️ Largest Contentful Paint (LCP) < 2.5s
- 📊 Performance score > 80
- ♿ Accessibility score > 80

**Actual Results**:
- FCP: _______
- LCP: _______
- Performance: _______
- Accessibility: _______

---

### Test 9.2: API Response Time

**What to test**: Endpoints respond in reasonable time

**Steps**:
1. Open DevTools → Network tab
2. Filter by XHR/Fetch
3. Perform common actions and check response times

**Expected Results**:
- ⏱️ Login endpoint: < 500ms
- ⏱️ List endpoints: < 1s
- ⏱️ Detail endpoints: < 500ms
- ⏱️ Create/Update: < 1s

**Actual Results**:
- Login: _______ ms
- Internship list: _______ ms
- Internship detail: _______ ms
- Create internship: _______ ms

---

## Section 10: Data Integrity Testing

### Test 10.1: Error Recovery

**What to test**: Data not lost on error

**Steps**:
1. Start filling out internship creation form
2. Enter some data (title, description, salary)
3. Trigger validation error (e.g., invalid dates)
4. See error message
5. Fix the error fields

**Expected Result**:
- ✅ Previously entered data NOT cleared
- ✅ Only error fields need correction
- ✅ User experience provides context

**Actual Result**: ___________

---

### Test 10.2: Offline Resilience

**What to test**: App handles offline gracefully

**Steps** (Mobile):
1. Open app with network on
2. Load some data
3. Put phone in airplane mode
4. Try to perform action
5. Resume network

**Expected Result**:
- ✅ Clear offline message (not confusing generic error)
- ✅ Data from before going offline still visible
- ✅ Can retry after network restored

**Actual Result**: ___________

---

## Section 11: Edge Cases

### Test 11.1: Empty Search Results

**Steps**:
1. Go to Internship search
2. Search for term with no results: "xyzabc123"

**Expected Result**:
- ✅ See message: "No internships match your search"
- ✅ Search box still visible for new search
- ✅ Not confused with error state

**Actual Result**: ___________

---

### Test 11.2: Very Long Field Values

**Steps**:
1. Try to enter 1000+ character text in input field
2. Try to submit

**Expected Result**:
- ✅ Input field gracefully handles long text
- ✅ Either truncates or shows error with character limit
- ✅ No UI breaking/overflow

**Actual Result**: ___________

---

### Test 11.3: Special Characters in Input

**Steps**:
1. Enter email: `test+special@example.com`
2. Enter name: `María García`
3. Enter description with emojis: `Great opportunity! 🎉`
4. Submit

**Expected Result**:
- ✅ Special characters accepted
- ✅ Unicode characters (accents) displayed correctly
- ✅ Emojis displayed correctly
- ✅ Data survives round-trip to backend

**Actual Result**: ___________

---

## Summary Checklist

### Core Functionality
- [ ] Test 1.1: Invalid credentials
- [ ] Test 1.2: Missing email
- [ ] Test 1.3: Invalid email format
- [ ] Test 1.4: Multiple field errors
- [ ] Test 2.1: Create success
- [ ] Test 2.2: Create validation error
- [ ] Test 2.3: Conflict handling
- [ ] Test 2.4: 404 Not found
- [ ] Test 3.1: Authorization (403)
- [ ] Test 3.2: Session expired (401)
- [ ] Test 4.1: Server error (500)
- [ ] Test 4.2: Network error

### Portal-Specific
- [ ] Test 5.1: Student portal error
- [ ] Test 5.2: Institution portal error

### User Experience
- [ ] Test 6.1: Loading skeleton
- [ ] Test 6.2: Form submission state
- [ ] Test 7.1: Keyboard navigation
- [ ] Test 7.2: Screen reader

### Quality Assurance
- [ ] Test 8: Cross-browser ✅ All 5 browsers
- [ ] Test 9.1: Page load performance
- [ ] Test 9.2: API response times
- [ ] Test 10.1: Error recovery
- [ ] Test 10.2: Offline resilience
- [ ] Test 11.1: Empty results
- [ ] Test 11.2: Long values
- [ ] Test 11.3: Special characters

---

## Bug Report Template

When you encounter an issue, use this template:

```
**Title**: [Short description of issue]

**Portal**: [Student/Employer/Institution/Admin]

**Severity**: [Critical/High/Medium/Low]

**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshots/Video**:
[Attach if possible]

**Environment**:
- Browser: [Chrome/Firefox/Safari/Mobile]
- OS: [Windows/Mac/iOS/Android]
- Timestamp: [When it occurred]

**Error Details**:
[Paste any console errors]
```

---

## Feedback Collection

**Survey Questions**:

1. How clear were error messages? (1-5 scale)
2. Could you recover easily from errors? (1-5 scale)
3. Did loading states set expectations? (1-5 scale)
4. Any confusing interactions?
5. Any performance issues noticed?
6. Overall experience? (1-5 scale)

---

## Success Criteria

Beta testing is successful if:
- ✅ >90% of tests pass across all browsers
- ✅ Zero critical bugs found
- ✅ Average error message clarity score > 4/5
- ✅ <2s page load time
- ✅ >80 Lighthouse accessibility score
- ✅ Testers rate experience > 4/5

---

**Document Version**: 1.0
**Last Updated**: Phase 10 (Documentation & Standards)
**Next Review**: After beta testing week 1
