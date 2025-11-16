-- ============================================================================
-- CHECK REVIEWS REPLIES
-- ============================================================================
-- This script checks the actual state of reviews and replies in the database
-- to diagnose why replied_reviews = 0 in v_dashboard_stats
-- ============================================================================

-- 1. Check total reviews and replies per user
SELECT 
  user_id,
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN has_reply = true THEN 1 END) as has_reply_true,
  COUNT(CASE WHEN has_response = true THEN 1 END) as has_response_true,
  COUNT(CASE WHEN review_reply IS NOT NULL AND review_reply != '' THEN 1 END) as with_reply_text,
  COUNT(CASE WHEN response_text IS NOT NULL AND response_text != '' THEN 1 END) as with_response_text,
  COUNT(CASE WHEN reply_date IS NOT NULL THEN 1 END) as with_reply_date,
  COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) as with_responded_at,
  COUNT(CASE WHEN status = 'responded' THEN 1 END) as status_responded
FROM gmb_reviews
GROUP BY user_id
ORDER BY user_id;

-- 2. Sample reviews with replies (if any)
SELECT 
  user_id,
  external_review_id,
  rating,
  has_reply,
  has_response,
  LENGTH(review_reply) as reply_length,
  LENGTH(response_text) as response_length,
  reply_date,
  responded_at,
  status
FROM gmb_reviews
WHERE has_reply = true OR has_response = true OR review_reply IS NOT NULL OR response_text IS NOT NULL
LIMIT 10;

-- 3. Check v_dashboard_stats view
SELECT 
  user_id,
  total_reviews,
  replied_reviews,
  pending_reviews,
  calculated_response_rate
FROM v_dashboard_stats
ORDER BY user_id;

-- 4. Check if there's a mismatch between the view and actual data
WITH actual_counts AS (
  SELECT 
    user_id,
    COUNT(*) as total_reviews,
    COUNT(CASE WHEN has_reply = true THEN 1 END) as replied_reviews
  FROM gmb_reviews
  GROUP BY user_id
),
view_counts AS (
  SELECT 
    user_id,
    total_reviews,
    replied_reviews
  FROM v_dashboard_stats
)
SELECT 
  a.user_id,
  a.total_reviews as actual_total,
  v.total_reviews as view_total,
  a.replied_reviews as actual_replied,
  v.replied_reviews as view_replied,
  CASE 
    WHEN a.total_reviews != v.total_reviews THEN '❌ MISMATCH: total_reviews'
    WHEN a.replied_reviews != v.replied_reviews THEN '❌ MISMATCH: replied_reviews'
    ELSE '✅ MATCH'
  END as status
FROM actual_counts a
FULL OUTER JOIN view_counts v ON a.user_id = v.user_id
ORDER BY a.user_id;

