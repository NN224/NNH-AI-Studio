-- PGMQ Queue System for GMB Sync
-- Created: 2025-11-26
-- Description: Use Supabase's official PGMQ for event-driven sync

-- =====================================================
-- 1. CREATE SYNC QUEUE
-- =====================================================

-- Create the queue for GMB sync jobs
SELECT pgmq.create('gmb_sync_queue');

-- =====================================================
-- 2. HELPER FUNCTIONS
-- =====================================================

-- Function to enqueue a sync job
CREATE OR REPLACE FUNCTION enqueue_sync_job(
  p_account_id UUID,
  p_user_id UUID,
  p_sync_type TEXT DEFAULT 'full',
  p_priority INTEGER DEFAULT 0
)
RETURNS BIGINT AS $$
DECLARE
  v_msg_id BIGINT;
BEGIN
  -- Send message to queue
  SELECT pgmq.send(
    queue_name := 'gmb_sync_queue',
    msg := jsonb_build_object(
      'account_id', p_account_id,
      'user_id', p_user_id,
      'sync_type', p_sync_type,
      'priority', p_priority,
      'enqueued_at', NOW()
    ),
    delay := 0
  ) INTO v_msg_id;

  -- Also insert into sync_queue for tracking
  INSERT INTO sync_queue (
    user_id,
    account_id,
    sync_type,
    status,
    priority,
    scheduled_at,
    metadata
  ) VALUES (
    p_user_id,
    p_account_id,
    p_sync_type,
    'pending',
    p_priority,
    NOW(),
    jsonb_build_object('pgmq_msg_id', v_msg_id)
  );

  RETURN v_msg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get queue metrics
CREATE OR REPLACE FUNCTION get_queue_metrics()
RETURNS TABLE (
  queue_name TEXT,
  queue_length BIGINT,
  newest_msg_age_sec INTEGER,
  oldest_msg_age_sec INTEGER,
  total_messages BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM pgmq.metrics('gmb_sync_queue');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CLEANUP OLD SYSTEM
-- =====================================================

-- Remove old cron job (we'll use event-driven now)
SELECT cron.unschedule('gmb-sync-worker-every-5min');

-- =====================================================
-- 4. COMMENTS
-- =====================================================

COMMENT ON FUNCTION enqueue_sync_job(UUID, UUID, TEXT, INTEGER) IS 'Enqueues a sync job to PGMQ queue';
COMMENT ON FUNCTION get_queue_metrics() IS 'Returns PGMQ queue metrics for monitoring';

-- Migration completed
SELECT 'PGMQ Queue System Created Successfully' as result;
