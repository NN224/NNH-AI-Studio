-- ========================================
-- فحص سريع لمشكلة Reviews و Media
-- ========================================
-- انسخ النتائج وأرسلها
-- ========================================

-- 1. التحقق من format الـ location_id
SELECT 
  'Location IDs Format' as check_type,
  location_id,
  CASE 
    WHEN location_id LIKE 'accounts/%' THEN '✅ Correct format'
    WHEN location_id LIKE 'locations/%' THEN '⚠️ Missing accounts/ prefix'
    ELSE '❌ Invalid format'
  END as format_check
FROM gmb_locations
LIMIT 5;

-- 2. التحقق من account_id format
SELECT 
  'Account IDs Format' as check_type,
  id as account_uuid,
  account_id as google_account_id,
  CASE 
    WHEN account_id LIKE 'accounts/%' THEN '✅ Correct format'
    ELSE '❌ Invalid format'
  END as format_check
FROM gmb_accounts
LIMIT 5;

-- 3. التحقق من وجود reviews في جدول gmb_reviews
SELECT 
  'Reviews Count' as check_type,
  COUNT(*) as total_reviews
FROM gmb_reviews;

-- 4. التحقق من وجود media في جدول gmb_media  
SELECT 
  'Media Count' as check_type,
  COUNT(*) as total_media
FROM gmb_media;

-- 5. ملخص المشكلة
SELECT 
  '=== DIAGNOSIS ===' as check_type,
  'Locations exist' as item,
  CASE WHEN (SELECT COUNT(*) FROM gmb_locations) > 0 THEN '✅ YES' ELSE '❌ NO' END as status,
  (SELECT COUNT(*)::text FROM gmb_locations) || ' locations' as details
UNION ALL
SELECT 
  '=== DIAGNOSIS ===',
  'Locations have correct format',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM gmb_locations 
      WHERE location_id LIKE 'accounts/%'
    ) THEN '✅ YES'
    ELSE '❌ NO - This is the problem!'
  END,
  (SELECT COUNT(*)::text FROM gmb_locations WHERE location_id LIKE 'accounts/%') || ' with correct format'
UNION ALL
SELECT 
  '=== DIAGNOSIS ===',
  'Reviews table exists',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_reviews') THEN '✅ YES' ELSE '❌ NO' END,
  ''
UNION ALL
SELECT 
  '=== DIAGNOSIS ===',
  'Media table exists',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_media') THEN '✅ YES' ELSE '❌ NO' END,
  ''
UNION ALL
SELECT 
  '=== DIAGNOSIS ===',
  'Reviews saved',
  CASE WHEN (SELECT COUNT(*) FROM gmb_reviews) > 0 THEN '✅ YES' ELSE '❌ NO - Need to check logs' END,
  (SELECT COUNT(*)::text FROM gmb_reviews) || ' reviews'
UNION ALL
SELECT 
  '=== DIAGNOSIS ===',
  'Media saved',
  CASE WHEN (SELECT COUNT(*) FROM gmb_media) > 0 THEN '✅ YES' ELSE '❌ NO - May not exist in GMB' END,
  (SELECT COUNT(*)::text FROM gmb_media) || ' media items';

