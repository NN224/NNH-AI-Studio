-- Run this SQL in Supabase Dashboard SQL Editor
-- or via psql connection

-- Add oauth_connected_at column to gmb_accounts
ALTER TABLE gmb_accounts
ADD COLUMN IF NOT EXISTS oauth_connected_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN gmb_accounts.oauth_connected_at IS 'Timestamp when OAuth was connected for this account';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_oauth_connected_at
ON gmb_accounts(oauth_connected_at)
WHERE oauth_connected_at IS NOT NULL;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'gmb_accounts'
AND column_name = 'oauth_connected_at';
