# 🔄 OAuth Flow Diagram

**Visual representation of GMB OAuth flow with error points**

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ User clicks  │
│ "Connect GMB"│
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ Frontend: POST /api/gmb/create-auth-url              │
│ File: app/api/gmb/create-auth-url/route.ts          │
└──────┬───────────────────────────────────────────────┘
       │
       ├─ Get authenticated user (Supabase session)
       ├─ Generate random state token (crypto.randomUUID())
       ├─ Save state to oauth_states table
       │  └─ Fields: state, user_id, provider, redirect_uri, expires_at
       ├─ Build Google OAuth URL
       │  ├─ client_id
       │  ├─ redirect_uri
       │  ├─ scope (GMB + userinfo)
       │  ├─ access_type=offline (for refresh_token)
       │  ├─ prompt=select_account ⚠️ ISSUE: Should be "consent" for re-auth
       │  └─ state (for CSRF protection)
       └─ Return authUrl to frontend
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ Frontend: Redirect user to Google OAuth URL          │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────┐
│ 🌐 User on accounts.google.com                  │
│ - Selects Google account                        │
│ - Reviews permissions                            │
│ - Clicks "Allow"                                 │
└──────┬──────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ Google: Redirect to /api/gmb/oauth-callback         │
│ URL: ?code=xxx&state=yyy                             │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Backend: GET /api/gmb/oauth-callback                            │
│ File: app/api/gmb/oauth-callback/route.ts                      │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ├─ ⚠️ POTENTIAL SESSION LOSS HERE (SameSite cookies)
       │
       ├─ [1] Validate state token
       │     ├─ Query oauth_states table
       │     ├─ Check: state matches, not used, not expired
       │     └─ Mark state as used
       │
       ├─ [2] Get user_id from state record
       │     └─ ✅ GOOD: Not relying on session cookie
       │
       ├─ [3] Exchange code for tokens
       │     ├─ POST https://oauth2.googleapis.com/token
       │     ├─ Response: { access_token, refresh_token, expires_in }
       │     └─ ⚠️ ISSUE: refresh_token may be NULL for re-auth
       │
       ├─ [4] Get user info from Google
       │     ├─ GET https://www.googleapis.com/oauth2/v2/userinfo
       │     └─ Response: { email, name, picture }
       │
       ├─ [5] Fetch GMB accounts
       │     ├─ GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts
       │     └─ Response: { accounts: [...] }
       │
       ├─ [6] Check if account already linked
       │     ├─ Query gmb_accounts by account_id
       │     ├─ If exists for DIFFERENT user → Error
       │     ├─ If exists for SAME user → Re-auth flow
       │     └─ If not exists → First-time flow
       │
       ├─ [7] Encrypt tokens
       │     ├─ encryptToken(access_token) → encryptedAccessToken
       │     ├─ encryptToken(refresh_token) → encryptedRefreshToken
       │     └─ ⚠️ ISSUE: encryptedRefreshToken may be NULL
       │
       ├─ [8] Save to gmb_accounts table
       │     ├─ UPSERT on account_id
       │     ├─ Fields: user_id, account_id, account_name, email,
       │     │          token_expires_at, is_active
       │     └─ Get upserted account.id
       │
       ├─ [9] Save to gmb_secrets table ⚠️ CRITICAL FAILURE POINT
       │     ├─ UPSERT on account_id
       │     ├─ Fields: account_id, access_token, refresh_token
       │     └─ 🔴 ERROR: refresh_token is NULL but column is NOT NULL
       │
       └─ [10] Redirect user
             ├─ If RE_AUTH + has locations → /dashboard
             └─ Else → /select-account
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ User on /select-account or /dashboard                │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ Frontend: POST /api/gmb/locations/fetch-google       │
│ File: app/api/gmb/locations/fetch-google/route.ts   │
└──────┬───────────────────────────────────────────────┘
       │
       ├─ [1] Get authenticated user
       ├─ [2] Verify account belongs to user
       ├─ [3] Fetch secrets from gmb_secrets ⚠️ FAILURE POINT
       │     └─ 🔴 ERROR: Secrets not found (insert failed earlier)
       │
       ├─ [4] Decrypt access_token
       │     └─ decryptToken(encrypted_access_token)
       │
       ├─ [5] Fetch locations from Google
       │     ├─ GET https://mybusinessbusinessinformation.googleapis.com/v1/
       │     │     {account_id}/locations
       │     └─ Response: { locations: [...] }
       │
       └─ Return locations to frontend
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ User selects locations and imports                   │
└──────────────────────────────────────────────────────┘
```

---

## 🔴 Error Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                           │
└─────────────────────────────────────────────────────────────┘

Scenario A: NULL refresh_token on Re-auth
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User reconnects → Google doesn't return refresh_token
                ↓
                Try to upsert gmb_secrets with NULL refresh_token
                ↓
                🔴 Database constraint error
                ↓
                OAuth fails, user sees generic error


Scenario B: Secrets Insert Fails Silently
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAuth callback succeeds → Secrets insert fails (any reason)
                        ↓
                        Error logged but not returned
                        ↓
                        User redirected to /select-account
                        ↓
                        Try to fetch locations
                        ↓
                        🔴 "Failed to fetch secrets" error
                        ↓
                        User confused, must reconnect


Scenario C: Session Lost During OAuth
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User starts OAuth → Redirect to Google → Redirect back
                                       ↓
                                       ⚠️ Session cookie lost (SameSite)
                                       ↓
                                       Try to get user from session
                                       ↓
                                       🔴 "Auth session missing" error
                                       ↓
                                       OAuth fails

✅ CURRENT FIX: Use state token to get user_id (not session)


Scenario D: Token Expiry with No Refresh Token
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time passes → access_token expires → Try to fetch locations
           ↓
           getValidAccessToken() checks expiry
           ↓
           Try to refresh using refresh_token
           ↓
           🔴 refresh_token is NULL
           ↓
           Crash or return expired token
           ↓
           Google API returns 401 Unauthorized
```

---

## ✅ Fixed Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    AFTER FIXES                               │
└─────────────────────────────────────────────────────────────┘

Scenario A: NULL refresh_token → HANDLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User reconnects → Google doesn't return refresh_token
                ↓
                Check if existingRefreshToken available
                ↓
                ├─ YES → Use existing
                └─ NO  → Set to NULL (allowed by schema change)
                ↓
                ✅ Log warning: "No refresh_token available"
                ↓
                ✅ Upsert succeeds with NULL
                ↓
                OAuth completes successfully
                ↓
                ⚠️ User will need to re-auth when token expires


Scenario B: Secrets Insert → VALIDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAuth callback → Insert secrets
              ↓
              ✅ Check if insert succeeded
              ↓
              ├─ SUCCESS → Continue
              └─ FAILURE → Rollback gmb_accounts insert
                         ↓
                         Redirect to /settings with error
                         ↓
                         User sees: "Failed to secure credentials"
                         ↓
                         User clicks "Try again"


Scenario C: Session Loss → RECOVERED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User starts OAuth → Redirect to Google → Redirect back
                                       ↓
                                       Session cookie may be lost
                                       ↓
                                       ✅ Get user_id from state token
                                       ↓
                                       OAuth completes successfully


Scenario D: Token Expiry → HANDLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time passes → access_token expires → Try to fetch locations
           ↓
           getValidAccessToken() checks expiry
           ↓
           ✅ Check if refresh_token exists
           ↓
           ├─ YES → Refresh tokens
           │        ↓
           │        ✅ Return new access_token
           │
           └─ NO  → ✅ Deactivate account
                   ↓
                   ✅ Throw clear error
                   ↓
                   User sees: "Connection expired. Please reconnect."
                   ↓
                   User clicks "Reconnect" → OAuth flow starts
```

---

## 🔄 Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────┐
│              TOKEN REFRESH MECHANISM                         │
└─────────────────────────────────────────────────────────────┘

Any API call that needs access_token
           ↓
     Call getValidAccessToken(accountId)
           ↓
     [1] Fetch from gmb_secrets table
         ├─ access_token (encrypted)
         └─ refresh_token (encrypted, may be NULL)
           ↓
     [2] Fetch from gmb_accounts table
         └─ token_expires_at
           ↓
     [3] Decrypt tokens
         ├─ access_token → decrypted
         └─ refresh_token → decrypted OR NULL
           ↓
     [4] Check expiry (with 5-minute buffer)
           ↓
           ├─ NOT EXPIRED → Return access_token ✅
           │
           └─ EXPIRED →
                 ↓
                 Check if refresh_token exists
                 ↓
                 ├─ YES → [5] Refresh tokens
                 │         ├─ POST https://oauth2.googleapis.com/token
                 │         │   with grant_type=refresh_token
                 │         ├─ Get new access_token (+ maybe new refresh_token)
                 │         ├─ Update gmb_accounts.token_expires_at
                 │         ├─ Update gmb_secrets.access_token
                 │         └─ Return new access_token ✅
                 │
                 └─ NO  → [6] Deactivate account
                           ├─ Set gmb_accounts.is_active = false
                           ├─ Log error with user_id
                           └─ Throw error: "Please reconnect" 🔴

CURRENT ISSUE: Step [6] crashes instead of handling gracefully
```

---

## 🎯 Proactive Token Refresh (Future)

```
┌─────────────────────────────────────────────────────────────┐
│         CRON JOB: Refresh Expiring Tokens                    │
│         Runs every 6 hours                                    │
└─────────────────────────────────────────────────────────────┘

Cron trigger (0 */6 * * *)
           ↓
     [1] Find accounts with tokens expiring in <24h
         └─ SELECT * FROM gmb_accounts
            WHERE is_active = true
            AND token_expires_at < NOW() + INTERVAL '24 hours'
           ↓
     [2] For each account:
           ↓
           Fetch refresh_token from gmb_secrets
           ↓
           ├─ refresh_token EXISTS
           │    ↓
           │    [3] Refresh tokens
           │         ├─ POST to Google token endpoint
           │         ├─ Update database
           │         └─ Log success ✅
           │
           └─ refresh_token NULL
                ↓
                ⚠️ Log warning: "Cannot refresh - no refresh_token"
                ↓
                ⚠️ Send notification to user (future)
                    "Your GMB connection will expire soon"

BENEFIT: Users never experience expired tokens!
```

---

## 📊 Database Schema

```
┌──────────────────────────────────────────────────────────────┐
│                       gmb_accounts                            │
├──────────────────────────────────────────────────────────────┤
│ id                   UUID PRIMARY KEY                         │
│ user_id              UUID → auth.users(id)                    │
│ account_id           TEXT UNIQUE (Google account ID)          │
│ account_name         TEXT                                     │
│ email                TEXT                                     │
│ token_expires_at     TIMESTAMPTZ  ← Used for expiry check    │
│ is_active            BOOLEAN                                  │
│ last_sync            TIMESTAMPTZ                              │
│ created_at           TIMESTAMPTZ                              │
│ updated_at           TIMESTAMPTZ                              │
└──────────────────────────────────────────────────────────────┘
                               │
                               │ FK: account_id
                               ↓
┌──────────────────────────────────────────────────────────────┐
│                       gmb_secrets                             │
│                (Only accessible by service_role)              │
├──────────────────────────────────────────────────────────────┤
│ id                   UUID PRIMARY KEY                         │
│ account_id           UUID UNIQUE → gmb_accounts(id)           │
│ access_token         TEXT NOT NULL (encrypted)               │
│ refresh_token        TEXT NOT NULL ⚠️ → NULL ✅              │
│ created_at           TIMESTAMPTZ                              │
│ updated_at           TIMESTAMPTZ                              │
└──────────────────────────────────────────────────────────────┘

⚠️ ISSUE: refresh_token has NOT NULL constraint
✅ FIX:   Make it nullable (can be NULL for re-auth)
```

---

## 🔐 Security Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    SECURITY MEASURES                          │
└──────────────────────────────────────────────────────────────┘

[1] State Token (CSRF Protection)
    ├─ Generated: crypto.randomUUID() (cryptographically secure)
    ├─ Stored: oauth_states table with user_id
    ├─ Validated: Check state matches & not used & not expired
    └─ Expires: 30 minutes

[2] Token Encryption
    ├─ Algorithm: AES-256-GCM (AEAD cipher)
    ├─ Key: process.env.ENCRYPTION_KEY (32 bytes)
    ├─ IV: Random 12 bytes per encryption
    ├─ Auth Tag: 16 bytes for integrity verification
    └─ Storage: [IV | AUTH_TAG | CIPHERTEXT] as base64

[3] Row Level Security (RLS)
    ├─ gmb_accounts: Users can only access their own accounts
    ├─ gmb_secrets: ONLY service_role can access (no user access)
    └─ oauth_states: Server-side only (not exposed to client)

[4] Session Handling
    ├─ OAuth callback uses Admin Client (bypasses RLS safely)
    ├─ user_id validated from state token (not from session)
    └─ Session loss during redirect doesn't break flow ✅
```

---

## 📈 Monitoring Points

```
┌──────────────────────────────────────────────────────────────┐
│                   KEY METRICS TO TRACK                        │
└──────────────────────────────────────────────────────────────┘

[1] OAuth Success Rate
    ├─ Success: Redirect to /select-account or /dashboard
    ├─ Failure: Redirect to /settings with error
    └─ Target: >95%

[2] Token Refresh Success Rate
    ├─ Success: New tokens saved, API call continues
    ├─ Failure: Account deactivated, user prompted to reconnect
    └─ Target: >95%

[3] Null Refresh Token Rate
    ├─ Count: How many accounts have NULL refresh_token
    ├─ Trend: Should decrease with "consent" prompt
    └─ Alert: If >20% of active accounts

[4] Secrets Insert Failures
    ├─ Count: Failed inserts per day
    ├─ Reasons: Constraint violations, encryption errors
    └─ Alert: If >1% of OAuth attempts

[5] Session Loss Rate
    ├─ Count: OAuth with session missing errors
    ├─ Impact: Should be 0% after fix
    └─ Alert: If >0%

[6] Time to Reconnect
    ├─ Measure: Time from "Please reconnect" to successful OAuth
    ├─ Target: <2 minutes
    └─ Indicator: User friction
```

---

## 🔍 Debug Checklist

When investigating OAuth issues:

```
[ ] Check oauth_states table
    - Is state record present?
    - Is state.used = false?
    - Is state expired?
    - Does state.user_id match expected user?

[ ] Check gmb_accounts table
    - Is account record present?
    - Is is_active = true?
    - Is token_expires_at in the future?
    - Does user_id match?

[ ] Check gmb_secrets table
    - Is secrets record present?
    - Is access_token NOT NULL?
    - Is refresh_token NULL? (If yes, user will need re-auth soon)
    - Can tokens be decrypted successfully?

[ ] Check logs
    - OAuth callback logs (gmbLogger)
    - Token refresh logs
    - Encryption/decryption errors
    - Google API errors (401, 403, 429, 500)

[ ] Test token validity
    - Try to fetch GMB accounts from Google
    - Check if access_token works
    - Check if refresh_token works (if not NULL)
```

---

**See Also**:

- [OAUTH-FLOW-AUDIT-AND-PLAN.md](OAUTH-FLOW-AUDIT-AND-PLAN.md) - Full implementation plan
- [OAUTH-QUICK-SUMMARY.md](OAUTH-QUICK-SUMMARY.md) - Quick reference guide
