# ✅ Manual Testing Checklist - Pre-Production

**Date:** 2025-11-24
**Tester:** _____________
**Environment:** Production (https://nnh.ae)
**Browsers:** Chrome, Safari, Firefox
**Devices:** Desktop, Mobile (iOS/Android)

---

## 📋 Testing Phases

### Phase 1: Critical Authentication & Security (30 min) ⚡ CRITICAL
### Phase 2: Core GMB Features (45 min) ⚡ CRITICAL
### Phase 3: AI Features (30 min) ⚡ CRITICAL
### Phase 4: UI/UX & i18n (20 min)
### Phase 5: Edge Cases & Error Handling (15 min)

**Total Estimated Time:** ~2.5 hours

---

## 🔐 Phase 1: Authentication & Security (30 min)

### 1.1 Sign Up Flow
- [ ] Go to `/en/auth/signup`
- [ ] Enter new email: `test-[timestamp]@example.com`
- [ ] Enter password: `Test123!@#` (strong password)
- [ ] Enter full name: `Test User`
- [ ] Click "Sign Up"
- [ ] **Expected:** Email verification sent message
- [ ] **Expected:** User created in database
- [ ] **Check:** No errors in browser console
- [ ] **Check:** No errors in Sentry

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 1.2 Email Verification
- [ ] Check email inbox
- [ ] Click verification link
- [ ] **Expected:** Redirected to `/auth/callback`
- [ ] **Expected:** Then redirected to dashboard
- [ ] **Expected:** User is logged in
- [ ] **Check:** Session cookie set

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 1.3 Sign In Flow
- [ ] Sign out first
- [ ] Go to `/en/auth/login`
- [ ] Enter correct email & password
- [ ] Check "Remember Me"
- [ ] Click "Sign In"
- [ ] **Expected:** Redirected to `/en/dashboard`
- [ ] **Expected:** User logged in successfully
- [ ] **Check:** Session persists after browser close

**Test Invalid Credentials:**
- [ ] Try wrong password
- [ ] **Expected:** "Invalid credentials" error
- [ ] **Expected:** No redirect

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 1.4 OAuth (Google) Flow
- [ ] Sign out
- [ ] Go to `/en/auth/login`
- [ ] Click "Sign in with Google"
- [ ] **Expected:** Redirected to Google OAuth
- [ ] Select Google account
- [ ] **Expected:** GMB permissions requested
- [ ] Accept permissions
- [ ] **Expected:** Redirected back to `/auth/callback`
- [ ] **Expected:** Then to dashboard
- [ ] **Expected:** User logged in
- [ ] **Check:** GMB account connected

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 1.5 Password Reset Flow
- [ ] Sign out
- [ ] Go to `/en/auth/reset`
- [ ] Enter registered email
- [ ] Click "Send Reset Link"
- [ ] **Expected:** "Reset link sent" message
- [ ] Check email for reset link
- [ ] Click reset link
- [ ] Enter new password
- [ ] Confirm password
- [ ] **Expected:** Password updated
- [ ] **Expected:** Can login with new password

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 1.6 Session Security
- [ ] Login successfully
- [ ] Open browser DevTools → Application → Cookies
- [ ] **Check:** Session cookie is `HttpOnly`
- [ ] **Check:** Session cookie is `Secure` (in production)
- [ ] **Check:** Session cookie has `SameSite=Strict`
- [ ] Open new incognito tab
- [ ] Try to access `/en/dashboard` directly
- [ ] **Expected:** Redirected to login page

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 1.7 CSRF Protection
- [ ] Login to dashboard
- [ ] Open DevTools → Network
- [ ] Perform any POST action (e.g., update profile)
- [ ] **Check:** Request has `x-csrf-token` header
- [ ] Try to submit form without CSRF token (using Postman)
- [ ] **Expected:** Request rejected with 403

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

## 🏢 Phase 2: Core GMB Features (45 min)

### 2.1 GMB Account Connection
- [ ] Login to dashboard
- [ ] If not connected: Click "Connect GMB Account"
- [ ] **Expected:** OAuth flow starts
- [ ] Accept GMB permissions
- [ ] **Expected:** Account connected
- [ ] **Expected:** Account name displayed
- [ ] **Check:** `gmb_accounts` table has entry
- [ ] **Check:** OAuth tokens encrypted in database

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 2.2 GMB Data Sync (First Sync)
- [ ] Go to Settings or Dashboard
- [ ] Click "Sync GMB Data"
- [ ] **Expected:** Sync starts (spinner/progress)
- [ ] Wait for sync to complete (may take 1-2 min)
- [ ] **Expected:** Success message
- [ ] **Check:** Locations synced
- [ ] **Check:** Reviews synced
- [ ] **Check:** Questions synced
- [ ] Go to `/en/sync-diagnostics`
- [ ] **Check:** Sync status shows "Completed"
- [ ] **Check:** Data counts are correct

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Locations Synced:** _____
**Reviews Synced:** _____
**Questions Synced:** _____
**Notes:**

---

### 2.3 Locations Management
- [ ] Go to `/en/locations`
- [ ] **Expected:** List of locations displayed
- [ ] Click on a location
- [ ] **Expected:** Location details page
- [ ] **Check:** Location name, address, phone displayed
- [ ] **Check:** Map shows correct location
- [ ] **Check:** Operating hours displayed
- [ ] Try to edit location details
- [ ] **Expected:** Changes saved
- [ ] **Expected:** Synced to GMB

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 2.4 Reviews Display & Management
- [ ] Go to `/en/reviews`
- [ ] **Expected:** List of reviews displayed
- [ ] **Check:** Review text, rating, date displayed
- [ ] **Check:** Reviewer name/photo displayed
- [ ] Filter by rating (e.g., 5-star only)
- [ ] **Expected:** Filter works
- [ ] Sort by date (newest/oldest)
- [ ] **Expected:** Sort works
- [ ] Click on a review
- [ ] **Expected:** Review details page
- [ ] **Check:** Full review text visible

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Total Reviews Displayed:** _____
**Notes:**

---

### 2.5 Manual Review Reply
- [ ] Go to review that hasn't been replied to
- [ ] Click "Reply" button
- [ ] Type reply: "Thank you for your feedback!"
- [ ] Click "Send Reply"
- [ ] **Expected:** Reply sent successfully
- [ ] **Expected:** Reply shows under review
- [ ] **Check:** Reply synced to GMB
- [ ] Go to GMB dashboard directly
- [ ] **Check:** Reply visible there too

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 2.6 Questions Display & Management
- [ ] Go to `/en/questions`
- [ ] **Expected:** List of questions displayed
- [ ] **Check:** Question text, date displayed
- [ ] Filter by status (unanswered/answered)
- [ ] **Expected:** Filter works
- [ ] Click on a question
- [ ] **Expected:** Question details
- [ ] **Check:** Can see existing answers (if any)

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Total Questions Displayed:** _____
**Notes:**

---

### 2.7 Manual Question Answer
- [ ] Go to unanswered question
- [ ] Click "Answer" button
- [ ] Type answer: "Yes, we are open on weekends!"
- [ ] Click "Submit Answer"
- [ ] **Expected:** Answer sent successfully
- [ ] **Expected:** Answer shows under question
- [ ] **Check:** Answer synced to GMB

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

## 🤖 Phase 3: AI Features (30 min)

### 3.1 AI Review Auto-Reply (Manual Trigger)
- [ ] Go to `/en/reviews/ai-cockpit`
- [ ] Select a review (preferably 5-star)
- [ ] Click "Generate AI Reply"
- [ ] **Expected:** AI generates reply (within 3 seconds)
- [ ] **Check:** Reply is relevant to review
- [ ] **Check:** Reply tone is appropriate (professional/friendly)
- [ ] **Check:** Reply includes business name
- [ ] **Check:** Reply length is reasonable (50-200 chars)
- [ ] Edit reply if needed
- [ ] Click "Send"
- [ ] **Expected:** Reply posted successfully

**Test with Different Ratings:**
- [ ] Test with 1-star review
  - **Check:** Tone is apologetic
  - **Check:** Offers solution
- [ ] Test with 3-star review
  - **Check:** Tone is balanced
- [ ] Test with 5-star review
  - **Check:** Tone is grateful

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 3.2 AI Review Auto-Reply (Automatic)
- [ ] Go to Settings → Auto-Pilot
- [ ] Enable "Auto-Reply to Reviews"
- [ ] Set rating threshold: 4+ stars
- [ ] Set tone: Professional
- [ ] **Uncheck** "Require Approval" (instant auto-reply)
- [ ] Save settings
- [ ] Trigger new review sync (to test with existing reviews)
- [ ] **Expected:** Reviews with 4+ stars get auto-replies
- [ ] **Check:** Auto-replies are generated correctly
- [ ] **Check:** Auto-replies are sent to GMB
- [ ] **Check:** Logged in `ai_requests` table

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Auto-Replies Generated:** _____
**Notes:**

---

### 3.3 AI Question Auto-Answer
- [ ] Go to `/en/questions`
- [ ] Select unanswered question
- [ ] Click "Generate AI Answer"
- [ ] **Expected:** AI generates answer
- [ ] **Check:** Answer is relevant
- [ ] **Check:** Answer is helpful
- [ ] **Check:** Answer length appropriate
- [ ] Review and send

**Test Auto-Answer Feature:**
- [ ] Go to Settings → Auto-Pilot
- [ ] Enable "Auto-Answer Questions"
- [ ] Save settings
- [ ] Sync questions
- [ ] **Expected:** Unanswered questions get AI answers
- [ ] **Check:** Answers make sense
- [ ] **Check:** Logged in `ai_requests` table

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 3.4 AI Provider Fallback
- [ ] Go to Settings → AI Settings
- [ ] **Check:** Shows current AI provider
- [ ] **Check:** Shows usage statistics
- [ ] **Check:** Shows remaining quota

**Test Fallback (if possible):**
- [ ] Temporarily disable primary AI provider (set invalid API key)
- [ ] Try to generate AI reply
- [ ] **Expected:** Falls back to secondary provider
- [ ] **Expected:** Reply still generated
- [ ] **Check:** Fallback logged in database
- [ ] Re-enable primary provider

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 3.5 AI Usage Limits
- [ ] Check current plan (free/basic/pro)
- [ ] Check AI usage count this month
- [ ] **Expected:** Shows correct count
- [ ] **Expected:** Shows limit based on plan
- [ ] If near limit, try to generate AI reply
- [ ] **Expected:** Works until limit reached
- [ ] If limit reached:
  - **Expected:** Error message: "Limit exceeded"
  - **Expected:** Suggests upgrading plan

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Current Usage:** _____ / _____
**Notes:**

---

## 🌍 Phase 4: UI/UX & Internationalization (20 min)

### 4.1 Language Switching (English ↔ Arabic)
- [ ] Go to any page in English (`/en/dashboard`)
- [ ] Click language switcher → Arabic
- [ ] **Expected:** URL changes to `/ar/dashboard`
- [ ] **Expected:** All text translates to Arabic
- [ ] **Expected:** Layout switches to RTL
- [ ] **Check:** Navigation menu in Arabic
- [ ] **Check:** Buttons in Arabic
- [ ] **Check:** Forms in Arabic
- [ ] Switch back to English
- [ ] **Expected:** Everything back to English LTR

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 4.2 RTL Layout (Arabic)
- [ ] Switch to Arabic (`/ar/`)
- [ ] **Check:** Text alignment (right-aligned)
- [ ] **Check:** Sidebar on right side
- [ ] **Check:** Icons flipped correctly
- [ ] **Check:** Forms aligned right
- [ ] **Check:** Tables read right-to-left
- [ ] **Check:** Dropdowns open correctly
- [ ] Navigate through all main pages
- [ ] **Expected:** All pages work correctly in RTL

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 4.3 BETA Badge Visibility
**⚠️ CRITICAL per CLAUDE.md**
- [ ] Go to any page
- [ ] **CHECK:** BETA badge visible in top-right
- [ ] **CHECK:** Badge says "0.9.0-beta" or "BETA"
- [ ] **CHECK:** Badge is fixed position (always visible)
- [ ] Scroll down
- [ ] **CHECK:** Badge still visible
- [ ] Switch pages
- [ ] **CHECK:** Badge on every page
- [ ] **CRITICAL:** Badge must NEVER be hidden

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 4.4 Responsive Design (Mobile)
- [ ] Open site on mobile device or use DevTools mobile view
- [ ] **Check:** Dashboard displays correctly
- [ ] **Check:** Navigation menu collapses to hamburger
- [ ] **Check:** Reviews list readable
- [ ] **Check:** Forms usable
- [ ] **Check:** Buttons tap-able (not too small)
- [ ] **Check:** No horizontal scrolling
- [ ] Test on iPhone and Android (if possible)

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 4.5 Dark Mode (if enabled)
- [ ] Toggle dark mode (if available)
- [ ] **Expected:** All colors invert properly
- [ ] **Check:** Text readable on dark background
- [ ] **Check:** No white flashes
- [ ] **Check:** Images/logos look good
- [ ] Switch back to light mode
- [ ] **Expected:** Smooth transition

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

## ⚠️ Phase 5: Error Handling & Edge Cases (15 min)

### 5.1 Network Error Handling
- [ ] Open DevTools → Network
- [ ] Set throttling to "Offline"
- [ ] Try to sync GMB data
- [ ] **Expected:** Clear error message
- [ ] **Expected:** "Check your connection" message
- [ ] Set back to "Online"
- [ ] Retry action
- [ ] **Expected:** Works normally

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 5.2 Invalid Input Handling
- [ ] Try to submit form with empty required fields
- [ ] **Expected:** Validation error messages
- [ ] Try to enter invalid email format
- [ ] **Expected:** "Invalid email" error
- [ ] Try to enter weak password
- [ ] **Expected:** "Password too weak" error
- [ ] Try SQL injection: `' OR '1'='1`
- [ ] **Expected:** Input sanitized, no injection

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 5.3 Rate Limiting
- [ ] Rapidly click "Sync" button 20 times
- [ ] **Expected:** After N requests, rate limit error
- [ ] **Expected:** Error message: "Too many requests"
- [ ] **Expected:** Shows retry-after time
- [ ] Wait for rate limit to reset
- [ ] **Expected:** Can sync again

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 5.4 XSS Attack Prevention
- [ ] Try to enter script in review reply: `<script>alert('XSS')</script>`
- [ ] Submit
- [ ] **Expected:** Script tags stripped
- [ ] **Expected:** No alert popup
- [ ] **Check:** Stored safely in database
- [ ] View reply on page
- [ ] **Expected:** Displayed as text, not executed

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 5.5 Expired Session Handling
- [ ] Login successfully
- [ ] Wait 1 hour (or manually delete session cookie)
- [ ] Try to perform action (e.g., sync)
- [ ] **Expected:** Redirected to login page
- [ ] **Expected:** Message: "Session expired, please login"
- [ ] Login again
- [ ] **Expected:** Redirected back to previous page

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

### 5.6 Empty States
- [ ] Create new account (no GMB connected)
- [ ] Go to Reviews page
- [ ] **Expected:** Empty state message
- [ ] **Expected:** Call-to-action: "Connect GMB Account"
- [ ] Go to Questions page
- [ ] **Expected:** Empty state message
- [ ] Go to Posts page
- [ ] **Expected:** Empty state with create button

**Result:** ✅ Pass / ❌ Fail / ⚠️ Issues
**Notes:**

---

## 📊 Final Checklist

### Browser Compatibility
- [ ] Chrome/Chromium (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Performance
- [ ] Dashboard loads < 2 seconds
- [ ] Reviews page loads < 2 seconds
- [ ] AI reply generates < 3 seconds
- [ ] GMB sync completes < 2 minutes
- [ ] No JavaScript errors in console
- [ ] No broken images or assets

### Monitoring
- [ ] Check Sentry for errors during testing
- [ ] **Expected:** No critical errors
- [ ] Check logs for warnings
- [ ] Check Diagnostics page
- [ ] **Expected:** All systems operational

---

## 🎯 Results Summary

**Total Tests:** _____
**Passed:** _____ ✅
**Failed:** _____ ❌
**Issues:** _____ ⚠️

### Critical Issues Found:
1.
2.
3.

### Non-Critical Issues:
1.
2.
3.

### Performance Notes:
-
-

### Browser-Specific Issues:
-
-

---

## ✅ Production Readiness Decision

Based on testing results:

- [ ] **READY for Production** - All critical tests passed
- [ ] **READY with Minor Issues** - Can launch, fix issues in hotfix
- [ ] **NOT READY** - Critical issues must be fixed first

**Next Steps:**
1.
2.
3.

**Signed:** _____________
**Date:** _____________
**Decision:** GO / NO-GO

---

## 📝 Notes

Add any additional observations, suggestions, or concerns:

