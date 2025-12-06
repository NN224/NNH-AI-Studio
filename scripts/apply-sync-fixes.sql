-- ============================================================================
-- Apply All Sync System Fixes
-- ============================================================================
-- Run this in Supabase SQL Editor to apply all fixes
-- ============================================================================

-- This script combines the fixes from:
-- 1. 20250102000003_fix_health_check_function.sql
-- 2. 20250102000004_fix_mark_stale_jobs.sql

-- ============================================================================
-- FIX 1: check_sync_cron_health() - Resolve Ambiguous Column
-- ============================================================================

DROP FUNCTION IF EXISTS check_sync_cron_health();

CREATE OR REPLACE FUNCTION check_sync_cron_health()
RETURNS TABLE(
  status TEXT,
  config_ready BOOLEAN,
  worker_jobs_active INTEGER,
  stale_jobs_active INTEGER,
  last_worker_run TIMESTAMPTZ,
  pending_jobs_count BIGINT,
  processing_jobs_count BIGINT,
  issues TEXT[]
) AS $$
DECLARE
  v_issues TEXT[] := ARRAY[]::TEXT[];
  v_supabase_url TEXT;
  v_trigger_secret TEXT;
  v_config_ready BOOLEAN := true;
  v_status TEXT;
BEGIN
  v_supabase_url := get_sync_config('supabase_url');
  v_trigger_secret := get_sync_config('trigger_secret');
  
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_config_ready := false;
    v_issues := array_append(v_issues, 'supabase_url not configured');
  END IF;
  
  IF v_trigger_secret IS NULL OR v_trigger_secret = '' THEN
    v_config_ready := false;
    v_issues := array_append(v_issues, 'trigger_secret not configured');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE 'gmb-%' AND active = true) THEN
    v_issues := array_append(v_issues, 'No active worker cron jobs');
  END IF;

  v_status := CASE
    WHEN v_config_ready AND array_length(v_issues, 1) IS NULL THEN 'HEALTHY'
    WHEN v_config_ready AND array_length(v_issues, 1) > 0 THEN 'DEGRADED'
    ELSE 'UNHEALTHY'
  END;

  RETURN QUERY
  SELECT
    v_status AS status,
    v_config_ready AS config_ready,
    (SELECT COUNT(*)::INTEGER FROM cron.job WHERE jobname LIKE 'gmb-%' AND active = true) AS worker_jobs_active,
    (SELECT COUNT(*)::INTEGER FROM cron.job WHERE jobname LIKE 'mark-stale-%' AND active = true) AS stale_jobs_active,
    (SELECT MAX(jrd.start_time) 
     FROM cron.job_run_details jrd
     JOIN cron.job j ON j.jobid = jrd.jobid
     WHERE j.jobname LIKE 'gmb-%') AS last_worker_run,
    (SELECT COUNT(*) FROM sync_queue sq WHERE sq.status = 'pending') AS pending_jobs_count,
    (SELECT COUNT(*) FROM sync_queue sq WHERE sq.status = 'processing') AS processing_jobs_count,
    v_issues AS issues;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX 2: Auto-update updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sync_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sync_queue_updated_at ON sync_queue;

CREATE TRIGGER trigger_update_sync_queue_updated_at
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_queue_updated_at();

-- ============================================================================
-- FIX 3: Improved mark_stale_sync_jobs()
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_stale_sync_jobs()
RETURNS void AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE sync_queue
  SET
    status = CASE
      WHEN attempts < max_attempts THEN 'pending'
      ELSE 'failed'
    END,
    started_at = NULL,
    error_message = CASE
      WHEN attempts < max_attempts 
      THEN 'Job timed out (stale) - retrying'
      ELSE 'Job timed out after max attempts'
    END
  WHERE
    status = 'processing'
    AND started_at < NOW() - INTERVAL '15 minutes';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count > 0 THEN
    RAISE NOTICE 'Marked % stale job(s)', v_updated_count;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Test All Fixes
-- ============================================================================

-- Test 1: Health Check
SELECT '✅ Testing health check...' AS test;
SELECT * FROM check_sync_cron_health();

-- Test 2: Stale Jobs
SELECT '✅ Testing mark_stale_jobs...' AS test;
SELECT mark_stale_sync_jobs();

-- Test 3: Cron Status
SELECT '✅ Checking cron jobs status...' AS test;
SELECT * FROM v_sync_cron_status;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  '✅ All fixes applied successfully!' AS status,
  'System is ready to use' AS message;
