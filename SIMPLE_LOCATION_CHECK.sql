-- Simple check for locations

-- 1. Do we have locations?
SELECT 
  'Total Locations' as info,
  COUNT(*) as count
FROM gmb_locations;

-- 2. When were they last updated?
SELECT 
  'Last Updated' as info,
  location_name,
  updated_at,
  last_synced_at
FROM gmb_locations
ORDER BY updated_at DESC
LIMIT 5;

-- 3. Check metadata
SELECT 
  'Metadata Check' as info,
  location_name,
  CASE WHEN metadata IS NOT NULL THEN '✅ Has metadata' ELSE '❌ No metadata' END as metadata_status,
  CASE WHEN metadata->'attributes' IS NOT NULL THEN '✅ Has attributes' ELSE '❌ No attributes' END as attributes_status,
  CASE WHEN metadata->'placeActionLinks' IS NOT NULL THEN '✅ Has action links' ELSE '❌ No action links' END as action_links_status,
  CASE WHEN business_hours IS NOT NULL THEN '✅ Has hours' ELSE '❌ No hours' END as hours_status
FROM gmb_locations
LIMIT 3;

