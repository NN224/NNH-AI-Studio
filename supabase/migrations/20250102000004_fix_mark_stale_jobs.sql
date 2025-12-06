-- ============================================================================
-- Fix mark_stale_sync_jobs() - Add Better Error Handling
-- ============================================================================

-- 1. Add trigger to auto-update updated_at on sync_queue
CREATE OR REPLACE FUNCTION update_sync_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_update_sync_queue_updated_at ON sync_queue;

-- Create trigger
CREATE TRIGGER trigger_update_sync_queue_updated_at
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_queue_updated_at();

-- 2. Improve mark_stale_sync_jobs() with better logic
CREATE OR REPLACE FUNCTION mark_stale_sync_jobs()
RETURNS void AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Mark jobs stuck in 'processing' as stale
  -- Only reset if they haven't exceeded max_attempts
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

COMMENT ON FUNCTION mark_stale_sync_jobs IS 'Marks jobs stuck in processing as stale and resets or fails them based on attempts';

-- 3. Test the function
SELECT mark_stale_sync_jobs();

-- 4. Show result
SELECT 
  'mark_stale_sync_jobs() fixed successfully' AS status,
  'Function will now handle stale jobs with max_attempts check' AS note;
