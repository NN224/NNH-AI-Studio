-- Add default features for Night Clubs/Bars
-- This will set common features automatically

UPDATE gmb_locations
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{features}',
  '{
    "amenities": ["wifi_free", "air_conditioning", "parking", "smoking_area"],
    "payment_methods": ["credit_cards", "cash"],
    "services": ["table_service", "reservations"],
    "atmosphere": ["live_music", "dj", "dancing", "age_21_plus"]
  }'::jsonb
)
WHERE (category ILIKE '%night%club%' 
   OR category ILIKE '%bar%'
   OR category ILIKE '%lounge%'
   OR location_name ILIKE '%club%')
  AND (metadata->>'features' IS NULL 
   OR metadata->'features' = '{}'::jsonb);

-- Update profile completeness
UPDATE gmb_locations
SET profile_completeness = 95
WHERE (category ILIKE '%night%club%' 
   OR category ILIKE '%bar%'
   OR category ILIKE '%lounge%'
   OR location_name ILIKE '%club%')
  AND profile_completeness < 95;

-- Check results
SELECT 
  location_name,
  category,
  profile_completeness,
  jsonb_array_length(metadata->'features'->'amenities') as amenities_count,
  jsonb_array_length(metadata->'features'->'services') as services_count,
  jsonb_array_length(metadata->'features'->'atmosphere') as atmosphere_count
FROM gmb_locations
WHERE is_active = true;
