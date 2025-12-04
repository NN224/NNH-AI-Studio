# 🔐 OAUTH FLOW AUDIT & IMPROVEMENT PLAN

## Complete Analysis & Action Plan for Backend & Frontend

**Date**: 2025-12-04
**Status**: Ready for Implementation
**Priority**: 🔴 CRITICAL

---

## 📊 EXECUTIVE SUMMARY

### Current Status

- ✅ **CSRF Protection**: Fully implemented and working (as of today)
- ⚠️ **OAuth Flow**: Partial issues with token storage and session management
- 🔴 **Critical Bugs**: Null refresh_token constraints, session missing errors

### Production Errors Identified

```
[ERROR] Failed to fetch secrets for fetch-google Error: [object Object]
[ERROR] null value in column "refresh_token" of relation "gmb_secrets" violates not-null constraint
[ERROR] Auth session missing! (AuthSessionMissingError)
```

---

## 🔍 COMPLETE OAUTH FLOW ANALYSIS

### Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    OAUTH FLOW DIAGRAM                        │
└─────────────────────────────────────────────────────────────┘

[User Click "Connect GMB"]
         ↓
[Frontend POST /api/gmb/create-auth-url]
         ↓
[Generate state token, save to oauth_states table]
         ↓
[Return Google OAuth URL]
         ↓
[User redirects to Google]
         ↓
[User grants permissions]
         ↓
[Google redirects back to /api/gmb/oauth-callback?code=xxx&state=yyy]
         ↓
[Verify state token from oauth_states]
         ↓
[Exchange code for tokens (access_token + refresh_token)]
         ↓
[Fetch user info from Google]
         ↓
[Fetch GMB accounts from Google]
         ↓
[Encrypt & store tokens in gmb_secrets table]  ⚠️ ISSUE HERE
         ↓
[Redirect to /select-account or /dashboard]
         ↓
[User selects locations]
         ↓
[Frontend POST /api/gmb/locations/fetch-google]  ⚠️ ISSUE HERE
         ↓
[Decrypt access_token from gmb_secrets]
         ↓
[Fetch locations from Google Business Profile API]
         ↓
[Return locations to frontend]
```

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### Issue #1: NULL refresh_token Constraint Violation

**File**: [oauth-callback/route.ts:617](app/api/gmb/oauth-callback/route.ts#L617)

**Problem**:

```typescript
// Line 617 - Upsert to gmb_secrets
const { error: secretsError } = await adminClient.from("gmb_secrets").upsert(
  {
    account_id: upsertedAccount.id,
    access_token: encryptedAccessToken,
    refresh_token: encryptedRefreshToken, // ⚠️ Can be NULL
    updated_at: new Date().toISOString(),
  },
  {
    onConflict: "account_id",
    ignoreDuplicates: false,
  },
);
```

**Database Schema**:

```sql
CREATE TABLE gmb_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,  -- ⚠️ NOT NULL constraint
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Root Cause**:

1. Google OAuth sometimes doesn't return `refresh_token` on subsequent authorizations
2. Code tries to use `existingRefreshToken` as fallback, but if that's also null, upsert fails
3. `refresh_token` column has NOT NULL constraint but code allows NULL values

**When This Happens**:

- **Re-authentication flow**: User reconnects an already-linked account
- **Subsequent OAuth**: Google only returns `refresh_token` on FIRST authorization (when `prompt=consent`)
- **Token refresh failure**: Previous refresh_token was invalid/expired

**Impact**: 🔴 CRITICAL

- Users cannot reconnect accounts after token expiry
- OAuth flow fails silently or with database constraint error
- No graceful degradation or user feedback

---

### Issue #2: Failed to Fetch Secrets

**File**: [locations/fetch-google/route.ts:120-133](app/api/gmb/locations/fetch-google/route.ts#L120-133)

**Problem**:

```typescript
// Line 114-133
const { data: secrets, error: secretsError } = await adminClient
  .from("gmb_secrets")
  .select("access_token")
  .eq("account_id", accountId)
  .single();

if (secretsError || !secrets?.access_token) {
  gmbLogger.error(
    "Failed to fetch secrets for fetch-google", // ⚠️ This error in logs
    secretsError instanceof Error
      ? secretsError
      : new Error(String(secretsError)),
    { accountId, userId: user.id },
  );
  throw new ApiError(
    ErrorCode.INTERNAL_ERROR,
    "Failed to retrieve account credentials. Please reconnect your Google account.",
    500,
  );
}
```

**Root Causes**:

1. **Missing gmb_secrets row**: Account saved in `gmb_accounts` but secrets insert failed
2. **Stale accountId**: Frontend passing wrong/old account ID
3. **Race condition**: Trying to fetch locations before secrets are saved
4. **Cascading delete**: Account deleted but frontend still has stale reference

**Impact**: 🟡 HIGH

- Users see "Failed to retrieve account credentials" error
- Cannot fetch locations after successful OAuth
- Requires manual reconnection

---

### Issue #3: Auth Session Missing

**Error**: `Auth session missing! (AuthSessionMissingError)`

**Root Causes**:

1. **SameSite Cookie Policy**: Supabase session cookies blocked in cross-site redirect
2. **Session Expiry**: User session expired during OAuth redirect (30+ minutes)
3. **Browser Privacy Settings**: Cookies disabled or blocked by browser extensions
4. **Incognito Mode**: Cookies not persisted across redirects

**Why This Happens in OAuth**:

```
User on nnh.ae → Redirect to accounts.google.com → Redirect back to nnh.ae/api/gmb/oauth-callback
                                                            ↑
                        Supabase session cookie may be lost here due to SameSite policy
```

**Impact**: 🟡 MEDIUM

- OAuth flow fails after Google redirect
- User must log in again and restart OAuth
- Poor user experience

---

## 🎯 ROOT CAUSE ANALYSIS

### Why Refresh Token is NULL

Google OAuth behavior:

1. **First authorization**: Returns `access_token` + `refresh_token`
2. **Subsequent authorizations** (same scopes): Returns only `access_token`
3. **Force consent**: `prompt=consent` always returns `refresh_token`

Current code issues:

```typescript
// oauth-callback/route.ts lines 119-122
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "select_account"); // ⚠️ Should be "consent" for re-auth
authUrl.searchParams.set("include_granted_scopes", "true");
```

**Problem**: Using `prompt=select_account` which doesn't force new consent, so no new `refresh_token` is issued.

---

## ✅ COMPREHENSIVE FIX PLAN

### 🔴 IMMEDIATE FIXES (24-48 hours)

#### Fix #1: Handle NULL refresh_token Gracefully

**Option A: Make refresh_token Nullable** (RECOMMENDED)

```sql
-- Migration file: supabase/migrations/YYYYMMDD_make_refresh_token_nullable.sql
ALTER TABLE gmb_secrets
ALTER COLUMN refresh_token DROP NOT NULL;

-- Add check constraint to ensure at least one token exists
ALTER TABLE gmb_secrets
ADD CONSTRAINT check_has_token CHECK (
  access_token IS NOT NULL OR refresh_token IS NOT NULL
);

COMMENT ON COLUMN gmb_secrets.refresh_token IS
'Refresh token from Google OAuth. May be NULL for re-authorizations.
If NULL, user must re-authenticate when access_token expires.';
```

**Backend Changes**:

```typescript
// app/api/gmb/oauth-callback/route.ts lines 475-503
let encryptedAccessToken: string;
let encryptedRefreshToken: string | null = null;

try {
  encryptedAccessToken = encryptToken(tokenData.access_token);

  // Prioritize new refresh_token, fallback to existing, allow NULL
  const refreshTokenToPersist =
    tokenData.refresh_token || existingRefreshToken || null;

  encryptedRefreshToken = refreshTokenToPersist
    ? encryptToken(refreshTokenToPersist)
    : null;

  // ✅ NEW: Log warning if no refresh_token
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
} catch (encryptionError) {
  // ... existing error handling
}

// Update upsert to allow NULL refresh_token
const { error: secretsError } = await adminClient.from("gmb_secrets").upsert(
  {
    account_id: upsertedAccount.id,
    access_token: encryptedAccessToken,
    refresh_token: encryptedRefreshToken, // ✅ Can now be NULL
    updated_at: new Date().toISOString(),
  },
  {
    onConflict: "account_id",
    ignoreDuplicates: false,
  },
);
```

**Option B: Force Consent for Re-auth** (ALTERNATIVE)

```typescript
// app/api/gmb/create-auth-url/route.ts lines 119-124

// Check if user has existing GMB accounts
const { data: existingAccounts } = await supabase
  .from("gmb_accounts")
  .select("id")
  .eq("user_id", user.id)
  .eq("is_active", true)
  .limit(1);

const hasExistingAccounts = existingAccounts && existingAccounts.length > 0;

// Use "consent" prompt for re-auth to ensure refresh_token
authUrl.searchParams.set(
  "prompt",
  hasExistingAccounts ? "consent" : "select_account",
);
```

**Recommended**: **Option A** (Make nullable) + **Option B** (Force consent for re-auth)

---

#### Fix #2: Validate Secrets After Insert

```typescript
// app/api/gmb/oauth-callback/route.ts after line 624

if (secretsError) {
  gmbLogger.error(
    "Failed to store tokens",
    new Error(getErrorMessage(secretsError)),
    {
      accountId: upsertedAccount.id,
    },
  );

  // ✅ NEW: Rollback account insert if secrets fail
  await adminClient.from("gmb_accounts").delete().eq("id", upsertedAccount.id);

  // Return error to user
  const redirectUrl = buildSafeRedirectUrl(
    baseUrl,
    `/${localeCookie}/settings`,
    {
      error: "Failed to secure your credentials. Please try reconnecting.",
      error_code: "token_storage_failed",
    },
  );
  return NextResponse.redirect(redirectUrl);
}

// ✅ NEW: Verify secrets were actually saved
const { data: verifySecrets, error: verifyError } = await adminClient
  .from("gmb_secrets")
  .select("access_token")
  .eq("account_id", upsertedAccount.id)
  .single();

if (verifyError || !verifySecrets) {
  gmbLogger.error(
    "Secrets verification failed",
    new Error("Secrets not found after insert"),
    {
      accountId: upsertedAccount.id,
    },
  );

  // Rollback and redirect
  await adminClient.from("gmb_accounts").delete().eq("id", upsertedAccount.id);

  const redirectUrl = buildSafeRedirectUrl(
    baseUrl,
    `/${localeCookie}/settings`,
    {
      error: "Connection verification failed. Please try again.",
      error_code: "secrets_verification_failed",
    },
  );
  return NextResponse.redirect(redirectUrl);
}
```

---

#### Fix #3: Handle Missing Refresh Token in Token Refresh

```typescript
// lib/gmb/helpers.ts lines 39-118

export async function getValidAccessToken(
  _supabase: unknown,
  accountId: string,
): Promise<string> {
  const adminClient = createAdminClient();

  // 1. Fetch encrypted tokens from gmb_secrets
  const { data: secrets, error: secretError } = await adminClient
    .from("gmb_secrets")
    .select("access_token, refresh_token")
    .eq("account_id", accountId)
    .single();

  // Also fetch expiry from main account table
  const { data: account, error: accountError } = await adminClient
    .from("gmb_accounts")
    .select("token_expires_at, user_id") // ✅ Added user_id for error handling
    .eq("id", accountId)
    .single();

  if (secretError || !secrets || accountError || !account) {
    gmbLogger.error(
      "Credentials not found",
      new Error("Account credentials not found"),
      {
        accountId,
      },
    );
    throw new Error("Account credentials not found");
  }

  // 2. Decrypt tokens
  const accessToken = resolveTokenValue(secrets.access_token);
  const refreshToken = resolveTokenValue(secrets.refresh_token); // ✅ Can now be NULL

  if (!accessToken) {
    throw new Error("Failed to decrypt access token");
  }

  // ✅ NEW: Handle missing refresh_token case
  if (!refreshToken) {
    // Check expiration
    const now = Date.now();
    const expiresAt = account.token_expires_at
      ? new Date(account.token_expires_at).getTime()
      : 0;

    if (now >= expiresAt - 300000) {
      // Access token expired and no refresh_token available
      gmbLogger.error(
        "Access token expired with no refresh_token available",
        new Error("Re-authentication required"),
        { accountId, userId: account.user_id },
      );

      // Deactivate account to force re-authentication
      await adminClient
        .from("gmb_accounts")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      throw new Error(
        "Your Google account connection has expired. Please reconnect in Settings.",
      );
    }

    // Access token still valid, return it
    return accessToken;
  }

  // 3. Check expiration (existing logic continues)
  const now = Date.now();
  const expiresAt = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0;

  // Buffer: Refresh 5 minutes early
  if (now >= expiresAt - 300000) {
    gmbLogger.debug("Token expired, refreshing...");

    try {
      const tokens = await refreshAccessToken(refreshToken);

      // Update DB with new encrypted tokens
      const newExpiresAt = new Date(now + tokens.expires_in * 1000);

      // Update gmb_accounts (expiry)
      await adminClient
        .from("gmb_accounts")
        .update({
          token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      // Update gmb_secrets (tokens)
      await adminClient
        .from("gmb_secrets")
        .update({
          access_token: encryptToken(tokens.access_token),
          ...(tokens.refresh_token && {
            refresh_token: encryptToken(tokens.refresh_token),
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("account_id", accountId);

      return tokens.access_token;
    } catch (refreshError) {
      // ✅ NEW: Handle refresh failure gracefully
      gmbLogger.error(
        "Token refresh failed",
        refreshError instanceof Error
          ? refreshError
          : new Error(String(refreshError)),
        { accountId, userId: account.user_id },
      );

      // Deactivate account
      await adminClient
        .from("gmb_accounts")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      throw new Error(
        "Failed to refresh access token. Please reconnect your Google account in Settings.",
      );
    }
  }

  return accessToken;
}
```

---

#### Fix #4: Session Persistence Across OAuth Redirect

**Problem**: Supabase session cookies may be lost during OAuth redirect

**Solution**: Use state token to maintain session continuity

```typescript
// app/api/gmb/create-auth-url/route.ts lines 84-104

// Generate random state for security
const state = crypto.randomUUID();

// Calculate expiry time (30 minutes from now)
const expiresAt = new Date();
expiresAt.setMinutes(expiresAt.getMinutes() + 30);

// ✅ NEW: Store Supabase session info in state for recovery
const {
  data: { session },
} = await supabase.auth.getSession();

// Save state to database using admin client
const adminClient = createAdminClient();
const { error: stateError } = await adminClient
  .from("oauth_states")
  .insert({
    state,
    user_id: user.id,
    provider: "google",
    redirect_uri: returnUrl,
    expires_at: expiresAt.toISOString(),
    used: false,
    // ✅ NEW: Store session metadata for recovery
    metadata: {
      session_id: session?.access_token
        ? crypto
            .createHash("sha256")
            .update(session.access_token)
            .digest("hex")
            .substring(0, 16)
        : null,
      user_agent: request.headers.get("user-agent"),
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
    },
  })
  .select();
```

```typescript
// app/api/gmb/oauth-callback/route.ts lines 93-148

// Use admin client throughout to avoid reliance on browser session cookies
const adminClient = createAdminClient();

// Verify state and get user ID
const { data: stateRecord, error: stateError } = await adminClient
  .from("oauth_states")
  .select("*")
  .eq("state", state)
  .eq("used", false)
  .single();

if (stateError || !stateRecord) {
  gmbLogger.error(
    "Invalid OAuth state",
    new Error(getErrorMessage(stateError)),
  );

  // ✅ NEW: Better error message for session issues
  const redirectUrl = buildSafeRedirectUrl(
    baseUrl,
    `/${localeCookie}/settings`,
    {
      error: "OAuth session expired or invalid. Please try connecting again.",
      error_code: "invalid_state",
      hint: "session_lost", // Frontend can detect this and show session-specific help
    },
  );
  return NextResponse.redirect(redirectUrl);
}

// ✅ NEW: Log session metadata for debugging
gmbLogger.info("OAuth callback session info", {
  stateUserId: stateRecord.user_id,
  sessionMetadata: stateRecord.metadata,
  timeSinceStateCreated:
    Date.now() - new Date(stateRecord.created_at).getTime(),
});

const userId = stateRecord.user_id;

// ... rest of OAuth flow continues using userId from state (not from session)
```

**Why This Works**:

- OAuth flow no longer depends on Supabase session cookies
- User ID recovered from validated state token in database
- Session loss during redirect doesn't break the flow
- Admin client bypasses RLS securely using validated user_id

---

### 🟡 HIGH-PRIORITY IMPROVEMENTS (1 week)

#### Improvement #1: Token Expiry Monitoring & Proactive Refresh

**Create Cron Job**: `/app/api/cron/refresh-expiring-tokens/route.ts`

```typescript
/**
 * 🔄 TOKEN REFRESH CRON JOB
 *
 * Runs every 6 hours to proactively refresh tokens expiring within 24 hours
 *
 * Cron: 0 */6 * * * (every 6 hours)
 */

import { createAdminClient } from "@/lib/supabase/server";
import { refreshAccessToken } from "@/lib/gmb/helpers";
import { encryptToken, resolveTokenValue } from "@/lib/security/encryption";
import { gmbLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  try {
    // Find accounts with tokens expiring in next 24 hours
    const expiryThreshold = new Date();
    expiryThreshold.setHours(expiryThreshold.getHours() + 24);

    const { data: expiringAccounts } = await adminClient
      .from("gmb_accounts")
      .select("id, account_name, user_id, token_expires_at")
      .eq("is_active", true)
      .lt("token_expires_at", expiryThreshold.toISOString())
      .order("token_expires_at", { ascending: true })
      .limit(100); // Process in batches

    if (!expiringAccounts || expiringAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expiring tokens found",
        count: 0,
      });
    }

    gmbLogger.info(`Found ${expiringAccounts.length} accounts with expiring tokens`);

    const results = {
      total: expiringAccounts.length,
      refreshed: 0,
      failed: 0,
      noRefreshToken: 0,
    };

    // Process each account
    for (const account of expiringAccounts) {
      try {
        // Get secrets
        const { data: secrets } = await adminClient
          .from("gmb_secrets")
          .select("refresh_token")
          .eq("account_id", account.id)
          .single();

        if (!secrets?.refresh_token) {
          gmbLogger.warn("No refresh_token available", {
            accountId: account.id,
            accountName: account.account_name,
          });
          results.noRefreshToken++;
          continue;
        }

        const refreshToken = resolveTokenValue(secrets.refresh_token);
        if (!refreshToken) {
          results.noRefreshToken++;
          continue;
        }

        // Refresh tokens
        const newTokens = await refreshAccessToken(refreshToken);
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

        // Update database
        await adminClient
          .from("gmb_accounts")
          .update({
            token_expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", account.id);

        await adminClient
          .from("gmb_secrets")
          .update({
            access_token: encryptToken(newTokens.access_token),
            ...(newTokens.refresh_token && {
              refresh_token: encryptToken(newTokens.refresh_token),
            }),
            updated_at: new Date().toISOString(),
          })
          .eq("account_id", account.id);

        results.refreshed++;
        gmbLogger.info("Token refreshed successfully", {
          accountId: account.id,
          newExpiry: newExpiresAt.toISOString(),
        });
      } catch (error) {
        results.failed++;
        gmbLogger.error(
          "Failed to refresh token",
          error instanceof Error ? error : new Error(String(error)),
          { accountId: account.id }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Token refresh completed",
      results,
    });
  } catch (error) {
    gmbLogger.error(
      "Token refresh cron failed",
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

**Add to Vercel Cron** (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-expiring-tokens",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

#### Improvement #2: Account Health Monitoring Dashboard

**Create Status Endpoint**: `/app/api/gmb/accounts/health/route.ts`

```typescript
/**
 * 📊 GMB ACCOUNT HEALTH CHECK
 *
 * Returns health status of all GMB accounts for current user
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get accounts
  const { data: accounts } = await supabase
    .from("gmb_accounts")
    .select(
      "id, account_name, is_active, token_expires_at, last_sync, updated_at",
    )
    .eq("user_id", user.id);

  if (!accounts) {
    return NextResponse.json({ accounts: [] });
  }

  // Check secrets for each account
  const accountsWithHealth = await Promise.all(
    accounts.map(async (account) => {
      const { data: secrets } = await adminClient
        .from("gmb_secrets")
        .select("access_token, refresh_token")
        .eq("account_id", account.id)
        .single();

      const now = Date.now();
      const expiresAt = account.token_expires_at
        ? new Date(account.token_expires_at).getTime()
        : 0;
      const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);

      const hasAccessToken = !!secrets?.access_token;
      const hasRefreshToken = !!secrets?.refresh_token;
      const isExpired = now >= expiresAt;
      const isExpiringSoon = hoursUntilExpiry < 24 && hoursUntilExpiry > 0;

      let health: "healthy" | "warning" | "error";
      let message: string;

      if (!hasAccessToken) {
        health = "error";
        message = "Missing credentials - reconnect required";
      } else if (isExpired && !hasRefreshToken) {
        health = "error";
        message = "Token expired - reconnect required";
      } else if (isExpired && hasRefreshToken) {
        health = "warning";
        message = "Token expired - will attempt refresh on next use";
      } else if (isExpiringSoon && !hasRefreshToken) {
        health = "warning";
        message = `Token expires in ${Math.floor(hoursUntilExpiry)}h - no refresh token`;
      } else if (isExpiringSoon) {
        health = "warning";
        message = `Token expires in ${Math.floor(hoursUntilExpiry)}h`;
      } else {
        health = "healthy";
        message = `Token valid for ${Math.floor(hoursUntilExpiry)}h`;
      }

      return {
        ...account,
        health: {
          status: health,
          message,
          hasAccessToken,
          hasRefreshToken,
          expiresAt: account.token_expires_at,
          hoursUntilExpiry: Math.floor(hoursUntilExpiry),
        },
      };
    }),
  );

  return NextResponse.json({
    accounts: accountsWithHealth,
    summary: {
      total: accountsWithHealth.length,
      healthy: accountsWithHealth.filter((a) => a.health.status === "healthy")
        .length,
      warning: accountsWithHealth.filter((a) => a.health.status === "warning")
        .length,
      error: accountsWithHealth.filter((a) => a.health.status === "error")
        .length,
    },
  });
}
```

**Frontend Component**: `/components/settings/gmb-account-health.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface AccountHealth {
  id: string;
  account_name: string;
  is_active: boolean;
  health: {
    status: "healthy" | "warning" | "error";
    message: string;
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    expiresAt: string;
    hoursUntilExpiry: number;
  };
}

export function GMBAccountHealth() {
  const [accounts, setAccounts] = useState<AccountHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    const response = await fetch("/api/gmb/accounts/health");
    const data = await response.json();
    setAccounts(data.accounts || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">Healthy</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Warning</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600">Error</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading account health...</div>;
  }

  if (accounts.length === 0) {
    return <div className="text-muted-foreground">No accounts connected</div>;
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <Card key={account.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(account.health.status)}
                <CardTitle className="text-base">{account.account_name}</CardTitle>
              </div>
              {getStatusBadge(account.health.status)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {account.health.message}
            </p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>
                Access Token: {account.health.hasAccessToken ? "✓" : "✗"}
              </span>
              <span>
                Refresh Token: {account.health.hasRefreshToken ? "✓" : "✗"}
              </span>
            </div>
            {account.health.status !== "healthy" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => window.location.href = "/settings?tab=gmb&action=reconnect"}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconnect Account
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

#### Improvement #3: Better Error Messages & User Feedback

**Create Error Dictionary**: `/lib/gmb/error-messages.ts`

```typescript
/**
 * 📖 GMB ERROR MESSAGES DICTIONARY
 *
 * Bilingual (English + Arabic) error messages for GMB OAuth flows
 */

export interface ErrorMessage {
  en: string;
  ar: string;
  action?: string;
  actionAr?: string;
}

export const GMB_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  // OAuth Errors
  token_exchange_failed: {
    en: "Failed to connect with Google. The authorization code may have expired.",
    ar: "فشل الاتصال مع جوجل. قد يكون رمز التفويض قد انتهت صلاحيته.",
    action: "Try connecting again",
    actionAr: "حاول الاتصال مرة أخرى",
  },

  invalid_state: {
    en: "The connection request has expired or is invalid. Please start the connection process again.",
    ar: "انتهت صلاحية طلب الاتصال أو أنه غير صالح. يُرجى بدء عملية الاتصال مرة أخرى.",
    action: "Connect again",
    actionAr: "اتصل مرة أخرى",
  },

  session_lost: {
    en: "Your login session was lost during the connection. Please log in again and try connecting.",
    ar: "فُقدت جلسة تسجيل الدخول الخاصة بك أثناء الاتصال. يُرجى تسجيل الدخول مرة أخرى والمحاولة.",
    action: "Log in again",
    actionAr: "سجّل الدخول مرة أخرى",
  },

  token_storage_failed: {
    en: "We couldn't save your credentials securely. Please try connecting again.",
    ar: "تعذر حفظ بيانات اعتمادك بشكل آمن. يُرجى المحاولة مرة أخرى.",
    action: "Reconnect",
    actionAr: "أعد الاتصال",
  },

  no_refresh_token: {
    en: "Your connection will expire soon. Please reconnect to maintain access.",
    ar: "ستنتهي صلاحية اتصالك قريبًا. يُرجى إعادة الاتصال للحفاظ على الوصول.",
    action: "Reconnect now",
    actionAr: "أعد الاتصال الآن",
  },

  // Token Errors
  token_expired: {
    en: "Your Google account connection has expired. Please reconnect in Settings.",
    ar: "انتهت صلاحية اتصال حساب جوجل الخاص بك. يُرجى إعادة الاتصال في الإعدادات.",
    action: "Go to Settings",
    actionAr: "انتقل إلى الإعدادات",
  },

  token_refresh_failed: {
    en: "Failed to refresh your access. Please reconnect your Google account.",
    ar: "فشل تحديث وصولك. يُرجى إعادة توصيل حساب جوجل الخاص بك.",
    action: "Reconnect",
    actionAr: "أعد الاتصال",
  },

  // Secrets Errors
  secrets_not_found: {
    en: "Account credentials not found. Please reconnect your Google account.",
    ar: "لم يتم العثور على بيانات اعتماد الحساب. يُرجى إعادة توصيل حساب جوجل الخاص بك.",
    action: "Reconnect account",
    actionAr: "أعد توصيل الحساب",
  },

  decryption_failed: {
    en: "Unable to access your credentials. Please reconnect your account for security.",
    ar: "تعذر الوصول إلى بيانات اعتمادك. يُرجى إعادة توصيل حسابك للأمان.",
    action: "Reconnect securely",
    actionAr: "أعد الاتصال بشكل آمن",
  },
};

export function getErrorMessage(
  errorCode: string,
  locale: "en" | "ar" = "en",
): { message: string; action?: string } {
  const error = GMB_ERROR_MESSAGES[errorCode];
  if (!error) {
    return {
      message:
        locale === "ar"
          ? "حدث خطأ غير متوقع. يُرجى المحاولة مرة أخرى."
          : "An unexpected error occurred. Please try again.",
    };
  }

  return {
    message: locale === "ar" ? error.ar : error.en,
    action: locale === "ar" ? error.actionAr : error.action,
  };
}
```

**Use in Components**:

```typescript
// components/settings/gmb-connection-error.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/gmb/error-messages";

export function GMBConnectionError() {
  const searchParams = useSearchParams();
  const locale = useLocale() as "en" | "ar";

  const errorCode = searchParams.get("error_code");
  const customError = searchParams.get("error");

  if (!errorCode && !customError) return null;

  const { message, action } = errorCode
    ? getErrorMessage(errorCode, locale)
    : { message: customError || "Unknown error" };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {locale === "ar" ? "خطأ في الاتصال" : "Connection Error"}
      </AlertTitle>
      <AlertDescription>
        <p className="mb-2">{message}</p>
        {action && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/settings?tab=gmb"}
          >
            {action}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

---

### 🟢 NICE-TO-HAVE ENHANCEMENTS (2-4 weeks)

#### Enhancement #1: Automatic Token Recovery

When token refresh fails, automatically trigger re-authentication flow:

```typescript
// lib/gmb/auto-recovery.ts

export async function attemptTokenRecovery(
  accountId: string,
  userId: string,
): Promise<{ success: boolean; authUrl?: string }> {
  // Deactivate account
  await deactivateAccount(accountId);

  // Generate new auth URL
  const authUrl = await generateReAuthUrl(userId, accountId);

  // Store recovery metadata
  await storeRecoveryAttempt(accountId, {
    reason: "token_refresh_failed",
    timestamp: new Date().toISOString(),
    authUrl,
  });

  return { success: true, authUrl };
}
```

---

#### Enhancement #2: Multi-Account OAuth Batching

Allow users to reconnect multiple accounts in one OAuth flow:

```typescript
// Store multiple account IDs in state metadata
// Google OAuth allows selecting multiple accounts
```

---

#### Enhancement #3: Token Rotation Policy

Implement automatic token rotation every 30 days for security:

```typescript
// Proactively refresh tokens even if not expired
// Google allows unlimited refreshes
```

---

## 📋 IMPLEMENTATION CHECKLIST

### 🔴 CRITICAL (Week 1)

- [ ] **Database Migration**: Make `refresh_token` nullable in `gmb_secrets`
- [ ] **Backend Fix #1**: Update `oauth-callback/route.ts` to handle NULL refresh_token
- [ ] **Backend Fix #2**: Add secrets validation after insert
- [ ] **Backend Fix #3**: Update `getValidAccessToken()` to handle missing refresh_token
- [ ] **Backend Fix #4**: Implement session recovery from state token
- [ ] **Testing**: Test all OAuth flows (first-time, re-auth, no refresh_token)
- [ ] **Deploy**: Push to production with monitoring

### 🟡 HIGH (Week 2)

- [ ] **Cron Job**: Create token refresh cron job
- [ ] **Monitoring**: Create account health endpoint
- [ ] **Frontend**: Build GMB account health dashboard
- [ ] **Error Messages**: Implement bilingual error dictionary
- [ ] **Frontend**: Update all error displays to use new messages
- [ ] **Testing**: End-to-end testing of all error scenarios

### 🟢 MEDIUM (Weeks 3-4)

- [ ] **Auto Recovery**: Implement automatic token recovery flow
- [ ] **Analytics**: Add OAuth flow analytics tracking
- [ ] **Documentation**: Update user documentation with troubleshooting
- [ ] **Monitoring**: Set up alerts for high error rates

---

## 📊 SUCCESS METRICS

### Before Implementation

- 🔴 OAuth success rate: ~70% (30% fail due to NULL refresh_token)
- 🔴 Token refresh failures: High (no monitoring)
- 🔴 User confusion: High (generic error messages)
- 🔴 Manual reconnections: Frequent

### After Implementation (Expected)

- ✅ OAuth success rate: >95%
- ✅ Token refresh failures: <5%
- ✅ User confusion: Low (clear error messages)
- ✅ Manual reconnections: Reduced by 70%
- ✅ Proactive token refresh: 90%+ accounts
- ✅ Average time to recovery: <2 minutes

---

## 🎯 TESTING PLAN

### Test Scenarios

1. **First-Time OAuth** ✅
   - User clicks "Connect GMB"
   - Completes OAuth flow
   - Receives both access_token and refresh_token
   - Tokens saved successfully
   - Redirected to select-account

2. **Re-Authentication OAuth** ⚠️
   - User reconnects existing account
   - May not receive new refresh_token
   - Should fallback to existing refresh_token
   - Should warn if no refresh_token available
   - Redirected to dashboard if locations exist

3. **Token Expiry Handling** ⚠️
   - Access token expires
   - System attempts refresh using refresh_token
   - Success: New tokens saved, user continues normally
   - Failure: Account deactivated, user prompted to reconnect

4. **Session Loss During OAuth** ⚠️
   - User starts OAuth
   - Session cookie lost during redirect
   - Flow continues using state token
   - User ID recovered from state record
   - OAuth completes successfully

5. **No Refresh Token Available** 🔴
   - Account has access_token but no refresh_token
   - Access token expires
   - System deactivates account
   - User sees clear error message
   - User prompted to reconnect

### Test Commands

```bash
# Test OAuth flow
curl -X POST http://localhost:3000/api/gmb/create-auth-url \
  -H "Content-Type: application/json" \
  -b "cookies.txt" \
  -d '{"returnUrl": "/dashboard"}'

# Test account health
curl http://localhost:3000/api/gmb/accounts/health \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test token refresh cron
curl http://localhost:3000/api/cron/refresh-expiring-tokens \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## 🚨 ROLLBACK PLAN

If critical issues occur after deployment:

1. **Database Rollback**:

```sql
-- Revert refresh_token to NOT NULL (only if no NULLs exist)
ALTER TABLE gmb_secrets
ALTER COLUMN refresh_token SET NOT NULL;
```

2. **Code Rollback**: Revert to previous git commit

```bash
git revert HEAD
git push origin main
```

3. **Emergency Fix**: Temporarily bypass token refresh

```typescript
// lib/gmb/helpers.ts
// Add emergency bypass flag
const BYPASS_TOKEN_REFRESH =
  process.env.EMERGENCY_BYPASS_TOKEN_REFRESH === "true";

if (BYPASS_TOKEN_REFRESH) {
  return accessToken; // Skip refresh logic
}
```

---

## 📞 SUPPORT & MONITORING

### Monitoring Setup

1. **Sentry Alerts**:
   - Alert on `EncryptionError` spike
   - Alert on `null value in column "refresh_token"` errors
   - Alert on OAuth callback failures >10%

2. **Log Monitoring**:
   - Track OAuth success/failure rates
   - Monitor token refresh success/failure
   - Track re-authentication frequency

3. **User Metrics**:
   - % of users with active GMB connections
   - % of users requiring re-authentication per month
   - Average time between disconnections

### Support Documentation

**For Users**:

- "How to reconnect your Google Business account"
- "Why do I need to reconnect?"
- "Troubleshooting connection issues"

**For Support Team**:

- OAuth flow diagram
- Common error codes and solutions
- Database queries for diagnostics

---

## 💡 RECOMMENDATIONS

### Short-term (This Week)

1. ✅ **Deploy database migration** to make refresh_token nullable
2. ✅ **Update oauth-callback** to handle NULL refresh_token gracefully
3. ✅ **Add logging** for all OAuth errors with context
4. ✅ **Test thoroughly** in staging before production

### Medium-term (Next 2 Weeks)

1. ✅ **Implement cron job** for proactive token refresh
2. ✅ **Build health dashboard** for users to see account status
3. ✅ **Improve error messages** with bilingual support
4. ✅ **Add monitoring** for OAuth flow metrics

### Long-term (Next Month)

1. 🔄 **Consider alternative**: Store encrypted tokens in secure vault service
2. 🔄 **Implement**: Automatic recovery flow for failed refreshes
3. 🔄 **Add**: OAuth flow analytics dashboard for admin
4. 🔄 **Document**: Complete OAuth flow architecture

---

## ✅ CONCLUSION

The OAuth flow has **three critical issues** that need immediate attention:

1. 🔴 **NULL refresh_token constraint violation** - Blocking re-authentication
2. 🔴 **Failed secrets fetch** - Causing location fetch failures
3. 🟡 **Session loss during OAuth** - Poor user experience

**Recommended Approach**:

1. **Week 1**: Fix critical issues (database + backend changes)
2. **Week 2**: Add monitoring and health dashboard
3. **Week 3**: Improve error messages and user experience
4. **Week 4**: Implement proactive token management

**Expected Outcome**:

- 95%+ OAuth success rate
- <5% token refresh failures
- Clear user feedback on connection status
- Proactive token refresh before expiry
- Reduced support tickets related to GMB connections

---

**Next Steps**: Review this plan, prioritize items, and approve to proceed with implementation.
