-- Create sync_queue table for reliable background sync
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'incremental', 'locations_only'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER NOT NULL DEFAULT 0, -- Higher number = higher priority
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_account_id ON sync_queue(account_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority_created ON sync_queue(priority DESC, created_at ASC) WHERE status = 'pending';

-- Add RLS policies
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own queue items
CREATE POLICY "Users can view own sync queue"
  ON sync_queue
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own queue items
CREATE POLICY "Users can insert own sync queue"
  ON sync_queue
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only service role can update queue items
CREATE POLICY "Service role can update sync queue"
  ON sync_queue
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sync_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_queue_updated_at
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_queue_updated_at();

-- Add comment
COMMENT ON TABLE sync_queue IS 'Queue for background GMB sync jobs to ensure completion in serverless environment';
