-- Check if attributes and placeActionLinks are in metadata

SELECT 
  location_name,
  -- Check metadata structure
  jsonb_typeof(metadata) as metadata_type,
  jsonb_typeof(metadata->'attributes') as attributes_type,
  jsonb_typeof(metadata->'placeActionLinks') as place_actions_type,
  -- Show sample
  metadata->'attributes' as attributes_content,
  metadata->'placeActionLinks' as place_actions_content,
  -- Show what IS in metadata
  jsonb_object_keys(metadata) as metadata_keys
FROM gmb_locations
LIMIT 1;

-- Also check the full metadata to see its structure
SELECT 
  'Full Metadata Sample' as info,
  location_name,
  metadata
FROM gmb_locations
LIMIT 1;

