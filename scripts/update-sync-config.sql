-- ============================================================================
-- Update Sync System Configuration
-- ============================================================================
-- Run this after applying the migration to set your actual values
-- ============================================================================

-- 1. Update Supabase URL (replace with your actual URL)
UPDATE sync_system_config
SET value = 'https://YOUR_PROJECT_ID.supabase.co'
WHERE key = 'supabase_url';

-- 2. Update Trigger Secret (get from your .env file: TRIGGER_SECRET)
UPDATE sync_system_config
SET value = 'YOUR_TRIGGER_SECRET_HERE'
WHERE key = 'trigger_secret';

-- 3. Verify configuration
SELECT 
  key,
  CASE 
    WHEN key = 'trigger_secret' THEN '***' || RIGHT(value, 4)  -- Hide most of secret
    ELSE value
  END AS value,
  description,
  updated_at
FROM sync_system_config
ORDER BY key;

-- 4. Check health status
SELECT * FROM check_sync_cron_health();

-- 5. View cron jobs
SELECT * FROM v_sync_cron_status;

-- ============================================================================
-- Expected Results:
-- ============================================================================
-- config_ready: true
-- status: HEALTHY
-- worker_jobs_active: 1 (or more)
-- issues: (should be empty array)
-- ============================================================================
