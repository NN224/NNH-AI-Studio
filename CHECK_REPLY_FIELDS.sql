-- 🔍 فحص حقول الردود في gmb_reviews

-- 1. عينة من الـ Reviews مع الردود
SELECT 
  'Reply Fields Sample' as check_name,
  id,
  reviewer_name,
  has_reply,
  has_response,
  CASE WHEN reply_text IS NOT NULL AND reply_text != '' THEN 'YES' ELSE 'NO' END as has_reply_text,
  CASE WHEN review_reply IS NOT NULL AND review_reply != '' THEN 'YES' ELSE 'NO' END as has_review_reply,
  CASE WHEN response_text IS NOT NULL AND response_text != '' THEN 'YES' ELSE 'NO' END as has_response_text,
  CASE WHEN responded_at IS NOT NULL THEN 'YES' ELSE 'NO' END as has_responded_at,
  LEFT(COALESCE(reply_text, review_reply, response_text, ''), 50) as reply_snippet
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
  AND has_reply = true
LIMIT 5;

-- 2. إحصائيات الحقول
SELECT 
  'Field Statistics' as check_name,
  COUNT(*) as total_reviews,
  COUNT(*) FILTER (WHERE has_reply = true) as has_reply_true,
  COUNT(*) FILTER (WHERE reply_text IS NOT NULL AND reply_text != '') as with_reply_text,
  COUNT(*) FILTER (WHERE review_reply IS NOT NULL AND review_reply != '') as with_review_reply,
  COUNT(*) FILTER (WHERE response_text IS NOT NULL AND response_text != '') as with_response_text,
  COUNT(*) FILTER (WHERE responded_at IS NOT NULL) as with_responded_at
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d';

-- 3. التحقق من أين يتم حفظ الردود
SELECT DISTINCT
  'Reply Storage' as check_name,
  CASE 
    WHEN reply_text IS NOT NULL AND reply_text != '' THEN 'reply_text'
    WHEN review_reply IS NOT NULL AND review_reply != '' THEN 'review_reply'
    WHEN response_text IS NOT NULL AND response_text != '' THEN 'response_text'
    ELSE 'NO_REPLY_TEXT'
  END as reply_field_used,
  COUNT(*) as count
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
  AND has_reply = true
GROUP BY reply_field_used
ORDER BY count DESC;

-- 4. عينة كاملة
SELECT 
  'Full Sample' as check_name,
  id,
  reviewer_name,
  has_reply,
  reply_text,
  review_reply,
  response_text,
  responded_at
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
  AND has_reply = true
  AND (reply_text IS NULL OR reply_text = '')
  AND (review_reply IS NOT NULL AND review_reply != '')
LIMIT 3;
