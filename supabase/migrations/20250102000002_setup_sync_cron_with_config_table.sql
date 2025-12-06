-- ============================================================================
-- Setup Sync Cron Jobs - Using Config Table (No GUC Required)
-- ============================================================================
-- This migration uses a secure config table instead of current_setting()
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- 1. Create secure config table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert required configuration values
INSERT INTO sync_system_config (key, value, description) VALUES
  ('supabase_url', '', 'Supabase project URL - UPDATE THIS'),
  ('trigger_secret', '', 'Trigger secret for Edge Functions - UPDATE THIS'),
  ('worker_enabled', 'true', 'Enable/disable sync worker'),
  ('worker_interval_minutes', '2', 'Worker run interval in minutes'),
  ('stale_check_interval_minutes', '10', 'Stale job check interval')
ON CONFLICT (key) DO NOTHING;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sync_config_key ON sync_system_config(key);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sync_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sync_config_updated_at
  BEFORE UPDATE ON sync_system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_config_updated_at();

-- ============================================================================
-- 2. Create secure getter function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sync_config(config_key TEXT)
RETURNS TEXT AS $$
DECLARE
  config_value TEXT;
BEGIN
  SELECT value INTO config_value
  FROM sync_system_config
  WHERE key = config_key;
  
  RETURN config_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 3. Create function to trigger sync worker
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_sync_worker()
RETURNS void AS $$
DECLARE
  v_supabase_url TEXT;
  v_trigger_secret TEXT;
  v_worker_enabled TEXT;
  v_response_id BIGINT;
BEGIN
  -- Get configuration values from secure table
  v_supabase_url := get_sync_config('supabase_url');
  v_trigger_secret := get_sync_config('trigger_secret');
  v_worker_enabled := get_sync_config('worker_enabled');
  
  -- Check if worker is enabled
  IF v_worker_enabled IS NULL OR v_worker_enabled != 'true' THEN
    RAISE NOTICE 'Sync worker is disabled';
    RETURN;
  END IF;
  
  -- Validate required config
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    RAISE WARNING 'supabase_url not configured. Update sync_system_config table.';
    RETURN;
  END IF;
  
  IF v_trigger_secret IS NULL OR v_trigger_secret = '' THEN
    RAISE WARNING 'trigger_secret not configured. Update sync_system_config table.';
    RETURN;
  END IF;

  -- Call the Edge Function using pg_net
  SELECT id INTO v_response_id
  FROM net.http_post(
    url := v_supabase_url || '/functions/v1/gmb-sync-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Trigger-Secret', v_trigger_secret
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'timestamp', NOW()
    )
  );

  RAISE NOTICE 'Sync worker triggered successfully. Request ID: %', v_response_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger sync worker: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Schedule Cron Jobs
-- ============================================================================

-- Remove existing jobs if they exist
DO $$
BEGIN
  PERFORM cron.unschedule('gmb-sync-worker-frequent');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist, continue
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('mark-stale-jobs');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist, continue
  NULL;
END $$;

-- Job 1: Process sync queue every 2 minutes
SELECT cron.schedule(
  'gmb-sync-worker-frequent',
  '*/2 * * * *',  -- Every 2 minutes
  $$SELECT trigger_sync_worker();$$
);

-- Job 2: Mark stale jobs every 10 minutes
SELECT cron.schedule(
  'mark-stale-jobs',
  '*/10 * * * *',  -- Every 10 minutes
  $$SELECT mark_stale_sync_jobs();$$
);

-- ============================================================================
-- 5. Create monitoring views
-- ============================================================================

CREATE OR REPLACE VIEW v_sync_cron_status AS
SELECT 
  j.jobname,
  j.schedule,
  j.active,
  j.jobid,
  -- Last run info from cron.job_run_details
  (SELECT start_time 
   FROM cron.job_run_details 
   WHERE jobid = j.jobid 
   ORDER BY start_time DESC 
   LIMIT 1) AS last_run_start,
  (SELECT end_time 
   FROM cron.job_run_details 
   WHERE jobid = j.jobid 
   ORDER BY start_time DESC 
   LIMIT 1) AS last_run_end,
  (SELECT status 
   FROM cron.job_run_details 
   WHERE jobid = j.jobid 
   ORDER BY start_time DESC 
   LIMIT 1) AS last_run_status
FROM cron.job j
WHERE j.jobname LIKE 'gmb-%' OR j.jobname LIKE 'mark-stale-%'
ORDER BY j.jobname;

-- ============================================================================
-- 6. Create health check function
-- ============================================================================

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
BEGIN
  -- Check configuration
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
  
  -- Check active cron jobs
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE 'gmb-%' AND active = true) THEN
    v_issues := array_append(v_issues, 'No active worker cron jobs');
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN v_config_ready AND array_length(v_issues, 1) IS NULL THEN 'HEALTHY'
      WHEN v_config_ready AND array_length(v_issues, 1) > 0 THEN 'DEGRADED'
      ELSE 'UNHEALTHY'
    END AS status,
    v_config_ready AS config_ready,
    (SELECT COUNT(*)::INTEGER FROM cron.job WHERE jobname LIKE 'gmb-%' AND active = true) AS worker_jobs_active,
    (SELECT COUNT(*)::INTEGER FROM cron.job WHERE jobname LIKE 'mark-stale-%' AND active = true) AS stale_jobs_active,
    (SELECT MAX(jrd.start_time) 
     FROM cron.job_run_details jrd
     JOIN cron.job j ON j.jobid = jrd.jobid
     WHERE j.jobname LIKE 'gmb-%') AS last_worker_run,
    (SELECT COUNT(*) FROM sync_queue WHERE status = 'pending') AS pending_jobs_count,
    (SELECT COUNT(*) FROM sync_queue WHERE status = 'processing') AS processing_jobs_count,
    v_issues AS issues;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Grant permissions
-- ============================================================================

-- Allow authenticated users to read config (via function only)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_sync_config(TEXT) TO authenticated;

-- Allow service role full access
GRANT ALL ON sync_system_config TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- RLS policies for config table
ALTER TABLE sync_system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage config"
ON sync_system_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Read-only for authenticated users (for monitoring)
CREATE POLICY "Authenticated users can view config"
ON sync_system_config
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- 8. Add helpful comments
-- ============================================================================

COMMENT ON TABLE sync_system_config IS 'Secure configuration storage for sync system';
COMMENT ON FUNCTION get_sync_config IS 'Safely retrieve sync configuration values';
COMMENT ON FUNCTION trigger_sync_worker IS 'Triggers the GMB sync worker Edge Function';
COMMENT ON FUNCTION check_sync_cron_health IS 'Returns health status of sync system';
COMMENT ON VIEW v_sync_cron_status IS 'Shows status of all sync-related cron jobs';

-- ============================================================================
-- 9. Display setup instructions
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Sync Cron Jobs Created Successfully!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Update configuration values:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Update supabase_url:';
  RAISE NOTICE '   UPDATE sync_system_config';
  RAISE NOTICE '   SET value = ''https://your-project.supabase.co''';
  RAISE NOTICE '   WHERE key = ''supabase_url'';';
  RAISE NOTICE '';
  RAISE NOTICE '2. Update trigger_secret (from .env file):';
  RAISE NOTICE '   UPDATE sync_system_config';
  RAISE NOTICE '   SET value = ''your-trigger-secret-here''';
  RAISE NOTICE '   WHERE key = ''trigger_secret'';';
  RAISE NOTICE '';
  RAISE NOTICE '3. Check health:';
  RAISE NOTICE '   SELECT * FROM check_sync_cron_health();';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Show created cron jobs
SELECT 
  '✅ Cron Job Created' AS status,
  jobname,
  schedule,
  CASE WHEN active THEN '🟢 Active' ELSE '🔴 Inactive' END AS state
FROM cron.job
WHERE jobname IN ('gmb-sync-worker-frequent', 'mark-stale-jobs');
