# 🚀 OAuth Flow - Quick Summary

**Last Updated**: 2025-12-04

---

## 📊 Current Status

| Component        | Status     | Notes                                               |
| ---------------- | ---------- | --------------------------------------------------- |
| CSRF Protection  | ✅ WORKING | Fixed today - all production errors resolved        |
| OAuth Initiation | ✅ WORKING | `/api/gmb/create-auth-url` functioning correctly    |
| OAuth Callback   | ⚠️ PARTIAL | Works for first-time, fails for re-auth             |
| Token Storage    | 🔴 BROKEN  | NULL refresh_token causes database constraint error |
| Token Refresh    | ⚠️ PARTIAL | Works if refresh_token exists, crashes if NULL      |
| Session Handling | ⚠️ PARTIAL | Session may be lost during OAuth redirect           |

---

## 🔴 3 Critical Bugs

### Bug #1: NULL Refresh Token Constraint

**File**: `app/api/gmb/oauth-callback/route.ts:617`

**Error**:

```
null value in column "refresh_token" of relation "gmb_secrets" violates not-null constraint
```

**Why**: Google doesn't always return refresh_token on re-authorization

**Fix**: Make `refresh_token` column nullable in database

---

### Bug #2: Failed to Fetch Secrets

**File**: `app/api/gmb/locations/fetch-google/route.ts:122`

**Error**:

```
Failed to fetch secrets for fetch-google Error: [object Object]
```

**Why**: Secrets row not created due to Bug #1, or secrets insert failed silently

**Fix**: Add validation after secrets insert + rollback on failure

---

### Bug #3: Auth Session Missing

**Error**:

```
Auth session missing! (AuthSessionMissingError)
```

**Why**: Supabase session cookie lost during OAuth redirect (SameSite policy)

**Fix**: Use state token to recover user_id instead of relying on session cookie

---

## ✅ Recommended Fixes (Priority Order)

### 🔴 IMMEDIATE (24-48 hours)

1. **Database Migration**

   ```sql
   ALTER TABLE gmb_secrets
   ALTER COLUMN refresh_token DROP NOT NULL;
   ```

2. **Update OAuth Callback** - Handle NULL refresh_token gracefully
   - Log warning when no refresh_token received
   - Allow NULL in database upsert
   - Validate secrets after insert

3. **Update Token Refresh** - Handle missing refresh_token
   - Check if refresh_token exists before using
   - Deactivate account if token expired with no refresh_token
   - Show clear error message to user

4. **Fix Session Handling** - Don't rely on session cookies
   - Use state token to recover user_id
   - Already using admin client (good!)
   - Add session metadata to state for debugging

---

### 🟡 HIGH PRIORITY (1 week)

5. **Proactive Token Refresh Cron**
   - Run every 6 hours
   - Refresh tokens expiring within 24 hours
   - Prevent expiry before user notices

6. **Account Health Dashboard**
   - Show token expiry status
   - Show if refresh_token is missing
   - Warn users to reconnect before expiry

7. **Better Error Messages**
   - Bilingual (English + Arabic)
   - Actionable (tell user what to do)
   - Context-aware (explain why error happened)

---

### 🟢 NICE TO HAVE (2-4 weeks)

8. **Auto Recovery Flow** - Automatically trigger re-auth when token refresh fails
9. **Token Rotation Policy** - Proactively refresh every 30 days for security
10. **OAuth Analytics** - Track success rates, failure reasons, time-to-reconnect

---

## 📈 Expected Impact

| Metric                 | Before   | After                |
| ---------------------- | -------- | -------------------- |
| OAuth Success Rate     | ~70%     | >95%                 |
| Token Refresh Failures | High     | <5%                  |
| Manual Reconnections   | Frequent | Rare (70% reduction) |
| User Confusion         | High     | Low                  |
| Time to Recovery       | Unknown  | <2 min               |

---

## 🎯 Testing Checklist

- [ ] First-time OAuth (should receive refresh_token)
- [ ] Re-authentication OAuth (may not receive refresh_token)
- [ ] Token expiry with refresh_token (should auto-refresh)
- [ ] Token expiry without refresh_token (should prompt re-auth)
- [ ] Session loss during redirect (should recover from state)
- [ ] Secrets insert failure (should rollback account)
- [ ] Account health dashboard (should show accurate status)
- [ ] Error messages (should be clear and actionable)

---

## 📁 Key Files

### Backend (OAuth Flow)

- [app/api/gmb/create-auth-url/route.ts](app/api/gmb/create-auth-url/route.ts) - Initiates OAuth
- [app/api/gmb/oauth-callback/route.ts](app/api/gmb/oauth-callback/route.ts) - Handles callback ⚠️
- [lib/gmb/helpers.ts](lib/gmb/helpers.ts) - Token refresh logic ⚠️
- [lib/security/encryption.ts](lib/security/encryption.ts) - Token encryption/decryption

### Backend (Token Usage)

- [app/api/gmb/locations/fetch-google/route.ts](app/api/gmb/locations/fetch-google/route.ts) - Uses tokens ⚠️
- [server/actions/gmb-account.ts](server/actions/gmb-account.ts) - Account management

### Database

- [supabase/migrations/20250101000000_init_full_schema.sql:140-155](supabase/migrations/20250101000000_init_full_schema.sql#L140-155) - gmb_secrets table ⚠️

### Frontend

- Components: TBD (need to add health dashboard)
- Settings: TBD (need to add reconnect flow)

---

## 🔧 Quick Fixes You Can Do Right Now

### 1. Make refresh_token Nullable (2 minutes)

Create file: `supabase/migrations/YYYYMMDD_make_refresh_token_nullable.sql`

```sql
-- Make refresh_token nullable to handle Google OAuth re-auth flow
ALTER TABLE gmb_secrets
ALTER COLUMN refresh_token DROP NOT NULL;

-- Add check to ensure at least one token exists
ALTER TABLE gmb_secrets
ADD CONSTRAINT check_has_token CHECK (
  access_token IS NOT NULL OR refresh_token IS NOT NULL
);

-- Add helpful comment
COMMENT ON COLUMN gmb_secrets.refresh_token IS
'Refresh token from Google OAuth. May be NULL for re-authorizations where Google does not issue a new refresh token. If NULL, user must re-authenticate when access_token expires.';
```

Apply:

```bash
# Push to Supabase
supabase db push

# Or apply directly in Supabase dashboard SQL editor
```

---

### 2. Update OAuth Callback to Log Warning (5 minutes)

File: `app/api/gmb/oauth-callback/route.ts` around line 480

Add after token encryption:

```typescript
// Log warning if no refresh_token
if (!encryptedRefreshToken) {
  gmbLogger.warn(
    "No refresh_token available - user will need to re-auth when access_token expires",
    {
      accountId,
      userId,
      isReAuth,
      hadExistingRefreshToken: !!existingRefreshToken,
      receivedNewRefreshToken: !!tokenData.refresh_token,
    },
  );
}
```

---

### 3. Force Consent for Re-auth (10 minutes)

File: `app/api/gmb/create-auth-url/route.ts` around line 119

Replace:

```typescript
authUrl.searchParams.set("prompt", "select_account");
```

With:

```typescript
// Check if user has existing accounts
const { data: existingAccounts } = await supabase
  .from("gmb_accounts")
  .select("id")
  .eq("user_id", user.id)
  .eq("is_active", true)
  .limit(1);

const hasExistingAccounts = existingAccounts && existingAccounts.length > 0;

// Use "consent" for re-auth to ensure refresh_token
authUrl.searchParams.set(
  "prompt",
  hasExistingAccounts ? "consent" : "select_account",
);
```

---

## 📞 Next Steps

1. **Review**: Read the full plan in [OAUTH-FLOW-AUDIT-AND-PLAN.md](OAUTH-FLOW-AUDIT-AND-PLAN.md)
2. **Prioritize**: Decide which fixes to implement first
3. **Test**: Create test accounts to verify fixes
4. **Deploy**: Roll out incrementally (staging → production)
5. **Monitor**: Track error rates and success metrics

---

## 💬 Questions?

Common questions answered in the full plan:

- Why does Google not always return refresh_token?
- What happens when access_token expires with no refresh_token?
- How does session loss occur during OAuth redirect?
- Should we force consent prompt every time?
- What's the difference between access_token and refresh_token?

See: [OAUTH-FLOW-AUDIT-AND-PLAN.md](OAUTH-FLOW-AUDIT-AND-PLAN.md)
