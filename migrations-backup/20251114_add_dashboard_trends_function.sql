-- Migration: Add dashboard trends calculation function
-- Created: 2025-11-14
-- Description: Creates a function to calculate trends for dashboard metrics

-- Function to calculate dashboard trends
CREATE OR REPLACE FUNCTION get_dashboard_trends(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  metric_name TEXT,
  current_value NUMERIC,
  previous_value NUMERIC,
  change_value NUMERIC,
  change_percentage NUMERIC
) AS $$
DECLARE
  v_current_period_start TIMESTAMP;
  v_previous_period_start TIMESTAMP;
  v_period_length INTERVAL;
BEGIN
  -- Calculate period boundaries
  v_period_length := (p_days || ' days')::INTERVAL;
  v_current_period_start := NOW() - v_period_length;
  v_previous_period_start := v_current_period_start - v_period_length;
  
  -- Reviews trend
  WITH review_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE r.review_date >= v_current_period_start) as current_reviews,
      COUNT(*) FILTER (WHERE r.review_date >= v_previous_period_start AND r.review_date < v_current_period_start) as previous_reviews
    FROM gmb_reviews r
    JOIN gmb_locations l ON r.location_id = l.id
    WHERE l.user_id = p_user_id AND l.is_active = true
  )
  SELECT 
    'reviews'::TEXT,
    current_reviews::NUMERIC,
    previous_reviews::NUMERIC,
    (current_reviews - previous_reviews)::NUMERIC,
    CASE 
      WHEN previous_reviews = 0 THEN 0
      ELSE ROUND(((current_reviews - previous_reviews)::NUMERIC / previous_reviews::NUMERIC) * 100, 1)
    END
  FROM review_counts
  
  UNION ALL
  
  -- Questions trend
  WITH question_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE q.created_at >= v_current_period_start) as current_questions,
      COUNT(*) FILTER (WHERE q.created_at >= v_previous_period_start AND q.created_at < v_current_period_start) as previous_questions
    FROM gmb_questions q
    JOIN gmb_locations l ON q.location_id = l.id
    WHERE l.user_id = p_user_id AND l.is_active = true
  )
  SELECT 
    'questions'::TEXT,
    current_questions::NUMERIC,
    previous_questions::NUMERIC,
    (current_questions - previous_questions)::NUMERIC,
    CASE 
      WHEN previous_questions = 0 THEN 0
      ELSE ROUND(((current_questions - previous_questions)::NUMERIC / previous_questions::NUMERIC) * 100, 1)
    END
  FROM question_counts
  
  UNION ALL
  
  -- Rating trend
  WITH rating_averages AS (
    SELECT
      AVG(r.rating) FILTER (WHERE r.review_date >= v_current_period_start) as current_rating,
      AVG(r.rating) FILTER (WHERE r.review_date >= v_previous_period_start AND r.review_date < v_current_period_start) as previous_rating
    FROM gmb_reviews r
    JOIN gmb_locations l ON r.location_id = l.id
    WHERE l.user_id = p_user_id AND l.is_active = true
  )
  SELECT 
    'rating'::TEXT,
    ROUND(COALESCE(current_rating, 0), 2),
    ROUND(COALESCE(previous_rating, 0), 2),
    ROUND(COALESCE(current_rating, 0) - COALESCE(previous_rating, 0), 2),
    CASE 
      WHEN previous_rating IS NULL OR previous_rating = 0 THEN 0
      ELSE ROUND(((current_rating - previous_rating) / previous_rating) * 100, 1)
    END
  FROM rating_averages
  
  UNION ALL
  
  -- Response rate trend
  WITH response_rates AS (
    SELECT
      COUNT(*) FILTER (WHERE r.review_date >= v_current_period_start) as current_total,
      COUNT(*) FILTER (WHERE r.review_date >= v_current_period_start AND r.has_reply = true) as current_replied,
      COUNT(*) FILTER (WHERE r.review_date >= v_previous_period_start AND r.review_date < v_current_period_start) as previous_total,
      COUNT(*) FILTER (WHERE r.review_date >= v_previous_period_start AND r.review_date < v_current_period_start AND r.has_reply = true) as previous_replied
    FROM gmb_reviews r
    JOIN gmb_locations l ON r.location_id = l.id
    WHERE l.user_id = p_user_id AND l.is_active = true
  )
  SELECT 
    'responseRate'::TEXT,
    CASE 
      WHEN current_total = 0 THEN 0
      ELSE ROUND((current_replied::NUMERIC / current_total::NUMERIC) * 100, 1)
    END,
    CASE 
      WHEN previous_total = 0 THEN 0
      ELSE ROUND((previous_replied::NUMERIC / previous_total::NUMERIC) * 100, 1)
    END,
    CASE 
      WHEN current_total = 0 AND previous_total = 0 THEN 0
      WHEN current_total = 0 THEN -100
      WHEN previous_total = 0 THEN 100
      ELSE ROUND(
        ((current_replied::NUMERIC / current_total::NUMERIC) - 
         (previous_replied::NUMERIC / previous_total::NUMERIC)) * 100, 1
      )
    END,
    0 -- Percentage change calculation is in the change_value for response rate
  FROM response_rates;
  
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate location-specific trends
CREATE OR REPLACE FUNCTION get_location_trends(
  p_location_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  metric_name TEXT,
  current_value NUMERIC,
  previous_value NUMERIC,
  change_value NUMERIC,
  change_percentage NUMERIC
) AS $$
DECLARE
  v_current_period_start TIMESTAMP;
  v_previous_period_start TIMESTAMP;
  v_period_length INTERVAL;
BEGIN
  -- Calculate period boundaries
  v_period_length := (p_days || ' days')::INTERVAL;
  v_current_period_start := NOW() - v_period_length;
  v_previous_period_start := v_current_period_start - v_period_length;
  
  RETURN QUERY
  -- Reviews for this location
  WITH location_reviews AS (
    SELECT
      COUNT(*) FILTER (WHERE review_date >= v_current_period_start) as current_reviews,
      COUNT(*) FILTER (WHERE review_date >= v_previous_period_start AND review_date < v_current_period_start) as previous_reviews,
      AVG(rating) FILTER (WHERE review_date >= v_current_period_start) as current_rating,
      AVG(rating) FILTER (WHERE review_date >= v_previous_period_start AND review_date < v_current_period_start) as previous_rating
    FROM gmb_reviews
    WHERE location_id = p_location_id
  ),
  location_questions AS (
    SELECT
      COUNT(*) FILTER (WHERE created_at >= v_current_period_start) as current_questions,
      COUNT(*) FILTER (WHERE created_at >= v_previous_period_start AND created_at < v_current_period_start) as previous_questions
    FROM gmb_questions
    WHERE location_id = p_location_id
  )
  SELECT 
    'reviews'::TEXT,
    lr.current_reviews::NUMERIC,
    lr.previous_reviews::NUMERIC,
    (lr.current_reviews - lr.previous_reviews)::NUMERIC,
    CASE 
      WHEN lr.previous_reviews = 0 THEN 0
      ELSE ROUND(((lr.current_reviews - lr.previous_reviews)::NUMERIC / lr.previous_reviews::NUMERIC) * 100, 1)
    END
  FROM location_reviews lr
  
  UNION ALL
  
  SELECT 
    'questions'::TEXT,
    lq.current_questions::NUMERIC,
    lq.previous_questions::NUMERIC,
    (lq.current_questions - lq.previous_questions)::NUMERIC,
    CASE 
      WHEN lq.previous_questions = 0 THEN 0
      ELSE ROUND(((lq.current_questions - lq.previous_questions)::NUMERIC / lq.previous_questions::NUMERIC) * 100, 1)
    END
  FROM location_questions lq
  
  UNION ALL
  
  SELECT 
    'rating'::TEXT,
    ROUND(COALESCE(lr.current_rating, 0), 2),
    ROUND(COALESCE(lr.previous_rating, 0), 2),
    ROUND(COALESCE(lr.current_rating, 0) - COALESCE(lr.previous_rating, 0), 2),
    CASE 
      WHEN lr.previous_rating IS NULL OR lr.previous_rating = 0 THEN 0
      ELSE ROUND(((lr.current_rating - lr.previous_rating) / lr.previous_rating) * 100, 1)
    END
  FROM location_reviews lr;
  
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_dashboard_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_location_trends TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_dashboard_trends IS 'Calculates trend data for dashboard metrics comparing current period vs previous period';
COMMENT ON FUNCTION get_location_trends IS 'Calculates trend data for a specific location comparing current period vs previous period';
