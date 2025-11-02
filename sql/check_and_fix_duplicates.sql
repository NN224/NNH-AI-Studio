-- Step 1: Check for duplicate locations
SELECT 
  location_id,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as location_ids,
  STRING_AGG(location_name, ' | ') as location_names
FROM gmb_locations
GROUP BY location_id
HAVING COUNT(*) > 1;

-- Step 2: View details of duplicate locations with completeness indicators
SELECT 
  l.id,
  l.location_id,
  l.location_name,
  l.updated_at,
  CASE WHEN (l.metadata->>'profile')::jsonb->>'description' IS NOT NULL THEN '✅' ELSE '❌' END as has_description,
  CASE WHEN (l.metadata->>'regularHours')::jsonb->'periods' IS NOT NULL 
       AND jsonb_array_length((l.metadata->>'regularHours')::jsonb->'periods') > 0 THEN '✅' ELSE '❌' END as has_hours,
  CASE WHEN (l.metadata->>'serviceItems') IS NOT NULL 
       AND jsonb_array_length((l.metadata->>'serviceItems')::jsonb) > 0 THEN '✅' ELSE '❌' END as has_services,
  CASE WHEN (l.metadata->>'openInfo')::jsonb->>'status' IS NOT NULL THEN '✅' ELSE '❌' END as has_open_info,
  CASE WHEN l.category IS NOT NULL THEN '✅' ELSE '❌' END as has_category,
  CASE WHEN l.phone IS NOT NULL THEN '✅' ELSE '❌' END as has_phone,
  CASE WHEN l.website IS NOT NULL THEN '✅' ELSE '❌' END as has_website
FROM gmb_locations l
WHERE l.location_id IN (
  SELECT location_id
  FROM gmb_locations
  GROUP BY location_id
  HAVING COUNT(*) > 1
)
ORDER BY l.location_id, l.updated_at DESC;

-- Step 3: Delete duplicates (keep the one with latest updated_at for each location_id)
-- ⚠️ Run Step 1 and 2 first to review what will be deleted
-- ⚠️ Uncomment the DELETE statement below only after reviewing the results

/*
DELETE FROM gmb_locations
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY location_id 
        ORDER BY 
          -- Prefer locations with more metadata
          CASE WHEN (metadata->>'profile')::jsonb->>'description' IS NOT NULL THEN 1 ELSE 0 END DESC,
          CASE WHEN (metadata->>'regularHours')::jsonb->'periods' IS NOT NULL THEN 1 ELSE 0 END DESC,
          updated_at DESC
      ) as rn
    FROM gmb_locations
    WHERE location_id IN (
      SELECT location_id
      FROM gmb_locations
      GROUP BY location_id
      HAVING COUNT(*) > 1
    )
  ) ranked
  WHERE rn > 1
);
*/

