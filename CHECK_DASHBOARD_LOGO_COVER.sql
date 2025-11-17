-- Check if logo_url and cover_photo_url columns exist
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'gmb_locations'
  AND column_name IN ('logo_url', 'cover_photo_url');

-- Check actual data
SELECT 
  id,
  location_name,
  logo_url,
  cover_photo_url,
  rating,
  review_count
FROM gmb_locations
WHERE is_active = true
LIMIT 5;
