-- Add logo_url and cover_photo_url columns to gmb_locations if they don't exist
-- These columns are used by the UI to display business branding

DO $$
BEGIN
  -- Add logo_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmb_locations' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE gmb_locations ADD COLUMN logo_url TEXT;
    RAISE NOTICE 'Added logo_url column to gmb_locations';
  END IF;

  -- Add cover_photo_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmb_locations' AND column_name = 'cover_photo_url'
  ) THEN
    ALTER TABLE gmb_locations ADD COLUMN cover_photo_url TEXT;
    RAISE NOTICE 'Added cover_photo_url column to gmb_locations';
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN gmb_locations.logo_url IS 'URL to the business logo image';
COMMENT ON COLUMN gmb_locations.cover_photo_url IS 'URL to the business cover photo';
