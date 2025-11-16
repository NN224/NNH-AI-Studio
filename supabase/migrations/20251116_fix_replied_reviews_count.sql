-- ============================================================================
-- FIX: replied_reviews count in v_dashboard_stats
-- ============================================================================
-- Issue: The view counts replied_reviews using reply_text, but the sync
--        saves replies in review_reply field. This causes a mismatch.
-- Solution: Count using has_reply flag instead of reply_text
-- ============================================================================

DROP VIEW IF EXISTS v_dashboard_stats CASCADE;

CREATE OR REPLACE VIEW v_dashboard_stats AS
WITH location_stats AS (
  SELECT 
    l.user_id,
    COUNT(DISTINCT l.id) as total_locations,
    SUM(l.review_count) as total_reviews_from_locations,
    AVG(l.calculated_response_rate) as avg_response_rate
  FROM public.gmb_locations l
  WHERE l.is_active = true
  GROUP BY l.user_id
),
review_stats AS (
  SELECT 
    r.user_id,
    COUNT(DISTINCT r.id) as total_reviews,
    AVG(r.rating) FILTER (WHERE r.rating IS NOT NULL AND r.rating > 0) as avg_rating,
    -- ✅ FIX: Count pending using has_reply flag
    COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = false OR r.has_reply IS NULL) as pending_reviews,
    COUNT(DISTINCT r.id) FILTER (WHERE r.created_at > NOW() - INTERVAL '7 days') as recent_reviews,
    -- ✅ FIX: Count replied using has_reply flag instead of reply_text
    COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = true) as replied_reviews
  FROM public.gmb_reviews r
  WHERE r.rating IS NOT NULL
  GROUP BY r.user_id
),
question_stats AS (
  SELECT 
    q.user_id,
    COUNT(DISTINCT q.id) FILTER (WHERE q.answer_status = 'pending' OR q.answer_text IS NULL) as pending_questions
  FROM public.gmb_questions q
  GROUP BY q.user_id
)
SELECT 
  COALESCE(ls.user_id, rs.user_id, qs.user_id) as user_id,
  COALESCE(ls.total_locations, 0) as total_locations,
  COALESCE(rs.total_reviews, 0) as total_reviews,
  COALESCE(rs.avg_rating, 0) as avg_rating,
  COALESCE(rs.pending_reviews, 0) as pending_reviews,
  COALESCE(rs.replied_reviews, 0) as replied_reviews,
  COALESCE(qs.pending_questions, 0) as pending_questions,
  COALESCE(rs.recent_reviews, 0) as recent_reviews,
  COALESCE(ls.avg_response_rate, 0) as avg_response_rate,
  -- Calculate response rate from actual replies
  CASE 
    WHEN COALESCE(rs.total_reviews, 0) > 0 
    THEN ROUND((COALESCE(rs.replied_reviews, 0)::numeric / rs.total_reviews::numeric) * 100, 2)
    ELSE 0 
  END as calculated_response_rate
FROM location_stats ls
FULL OUTER JOIN review_stats rs ON ls.user_id = rs.user_id
FULL OUTER JOIN question_stats qs ON COALESCE(ls.user_id, rs.user_id) = qs.user_id;

-- Grant permissions
GRANT SELECT ON v_dashboard_stats TO authenticated;
GRANT SELECT ON v_dashboard_stats TO service_role;

-- Add comment
COMMENT ON VIEW v_dashboard_stats IS 'Dashboard statistics view - counts replied_reviews using has_reply flag (FIXED 2025-11-16)';

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify the fix:
/*
SELECT 
  user_id,
  total_reviews,
  replied_reviews,
  pending_reviews,
  calculated_response_rate
FROM v_dashboard_stats
ORDER BY user_id;
*/

