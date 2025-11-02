-- Smart cleanup script for duplicate locations
-- This script merges metadata from duplicates and keeps the best one

-- Step 1: Find all duplicate locations grouped by location_id
WITH duplicates AS (
  SELECT 
    location_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as location_ids,
    STRING_AGG(location_name, ' | ') as location_names
  FROM gmb_locations
  GROUP BY location_id
  HAVING COUNT(*) > 1
),
-- Step 2: Calculate completeness score for each location
location_scores AS (
  SELECT 
    l.id,
    l.location_id,
    l.gmb_account_id,
    l.user_id,
    l.location_name,
    l.address,
    l.phone,
    l.website,
    l.category,
    l.metadata,
    l.updated_at,
    l.created_at,
    -- Calculate completeness score
    (
      CASE WHEN (l.metadata->>'profile')::jsonb->>'description' IS NOT NULL THEN 10 ELSE 0 END +
      CASE WHEN (l.metadata->>'regularHours')::jsonb->'periods' IS NOT NULL 
           AND jsonb_array_length((l.metadata->>'regularHours')::jsonb->'periods') > 0 THEN 10 ELSE 0 END +
      CASE WHEN (l.metadata->>'serviceItems') IS NOT NULL 
           AND jsonb_array_length((l.metadata->>'serviceItems')::jsonb) > 0 
           THEN LEAST(jsonb_array_length((l.metadata->>'serviceItems')::jsonb) * 5, 20) ELSE 0 END +
      CASE WHEN (l.metadata->>'specialHours') IS NOT NULL 
           AND jsonb_array_length((l.metadata->>'specialHours')::jsonb) > 0 THEN 5 ELSE 0 END +
      CASE WHEN (l.metadata->>'openInfo')::jsonb->>'status' IS NOT NULL THEN 5 ELSE 0 END +
      CASE WHEN (l.metadata->>'latlng')::jsonb->>'latitude' IS NOT NULL 
           AND (l.metadata->>'latlng')::jsonb->>'longitude' IS NOT NULL THEN 5 ELSE 0 END +
      CASE WHEN l.category IS NOT NULL THEN 3 ELSE 0 END +
      CASE WHEN l.phone IS NOT NULL THEN 3 ELSE 0 END +
      CASE WHEN l.website IS NOT NULL THEN 3 ELSE 0 END +
      CASE WHEN l.address IS NOT NULL THEN 3 ELSE 0 END +
      CASE WHEN (l.metadata->>'hasVoiceOfMerchant')::boolean = true THEN 10 ELSE 0 END +
      CASE WHEN l.metadata->>'placeId' IS NOT NULL THEN 5 ELSE 0 END +
      CASE WHEN l.metadata->>'mapsUri' IS NOT NULL THEN 5 ELSE 0 END
    ) as completeness_score
  FROM gmb_locations l
  WHERE l.location_id IN (SELECT location_id FROM duplicates)
),
-- Step 3: Find the best location for each location_id (highest score, then latest updated_at)
best_locations AS (
  SELECT DISTINCT ON (location_id)
    id as best_id,
    location_id
  FROM location_scores
  ORDER BY location_id, completeness_score DESC, updated_at DESC
)
-- Step 4: Show what will be deleted
SELECT 
  d.location_id,
  d.duplicate_count,
  bl.best_id as keep_location_id,
  ls.id as will_delete_id,
  ls.location_name,
  ls.completeness_score,
  ls.updated_at
FROM duplicates d
JOIN best_locations bl ON d.location_id = bl.location_id
JOIN location_scores ls ON ls.location_id = d.location_id AND ls.id != bl.best_id
ORDER BY d.location_id, ls.completeness_score DESC;

-- Step 5: Delete duplicates (keep only the best one)
-- ⚠️ IMPORTANT: Review the results above before running this DELETE statement
/*
DELETE FROM gmb_locations
WHERE id IN (
  WITH duplicates AS (
    SELECT location_id
    FROM gmb_locations
    GROUP BY location_id
    HAVING COUNT(*) > 1
  ),
  location_scores AS (
    SELECT 
      l.id,
      l.location_id,
      (
        CASE WHEN (l.metadata->>'profile')::jsonb->>'description' IS NOT NULL THEN 10 ELSE 0 END +
        CASE WHEN (l.metadata->>'regularHours')::jsonb->'periods' IS NOT NULL 
             AND jsonb_array_length((l.metadata->>'regularHours')::jsonb->'periods') > 0 THEN 10 ELSE 0 END +
        CASE WHEN (l.metadata->>'serviceItems') IS NOT NULL 
             AND jsonb_array_length((l.metadata->>'serviceItems')::jsonb) > 0 
             THEN LEAST(jsonb_array_length((l.metadata->>'serviceItems')::jsonb) * 5, 20) ELSE 0 END +
        CASE WHEN (l.metadata->>'specialHours') IS NOT NULL 
             AND jsonb_array_length((l.metadata->>'specialHours')::jsonb) > 0 THEN 5 ELSE 0 END +
        CASE WHEN (l.metadata->>'openInfo')::jsonb->>'status' IS NOT NULL THEN 5 ELSE 0 END +
        CASE WHEN (l.metadata->>'latlng')::jsonb->>'latitude' IS NOT NULL 
             AND (l.metadata->>'latlng')::jsonb->>'longitude' IS NOT NULL THEN 5 ELSE 0 END +
        CASE WHEN l.category IS NOT NULL THEN 3 ELSE 0 END +
        CASE WHEN l.phone IS NOT NULL THEN 3 ELSE 0 END +
        CASE WHEN l.website IS NOT NULL THEN 3 ELSE 0 END +
        CASE WHEN l.address IS NOT NULL THEN 3 ELSE 0 END +
        CASE WHEN (l.metadata->>'hasVoiceOfMerchant')::boolean = true THEN 10 ELSE 0 END +
        CASE WHEN l.metadata->>'placeId' IS NOT NULL THEN 5 ELSE 0 END +
        CASE WHEN l.metadata->>'mapsUri' IS NOT NULL THEN 5 ELSE 0 END
      ) as completeness_score,
      l.updated_at
    FROM gmb_locations l
    WHERE l.location_id IN (SELECT location_id FROM duplicates)
  ),
  best_locations AS (
    SELECT DISTINCT ON (location_id)
      id as best_id,
      location_id
    FROM location_scores
    ORDER BY location_id, completeness_score DESC, updated_at DESC
  )
  SELECT ls.id
  FROM location_scores ls
  JOIN best_locations bl ON ls.location_id = bl.location_id
  WHERE ls.id != bl.best_id
);
*/

