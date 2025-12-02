-- Add last_sync column to gmb_accounts if it doesn't exist
-- This fixes the mismatch between code (last_sync) and schema (last_synced_at)

DO $$
BEGIN
  -- Add last_sync column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmb_accounts' AND column_name = 'last_sync'
  ) THEN
    -- Check if last_synced_at exists and rename it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'gmb_accounts' AND column_name = 'last_synced_at'
    ) THEN
      ALTER TABLE gmb_accounts RENAME COLUMN last_synced_at TO last_sync;
      RAISE NOTICE 'Renamed last_synced_at to last_sync';
    ELSE
      -- Add new column
      ALTER TABLE gmb_accounts ADD COLUMN last_sync TIMESTAMPTZ;
      RAISE NOTICE 'Added last_sync column';
    END IF;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN gmb_accounts.last_sync IS 'Timestamp of last successful sync';
