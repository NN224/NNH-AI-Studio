-- Fix Dashboard Missing Views and Functions
-- Created: 2025-01-18
-- Description: Ensures all views and functions required by Dashboard APIs exist
--
-- SAFE TO RUN: This migration uses DROP IF EXISTS to avoid conflicts
-- and CREATE OR REPLACE for idempotent operations.

-- =====================================================
-- 1. ENSURE v_dashboard_stats VIEW EXISTS
-- =====================================================

-- Drop existing view first to avoid conflicts
DROP VIEW IF EXISTS v_dashboard_stats;

-- This view is used by dashboard/actions.ts getDashboardStats()
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
    COUNT(DISTINCT r.id) FILTER (WHERE (r.has_reply = false OR r.has_reply IS NULL) AND (r.reply_text IS NULL OR r.reply_text = '')) as pending_reviews,
    COUNT(DISTINCT r.id) FILTER (WHERE r.created_at > NOW() - INTERVAL '7 days') as recent_reviews,
    COUNT(DISTINCT r.id) FILTER (WHERE r.reply_text IS NOT NULL AND r.reply_text != '') as replied_reviews
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

-- =====================================================
-- 2. ENSURE mv_location_stats MATERIALIZED VIEW EXISTS
-- =====================================================

-- This view is used by dashboard/stats/route.ts
DROP MATERIALIZED VIEW IF EXISTS mv_location_stats;
CREATE MATERIALIZED VIEW mv_location_stats AS
SELECT 
  l.id,
  l.user_id,
  l.location_name,
  COUNT(DISTINCT r.id) as total_reviews,
  COUNT(DISTINCT CASE WHEN r.has_reply = false OR r.has_reply IS NULL THEN r.id END) as pending_reviews,
  COUNT(DISTINCT q.id) as total_questions,
  COUNT(DISTINCT CASE WHEN q.answer_status = 'pending' OR q.answer_text IS NULL THEN q.id END) as unanswered_questions,
  COALESCE(AVG(r.rating) FILTER (WHERE r.rating IS NOT NULL), 0) as avg_rating,
  CASE 
    WHEN COUNT(DISTINCT r.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN r.has_reply = true THEN r.id END)::numeric / COUNT(DISTINCT r.id)::numeric) * 100, 2)
    ELSE 0 
  END as response_rate,
  MAX(r.review_date) as last_review_date,
  MAX(q.created_at) as last_question_date,
  NOW() as refreshed_at
FROM public.gmb_locations l
LEFT JOIN public.gmb_reviews r ON l.id = r.location_id
LEFT JOIN public.gmb_questions q ON l.id = q.location_id
WHERE l.user_id IS NOT NULL AND l.is_active = true
GROUP BY l.id, l.user_id, l.location_name;

-- Create unique index
CREATE UNIQUE INDEX idx_mv_location_stats_id ON mv_location_stats(id);
CREATE INDEX idx_mv_location_stats_user ON mv_location_stats(user_id);

-- =====================================================
-- 3. ENSURE v_health_score_distribution VIEW EXISTS
-- =====================================================

-- Drop existing view first to avoid conflicts
DROP VIEW IF EXISTS v_health_score_distribution;

-- This view is used by dashboard/stats/route.ts
CREATE OR REPLACE VIEW v_health_score_distribution AS
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE health_score >= 80) as excellent_count,
  COUNT(*) FILTER (WHERE health_score >= 60 AND health_score < 80) as good_count,
  COUNT(*) FILTER (WHERE health_score >= 40 AND health_score < 60) as fair_count,
  COUNT(*) FILTER (WHERE health_score < 40) as needs_attention_count,
  AVG(health_score) as avg_health_score,
  MIN(health_score) as min_health_score,
  MAX(health_score) as max_health_score
FROM public.gmb_locations
WHERE is_active = true AND health_score IS NOT NULL
GROUP BY user_id;

-- =====================================================
-- 4. ENSURE get_dashboard_trends FUNCTION EXISTS
-- =====================================================

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_dashboard_trends(UUID, INTEGER);

-- This function is used by dashboard/stats/route.ts
CREATE OR REPLACE FUNCTION get_dashboard_trends(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  reviews JSONB,
  questions JSONB,
  rating JSONB,
  response_rate JSONB
) AS $$
DECLARE
  v_current_period_start TIMESTAMP;
  v_previous_period_start TIMESTAMP;
  v_period_length INTERVAL;
  v_current_reviews INTEGER;
  v_previous_reviews INTEGER;
  v_current_questions INTEGER;
  v_previous_questions INTEGER;
  v_current_rating NUMERIC;
  v_previous_rating NUMERIC;
  v_current_response_rate NUMERIC;
  v_previous_response_rate NUMERIC;
BEGIN
  -- Calculate period boundaries
  v_period_length := (p_days || ' days')::INTERVAL;
  v_current_period_start := NOW() - v_period_length;
  v_previous_period_start := v_current_period_start - v_period_length;
  
  -- Get current period reviews
  SELECT COUNT(*)
  INTO v_current_reviews
  FROM gmb_reviews r
  JOIN gmb_locations l ON r.location_id = l.id
  WHERE l.user_id = p_user_id 
    AND l.is_active = true 
    AND r.review_date >= v_current_period_start;
  
  -- Get previous period reviews
  SELECT COUNT(*)
  INTO v_previous_reviews
  FROM gmb_reviews r
  JOIN gmb_locations l ON r.location_id = l.id
  WHERE l.user_id = p_user_id 
    AND l.is_active = true 
    AND r.review_date >= v_previous_period_start 
    AND r.review_date < v_current_period_start;
  
  -- Get current period questions
  SELECT COUNT(*)
  INTO v_current_questions
  FROM gmb_questions q
  JOIN gmb_locations l ON q.location_id = l.id
  WHERE l.user_id = p_user_id 
    AND l.is_active = true 
    AND q.created_at >= v_current_period_start;
  
  -- Get previous period questions
  SELECT COUNT(*)
  INTO v_previous_questions
  FROM gmb_questions q
  JOIN gmb_locations l ON q.location_id = l.id
  WHERE l.user_id = p_user_id 
    AND l.is_active = true 
    AND q.created_at >= v_previous_period_start 
    AND q.created_at < v_current_period_start;
  
  -- Get current period rating
  SELECT AVG(r.rating)
  INTO v_current_rating
  FROM gmb_reviews r
  JOIN gmb_locations l ON r.location_id = l.id
  WHERE l.user_id = p_user_id 
    AND l.is_active = true 
    AND r.review_date >= v_current_period_start
    AND r.rating IS NOT NULL;
  
  -- Get previous period rating
  SELECT AVG(r.rating)
  INTO v_previous_rating
  FROM gmb_reviews r
  JOIN gmb_locations l ON r.location_id = l.id
  WHERE l.user_id = p_user_id 
    AND l.is_active = true 
    AND r.review_date >= v_previous_period_start 
    AND r.review_date < v_current_period_start
    AND r.rating IS NOT NULL;
  
  -- Get current period response rate
  WITH current_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE r.has_reply = true) as replied
    FROM gmb_reviews r
    JOIN gmb_locations l ON r.location_id = l.id
    WHERE l.user_id = p_user_id 
      AND l.is_active = true 
      AND r.review_date >= v_current_period_start
  )
  SELECT 
    CASE WHEN total > 0 THEN (replied::numeric / total::numeric) * 100 ELSE 0 END
  INTO v_current_response_rate
  FROM current_stats;
  
  -- Get previous period response rate
  WITH previous_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE r.has_reply = true) as replied
    FROM gmb_reviews r
    JOIN gmb_locations l ON r.location_id = l.id
    WHERE l.user_id = p_user_id 
      AND l.is_active = true 
      AND r.review_date >= v_previous_period_start 
      AND r.review_date < v_current_period_start
  )
  SELECT 
    CASE WHEN total > 0 THEN (replied::numeric / total::numeric) * 100 ELSE 0 END
  INTO v_previous_response_rate
  FROM previous_stats;
  
  -- Return results as JSONB
  RETURN QUERY SELECT
    jsonb_build_object(
      'current', COALESCE(v_current_reviews, 0),
      'previous', COALESCE(v_previous_reviews, 0),
      'change', CASE 
        WHEN COALESCE(v_previous_reviews, 0) = 0 THEN 0
        ELSE ROUND(((COALESCE(v_current_reviews, 0) - COALESCE(v_previous_reviews, 0))::numeric / v_previous_reviews::numeric) * 100, 1)
      END
    ) as reviews,
    jsonb_build_object(
      'current', COALESCE(v_current_questions, 0),
      'previous', COALESCE(v_previous_questions, 0),
      'change', CASE 
        WHEN COALESCE(v_previous_questions, 0) = 0 THEN 0
        ELSE ROUND(((COALESCE(v_current_questions, 0) - COALESCE(v_previous_questions, 0))::numeric / v_previous_questions::numeric) * 100, 1)
      END
    ) as questions,
    jsonb_build_object(
      'current', ROUND(COALESCE(v_current_rating, 0), 2),
      'previous', ROUND(COALESCE(v_previous_rating, 0), 2),
      'change', ROUND(COALESCE(v_current_rating, 0) - COALESCE(v_previous_rating, 0), 2)
    ) as rating,
    jsonb_build_object(
      'current', ROUND(COALESCE(v_current_response_rate, 0), 1),
      'previous', ROUND(COALESCE(v_previous_response_rate, 0), 1),
      'change', ROUND(COALESCE(v_current_response_rate, 0) - COALESCE(v_previous_response_rate, 0), 1)
    ) as response_rate;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 5. ENSURE activity_logs TABLE EXISTS
-- =====================================================

-- This table is used by dashboard/actions.ts getActivityFeed()
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  activity_message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created 
  ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type 
  ON activity_logs(activity_type);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own activity logs" ON activity_logs;
CREATE POLICY "Users can view their own activity logs"
  ON activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own activity logs" ON activity_logs;
CREATE POLICY "Users can insert their own activity logs"
  ON activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. ENSURE gmb_performance_metrics TABLE EXISTS
-- =====================================================

-- This table is used by dashboard/actions.ts getPerformanceChartData()
CREATE TABLE IF NOT EXISTS gmb_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_date DATE NOT NULL,
  metric_value BIGINT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gmb_performance_metrics_user_date 
  ON gmb_performance_metrics(user_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_gmb_performance_metrics_type 
  ON gmb_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_gmb_performance_metrics_location 
  ON gmb_performance_metrics(location_id);

-- Enable RLS
ALTER TABLE gmb_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own performance metrics" ON gmb_performance_metrics;
CREATE POLICY "Users can view their own performance metrics"
  ON gmb_performance_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own performance metrics" ON gmb_performance_metrics;
CREATE POLICY "Users can insert their own performance metrics"
  ON gmb_performance_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 7. CREATE FUNCTION TO REFRESH MATERIALIZED VIEW
-- =====================================================

-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS refresh_location_stats();

-- This function is used by dashboard/stats/route.ts POST endpoint
CREATE OR REPLACE FUNCTION refresh_location_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_location_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions on views and functions
GRANT SELECT ON v_dashboard_stats TO authenticated;
GRANT SELECT ON v_dashboard_stats TO service_role;

GRANT SELECT ON mv_location_stats TO authenticated;
GRANT SELECT ON mv_location_stats TO service_role;

GRANT SELECT ON v_health_score_distribution TO authenticated;
GRANT SELECT ON v_health_score_distribution TO service_role;

GRANT EXECUTE ON FUNCTION get_dashboard_trends(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_trends(UUID, INTEGER) TO service_role;

GRANT EXECUTE ON FUNCTION refresh_location_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_location_stats() TO service_role;

-- =====================================================
-- 9. ADD COMMENTS
-- =====================================================

COMMENT ON VIEW v_dashboard_stats IS 'Dashboard statistics view - calculates metrics from reviews and questions';
COMMENT ON MATERIALIZED VIEW mv_location_stats IS 'Materialized view for optimized location statistics queries';
COMMENT ON VIEW v_health_score_distribution IS 'Distribution of health scores across locations for each user';
COMMENT ON FUNCTION get_dashboard_trends IS 'Calculates trend data for dashboard metrics over specified period';
COMMENT ON FUNCTION refresh_location_stats IS 'Refreshes the materialized view for location statistics';
COMMENT ON TABLE activity_logs IS 'Stores user activity logs for dashboard feed';
COMMENT ON TABLE gmb_performance_metrics IS 'Stores performance metrics from Google My Business API';

-- =====================================================
-- 10. INITIAL DATA POPULATION
-- =====================================================

-- Refresh the materialized view with current data
SELECT refresh_location_stats();

-- Populate some sample activity logs if table is empty
INSERT INTO activity_logs (user_id, activity_type, activity_message)
SELECT DISTINCT 
  user_id,
  'system',
  'Dashboard initialized successfully'
FROM gmb_locations
WHERE user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM activity_logs WHERE user_id = gmb_locations.user_id)
LIMIT 100;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
