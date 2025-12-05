-- =====================================================
-- Add oauth_connected_at column to gmb_accounts
-- =====================================================
-- This column tracks when OAuth was connected for each account
-- =====================================================

-- Add oauth_connected_at column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmb_accounts'
    AND column_name = 'oauth_connected_at'
  ) THEN
    ALTER TABLE gmb_accounts ADD COLUMN oauth_connected_at TIMESTAMPTZ;
    COMMENT ON COLUMN gmb_accounts.oauth_connected_at IS 'Timestamp when OAuth was connected for this account';
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_oauth_connected_at
ON gmb_accounts(oauth_connected_at)
WHERE oauth_connected_at IS NOT NULL;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'oauth_connected_at column added to gmb_accounts';
END $$;
