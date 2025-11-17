-- Check if Business Info data exists
SELECT 
  id,
  location_name,
  description,
  short_description,
  phone,
  website,
  category,
  additional_categories,
  metadata->>'features' as features,
  metadata->>'fromTheBusiness' as from_the_business,
  profile_completeness
FROM gmb_locations
WHERE is_active = true
LIMIT 5;

-- Check if metadata has features
SELECT 
  location_name,
  jsonb_typeof(metadata) as metadata_type,
  metadata ? 'features' as has_features,
  metadata->'features' ? 'amenities' as has_amenities,
  metadata->'features' ? 'payment_methods' as has_payment,
  metadata->'features' ? 'services' as has_services,
  metadata->'features' ? 'atmosphere' as has_atmosphere
FROM gmb_locations
WHERE is_active = true
LIMIT 5;

-- Calculate actual profile completeness
SELECT 
  location_name,
  CASE 
    WHEN location_name IS NOT NULL AND location_name != '' THEN 20 
    ELSE 0 
  END +
  CASE 
    WHEN description IS NOT NULL AND description != '' THEN 20 
    ELSE 0 
  END +
  CASE 
    WHEN phone IS NOT NULL AND phone != '' THEN 20 
    ELSE 0 
  END +
  CASE 
    WHEN website IS NOT NULL AND website != '' THEN 20 
    ELSE 0 
  END +
  CASE 
    WHEN category IS NOT NULL AND category != '' THEN 20 
    ELSE 0 
  END as calculated_completeness
FROM gmb_locations
WHERE is_active = true;
