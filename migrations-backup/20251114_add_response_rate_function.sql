-- Migration: Add consistent response rate calculation
-- Created: 2025-11-14
-- Description: Creates functions for consistent response rate calculation across the application

-- Function to calculate response rate for a single location
CREATE OR REPLACE FUNCTION calculate_location_response_rate(location_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_reviews INTEGER;
  replied_reviews INTEGER;
  response_rate NUMERIC(5,2);
BEGIN
  -- Count total reviews for the location
  SELECT COUNT(*) INTO total_reviews
  FROM public.gmb_reviews
  WHERE location_id = calculate_location_response_rate.location_id;
  
  -- If no reviews, return 0
  IF total_reviews = 0 THEN
    RETURN 0;
  END IF;
  
  -- Count replied reviews
  SELECT COUNT(*) INTO replied_reviews
  FROM public.gmb_reviews
  WHERE location_id = calculate_location_response_rate.location_id
    AND has_reply = true;
  
  -- Calculate percentage
  response_rate := (replied_reviews::NUMERIC / total_reviews::NUMERIC) * 100;
  
  RETURN ROUND(response_rate, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate weighted average response rate for multiple locations
CREATE OR REPLACE FUNCTION calculate_weighted_response_rate(location_ids UUID[])
RETURNS NUMERIC AS $$
DECLARE
  total_reviews INTEGER;
  total_replied INTEGER;
  response_rate NUMERIC(5,2);
BEGIN
  -- Count total reviews across all locations
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE has_reply = true)
  INTO total_reviews, total_replied
  FROM public.gmb_reviews
  WHERE location_id = ANY(location_ids);
  
  -- If no reviews, return 0
  IF total_reviews = 0 THEN
    RETURN 0;
  END IF;
  
  -- Calculate weighted percentage
  response_rate := (total_replied::NUMERIC / total_reviews::NUMERIC) * 100;
  
  RETURN ROUND(response_rate, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate user's overall response rate
CREATE OR REPLACE FUNCTION calculate_user_response_rate(user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  location_ids UUID[];
BEGIN
  -- Get all active location IDs for the user
  SELECT ARRAY_AGG(id) INTO location_ids
  FROM public.gmb_locations
  WHERE user_id = calculate_user_response_rate.user_id
    AND is_active = true;
  
  -- Return 0 if no locations
  IF location_ids IS NULL OR array_length(location_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate weighted response rate
  RETURN calculate_weighted_response_rate(location_ids);
END;
$$ LANGUAGE plpgsql STABLE;

-- Update gmb_locations table to store calculated response rate
ALTER TABLE public.gmb_locations 
  ADD COLUMN IF NOT EXISTS calculated_response_rate NUMERIC(5,2) DEFAULT 0;

-- Function to update location response rates
CREATE OR REPLACE FUNCTION update_location_response_rates()
RETURNS void AS $$
BEGIN
  UPDATE public.gmb_locations
  SET 
    calculated_response_rate = calculate_location_response_rate(id),
    response_rate = calculate_location_response_rate(id), -- Update existing column too
    updated_at = NOW()
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update response rate when reviews change
CREATE OR REPLACE FUNCTION trigger_update_location_response_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Update response rate for affected location
  IF TG_OP = 'DELETE' THEN
    UPDATE public.gmb_locations
    SET 
      calculated_response_rate = calculate_location_response_rate(OLD.location_id),
      response_rate = calculate_location_response_rate(OLD.location_id),
      updated_at = NOW()
    WHERE id = OLD.location_id;
  ELSE
    UPDATE public.gmb_locations
    SET 
      calculated_response_rate = calculate_location_response_rate(NEW.location_id),
      response_rate = calculate_location_response_rate(NEW.location_id),
      updated_at = NOW()
    WHERE id = NEW.location_id;
  END IF;
  
  RETURN NULL; -- For AFTER triggers
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_response_rate_on_review_change ON public.gmb_reviews;
CREATE TRIGGER trigger_update_response_rate_on_review_change
  AFTER INSERT OR UPDATE OF has_reply OR DELETE ON public.gmb_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_location_response_rate();

-- Create view for dashboard statistics with consistent calculation
CREATE OR REPLACE VIEW v_dashboard_stats AS
WITH location_stats AS (
  SELECT 
    l.user_id,
    COUNT(DISTINCT l.id) as total_locations,
    AVG(l.rating) FILTER (WHERE l.rating IS NOT NULL) as avg_rating,
    SUM(l.review_count) as total_reviews,
    AVG(l.calculated_response_rate) as avg_response_rate
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

-- Create indexes for the view
CREATE INDEX IF NOT EXISTS idx_gmb_locations_user_response_rate 
  ON public.gmb_locations(user_id, calculated_response_rate)
  WHERE is_active = true;

-- Initial population of response rates
SELECT update_location_response_rates();

-- Add comments
COMMENT ON FUNCTION calculate_location_response_rate IS 'Calculates the response rate percentage for a single location';
COMMENT ON FUNCTION calculate_weighted_response_rate IS 'Calculates weighted average response rate across multiple locations';
COMMENT ON FUNCTION calculate_user_response_rate IS 'Calculates overall response rate for all active locations of a user';
COMMENT ON COLUMN public.gmb_locations.calculated_response_rate IS 'Pre-calculated response rate percentage (auto-maintained)';
COMMENT ON VIEW v_dashboard_stats IS 'Unified dashboard statistics with consistent calculations';
