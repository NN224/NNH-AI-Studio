-- ========================================
-- سكريبت التحقق من مشكلة Reviews و Media
-- ========================================

-- 1. التحقق من بنية جدول gmb_reviews
SELECT 
  'gmb_reviews columns' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_reviews'
ORDER BY ordinal_position;

-- 2. التحقق من Constraints في gmb_reviews
SELECT 
  'gmb_reviews constraints' as check_name,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.gmb_reviews'::regclass;

-- 3. التحقق من أي reviews موجودة
SELECT 
  'existing reviews' as check_name,
  COUNT(*) as total_reviews,
  COUNT(DISTINCT location_id) as locations_with_reviews,
  COUNT(DISTINCT gmb_account_id) as accounts_with_reviews
FROM gmb_reviews;

-- 4. التحقق من locations الموجودة
SELECT 
  'locations info' as check_name,
  l.id as location_uuid,
  l.location_id as google_location_id,
  l.location_name,
  a.account_id as google_account_id,
  CASE 
    WHEN l.location_id LIKE 'accounts/%' THEN '✅ Full resource'
    ELSE '❌ Missing accounts/ prefix'
  END as resource_format
FROM gmb_locations l
LEFT JOIN gmb_accounts a ON a.id = l.gmb_account_id
LIMIT 10;

-- 5. التحقق من Media table
SELECT 
  'gmb_media columns' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_media'
ORDER BY ordinal_position;

-- 6. التحقق من أي media موجود
SELECT 
  'existing media' as check_name,
  COUNT(*) as total_media,
  COUNT(DISTINCT location_id) as locations_with_media
FROM gmb_media;

-- ========================================
-- ملاحظات:
-- ========================================
-- إذا كان location_id لا يحتوي على 'accounts/' prefix
-- فسيتم إرجاع [] في fetchReviews و fetchMedia
--
-- إذا كان هناك reviews في Google My Business لكن لا تظهر هنا
-- فالمشكلة في API endpoint أو permissions
--
-- ========================================

