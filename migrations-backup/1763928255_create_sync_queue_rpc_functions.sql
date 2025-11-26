-- Migration: Create RPC functions for sync_queue worker
-- Created: 2025-11-23
-- Purpose: Add Postgres functions required by gmb-sync-worker Edge Function
--
-- This migration creates 4 RPC functions:
-- 1. pick_sync_jobs - Picks pending jobs with FOR UPDATE SKIP LOCKED
-- 2. mark_stale_sync_jobs - Marks stale jobs as failed
-- 3. update_sync_status_success - Updates sync_status on success
-- 4. update_sync_status_failure - Updates sync_status on failure

BEGIN;

-- ============================================================================
-- 1. pick_sync_jobs
-- ============================================================================
-- Picks pending sync jobs using FOR UPDATE SKIP LOCKED to prevent race conditions
-- when multiple workers run simultaneously
CREATE OR REPLACE FUNCTION pick_sync_jobs(job_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  account_id UUID,
  sync_type TEXT,
  attempts INTEGER,
  max_attempts INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  UPDATE sync_queue sq
  SET
    status = 'processing',
    started_at = NOW(),
    attempts = attempts + 1
  FROM (
    SELECT sq2.id
    FROM sync_queue sq2
    WHERE sq2.status = 'pending'
      AND (sq2.scheduled_at IS NULL OR sq2.scheduled_at <= NOW())
      AND sq2.attempts < sq2.max_attempts
    ORDER BY sq2.priority DESC, sq2.created_at ASC
    LIMIT job_limit
    FOR UPDATE SKIP LOCKED
  ) selected
  WHERE sq.id = selected.id
  RETURNING
    sq.id,
    sq.account_id,
    sq.sync_type,
    sq.attempts,
    sq.max_attempts,
    sq.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION pick_sync_jobs(INTEGER) TO service_role;

COMMENT ON FUNCTION pick_sync_jobs(INTEGER) IS
  'Picks pending sync jobs for processing. Uses FOR UPDATE SKIP LOCKED to prevent race conditions.';

-- ============================================================================
-- 2. mark_stale_sync_jobs
-- ============================================================================
-- Marks jobs that have been in 'processing' state for too long as failed
CREATE OR REPLACE FUNCTION mark_stale_sync_jobs(stale_threshold_minutes INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE sync_queue
  SET
    status = 'failed',
    completed_at = NOW(),
    last_error = 'Job marked as stale after ' || stale_threshold_minutes || ' minutes in processing state'
  WHERE status = 'processing'
    AND started_at < NOW() - (stale_threshold_minutes || ' minutes')::INTERVAL
    AND completed_at IS NULL;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION mark_stale_sync_jobs(INTEGER) TO service_role;

COMMENT ON FUNCTION mark_stale_sync_jobs(INTEGER) IS
  'Marks stale sync jobs (stuck in processing state) as failed';

-- ============================================================================
-- 3. update_sync_status_success
-- ============================================================================
-- Updates sync_status table when a sync job succeeds (atomic, no race condition)
CREATE OR REPLACE FUNCTION update_sync_status_success(
  p_account_id UUID,
  p_sync_type TEXT,
  p_completed_at TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO sync_status (
    account_id,
    last_sync_completed_at,
    last_sync_status,
    last_sync_type,
    consecutive_failures,
    total_syncs,
    successful_syncs
  )
  VALUES (
    p_account_id,
    p_completed_at,
    'success',
    p_sync_type,
    0,
    1,
    1
  )
  ON CONFLICT (account_id) DO UPDATE SET
    last_sync_completed_at = EXCLUDED.last_sync_completed_at,
    last_sync_status = EXCLUDED.last_sync_status,
    last_sync_type = EXCLUDED.last_sync_type,
    consecutive_failures = 0,
    total_syncs = sync_status.total_syncs + 1,
    successful_syncs = sync_status.successful_syncs + 1,
    last_error = NULL,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION update_sync_status_success(UUID, TEXT, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION update_sync_status_success(UUID, TEXT, TIMESTAMPTZ) IS
  'Atomically updates sync_status when a sync job succeeds';

-- ============================================================================
-- 4. update_sync_status_failure
-- ============================================================================
-- Updates sync_status table when a sync job fails (atomic, no race condition)
CREATE OR REPLACE FUNCTION update_sync_status_failure(
  p_account_id UUID,
  p_error TEXT,
  p_completed_at TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO sync_status (
    account_id,
    last_sync_completed_at,
    last_sync_status,
    last_error,
    consecutive_failures,
    total_syncs,
    failed_syncs
  )
  VALUES (
    p_account_id,
    p_completed_at,
    'failed',
    p_error,
    1,
    1,
    1
  )
  ON CONFLICT (account_id) DO UPDATE SET
    last_sync_completed_at = EXCLUDED.last_sync_completed_at,
    last_sync_status = EXCLUDED.last_sync_status,
    last_error = EXCLUDED.last_error,
    consecutive_failures = sync_status.consecutive_failures + 1,
    total_syncs = sync_status.total_syncs + 1,
    failed_syncs = sync_status.failed_syncs + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION update_sync_status_failure(UUID, TEXT, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION update_sync_status_failure(UUID, TEXT, TIMESTAMPTZ) IS
  'Atomically updates sync_status when a sync job fails';

-- ============================================================================
-- Additional: Add scheduled_at and last_error columns to sync_queue if missing
-- ============================================================================
DO $$
BEGIN
  -- Add scheduled_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_queue' AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE sync_queue ADD COLUMN scheduled_at TIMESTAMPTZ;
    COMMENT ON COLUMN sync_queue.scheduled_at IS 'When to run this job (for delayed retries)';
  END IF;

  -- Rename error_message to last_error if needed (for consistency with Edge Function)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_queue' AND column_name = 'error_message'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_queue' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE sync_queue RENAME COLUMN error_message TO last_error;
  END IF;

  -- Add last_error column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_queue' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE sync_queue ADD COLUMN last_error TEXT;
    COMMENT ON COLUMN sync_queue.last_error IS 'Error message from last failed attempt';
  END IF;
END $$;

-- ============================================================================
-- Create index on scheduled_at for efficient job picking
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sync_queue_scheduled_at
  ON sync_queue(scheduled_at)
  WHERE status = 'pending' AND scheduled_at IS NOT NULL;

COMMIT;
