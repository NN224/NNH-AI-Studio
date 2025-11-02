-- Debug script to understand why 2 locations appear in UI when no duplicates exist in DB

-- Step 1: Check all locations with same name (might be different location_id)
SELECT 
  location_name,
  location_id,
  id,
  gmb_account_id,
  updated_at,
  created_at
FROM gmb_locations
ORDER BY location_name, updated_at DESC;

-- Step 2: Check if there are locations with similar names
SELECT 
  location_name,
  COUNT(*) as count,
  STRING_AGG(location_id, ', ') as location_ids,
  STRING_AGG(id::text, ', ') as ids
FROM gmb_locations
GROUP BY location_name
HAVING COUNT(*) > 1;

-- Step 3: Check locations grouped by location_id (exact duplicates check)
SELECT 
  location_id,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids,
  STRING_AGG(location_name, ' | ') as names,
  STRING_AGG(gmb_account_id::text, ', ') as account_ids,
  STRING_AGG(updated_at::text, ' | ') as updated_dates
FROM gmb_locations
GROUP BY location_id
ORDER BY count DESC;

-- Step 4: Check locations per account
SELECT 
  gmb_account_id,
  COUNT(*) as location_count,
  STRING_AGG(location_name, ', ') as location_names
FROM gmb_locations
GROUP BY gmb_account_id;

-- Step 5: Check if there are active accounts that might cause duplication
SELECT 
  a.id as account_id,
  a.account_name,
  a.is_active,
  COUNT(l.id) as location_count
FROM gmb_accounts a
LEFT JOIN gmb_locations l ON l.gmb_account_id = a.id
WHERE a.is_active = true
GROUP BY a.id, a.account_name, a.is_active;

