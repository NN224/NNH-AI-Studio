-- ============================================================================
-- Setup Cron Jobs for Sync System
-- ============================================================================
-- This migration sets up pg_cron jobs to automatically process sync queue
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 1. Create helper function to call Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_sync_worker()
RETURNS void AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_trigger_secret TEXT;
  v_response TEXT;
BEGIN
  -- Get environment variables (these should be set in Supabase project settings)
  v_supabase_url := current_setting('app.supabase_url', true);
  v_trigger_secret := current_setting('app.trigger_secret', true);
  
  IF v_supabase_url IS NULL OR v_trigger_secret IS NULL THEN
    RAISE WARNING 'Missing required settings: supabase_url or trigger_secret';
    RETURN;
  END IF;

  -- Call the Edge Function using pg_net
  SELECT content INTO v_response
  FROM net.http_post(
    url := v_supabase_url || '/functions/v1/gmb-sync-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Trigger-Secret', v_trigger_secret
    ),
    body := '{"trigger": "cron"}'::jsonb
  );

  RAISE NOTICE 'Sync worker triggered: %', v_response;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger sync worker: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Schedule Cron Jobs
-- ============================================================================

-- Remove existing jobs if they exist
SELECT cron.unschedule('gmb-sync-worker-frequent')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'gmb-sync-worker-frequent'
);

SELECT cron.unschedule('gmb-sync-worker-regular')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'gmb-sync-worker-regular'
);

SELECT cron.unschedule('mark-stale-jobs')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'mark-stale-jobs'
);

-- Job 1: Process sync queue every 2 minutes (frequent)
-- This ensures new sync requests are picked up quickly
SELECT cron.schedule(
  'gmb-sync-worker-frequent',
  '*/2 * * * *',  -- Every 2 minutes
  $$SELECT trigger_sync_worker();$$
);

-- Job 2: Mark stale jobs every 10 minutes
-- This resets jobs that got stuck in "processing" state
SELECT cron.schedule(
  'mark-stale-jobs',
  '*/10 * * * *',  -- Every 10 minutes
  $$SELECT mark_stale_sync_jobs();$$
);

-- ============================================================================
-- 3. Create monitoring view
-- ============================================================================

CREATE OR REPLACE VIEW v_sync_cron_status AS
SELECT 
  j.jobname,
  j.schedule,
  j.command,
  j.active,
  j.jobid,
  -- Last run info
  r.start_time AS last_run_start,
  r.end_time AS last_run_end,
  r.status AS last_run_status,
  -- Next scheduled run
  CASE 
    WHEN j.active THEN 
      (SELECT start_time 
       FROM cron.job_run_details 
       WHERE jobid = j.jobid 
       AND status = 'starting'
       ORDER BY start_time DESC 
       LIMIT 1)
    ELSE NULL
  END AS next_run
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT start_time, end_time, status
  FROM cron.job_run_details
  WHERE jobid = j.jobid
  ORDER BY start_time DESC
  LIMIT 1
) r ON true
WHERE j.jobname LIKE 'gmb-%' OR j.jobname LIKE 'mark-stale-%'
ORDER BY j.jobname;

-- ============================================================================
-- 4. Grant necessary permissions
-- ============================================================================

-- Allow service role to manage cron jobs
GRANT USAGE ON SCHEMA cron TO service_role;
GRANT SELECT ON cron.job TO service_role;
GRANT SELECT ON cron.job_run_details TO service_role;

-- ============================================================================
-- 5. Add configuration table for cron settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_cron_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_enabled BOOLEAN DEFAULT true,
  worker_interval_minutes INTEGER DEFAULT 2,
  stale_check_interval_minutes INTEGER DEFAULT 10,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT,
  notes TEXT
);

-- Insert default configuration
INSERT INTO sync_cron_config (
  worker_enabled,
  worker_interval_minutes,
  stale_check_interval_minutes,
  notes
) VALUES (
  true,
  2,
  10,
  'Initial cron configuration for sync system'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. Helper function to check cron status
-- ============================================================================

CREATE OR REPLACE FUNCTION check_sync_cron_health()
RETURNS TABLE(
  status TEXT,
  worker_jobs_active INTEGER,
  stale_jobs_active INTEGER,
  last_worker_run TIMESTAMPTZ,
  pending_jobs_count BIGINT,
  processing_jobs_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN (SELECT COUNT(*) FROM cron.job WHERE jobname LIKE 'gmb-%' AND active = true) >= 1
      THEN 'HEALTHY'
      ELSE 'UNHEALTHY'
    END AS status,
    (SELECT COUNT(*)::INTEGER FROM cron.job WHERE jobname LIKE 'gmb-%' AND active = true) AS worker_jobs_active,
    (SELECT COUNT(*)::INTEGER FROM cron.job WHERE jobname LIKE 'mark-stale-%' AND active = true) AS stale_jobs_active,
    (SELECT MAX(start_time) 
     FROM cron.job_run_details jrd
     JOIN cron.job j ON j.jobid = jrd.jobid
     WHERE j.jobname LIKE 'gmb-%') AS last_worker_run,
    (SELECT COUNT(*) FROM sync_queue WHERE status = 'pending') AS pending_jobs_count,
    (SELECT COUNT(*) FROM sync_queue WHERE status = 'processing') AS processing_jobs_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION trigger_sync_worker IS 'Triggers the GMB sync worker Edge Function via pg_net';
COMMENT ON FUNCTION check_sync_cron_health IS 'Returns health status of sync cron jobs';
COMMENT ON VIEW v_sync_cron_status IS 'Shows status of all sync-related cron jobs';
COMMENT ON TABLE sync_cron_config IS 'Configuration settings for sync cron jobs';

-- ============================================================================
-- Verification
-- ============================================================================

-- Show created cron jobs
SELECT 
  jobname,
  schedule,
  active,
  'Created successfully' AS status
FROM cron.job
WHERE jobname IN ('gmb-sync-worker-frequent', 'mark-stale-jobs');

-- Show health check
SELECT * FROM check_sync_cron_health();
