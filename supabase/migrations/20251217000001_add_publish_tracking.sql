/**
 * 🔄 ADD PUBLISH TRACKING TO PENDING ACTIONS
 *
 * Adds columns to track publishing attempts, errors, and retry logic
 * for the Google Business Profile publishing system.
 */

-- Add publish tracking columns to pending_ai_actions
ALTER TABLE pending_ai_actions
ADD COLUMN IF NOT EXISTS publish_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_publish_error TEXT,
ADD COLUMN IF NOT EXISTS last_publish_attempt_at TIMESTAMPTZ;

-- Add comment explaining the new columns
COMMENT ON COLUMN pending_ai_actions.publish_attempts IS 'Number of times publishing to Google was attempted';
COMMENT ON COLUMN pending_ai_actions.last_publish_error IS 'Last error message from publishing attempt';
COMMENT ON COLUMN pending_ai_actions.last_publish_attempt_at IS 'Timestamp of last publishing attempt';

-- Add index for querying failed publishes
CREATE INDEX IF NOT EXISTS idx_pending_actions_failed_publish
ON pending_ai_actions(user_id, status)
WHERE status = 'publish_failed';

-- Add index for retry tracking
CREATE INDEX IF NOT EXISTS idx_pending_actions_publish_attempts
ON pending_ai_actions(publish_attempts)
WHERE status = 'pending' AND publish_attempts > 0;
