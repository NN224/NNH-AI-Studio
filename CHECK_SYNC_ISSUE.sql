-- Check why locations count is 0 in sync

-- 1. Do we have locations in DB?
SELECT 
  'Total Locations in DB' as check,
  COUNT(*) as count,
  STRING_AGG(DISTINCT location_name, ', ') as location_names
FROM gmb_locations;

-- 2. When were locations last updated?
SELECT 
  'Last Updated Locations' as check,
  location_name,
  updated_at,
  last_synced_at,
  CASE 
    WHEN updated_at > NOW() - INTERVAL '1 hour' THEN '✅ Updated recently'
    WHEN updated_at > NOW() - INTERVAL '1 day' THEN '⚠️ Updated today but not recent'
    ELSE '❌ Not updated recently'
  END as status
FROM gmb_locations
ORDER BY updated_at DESC
LIMIT 5;

-- 3. Check sync_status table for errors
SELECT 
  'Recent Sync Status' as check,
  status,
  progress,
  counts,
  error,
  started_at,
  finished_at
FROM sync_status
ORDER BY started_at DESC
LIMIT 3;

-- 4. Check if metadata was updated
SELECT 
  'Metadata Update Check' as check,
  location_name,
  CASE 
    WHEN metadata->'attributes' IS NOT NULL THEN '✅ Has attributes'
    ELSE '❌ No attributes'
  END as attributes_status,
  CASE 
    WHEN metadata->'placeActionLinks' IS NOT NULL THEN '✅ Has action links'
    ELSE '❌ No action links'
  END as action_links_status,
  updated_at
FROM gmb_locations
LIMIT 3;

