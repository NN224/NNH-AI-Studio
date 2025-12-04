-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 OAUTH MONITORING VIEW
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Purpose: Real-time monitoring dashboard for OAuth flow health
--
-- Usage: SELECT * FROM oauth_health_metrics;
--
-- Metrics Tracked:
--   1. NULL constraint violations (should be 0 after fix)
--   2. Missing refresh_token rate (track Google OAuth behavior)
--   3. Account deactivation rate (users needing reconnection)
--   4. Token expiry status (proactive monitoring)
--
-- Created: 2025-12-04
-- Author: Claude Code (OAuth Flow Monitoring)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Create monitoring view for quick OAuth health checks
CREATE OR REPLACE VIEW oauth_health_metrics AS
SELECT
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 📈 ACCOUNT STATISTICS
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  (SELECT COUNT(*) FROM gmb_accounts WHERE is_active = true)
    as active_accounts,

  (SELECT COUNT(*) FROM gmb_accounts WHERE is_active = false)
    as inactive_accounts,

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🔑 TOKEN STATISTICS (Key Metric #2)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  (SELECT COUNT(*) FROM gmb_secrets WHERE refresh_token IS NOT NULL)
    as accounts_with_refresh_token,

  (SELECT COUNT(*) FROM gmb_secrets WHERE refresh_token IS NULL)
    as accounts_without_refresh_token,

  -- Percentage without refresh_token (Target: <20%)
  ROUND(
    (SELECT COUNT(*) FROM gmb_secrets WHERE refresh_token IS NULL) * 100.0 /
    NULLIF((SELECT COUNT(*) FROM gmb_secrets), 0),
    2
  ) as percent_missing_refresh_token,

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- ⚠️ DEACTIVATION STATISTICS (Key Metric #3)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  (SELECT COUNT(*) FROM gmb_accounts
   WHERE is_active = false
   AND updated_at > NOW() - INTERVAL '24 hours')
    as deactivated_last_24h,

  (SELECT COUNT(*) FROM gmb_accounts
   WHERE is_active = false
   AND updated_at > NOW() - INTERVAL '7 days')
    as deactivated_last_7d,

  -- Deactivation rate (Target: <5%)
  ROUND(
    (SELECT COUNT(*) FROM gmb_accounts
     WHERE is_active = false
     AND updated_at > NOW() - INTERVAL '7 days') * 100.0 /
    NULLIF((SELECT COUNT(*) FROM gmb_accounts), 0),
    2
  ) as deactivation_rate_7d_percent,

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- ⏰ TOKEN EXPIRY STATISTICS (Proactive Monitoring)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  (SELECT COUNT(*) FROM gmb_accounts
   WHERE is_active = true
   AND token_expires_at < NOW() + INTERVAL '1 hour'
   AND token_expires_at > NOW())
    as expiring_within_1h,

  (SELECT COUNT(*) FROM gmb_accounts
   WHERE is_active = true
   AND token_expires_at < NOW() + INTERVAL '24 hours'
   AND token_expires_at > NOW())
    as expiring_within_24h,

  -- 🔴 CRITICAL: Expired but still active (should auto-refresh or deactivate)
  (SELECT COUNT(*) FROM gmb_accounts
   WHERE is_active = true
   AND token_expires_at < NOW())
    as expired_but_active,

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🚨 AT-RISK ACCOUNTS (No refresh_token + expiring soon)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  (SELECT COUNT(*)
   FROM gmb_accounts ga
   LEFT JOIN gmb_secrets gs ON ga.id = gs.account_id
   WHERE ga.is_active = true
   AND gs.refresh_token IS NULL
   AND ga.token_expires_at < NOW() + INTERVAL '24 hours')
    as at_risk_accounts,

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 📅 TIMESTAMP
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  NOW() as checked_at;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 DETAILED ACCOUNT STATUS VIEW (For Debugging)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE VIEW oauth_account_details AS
SELECT
  ga.id,
  ga.account_id as google_account_id,
  ga.account_name,
  ga.user_id,
  ga.is_active,
  ga.token_expires_at,
  ga.last_sync,
  ga.updated_at,

  -- Token status
  gs.refresh_token IS NOT NULL as has_refresh_token,
  gs.access_token IS NOT NULL as has_access_token,

  -- Expiry status
  CASE
    WHEN ga.token_expires_at < NOW() THEN 'EXPIRED'
    WHEN ga.token_expires_at < NOW() + INTERVAL '1 hour' THEN 'EXPIRING_SOON'
    WHEN ga.token_expires_at < NOW() + INTERVAL '24 hours' THEN 'EXPIRING_TODAY'
    ELSE 'VALID'
  END as token_status,

  -- Time until expiry (in hours)
  ROUND(
    EXTRACT(EPOCH FROM (ga.token_expires_at - NOW())) / 3600,
    2
  ) as hours_until_expiry,

  -- Risk level
  CASE
    WHEN ga.is_active = false THEN 'INACTIVE'
    WHEN gs.refresh_token IS NULL AND ga.token_expires_at < NOW() THEN 'CRITICAL'
    WHEN gs.refresh_token IS NULL AND ga.token_expires_at < NOW() + INTERVAL '24 hours' THEN 'HIGH_RISK'
    WHEN ga.token_expires_at < NOW() THEN 'EXPIRED'
    WHEN ga.token_expires_at < NOW() + INTERVAL '1 hour' THEN 'WARNING'
    ELSE 'HEALTHY'
  END as risk_level

FROM gmb_accounts ga
LEFT JOIN gmb_secrets gs ON ga.id = gs.account_id
ORDER BY
  CASE
    WHEN ga.is_active = false THEN 5
    WHEN gs.refresh_token IS NULL AND ga.token_expires_at < NOW() THEN 1
    WHEN gs.refresh_token IS NULL AND ga.token_expires_at < NOW() + INTERVAL '24 hours' THEN 2
    WHEN ga.token_expires_at < NOW() THEN 3
    WHEN ga.token_expires_at < NOW() + INTERVAL '1 hour' THEN 4
    ELSE 6
  END,
  ga.token_expires_at ASC;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📈 WEEKLY TREND VIEW
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE VIEW oauth_weekly_trends AS
WITH weekly_deactivations AS (
  SELECT
    DATE_TRUNC('week', updated_at)::date as week_start,
    COUNT(*) as deactivated_count
  FROM gmb_accounts
  WHERE is_active = false
    AND updated_at > NOW() - INTERVAL '4 weeks'
  GROUP BY DATE_TRUNC('week', updated_at)
),
weekly_activations AS (
  SELECT
    DATE_TRUNC('week', created_at)::date as week_start,
    COUNT(*) as activated_count
  FROM gmb_accounts
  WHERE created_at > NOW() - INTERVAL '4 weeks'
  GROUP BY DATE_TRUNC('week', created_at)
)
SELECT
  COALESCE(d.week_start, a.week_start) as week_start,
  COALESCE(a.activated_count, 0) as new_accounts,
  COALESCE(d.deactivated_count, 0) as deactivated_accounts,
  ROUND(
    COALESCE(d.deactivated_count, 0) * 100.0 /
    NULLIF(COALESCE(a.activated_count, 0) + COALESCE(d.deactivated_count, 0), 0),
    2
  ) as deactivation_rate_percent
FROM weekly_deactivations d
FULL OUTER JOIN weekly_activations a ON d.week_start = a.week_start
ORDER BY COALESCE(d.week_start, a.week_start) DESC;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 💬 COMMENTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMENT ON VIEW oauth_health_metrics IS
'Real-time OAuth flow health metrics. Query this view to monitor:
1. NULL constraint violations (should be 0 after migration)
2. Missing refresh_token rate (target <20%)
3. Account deactivation rate (target <5% per week)
4. Token expiry status (proactive monitoring)
Use: SELECT * FROM oauth_health_metrics;';

COMMENT ON VIEW oauth_account_details IS
'Detailed account-level OAuth status for debugging and support.
Shows token status, expiry time, and risk level for each account.
Use: SELECT * FROM oauth_account_details WHERE risk_level = ''CRITICAL'';';

COMMENT ON VIEW oauth_weekly_trends IS
'Weekly trend analysis for OAuth account activations and deactivations.
Use: SELECT * FROM oauth_weekly_trends;';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📋 USAGE EXAMPLES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Example 1: Check overall health
-- SELECT * FROM oauth_health_metrics;

-- Example 2: Find accounts at risk
-- SELECT * FROM oauth_account_details WHERE risk_level IN ('CRITICAL', 'HIGH_RISK');

-- Example 3: Find accounts that need immediate attention
-- SELECT * FROM oauth_account_details WHERE token_status = 'EXPIRED' AND is_active = true;

-- Example 4: Weekly trend
-- SELECT * FROM oauth_weekly_trends;

-- Example 5: Count accounts by risk level
-- SELECT risk_level, COUNT(*) FROM oauth_account_details GROUP BY risk_level ORDER BY COUNT(*) DESC;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
