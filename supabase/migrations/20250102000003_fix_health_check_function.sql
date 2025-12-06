-- ============================================================================
-- Fix check_sync_cron_health() - Resolve Ambiguous Column Error
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
  v_status TEXT;  -- ✅ Changed variable name to avoid conflict
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

  -- Determine overall status
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
    -- ✅ Fixed: Explicitly use sync_queue.status
    (SELECT COUNT(*) FROM sync_queue sq WHERE sq.status = 'pending') AS pending_jobs_count,
    (SELECT COUNT(*) FROM sync_queue sq WHERE sq.status = 'processing') AS processing_jobs_count,
    v_issues AS issues;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_sync_cron_health IS 'Returns health status of sync system (fixed ambiguous column error)';

-- Test the function
SELECT * FROM check_sync_cron_health();
