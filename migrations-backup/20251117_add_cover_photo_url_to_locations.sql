-- Add cover_photo_url column to gmb_locations table
ALTER TABLE public.gmb_locations
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_gmb_locations_cover_photo_url 
ON public.gmb_locations(cover_photo_url) 
WHERE cover_photo_url IS NOT NULL;

-- Update existing locations with cover photo from gmb_media
WITH cover_data AS (
  SELECT DISTINCT ON (location_id)
    location_id,
    url as cover_photo_url
  FROM gmb_media
  WHERE url IS NOT NULL
    AND (
      -- Check category field for COVER
      category = 'COVER'
      OR category = 'COVER_PHOTO'
      -- Or check in metadata
      OR metadata->>'mediaFormat' = 'COVER'
      OR metadata->>'mediaFormat' = 'COVER_PHOTO'
      OR metadata->'locationAssociation'->>'category' = 'COVER'
      OR metadata->'locationAssociation'->>'category' = 'COVER_PHOTO'
      -- Fallback to EXTERIOR photos
      OR category = 'EXTERIOR'
      OR metadata->'locationAssociation'->>'category' = 'EXTERIOR'
      -- Or any ADDITIONAL photos as last resort
      OR category = 'ADDITIONAL'
    )
  ORDER BY location_id, 
    CASE 
      WHEN category = 'COVER' THEN 1
      WHEN category = 'COVER_PHOTO' THEN 2
      WHEN metadata->'locationAssociation'->>'category' = 'COVER' THEN 3
      WHEN metadata->'locationAssociation'->>'category' = 'COVER_PHOTO' THEN 4
      WHEN category = 'EXTERIOR' THEN 5
      WHEN metadata->'locationAssociation'->>'category' = 'EXTERIOR' THEN 6
      WHEN category = 'ADDITIONAL' THEN 7
      ELSE 8
    END,
    created_at DESC
)
UPDATE gmb_locations gl
SET cover_photo_url = cd.cover_photo_url
FROM cover_data cd
WHERE gl.id = cd.location_id
  AND gl.cover_photo_url IS NULL;
