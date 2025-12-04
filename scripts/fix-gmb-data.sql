-- ============================================
-- FIX GMB DATA INCONSISTENCY
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check current state
SELECT 
  'gmb_accounts' as table_name,
  id,
  account_id,
  account_name,
  is_active,
  user_id,
  created_at
FROM gmb_accounts
WHERE user_id = 'cc6e53db-9017-4971-b049-3d4f247035fe';

SELECT 
  'gmb_locations' as table_name,
  id,
  location_name,
  gmb_account_id,
  is_active,
  user_id,
  created_at
FROM gmb_locations
WHERE user_id = 'cc6e53db-9017-4971-b049-3d4f247035fe';

SELECT 
  'gmb_secrets' as table_name,
  id,
  account_id,
  created_at
FROM gmb_secrets;

-- Step 2: Fix is_active on accounts (make sure it's TRUE)
UPDATE gmb_accounts 
SET is_active = true
WHERE user_id = 'cc6e53db-9017-4971-b049-3d4f247035fe';

-- Step 3: Fix gmb_locations to point to correct account
-- First, get the account ID that HAS secrets (the valid one)
WITH valid_account AS (
  SELECT ga.id as account_id
  FROM gmb_accounts ga
  INNER JOIN gmb_secrets gs ON gs.account_id = ga.id
  WHERE ga.user_id = 'cc6e53db-9017-4971-b049-3d4f247035fe'
  LIMIT 1
)
UPDATE gmb_locations
SET gmb_account_id = (SELECT account_id FROM valid_account)
WHERE user_id = 'cc6e53db-9017-4971-b049-3d4f247035fe'
  AND gmb_account_id NOT IN (SELECT account_id FROM valid_account);

-- Step 4: Delete orphan accounts (accounts without secrets)
DELETE FROM gmb_accounts
WHERE user_id = 'cc6e53db-9017-4971-b049-3d4f247035fe'
  AND id NOT IN (SELECT account_id FROM gmb_secrets);

-- Step 5: Verify the fix
SELECT 
  ga.id as account_id,
  ga.account_name,
  ga.is_active,
  gs.id as secret_id,
  COUNT(gl.id) as locations_count
FROM gmb_accounts ga
LEFT JOIN gmb_secrets gs ON gs.account_id = ga.id
LEFT JOIN gmb_locations gl ON gl.gmb_account_id = ga.id
WHERE ga.user_id = 'cc6e53db-9017-4971-b049-3d4f247035fe'
GROUP BY ga.id, ga.account_name, ga.is_active, gs.id;
