-- 🔍 فحص مشكلة has_reply = 0

-- 1. فحص البيانات الخام
SELECT 
  'Raw Data Check' as check_name,
  COUNT(*) as total_reviews,
  COUNT(*) FILTER (WHERE has_reply = true) as has_reply_true,
  COUNT(*) FILTER (WHERE has_reply = false) as has_reply_false,
  COUNT(*) FILTER (WHERE has_reply IS NULL) as has_reply_null,
  COUNT(*) FILTER (WHERE reply_text IS NOT NULL AND reply_text != '') as has_reply_text,
  COUNT(*) FILTER (WHERE review_reply IS NOT NULL AND review_reply != '') as has_review_reply
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d';

-- 2. مقارنة الحقول المختلفة
SELECT 
  'Field Comparison' as check_name,
  id,
  has_reply,
  has_response,
  CASE WHEN reply_text IS NOT NULL AND reply_text != '' THEN true ELSE false END as reply_text_exists,
  CASE WHEN review_reply IS NOT NULL AND review_reply != '' THEN true ELSE false END as review_reply_exists,
  CASE WHEN response_text IS NOT NULL AND response_text != '' THEN true ELSE false END as response_text_exists,
  LEFT(COALESCE(reply_text, review_reply, response_text, ''), 50) as reply_snippet
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
LIMIT 10;

-- 3. تحقق من الـ View مباشرة
SELECT 
  'View Check' as check_name,
  user_id,
  replied_reviews,
  total_reviews,
  calculated_response_rate
FROM v_dashboard_stats
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d';

-- 4. إحصائيات شاملة
SELECT 
  'Global Stats' as check_name,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_reviews_all,
  COUNT(*) FILTER (WHERE has_reply = true) as global_has_reply_true,
  COUNT(*) FILTER (WHERE has_reply = false) as global_has_reply_false,
  COUNT(*) FILTER (WHERE has_reply IS NULL) as global_has_reply_null
FROM gmb_reviews;

-- 5. تحقق من تحديثات الـ Sync الأخيرة
SELECT 
  'Recent Sync Updates' as check_name,
  synced_at::date as sync_date,
  COUNT(*) as reviews_synced,
  COUNT(*) FILTER (WHERE has_reply = true) as with_reply,
  COUNT(*) FILTER (WHERE has_reply = false) as without_reply
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
  AND synced_at > NOW() - INTERVAL '7 days'
GROUP BY synced_at::date
ORDER BY sync_date DESC;

-- 6. البحث عن أي Triggers أو Rules
SELECT 
  'Database Objects' as check_name,
  tablename,
  rulename,
  definition
FROM pg_rules
WHERE tablename = 'gmb_reviews' AND rulename LIKE '%reply%'
UNION ALL
SELECT 
  'Database Objects' as check_name,
  event_object_table as tablename,
  trigger_name as rulename,
  action_statement as definition
FROM information_schema.triggers
WHERE event_object_table = 'gmb_reviews' AND trigger_name LIKE '%reply%';
