-- Add logo_url column to gmb_locations table
ALTER TABLE public.gmb_locations
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_gmb_locations_logo_url 
ON public.gmb_locations(logo_url) 
WHERE logo_url IS NOT NULL;

-- Update existing locations with logo from gmb_media
WITH logo_data AS (
  SELECT DISTINCT ON (location_id)
    location_id,
    url as logo_url
  FROM gmb_media
  WHERE url IS NOT NULL
    AND (
      -- Check category field
      category = 'LOGO'
      -- Or check in metadata
      OR metadata->>'mediaFormat' = 'LOGO'
      OR metadata->'locationAssociation'->>'category' = 'LOGO'
      -- Fallback to PROFILE photos
      OR category = 'PROFILE'
      OR metadata->'locationAssociation'->>'category' = 'PROFILE'
    )
  ORDER BY location_id, 
    CASE 
      WHEN category = 'LOGO' THEN 1
      WHEN metadata->'locationAssociation'->>'category' = 'LOGO' THEN 2
      WHEN category = 'PROFILE' THEN 3
      WHEN metadata->'locationAssociation'->>'category' = 'PROFILE' THEN 4
      ELSE 5
    END,
    created_at DESC
)
UPDATE gmb_locations gl
SET logo_url = ld.logo_url
FROM logo_data ld
WHERE gl.id = ld.location_id
  AND gl.logo_url IS NULL;
