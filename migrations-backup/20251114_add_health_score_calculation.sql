-- Migration: Add health score calculation
-- Created: 2025-11-14
-- Description: Implements consistent health score calculation for locations

-- Function to calculate health score for a location
CREATE OR REPLACE FUNCTION calculate_location_health_score(location_id UUID)
RETURNS INTEGER AS $$
DECLARE
  loc RECORD;
  score INTEGER := 0;
  max_score INTEGER := 100;
  
  -- Score components
  profile_score INTEGER := 0;
  rating_score INTEGER := 0;
  review_score INTEGER := 0;
  response_score INTEGER := 0;
  activity_score INTEGER := 0;
  
  -- Metrics
  days_since_update INTEGER;
  recent_reviews INTEGER;
  recent_responses INTEGER;
BEGIN
  -- Get location data
  SELECT 
    l.*,
    COUNT(DISTINCT r.id) as total_reviews,
    COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = true) as replied_reviews,
    COUNT(DISTINCT r.id) FILTER (WHERE r.created_at > NOW() - INTERVAL '30 days') as recent_review_count,
    COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = true AND r.replied_at > NOW() - INTERVAL '30 days') as recent_reply_count,
    COUNT(DISTINCT q.id) FILTER (WHERE q.answer_status = 'answered') as answered_questions,
    COUNT(DISTINCT q.id) as total_questions
  INTO loc
  FROM public.gmb_locations l
  LEFT JOIN public.gmb_reviews r ON l.id = r.location_id
  LEFT JOIN public.gmb_questions q ON l.id = q.location_id
  WHERE l.id = calculate_location_health_score.location_id
  GROUP BY l.id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- 1. Profile Completeness Score (25 points)
  -- Basic info
  IF loc.location_name IS NOT NULL AND loc.location_name != '' THEN
    profile_score := profile_score + 3;
  END IF;
  
  IF loc.address IS NOT NULL AND loc.address != '' THEN
    profile_score := profile_score + 3;
  END IF;
  
  IF loc.phone IS NOT NULL AND loc.phone != '' THEN
    profile_score := profile_score + 3;
  END IF;
  
  IF loc.website IS NOT NULL AND loc.website != '' THEN
    profile_score := profile_score + 3;
  END IF;
  
  IF loc.category IS NOT NULL AND loc.category != '' THEN
    profile_score := profile_score + 3;
  END IF;
  
  -- Business hours
  IF loc.business_hours IS NOT NULL THEN
    profile_score := profile_score + 5;
  END IF;
  
  -- Description/metadata
  IF loc.metadata IS NOT NULL AND jsonb_typeof(loc.metadata) = 'object' THEN
    IF loc.metadata->>'description' IS NOT NULL THEN
      profile_score := profile_score + 5;
    END IF;
  END IF;
  
  score := score + LEAST(profile_score, 25);
  
  -- 2. Rating Score (20 points)
  IF loc.rating IS NOT NULL THEN
    -- 5 stars = 20 points, 4 stars = 16 points, etc.
    rating_score := ROUND((loc.rating / 5.0) * 20);
  END IF;
  
  score := score + rating_score;
  
  -- 3. Review Management Score (25 points)
  IF loc.total_reviews > 0 THEN
    -- Response rate (15 points max)
    IF loc.calculated_response_rate IS NOT NULL THEN
      response_score := ROUND((loc.calculated_response_rate / 100.0) * 15);
    ELSE
      response_score := ROUND((loc.replied_reviews::NUMERIC / loc.total_reviews::NUMERIC) * 15);
    END IF;
    
    -- Review volume (5 points)
    IF loc.total_reviews >= 50 THEN
      review_score := review_score + 5;
    ELSIF loc.total_reviews >= 20 THEN
      review_score := review_score + 3;
    ELSIF loc.total_reviews >= 5 THEN
      review_score := review_score + 1;
    END IF;
    
    -- Recent activity (5 points)
    IF loc.recent_review_count > 0 THEN
      review_score := review_score + 2;
    END IF;
    
    IF loc.recent_reply_count > 0 THEN
      review_score := review_score + 3;
    END IF;
  END IF;
  
  score := score + response_score + LEAST(review_score, 10);
  
  -- 4. Q&A Score (15 points)
  IF loc.total_questions > 0 AND loc.answered_questions > 0 THEN
    activity_score := activity_score + ROUND((loc.answered_questions::NUMERIC / loc.total_questions::NUMERIC) * 15);
  ELSIF loc.total_questions = 0 THEN
    -- No questions is not a penalty
    activity_score := activity_score + 10;
  END IF;
  
  score := score + LEAST(activity_score, 15);
  
  -- 5. Freshness Score (15 points)
  days_since_update := EXTRACT(DAY FROM NOW() - loc.updated_at);
  
  IF days_since_update <= 7 THEN
    score := score + 15;
  ELSIF days_since_update <= 30 THEN
    score := score + 10;
  ELSIF days_since_update <= 90 THEN
    score := score + 5;
  END IF;
  
  -- Ensure score is between 0 and 100
  RETURN GREATEST(0, LEAST(score, 100));
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update all health scores for a user
CREATE OR REPLACE FUNCTION update_user_health_scores(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.gmb_locations
  SET 
    health_score = calculate_location_health_score(id),
    updated_at = NOW()
  WHERE user_id = update_user_health_scores.user_id
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update health score on relevant changes
CREATE OR REPLACE FUNCTION trigger_update_health_score()
RETURNS TRIGGER AS $$
BEGIN
  -- For location updates
  IF TG_TABLE_NAME = 'gmb_locations' THEN
    NEW.health_score := calculate_location_health_score(NEW.id);
    RETURN NEW;
  END IF;
  
  -- For review/question changes, update the related location
  IF TG_TABLE_NAME IN ('gmb_reviews', 'gmb_questions') THEN
    UPDATE public.gmb_locations
    SET 
      health_score = calculate_location_health_score(id),
      updated_at = NOW()
    WHERE id = COALESCE(NEW.location_id, OLD.location_id);
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_health_score_on_location ON public.gmb_locations;
CREATE TRIGGER trigger_update_health_score_on_location
  BEFORE INSERT OR UPDATE ON public.gmb_locations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_health_score();

DROP TRIGGER IF EXISTS trigger_update_health_score_on_review ON public.gmb_reviews;
CREATE TRIGGER trigger_update_health_score_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.gmb_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_health_score();

DROP TRIGGER IF EXISTS trigger_update_health_score_on_question ON public.gmb_questions;
CREATE TRIGGER trigger_update_health_score_on_question
  AFTER INSERT OR UPDATE OR DELETE ON public.gmb_questions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_health_score();

-- Create health score ranges view
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
WHERE is_active = true
GROUP BY user_id;

-- Initial calculation of all health scores
UPDATE public.gmb_locations
SET health_score = calculate_location_health_score(id)
WHERE is_active = true;

-- Create index for health score queries
CREATE INDEX IF NOT EXISTS idx_gmb_locations_health_score_range
  ON public.gmb_locations(health_score)
  WHERE is_active = true;

-- Comments
COMMENT ON FUNCTION calculate_location_health_score IS 'Calculates health score (0-100) based on profile completeness, ratings, review management, Q&A, and freshness';
COMMENT ON COLUMN public.gmb_locations.health_score IS 'Overall health score (0-100) indicating how well the location is managed';
COMMENT ON VIEW v_health_score_distribution IS 'Distribution of health scores across locations for each user';
