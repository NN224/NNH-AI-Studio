-- Check if business hours data is stored in gmb_locations
SELECT 
  id,
  location_name,
  -- Check direct columns
  business_hours,
  regularhours,
  -- Check metadata
  metadata->'regularHours' as metadata_regular_hours,
  metadata->'moreHours' as metadata_more_hours,
  metadata->'serviceItems' as metadata_service_items,
  -- Check if data exists anywhere
  CASE 
    WHEN business_hours IS NOT NULL THEN 'business_hours column'
    WHEN regularhours IS NOT NULL THEN 'regularhours column'
    WHEN metadata->'regularHours' IS NOT NULL THEN 'metadata.regularHours'
    ELSE 'NO DATA'
  END as data_source
FROM gmb_locations
WHERE location_name LIKE '%DXB%'
   OR location_name LIKE '%XO Club%'
ORDER BY location_name;

