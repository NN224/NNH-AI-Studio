-- FINAL FIX: Recreate all views with user_id column
-- Run this in Supabase SQL Editor to fix all view errors

-- ============================================
-- 1. Fix mv_location_stats materialized view
-- ============================================

-- Drop existing materialized view
DROP MATERIALIZED VIEW IF EXISTS public.mv_location_stats CASCADE;

-- Recreate with user_id column
CREATE MATERIALIZED VIEW public.mv_location_stats AS
SELECT 
  l.id,
  l.user_id,
  l.location_name,
  COUNT(DISTINCT r.id) as total_reviews,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(DISTINCT q.id) as total_questions,
  COUNT(DISTINCT CASE WHEN r.has_reply = true THEN r.id END) as replied_reviews,
  COUNT(DISTINCT CASE WHEN q.answer_status = 'answered' THEN q.id END) as answered_questions,
  MAX(r.review_date) as last_review_date,
  MAX(q.created_at) as last_question_date
FROM public.gmb_locations l
LEFT JOIN public.gmb_reviews r ON l.id = r.location_id
LEFT JOIN public.gmb_questions q ON l.id = q.location_id
WHERE l.user_id IS NOT NULL
GROUP BY l.id, l.user_id, l.location_name;

-- Create index
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_location_stats_id ON public.mv_location_stats(id);
CREATE INDEX IF NOT EXISTS idx_mv_location_stats_user_id ON public.mv_location_stats(user_id);

-- ============================================
-- 2. Fix v_health_score_distribution view
-- ============================================

-- Drop existing view
DROP VIEW IF EXISTS public.v_health_score_distribution CASCADE;

-- Recreate with user_id column
CREATE OR REPLACE VIEW public.v_health_score_distribution AS
SELECT 
  l.id as location_id,
  l.user_id,
  l.location_name,
  COALESCE(hc.health_score, 0) as health_score,
  COALESCE(hc.response_rate, 0) as response_rate,
  COALESCE(hc.average_rating, 0) as average_rating,
  hc.checked_at,
  CASE 
    WHEN COALESCE(hc.health_score, 0) >= 80 THEN 'excellent'
    WHEN COALESCE(hc.health_score, 0) >= 60 THEN 'good'
    WHEN COALESCE(hc.health_score, 0) >= 40 THEN 'fair'
    ELSE 'poor'
  END as health_status
FROM public.gmb_locations l
LEFT JOIN LATERAL (
  SELECT * FROM public.health_check_results 
  WHERE location_id = l.id 
  ORDER BY checked_at DESC 
  LIMIT 1
) hc ON true;

-- ============================================
-- 3. Grant permissions
-- ============================================

GRANT SELECT ON public.mv_location_stats TO authenticated;
GRANT SELECT ON public.v_health_score_distribution TO authenticated;

-- ============================================
-- 4. Refresh materialized view
-- ============================================

REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_location_stats;

