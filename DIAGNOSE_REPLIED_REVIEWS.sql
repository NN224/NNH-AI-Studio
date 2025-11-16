-- ========================================
-- 🔍 DIAGNOSE REPLIED REVIEWS ISSUE
-- ========================================
-- فحص شامل لمشكلة replied_reviews = 0
-- ========================================

-- 1️⃣ فحص has_reply column في gmb_reviews
-- ========================================
SELECT 
  '1. has_reply Distribution' as check_name,
  has_reply,
  COUNT(*) as count
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
GROUP BY has_reply
ORDER BY has_reply;

-- 2️⃣ فحص reply_text vs has_reply
-- ========================================
SELECT 
  '2. reply_text vs has_reply' as check_name,
  CASE 
    WHEN reply_text IS NOT NULL AND reply_text != '' THEN 'Has reply_text'
    ELSE 'No reply_text'
  END as reply_text_status,
  has_reply,
  COUNT(*) as count
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
GROUP BY 
  CASE 
    WHEN reply_text IS NOT NULL AND reply_text != '' THEN 'Has reply_text'
    ELSE 'No reply_text'
  END,
  has_reply
ORDER BY reply_text_status, has_reply;

-- 3️⃣ فحص response column (قد يكون الـ reply في column مختلف)
-- ========================================
SELECT 
  '3. response vs reply_text' as check_name,
  CASE 
    WHEN response IS NOT NULL AND response != '' THEN 'Has response'
    ELSE 'No response'
  END as response_status,
  CASE 
    WHEN reply_text IS NOT NULL AND reply_text != '' THEN 'Has reply_text'
    ELSE 'No reply_text'
  END as reply_text_status,
  has_reply,
  COUNT(*) as count
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
GROUP BY 
  CASE 
    WHEN response IS NOT NULL AND response != '' THEN 'Has response'
    ELSE 'No response'
  END,
  CASE 
    WHEN reply_text IS NOT NULL AND reply_text != '' THEN 'Has reply_text'
    ELSE 'No reply_text'
  END,
  has_reply
ORDER BY response_status, reply_text_status, has_reply;

-- 4️⃣ عينة من الـ reviews (أول 10)
-- ========================================
SELECT 
  '4. Sample Reviews' as check_name,
  id,
  reviewer_name,
  rating,
  has_reply,
  CASE 
    WHEN reply_text IS NOT NULL AND reply_text != '' THEN '✅ Has reply_text'
    ELSE '❌ No reply_text'
  END as reply_text_status,
  CASE 
    WHEN response IS NOT NULL AND response != '' THEN '✅ Has response'
    ELSE '❌ No response'
  END as response_status,
  reply_date,
  responded_at,
  review_date
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
ORDER BY review_date DESC
LIMIT 10;

-- 5️⃣ فحص الـ columns الموجودة في gmb_reviews
-- ========================================
SELECT 
  '5. gmb_reviews Columns' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'gmb_reviews'
AND column_name IN ('has_reply', 'reply_text', 'response', 'reply_date', 'responded_at')
ORDER BY ordinal_position;

-- 6️⃣ فحص v_dashboard_stats definition (للـ replied_reviews)
-- ========================================
SELECT 
  '6. v_dashboard_stats Definition' as check_name,
  pg_get_viewdef('v_dashboard_stats', true) as view_definition;

-- 7️⃣ فحص إذا كان في reviews مع replies فعلاً
-- ========================================
SELECT 
  '7. Reviews with Actual Reply Content' as check_name,
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN reply_text IS NOT NULL AND LENGTH(reply_text) > 0 THEN 1 END) as has_reply_text,
  COUNT(CASE WHEN response IS NOT NULL AND LENGTH(response) > 0 THEN 1 END) as has_response,
  COUNT(CASE WHEN reply_date IS NOT NULL THEN 1 END) as has_reply_date,
  COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) as has_responded_at,
  COUNT(CASE WHEN has_reply = true THEN 1 END) as has_reply_true,
  COUNT(CASE WHEN has_reply = false OR has_reply IS NULL THEN 1 END) as has_reply_false_or_null
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d';

-- 8️⃣ عينة من review مع reply (إذا موجود)
-- ========================================
SELECT 
  '8. Sample Review with Reply' as check_name,
  id,
  reviewer_name,
  rating,
  LEFT(review_text, 100) as review_text_preview,
  has_reply,
  LEFT(COALESCE(reply_text, response, ''), 100) as reply_preview,
  reply_date,
  responded_at
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
AND (
  reply_text IS NOT NULL 
  OR response IS NOT NULL 
  OR reply_date IS NOT NULL 
  OR responded_at IS NOT NULL
  OR has_reply = true
)
ORDER BY review_date DESC
LIMIT 5;

-- 9️⃣ فحص آخر sync للـ reviews
-- ========================================
SELECT 
  '9. Last Reviews Sync' as check_name,
  MAX(synced_at) as last_synced,
  MAX(updated_at) as last_updated,
  COUNT(*) as total_reviews
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d';

-- 🔟 فحص gmb_sync_logs للـ reviews phase
-- ========================================
SELECT 
  '10. Reviews Sync Logs' as check_name,
  phase,
  status,
  counts,
  error,
  started_at,
  ended_at
FROM gmb_sync_logs
WHERE gmb_account_id IN (
  SELECT id FROM gmb_accounts WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
)
AND phase = 'reviews'
ORDER BY started_at DESC
LIMIT 5;

