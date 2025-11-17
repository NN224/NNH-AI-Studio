-- ========================================
-- 🔍 DIAGNOSE "ACCOUNT NOT FOUND" ISSUE
-- ========================================

-- 1️⃣ فحص gmb_accounts
-- ========================================
SELECT 
  '1. GMB Accounts' as check_name,
  id,
  account_name,
  email,
  is_active,
  token_expires_at,
  CASE 
    WHEN token_expires_at < NOW() THEN '❌ Expired'
    WHEN token_expires_at < NOW() + INTERVAL '7 days' THEN '⚠️ Expiring Soon'
    ELSE '✅ Valid'
  END as token_status,
  last_sync,
  created_at
FROM gmb_accounts
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
ORDER BY created_at DESC;

-- 2️⃣ فحص gmb_locations
-- ========================================
SELECT 
  '2. GMB Locations' as check_name,
  id,
  location_name,
  gmb_account_id,
  is_active,
  last_synced_at,
  CASE 
    WHEN gmb_account_id IS NULL THEN '❌ No Account'
    WHEN gmb_account_id NOT IN (SELECT id FROM gmb_accounts WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') THEN '❌ Invalid Account'
    ELSE '✅ Valid Account'
  END as account_status
FROM gmb_locations
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
ORDER BY created_at DESC;

-- 3️⃣ فحص Location بالـ ID المحدد
-- ========================================
SELECT 
  '3. Specific Location' as check_name,
  id,
  location_name,
  gmb_account_id,
  user_id,
  is_active,
  (SELECT account_name FROM gmb_accounts WHERE id = gmb_locations.gmb_account_id) as account_name,
  (SELECT is_active FROM gmb_accounts WHERE id = gmb_locations.gmb_account_id) as account_is_active
FROM gmb_locations
WHERE id = '8a606c17-5706-4d89-ac5a-8fd651b24c33';

-- 4️⃣ فحص العلاقة بين Locations و Accounts
-- ========================================
SELECT 
  '4. Locations-Accounts Relationship' as check_name,
  l.id as location_id,
  l.location_name,
  l.gmb_account_id,
  a.id as account_id_from_table,
  a.account_name,
  a.is_active as account_active,
  CASE 
    WHEN l.gmb_account_id = a.id THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as relationship_status
FROM gmb_locations l
LEFT JOIN gmb_accounts a ON l.gmb_account_id = a.id
WHERE l.user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
ORDER BY l.created_at DESC;

-- 5️⃣ فحص Orphaned Locations (locations بدون account)
-- ========================================
SELECT 
  '5. Orphaned Locations' as check_name,
  COUNT(*) as total_locations,
  COUNT(CASE WHEN gmb_account_id IS NULL THEN 1 END) as null_account_id,
  COUNT(CASE WHEN gmb_account_id IS NOT NULL AND gmb_account_id NOT IN (SELECT id FROM gmb_accounts) THEN 1 END) as invalid_account_id,
  COUNT(CASE WHEN gmb_account_id IN (SELECT id FROM gmb_accounts WHERE is_active = false) THEN 1 END) as inactive_account
FROM gmb_locations
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d';

-- 6️⃣ إصلاح Orphaned Locations (ربطهم بأول account نشط)
-- ========================================
-- ⚠️ هذا بيحدث gmb_account_id للـ locations اللي بدون account
WITH first_active_account AS (
  SELECT id 
  FROM gmb_accounts 
  WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d' 
  AND is_active = true 
  ORDER BY created_at DESC 
  LIMIT 1
)
UPDATE gmb_locations
SET gmb_account_id = (SELECT id FROM first_active_account)
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
AND (
  gmb_account_id IS NULL 
  OR gmb_account_id NOT IN (SELECT id FROM gmb_accounts)
)
RETURNING id, location_name, gmb_account_id;

-- 7️⃣ التحقق بعد الإصلاح
-- ========================================
SELECT 
  '7. After Fix Verification' as check_name,
  COUNT(*) as total_locations,
  COUNT(CASE WHEN gmb_account_id IS NULL THEN 1 END) as null_account_id,
  COUNT(CASE WHEN gmb_account_id IS NOT NULL THEN 1 END) as has_account_id,
  COUNT(CASE WHEN gmb_account_id IN (SELECT id FROM gmb_accounts WHERE is_active = true) THEN 1 END) as valid_active_account
FROM gmb_locations
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d';

