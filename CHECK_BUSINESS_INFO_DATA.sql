-- Check what data exists in gmb_locations for a specific location
-- Replace '8a606c17-5706-4d89-ac5a-8fd651b24c33' with your location ID

SELECT 
  id,
  location_name,
  description,
  short_description,
  phone,
  website,
  category,
  additional_categories,
  menu_url,
  booking_url,
  order_url,
  appointment_url,
  from_the_business,
  opening_date,
  service_area_enabled,
  profile_completeness,
  -- Check metadata structure
  CASE 
    WHEN metadata IS NULL THEN 'NULL'
    WHEN metadata::text = '{}' THEN 'EMPTY_OBJECT'
    ELSE 'HAS_DATA'
  END as metadata_status,
  -- Check if metadata has profile
  CASE 
    WHEN metadata->'profile' IS NOT NULL THEN 'HAS_PROFILE'
    ELSE 'NO_PROFILE'
  END as has_profile_in_metadata,
  -- Check if metadata has features
  CASE 
    WHEN metadata->'features' IS NOT NULL THEN 'HAS_FEATURES'
    ELSE 'NO_FEATURES'
  END as has_features_in_metadata,
  -- Check if metadata has attributes
  CASE 
    WHEN metadata->'attributes' IS NOT NULL THEN 'HAS_ATTRIBUTES'
    ELSE 'NO_ATTRIBUTES'
  END as has_attributes_in_metadata,
  -- Sample metadata keys
  jsonb_object_keys(metadata) as metadata_keys
FROM gmb_locations
WHERE id = '8a606c17-5706-4d89-ac5a-8fd651b24c33'
LIMIT 1;

-- Check metadata content (first 1000 chars)
SELECT 
  id,
  location_name,
  description,
  menu_url,
  booking_url,
  from_the_business,
  substring(metadata::text, 1, 1000) as metadata_sample
FROM gmb_locations
WHERE id = '8a606c17-5706-4d89-ac5a-8fd651b24c33';

-- Check if metadata.profile exists and has description
SELECT 
  id,
  location_name,
  metadata->'profile'->>'description' as profile_description,
  metadata->'profile'->>'merchantDescription' as profile_merchant_description,
  metadata->>'description' as metadata_description,
  metadata->'profile'->'attributes' as profile_attributes,
  metadata->'features' as metadata_features
FROM gmb_locations
WHERE id = '8a606c17-5706-4d89-ac5a-8fd651b24c33';
