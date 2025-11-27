-- =====================================================
-- WORKER HELPER FUNCTIONS
-- =====================================================

-- 1. Function to pick pending jobs (with locking)
CREATE OR REPLACE FUNCTION pick_sync_jobs(job_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  account_id UUID,
  sync_type TEXT,
  attempts INTEGER,
  max_attempts INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH available_jobs AS (
    SELECT q.id
    FROM sync_queue q
    WHERE q.status = 'pending'
    AND q.scheduled_at <= NOW()
    ORDER BY q.priority DESC, q.scheduled_at ASC
    LIMIT job_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE sync_queue q
  SET
    status = 'processing',
    started_at = NOW(),
    attempts = q.attempts + 1,
    updated_at = NOW()
  FROM available_jobs
  WHERE q.id = available_jobs.id
  RETURNING
    q.id,
    q.user_id,
    q.account_id,
    q.sync_type,
    q.attempts,
    q.max_attempts,
    q.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to mark stale jobs (timeouts)
CREATE OR REPLACE FUNCTION mark_stale_sync_jobs()
RETURNS void AS $$
BEGIN
  UPDATE sync_queue
  SET
    status = 'pending', -- Reset to pending to retry
    started_at = NULL,
    error_message = 'Job timed out (stale) - resetting',
    updated_at = NOW()
  WHERE
    status = 'processing'
    AND started_at < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper to update sync status on success
CREATE OR REPLACE FUNCTION update_sync_status_success(
  p_account_id UUID,
  p_sync_type TEXT,
  p_completed_at TIMESTAMPTZ
)
RETURNS void AS $$
BEGIN
  UPDATE sync_status
  SET
    last_sync_status = 'completed',
    last_sync_end_at = p_completed_at,
    updated_at = NOW()
  WHERE account_id = p_account_id;

  -- Also update the account table
  UPDATE gmb_accounts
  SET
    last_synced_at = p_completed_at,
    last_error = NULL
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Helper to update sync status on failure
CREATE OR REPLACE FUNCTION update_sync_status_failure(
  p_account_id UUID,
  p_error TEXT,
  p_completed_at TIMESTAMPTZ
)
RETURNS void AS $$
BEGIN
  UPDATE sync_status
  SET
    last_sync_status = 'failed',
    last_sync_end_at = p_completed_at,
    last_error = p_error,
    updated_at = NOW()
  WHERE account_id = p_account_id;

  -- Also update the account table
  UPDATE gmb_accounts
  SET
    last_error = p_error
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
