# 🔍 OAuth Flow Monitoring Guide

**Created**: 2025-12-04
**Purpose**: Track OAuth improvements after deployment

---

## 📊 Key Metrics to Monitor

### 1. NULL Constraint Violations (Should → 0)

**What to Check**: Database errors in Supabase logs

**Query in Supabase SQL Editor**:

```sql
-- Check for NULL constraint errors in the last 24 hours
SELECT
  created_at,
  event_message,
  metadata
FROM auth.audit_log_entries
WHERE event_message LIKE '%null value in column "refresh_token"%'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Expected Result**:

- ✅ **Before Fix**: 5-10 errors per day
- ✅ **After Fix**: **0 errors** (constraint is now nullable)

---

### 2. NULL Refresh Token Warnings (Track Frequency)

**What to Check**: Application logs for when Google doesn't return refresh_token

**Query in Supabase Logs** (or your logging service):

```sql
-- Count NULL refresh_token warnings by day
SELECT
  DATE(created_at) as date,
  COUNT(*) as warning_count
FROM logs
WHERE message LIKE '%No refresh_token available - user will need to re-auth%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Check gmb_secrets table directly**:

```sql
-- Count accounts with/without refresh_token
SELECT
  COUNT(*) as total_accounts,
  COUNT(refresh_token) as accounts_with_refresh_token,
  COUNT(*) - COUNT(refresh_token) as accounts_without_refresh_token,
  ROUND(
    (COUNT(*) - COUNT(refresh_token)) * 100.0 / COUNT(*),
    2
  ) as percent_without_refresh_token
FROM gmb_secrets;
```

**Expected Result**:

- ✅ **Normal Range**: 10-20% of accounts may have NULL refresh_token
- ⚠️ **Concern**: >50% suggests Google OAuth prompt needs adjustment
- ✅ **These accounts will work fine until access_token expires (1 hour)**

**What This Tells You**:

- High percentage = Users reconnecting often (prompt=select_account not returning refresh_token)
- Solution: Consider forcing `prompt=consent` for re-auth (see Quick Fix #3 in docs)

---

### 3. Account Deactivations (Should Be Rare)

**What to Check**: Accounts deactivated due to expired tokens with no refresh_token

**Query**:

```sql
-- Find recently deactivated accounts
SELECT
  ga.id,
  ga.account_name,
  ga.is_active,
  ga.token_expires_at,
  ga.updated_at,
  gs.refresh_token IS NULL as missing_refresh_token,
  EXTRACT(EPOCH FROM (NOW() - ga.token_expires_at)) / 3600 as hours_since_expiry
FROM gmb_accounts ga
LEFT JOIN gmb_secrets gs ON ga.id = gs.account_id
WHERE ga.is_active = false
  AND ga.updated_at > NOW() - INTERVAL '7 days'
ORDER BY ga.updated_at DESC;
```

**Expected Result**:

- ✅ **Target**: <5% of accounts deactivated per week
- ⚠️ **Concern**: >10% suggests issues with token refresh

**Why Deactivation Happens**:

1. Access token expired (after 1 hour)
2. No refresh_token available to get new access_token
3. System automatically deactivates account
4. User sees bilingual error message asking to reconnect

---

## 🎯 Success Metrics Dashboard

Create this view in Supabase for quick monitoring:

```sql
-- Create monitoring view
CREATE OR REPLACE VIEW oauth_health_metrics AS
SELECT
  -- Total accounts
  (SELECT COUNT(*) FROM gmb_accounts WHERE is_active = true) as active_accounts,

  -- Accounts with refresh_token
  (SELECT COUNT(*) FROM gmb_secrets WHERE refresh_token IS NOT NULL) as accounts_with_refresh_token,

  -- Accounts without refresh_token
  (SELECT COUNT(*) FROM gmb_secrets WHERE refresh_token IS NULL) as accounts_without_refresh_token,

  -- Deactivated in last 7 days
  (SELECT COUNT(*) FROM gmb_accounts
   WHERE is_active = false
   AND updated_at > NOW() - INTERVAL '7 days') as deactivated_last_7_days,

  -- Expiring soon (within 24 hours)
  (SELECT COUNT(*) FROM gmb_accounts
   WHERE is_active = true
   AND token_expires_at < NOW() + INTERVAL '24 hours'
   AND token_expires_at > NOW()) as expiring_within_24h,

  -- Already expired (should auto-refresh or deactivate)
  (SELECT COUNT(*) FROM gmb_accounts
   WHERE is_active = true
   AND token_expires_at < NOW()) as expired_but_active;
```

**Query the view**:

```sql
SELECT * FROM oauth_health_metrics;
```

**Expected Results**:

| Metric                | Before Fix | After Fix (Week 1) | Target |
| --------------------- | ---------- | ------------------ | ------ |
| Active Accounts       | 100        | 100                | -      |
| With Refresh Token    | 70         | 80-90              | >80%   |
| Without Refresh Token | 30         | 10-20              | <20%   |
| Deactivated (7d)      | 15-20      | <5                 | <5     |
| Expiring Within 24h   | Varies     | Auto-refreshed     | -      |
| Expired But Active    | 5-10       | 0                  | 0      |

---

## 🔔 Alert Thresholds

Set up alerts (via Supabase Dashboard or external monitoring) for:

### 🔴 Critical Alerts

- **NULL constraint errors**: Any occurrence (should be 0)
- **Expired but active accounts**: >5 accounts (token refresh failing)
- **Deactivation rate**: >10% in 7 days (token refresh issues)

### 🟡 Warning Alerts

- **Missing refresh_token**: >30% of accounts (OAuth prompt issue)
- **Deactivation rate**: >5% in 7 days (minor concern)

---

## 📈 Weekly Report Query

Run this query every Monday to track trends:

```sql
-- Weekly OAuth Health Report
WITH weekly_stats AS (
  SELECT
    DATE_TRUNC('week', updated_at) as week_start,
    COUNT(*) FILTER (WHERE is_active = false) as deactivated_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_count
  FROM gmb_accounts
  WHERE updated_at > NOW() - INTERVAL '4 weeks'
  GROUP BY DATE_TRUNC('week', updated_at)
),
token_stats AS (
  SELECT
    COUNT(*) as total,
    COUNT(refresh_token) as with_token,
    COUNT(*) - COUNT(refresh_token) as without_token
  FROM gmb_secrets
)
SELECT
  ws.week_start::date,
  ws.active_count,
  ws.deactivated_count,
  ROUND(ws.deactivated_count * 100.0 / NULLIF(ws.active_count + ws.deactivated_count, 0), 2) as deactivation_rate_percent,
  ts.total as total_accounts_now,
  ts.with_token as accounts_with_refresh_token,
  ROUND(ts.without_token * 100.0 / NULLIF(ts.total, 0), 2) as percent_missing_refresh_token
FROM weekly_stats ws
CROSS JOIN token_stats ts
ORDER BY ws.week_start DESC;
```

**Sample Output**:

```
week_start  | active | deactivated | deactivation_rate | total | with_refresh | missing_%
------------|--------|-------------|-------------------|-------|--------------|----------
2025-12-02  | 95     | 2           | 2.06%            | 97    | 85           | 12.37%
2025-11-25  | 92     | 15          | 14.02%           | 97    | 70           | 27.84%
```

---

## 🛠️ Troubleshooting Common Issues

### Issue: High Missing Refresh Token Rate (>30%)

**Root Cause**: Google OAuth not returning refresh_token on re-auth

**Solution**: Force consent prompt for re-auth

**File**: [app/api/gmb/create-auth-url/route.ts](../app/api/gmb/create-auth-url/route.ts)

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

### Issue: High Deactivation Rate (>10%)

**Root Cause**: Tokens expiring before refresh

**Solution**: Implement proactive token refresh cron (see OAUTH-FLOW-AUDIT-AND-PLAN.md)

**Quick Check**:

```sql
-- Find accounts expiring soon
SELECT
  ga.id,
  ga.account_name,
  ga.token_expires_at,
  EXTRACT(EPOCH FROM (ga.token_expires_at - NOW())) / 3600 as hours_until_expiry,
  gs.refresh_token IS NOT NULL as has_refresh_token
FROM gmb_accounts ga
LEFT JOIN gmb_secrets gs ON ga.id = gs.account_id
WHERE ga.is_active = true
  AND ga.token_expires_at < NOW() + INTERVAL '24 hours'
ORDER BY ga.token_expires_at ASC;
```

---

### Issue: Expired But Active Accounts (>0)

**Root Cause**: Token refresh logic not running or failing

**Check Logs**:

```sql
-- Find recent token refresh attempts
SELECT *
FROM logs
WHERE message LIKE '%Token refresh%'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

**Manual Trigger** (for testing):

```typescript
// In /api/gmb/locations/fetch-google/route.ts or similar
// getValidAccessToken() will automatically attempt refresh
```

---

## 📝 Logging Best Practices

All OAuth events should be logged with this structure:

```typescript
// Success case
gmbLogger.info("OAuth flow completed", {
  userId,
  accountId,
  hasRefreshToken: boolean,
  isFirstTime: boolean,
  isReAuth: boolean,
});

// Warning case
gmbLogger.warn("No refresh_token available", {
  userId,
  accountId,
  hadExistingRefreshToken: boolean,
  receivedNewRefreshToken: boolean,
});

// Error case
gmbLogger.error("Token refresh failed", error, {
  userId,
  accountId,
  errorMessage: string,
  hoursExpired: number,
});
```

---

## 🎯 Next Steps After Monitoring

### Week 1: Validate Fixes

- ✅ Confirm NULL constraint errors = 0
- ✅ Track missing refresh_token rate
- ✅ Monitor deactivation rate

### Week 2: Optimize

- If missing refresh_token >30%: Implement force consent
- If deactivation rate >5%: Add proactive token refresh cron
- If logs show high refresh failures: Investigate Google API errors

### Week 3: Enhance

- Build user-facing account health dashboard
- Add email alerts for expiring tokens
- Implement auto-recovery flow

---

## 📞 Support Queries

**For user support**, use these queries to diagnose issues:

```sql
-- User reports "connection lost"
SELECT
  ga.id,
  ga.account_name,
  ga.is_active,
  ga.token_expires_at,
  ga.last_sync,
  gs.refresh_token IS NOT NULL as has_refresh_token,
  CASE
    WHEN ga.token_expires_at < NOW() THEN 'EXPIRED'
    WHEN ga.token_expires_at < NOW() + INTERVAL '1 hour' THEN 'EXPIRING_SOON'
    ELSE 'VALID'
  END as token_status
FROM gmb_accounts ga
LEFT JOIN gmb_secrets gs ON ga.id = gs.account_id
WHERE ga.user_id = 'USER_ID_HERE'
ORDER BY ga.updated_at DESC;
```

**Recommended Actions**:

- `EXPIRED` + `has_refresh_token = false` → Ask user to reconnect
- `EXPIRED` + `has_refresh_token = true` → Token refresh should work (check logs)
- `EXPIRING_SOON` → Proactive refresh will trigger soon
- `VALID` → Check other issues (permissions, API errors)

---

## ✅ Success Checklist

After 1 week of monitoring, you should see:

- [ ] Zero NULL constraint violations in Supabase logs
- [ ] Missing refresh_token rate <20%
- [ ] Account deactivation rate <5% per week
- [ ] Clear patterns in logs (warnings for missing tokens, errors with context)
- [ ] No "expired but active" accounts (auto-refresh working)
- [ ] User feedback: clearer error messages, less confusion

---

**Questions?** See [OAUTH-FLOW-AUDIT-AND-PLAN.md](OAUTH-FLOW-AUDIT-AND-PLAN.md) for detailed implementation plan.
