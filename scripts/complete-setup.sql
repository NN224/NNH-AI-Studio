-- Complete Production Setup
-- This file contains all missing functions and final setup

-- 1. Missing Response Rate Functions
CREATE OR REPLACE FUNCTION calculate_weighted_response_rate(location_ids UUID[])
RETURNS NUMERIC AS $$
DECLARE
  total_reviews INTEGER;
  total_replied INTEGER;
  response_rate NUMERIC(5,2);
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE has_reply = true)
  INTO total_reviews, total_replied
  FROM public.gmb_reviews
  WHERE location_id = ANY(location_ids);
  
  IF total_reviews = 0 THEN
    RETURN 0;
  END IF;
  
  response_rate := (total_replied::NUMERIC / total_reviews::NUMERIC) * 100;
  RETURN ROUND(response_rate, 2);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION calculate_user_response_rate(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  location_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO location_ids
  FROM public.gmb_locations
  WHERE user_id = p_user_id
    AND is_active = true;
  
  IF location_ids IS NULL OR array_length(location_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN calculate_weighted_response_rate(location_ids);
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Dashboard Trends Functions
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
  v_period_length := (p_days || ' days')::INTERVAL;
  v_current_period_start := NOW() - v_period_length;
  v_previous_period_start := v_current_period_start - v_period_length;
  
  RETURN QUERY
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
  FROM review_counts;
END;
$$ LANGUAGE plpgsql STABLE;

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
  v_period_length := (p_days || ' days')::INTERVAL;
  v_current_period_start := NOW() - v_period_length;
  v_previous_period_start := v_current_period_start - v_period_length;
  
  RETURN QUERY
  WITH location_reviews AS (
    SELECT
      COUNT(*) FILTER (WHERE review_date >= v_current_period_start) as current_reviews,
      COUNT(*) FILTER (WHERE review_date >= v_previous_period_start AND review_date < v_current_period_start) as previous_reviews,
      AVG(rating) FILTER (WHERE review_date >= v_current_period_start) as current_rating,
      AVG(rating) FILTER (WHERE review_date >= v_previous_period_start AND review_date < v_current_period_start) as previous_rating
    FROM gmb_reviews
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
  FROM location_reviews lr;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Review Consistency Function
CREATE OR REPLACE FUNCTION maintain_review_reply_consistency()
RETURNS TRIGGER AS $$
BEGIN
  NEW.has_reply := (NEW.reply_text IS NOT NULL AND NEW.reply_text != '');
  
  IF NEW.reply_text IS NOT NULL AND NEW.replied_at IS NULL THEN
    NEW.replied_at := NOW();
  END IF;
  
  IF NEW.reply_text IS NULL OR NEW.reply_text = '' THEN
    NEW.replied_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. ML/AI Functions
CREATE OR REPLACE FUNCTION extract_sentiment_topics(analysis JSONB)
RETURNS TEXT[] AS $$
DECLARE
  topics TEXT[] := '{}';
  topic JSONB;
BEGIN
  IF analysis IS NULL OR analysis->'topics' IS NULL THEN
    RETURN topics;
  END IF;
  
  FOR topic IN SELECT * FROM jsonb_array_elements(analysis->'topics')
  LOOP
    topics := array_append(topics, topic->>'topic');
  END LOOP;
  
  RETURN topics;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_aspect_score(analysis JSONB, aspect TEXT)
RETURNS NUMERIC AS $$
BEGIN
  IF analysis IS NULL OR analysis->'aspects' IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN (analysis->'aspects'->>aspect)::NUMERIC;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Create Missing Views
CREATE OR REPLACE VIEW v_dashboard_stats AS
WITH location_stats AS (
  SELECT 
    l.user_id,
    COUNT(DISTINCT l.id) as total_locations,
    AVG(l.rating) FILTER (WHERE l.rating IS NOT NULL) as avg_rating,
    SUM(l.review_count) as total_reviews,
    AVG(COALESCE(l.calculated_response_rate, 0)) as avg_response_rate
  FROM public.gmb_locations l
  WHERE l.is_active = true
  GROUP BY l.user_id
),
review_stats AS (
  SELECT 
    l.user_id,
    COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = false) as pending_reviews,
    COUNT(DISTINCT r.id) FILTER (WHERE r.created_at > NOW() - INTERVAL '7 days') as recent_reviews
  FROM public.gmb_locations l
  JOIN public.gmb_reviews r ON l.id = r.location_id
  WHERE l.is_active = true
  GROUP BY l.user_id
),
question_stats AS (
  SELECT 
    l.user_id,
    COUNT(DISTINCT q.id) FILTER (WHERE q.answer_status IN ('unanswered', 'pending')) as pending_questions,
    COUNT(DISTINCT q.id) FILTER (WHERE q.created_at > NOW() - INTERVAL '7 days') as recent_questions
  FROM public.gmb_locations l
  JOIN public.gmb_questions q ON l.id = q.location_id
  WHERE l.is_active = true
  GROUP BY l.user_id
)
SELECT 
  ls.user_id,
  ls.total_locations,
  ROUND(ls.avg_rating::numeric, 2) as avg_rating,
  ls.total_reviews,
  ls.avg_response_rate as response_rate,
  COALESCE(rs.pending_reviews, 0) as pending_reviews,
  COALESCE(rs.recent_reviews, 0) as recent_reviews,
  COALESCE(qs.pending_questions, 0) as pending_questions,
  COALESCE(qs.recent_questions, 0) as recent_questions,
  NOW() as calculated_at
FROM location_stats ls
LEFT JOIN review_stats rs ON ls.user_id = rs.user_id
LEFT JOIN question_stats qs ON ls.user_id = qs.user_id;

-- 6. Grant Permissions
GRANT EXECUTE ON FUNCTION calculate_weighted_response_rate TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_response_rate TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_location_trends TO authenticated;
GRANT EXECUTE ON FUNCTION extract_sentiment_topics TO authenticated;
GRANT EXECUTE ON FUNCTION get_aspect_score TO authenticated;
GRANT SELECT ON v_dashboard_stats TO authenticated;

-- 7. Update All Location Stats
UPDATE public.gmb_locations
SET 
  calculated_response_rate = calculate_location_response_rate(id),
  health_score = calculate_location_health_score(id)
WHERE is_active = true;

-- Final Message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ====================================';
  RAISE NOTICE '✅ ALL FUNCTIONS CREATED SUCCESSFULLY!';
  RAISE NOTICE '✅ ====================================';
  RAISE NOTICE '';
END $$;
