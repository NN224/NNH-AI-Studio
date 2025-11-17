-- 🔧 حل بديل لمشكلة has_reply

-- 1. تحديث has_reply بناءً على وجود reply_text
UPDATE gmb_reviews
SET has_reply = true
WHERE (reply_text IS NOT NULL AND reply_text != '')
   OR (review_reply IS NOT NULL AND review_reply != '')
   OR (response_text IS NOT NULL AND response_text != '');

-- 2. تحديث has_reply = false للباقي
UPDATE gmb_reviews
SET has_reply = false
WHERE has_reply IS NULL
   OR (
     (reply_text IS NULL OR reply_text = '') AND
     (review_reply IS NULL OR review_reply = '') AND
     (response_text IS NULL OR response_text = '')
   );

-- 3. إضافة Index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_has_reply 
ON gmb_reviews(has_reply) 
WHERE has_reply = true;

-- 4. التحقق من النتيجة
SELECT 
  COUNT(*) as total_reviews,
  COUNT(*) FILTER (WHERE has_reply = true) as with_reply,
  COUNT(*) FILTER (WHERE has_reply = false) as without_reply,
  ROUND(
    COUNT(*) FILTER (WHERE has_reply = true)::numeric / 
    COUNT(*)::numeric * 100, 
    2
  ) as response_rate_percentage
FROM gmb_reviews;
