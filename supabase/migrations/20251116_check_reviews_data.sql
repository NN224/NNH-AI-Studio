-- Quick check to see review reply status
-- This will help us understand why all 412 reviews show as pending

-- Check total reviews and their reply status
SELECT 
  COUNT(*) as total_reviews,
  COUNT(*) FILTER (WHERE has_reply = true) as reviews_with_reply_flag,
  COUNT(*) FILTER (WHERE reply_text IS NOT NULL AND reply_text != '') as reviews_with_reply_text,
  COUNT(*) FILTER (WHERE has_reply = false OR reply_text IS NULL OR reply_text = '') as pending_reviews,
  ROUND(AVG(rating), 2) as avg_rating
FROM gmb_reviews
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- Sample a few reviews to see their status
SELECT 
  id,
  reviewer_name,
  rating,
  has_reply,
  CASE 
    WHEN reply_text IS NULL THEN 'NULL'
    WHEN reply_text = '' THEN 'EMPTY'
    ELSE 'HAS_TEXT'
  END as reply_text_status,
  LENGTH(reply_text) as reply_length,
  created_at
FROM gmb_reviews
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;

