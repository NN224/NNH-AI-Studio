-- =====================================================
-- Fix Stale Jobs Logic and Improve Distributed Locking
-- =====================================================
--
-- This migration:
-- 1. Adds locked_by and locked_at columns for distributed locking
-- 2. Fixes mark_stale_sync_jobs to check attempts before retrying
-- 3. Improves pick_sync_jobs to respect max_attempts and lock TTL
--

-- 1. Add distributed lock columns
ALTER TABLE sync_queue
ADD COLUMN IF NOT EXISTS locked_by TEXT,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Add index for lock queries
CREATE INDEX IF NOT EXISTS idx_sync_queue_locked
ON sync_queue(locked_by, locked_at)
WHERE status = 'processing';

COMMENT ON COLUMN sync_queue.locked_by IS 'Worker/process ID that locked this job';
COMMENT ON COLUMN sync_queue.locked_at IS 'Timestamp when lock was acquired';

-- 2. Update pick_sync_jobs to respect max_attempts and handle locks
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
    -- ✅ Check attempts before picking job
    AND (q.attempts IS NULL OR q.attempts < q.max_attempts)
    -- ✅ Check if lock expired or doesn't exist
    AND (
      q.locked_by IS NULL
      OR q.locked_at IS NULL
      OR q.locked_at < NOW() - INTERVAL '30 minutes' -- Lock TTL: 30 minutes
    )
    ORDER BY q.priority DESC, q.scheduled_at ASC
    LIMIT job_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE sync_queue q
  SET
    status = 'processing',
    started_at = NOW(),
    attempts = COALESCE(q.attempts, 0) + 1,
    locked_by = gen_random_uuid()::TEXT, -- ✅ Generate worker ID
    locked_at = NOW(), -- ✅ Set lock timestamp
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

COMMENT ON FUNCTION pick_sync_jobs(INT) IS 'Picks pending sync jobs with distributed locking and attempt checking';

-- 3. Fix mark_stale_sync_jobs to check attempts before retrying
-- Drop old function first (in case return type changed)
DROP FUNCTION IF EXISTS mark_stale_sync_jobs();

CREATE OR REPLACE FUNCTION mark_stale_sync_jobs()
RETURNS TABLE(
  reset_count INT,
  failed_count INT
) AS $$
DECLARE
  reset_jobs INT := 0;
  failed_jobs INT := 0;
BEGIN
  -- Reset jobs that haven't exceeded max_attempts
  WITH reset_jobs_cte AS (
    UPDATE sync_queue
    SET
      status = 'pending', -- ✅ Reset to pending for retry
      started_at = NULL,
      locked_by = NULL, -- ✅ Clear lock
      locked_at = NULL,
      error_message = 'Job timed out (stale) - resetting for retry',
      updated_at = NOW()
    WHERE
      status = 'processing'
      AND started_at < NOW() - INTERVAL '15 minutes'
      AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '30 minutes') -- ✅ Check lock TTL
      AND (attempts IS NULL OR attempts < max_attempts) -- ✅ Only reset if attempts < max_attempts
    RETURNING id
  )
  SELECT COUNT(*) INTO reset_jobs FROM reset_jobs_cte;

  -- Mark as failed jobs that exceeded max_attempts
  WITH failed_jobs_cte AS (
    UPDATE sync_queue
    SET
      status = 'failed', -- ✅ Mark as failed permanently
      started_at = NULL,
      locked_by = NULL, -- ✅ Clear lock
      locked_at = NULL,
      completed_at = NOW(),
      error_message = 'Job timed out (stale) - max attempts reached',
      updated_at = NOW()
    WHERE
      status = 'processing'
      AND started_at < NOW() - INTERVAL '15 minutes'
      AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '30 minutes') -- ✅ Check lock TTL
      AND attempts >= max_attempts -- ✅ Only fail if attempts >= max_attempts
    RETURNING id
  )
  SELECT COUNT(*) INTO failed_jobs FROM failed_jobs_cte;

  RETURN QUERY SELECT reset_jobs, failed_jobs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_stale_sync_jobs() IS 'Marks stale jobs as pending (if attempts < max) or failed (if attempts >= max)';

-- 4. Add function to clean up expired locks (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INT AS $$
DECLARE
  cleaned_count INT;
BEGIN
  WITH cleaned AS (
    UPDATE sync_queue
    SET
      locked_by = NULL,
      locked_at = NULL,
      updated_at = NOW()
    WHERE
      status = 'processing'
      AND locked_at < NOW() - INTERVAL '30 minutes' -- Lock expired
    RETURNING id
  )
  SELECT COUNT(*) INTO cleaned_count FROM cleaned;

  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_locks() IS 'Cleans up expired locks from sync_queue (call periodically)';

-- 5. Add cleanup function for old sync_queue records
CREATE OR REPLACE FUNCTION cleanup_sync_queue()
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  completed_deleted BIGINT := 0;
  failed_deleted BIGINT := 0;
  total_deleted BIGINT := 0;
BEGIN
  -- Delete completed jobs older than 7 days
  DELETE FROM sync_queue
  WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS completed_deleted = ROW_COUNT;

  -- Delete failed jobs older than 30 days (keep for debugging)
  DELETE FROM sync_queue
  WHERE status = 'failed'
  AND completed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS failed_deleted = ROW_COUNT;

  total_deleted := completed_deleted + failed_deleted;

  RETURN QUERY SELECT total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_sync_queue() IS 'Cleans up old completed (7 days) and failed (30 days) sync_queue records';
