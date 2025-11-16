-- Add dedicated columns for GMB location logo and cover image
-- Safe-guarded to avoid failures if columns already exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gmb_locations'
      AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.gmb_locations
    ADD COLUMN logo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gmb_locations'
      AND column_name = 'cover_photo_url'
  ) THEN
    ALTER TABLE public.gmb_locations
    ADD COLUMN cover_photo_url text;
  END IF;
END $$;

-- Optional helpful index (not unique) for faster lookups by media presence
CREATE INDEX IF NOT EXISTS idx_gmb_locations_logo_url ON public.gmb_locations (logo_url);
CREATE INDEX IF NOT EXISTS idx_gmb_locations_cover_photo_url ON public.gmb_locations (cover_photo_url);


