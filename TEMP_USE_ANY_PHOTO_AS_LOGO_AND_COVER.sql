-- Temporary script to use any existing photos as logo and cover
-- This is useful when GMB doesn't have explicit LOGO/COVER categories

-- First, let's check available photos
SELECT 
  location_id,
  COUNT(*) as photo_count,
  array_agg(DISTINCT category) as categories
FROM gmb_media
WHERE url IS NOT NULL
GROUP BY location_id;

-- Update locations with any available photo as logo (if no logo exists)
WITH first_photo AS (
  SELECT DISTINCT ON (location_id)
    location_id,
    url
  FROM gmb_media
  WHERE url IS NOT NULL
  ORDER BY location_id, created_at DESC
)
UPDATE gmb_locations gl
SET logo_url = fp.url
FROM first_photo fp
WHERE gl.id = fp.location_id
  AND gl.logo_url IS NULL;

-- Update locations with second available photo as cover (if no cover exists)
WITH second_photo AS (
  SELECT DISTINCT ON (location_id)
    location_id,
    url
  FROM gmb_media
  WHERE url IS NOT NULL
    AND url != (SELECT logo_url FROM gmb_locations WHERE id = gmb_media.location_id)
  ORDER BY location_id, created_at DESC
)
UPDATE gmb_locations gl
SET cover_photo_url = sp.url
FROM second_photo sp
WHERE gl.id = sp.location_id
  AND gl.cover_photo_url IS NULL;

-- Check results
SELECT 
  id,
  location_name,
  logo_url IS NOT NULL as has_logo,
  cover_photo_url IS NOT NULL as has_cover
FROM gmb_locations
ORDER BY location_name;
