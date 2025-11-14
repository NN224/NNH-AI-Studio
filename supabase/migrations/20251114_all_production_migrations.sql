-- =====================================================
-- PRODUCTION READINESS MIGRATIONS - ALL IN ONE
-- Created: 2025-11-14
-- Description: جميع ترحيلات الاستعداد للإنتاج في ملف واحد
-- =====================================================

-- =====================================================
-- 1. ERROR LOGS TABLE (Already executed - skip if exists)
-- =====================================================
-- Skip - Already executed

-- =====================================================
-- 2. PERFORMANCE INDEXES (Fixed version)
-- =====================================================

-- GMB LOCATIONS INDEXES
-- Index for foreign key relationship (missing in audit)
CREATE INDEX IF NOT EXISTS idx_gmb_locations_gmb_account_id 
  ON public.gmb_locations(gmb_account_id);

-- Index for user queries (critical for performance)
CREATE INDEX IF NOT EXISTS idx_gmb_locations_user_id 
  ON public.gmb_locations(user_id);

-- Composite index for common query pattern (user + active status)
CREATE INDEX IF NOT EXISTS idx_gmb_locations_user_active 
  ON public.gmb_locations(user_id, is_active) 
  WHERE is_active = true;

-- Text search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_gmb_locations_name_trgm 
  ON public.gmb_locations USING gin(location_name gin_trgm_ops);

-- Index for address searches
CREATE INDEX IF NOT EXISTS idx_gmb_locations_address_trgm 
  ON public.gmb_locations USING gin(address gin_trgm_ops);

-- Index for rating queries
CREATE INDEX IF NOT EXISTS idx_gmb_locations_rating 
  ON public.gmb_locations(rating) 
  WHERE rating IS NOT NULL;

-- Index for health score queries
CREATE INDEX IF NOT EXISTS idx_gmb_locations_health_score 
  ON public.gmb_locations(health_score) 
  WHERE health_score IS NOT NULL;

-- Index for sync status
CREATE INDEX IF NOT EXISTS idx_gmb_locations_is_syncing 
  ON public.gmb_locations(is_syncing) 
  WHERE is_syncing = true;

-- Index for location status
CREATE INDEX IF NOT EXISTS idx_gmb_locations_status 
  ON public.gmb_locations(status);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_gmb_locations_category 
  ON public.gmb_locations(category) 
  WHERE category IS NOT NULL;

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_gmb_locations_dashboard 
  ON public.gmb_locations(user_id, is_active, updated_at DESC);

-- GMB REVIEWS INDEXES
-- Index for location-based queries (fix N+1)
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_location_id 
  ON public.gmb_reviews(location_id);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_user_id 
  ON public.gmb_reviews(user_id);

-- Index for review date ordering
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_review_date 
  ON public.gmb_reviews(review_date DESC);

-- Index for pending reviews (has_reply)
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_pending 
  ON public.gmb_reviews(has_reply, review_date DESC) 
  WHERE has_reply = false OR has_reply IS NULL;

-- Index for sentiment analysis
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_sentiment 
  ON public.gmb_reviews(ai_sentiment) 
  WHERE ai_sentiment IS NOT NULL;

-- Index for rating filtering
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_rating 
  ON public.gmb_reviews(rating);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_location_date 
  ON public.gmb_reviews(location_id, review_date DESC);

-- Text search index for review content
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_text_search 
  ON public.gmb_reviews USING gin(
    to_tsvector('english', coalesce(review_text, '') || ' ' || coalesce(comment, ''))
  );

-- GMB QUESTIONS INDEXES
-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_gmb_questions_location_id 
  ON public.gmb_questions(location_id);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_gmb_questions_user_id 
  ON public.gmb_questions(user_id);

-- Index for answer status
CREATE INDEX IF NOT EXISTS idx_gmb_questions_answer_status 
  ON public.gmb_questions(answer_status);

-- Index for unanswered questions
CREATE INDEX IF NOT EXISTS idx_gmb_questions_unanswered 
  ON public.gmb_questions(answer_status, created_at DESC) 
  WHERE answer_status IN ('unanswered', 'pending');

-- Index for priority questions
CREATE INDEX IF NOT EXISTS idx_gmb_questions_priority 
  ON public.gmb_questions(priority, created_at DESC) 
  WHERE priority IN ('high', 'urgent');

-- Text search index for questions
CREATE INDEX IF NOT EXISTS idx_gmb_questions_text_search 
  ON public.gmb_questions USING gin(
    to_tsvector('english', question_text)
  );

-- GMB ACCOUNTS INDEXES
-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_user_id 
  ON public.gmb_accounts(user_id);

-- Index for active accounts
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_active 
  ON public.gmb_accounts(user_id, is_active) 
  WHERE is_active = true;

-- GMB POSTS INDEXES
-- Index for location queries
CREATE INDEX IF NOT EXISTS idx_gmb_posts_location_id 
  ON public.gmb_posts(location_id);

-- Index for user queries  
CREATE INDEX IF NOT EXISTS idx_gmb_posts_user_id 
  ON public.gmb_posts(user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_gmb_posts_status 
  ON public.gmb_posts(status);

-- Index for scheduled posts (FIXED)
CREATE INDEX IF NOT EXISTS idx_gmb_posts_scheduled 
  ON public.gmb_posts(scheduled_at, status) 
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- GMB ATTRIBUTES INDEXES (FIXED)
-- Index for location queries
CREATE INDEX IF NOT EXISTS idx_gmb_attributes_location_id 
  ON public.gmb_attributes(location_id);

-- Index for attribute names
CREATE INDEX IF NOT EXISTS idx_gmb_attributes_name 
  ON public.gmb_attributes(attribute_name);

-- Composite index for lookups
CREATE INDEX IF NOT EXISTS idx_gmb_attributes_location_name 
  ON public.gmb_attributes(location_id, attribute_name);

-- GMB MEDIA INDEXES
-- Index for location queries
CREATE INDEX IF NOT EXISTS idx_gmb_media_location_id 
  ON public.gmb_media(location_id);

-- Index for media type filtering (FIXED: use 'type' column)
CREATE INDEX IF NOT EXISTS idx_gmb_media_type 
  ON public.gmb_media(type);

-- Note: 'category' column doesn't exist in gmb_media table
-- Skipping category index

-- CLIENT PROFILES INDEXES
CREATE INDEX IF NOT EXISTS idx_client_profiles_user_id 
  ON public.client_profiles(user_id);

-- Ensure error_logs indexes exist
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp 
  ON public.error_logs(timestamp DESC);
  
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id 
  ON public.error_logs(user_id);
  
CREATE INDEX IF NOT EXISTS idx_error_logs_level 
  ON public.error_logs(level);

-- Update statistics for query optimizer
ANALYZE public.gmb_locations;
ANALYZE public.gmb_reviews;
ANALYZE public.gmb_questions;
ANALYZE public.gmb_accounts;
ANALYZE public.gmb_posts;
ANALYZE public.gmb_attributes;
ANALYZE public.gmb_media;
ANALYZE public.client_profiles;
ANALYZE public.error_logs;

-- Create materialized view for location stats
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_location_stats AS
SELECT 
  l.id,
  l.user_id,
  l.location_name,
  l.rating,
  l.review_count,
  l.health_score,
  l.response_rate,
  COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = false) as pending_reviews,
  COUNT(DISTINCT q.id) FILTER (WHERE q.answer_status IN ('unanswered', 'pending')) as pending_questions,
  MAX(GREATEST(l.updated_at, r.updated_at, q.created_at)) as last_activity
FROM gmb_locations l
LEFT JOIN gmb_reviews r ON l.id = r.location_id
LEFT JOIN gmb_questions q ON l.id = q.location_id
WHERE l.is_active = true
GROUP BY l.id;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_location_stats_user 
  ON mv_location_stats(user_id);
  
CREATE INDEX IF NOT EXISTS idx_mv_location_stats_id 
  ON mv_location_stats(id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_location_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_location_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. NORMALIZE REVIEW FIELDS (Safe version)
-- =====================================================

-- First, check and add columns if they don't exist
ALTER TABLE public.gmb_reviews 
  ADD COLUMN IF NOT EXISTS review_text TEXT,
  ADD COLUMN IF NOT EXISTS reply_text TEXT,
  ADD COLUMN IF NOT EXISTS has_reply BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- Analyze current state (safe version that doesn't fail if columns don't exist)
DO $$
DECLARE
  v_columns TEXT[];
  v_count INTEGER;
BEGIN
  -- Get list of existing columns
  SELECT array_agg(column_name) INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'gmb_reviews';
  
  RAISE NOTICE 'Existing columns in gmb_reviews: %', v_columns;
  
  -- Count non-null values in existing columns
  IF 'comment' = ANY(v_columns) THEN
    SELECT COUNT(*) INTO v_count FROM public.gmb_reviews WHERE comment IS NOT NULL;
    RAISE NOTICE 'Records with comment: %', v_count;
  END IF;
  
  IF 'review_reply' = ANY(v_columns) THEN
    SELECT COUNT(*) INTO v_count FROM public.gmb_reviews WHERE review_reply IS NOT NULL;
    RAISE NOTICE 'Records with review_reply: %', v_count;
  END IF;
  
  IF 'response_text' = ANY(v_columns) THEN
    SELECT COUNT(*) INTO v_count FROM public.gmb_reviews WHERE response_text IS NOT NULL;
    RAISE NOTICE 'Records with response_text: %', v_count;
  END IF;
  
  IF 'response' = ANY(v_columns) THEN
    SELECT COUNT(*) INTO v_count FROM public.gmb_reviews WHERE response IS NOT NULL;
    RAISE NOTICE 'Records with response: %', v_count;
  END IF;
END $$;

-- Backup existing data before normalization
CREATE TABLE IF NOT EXISTS public.gmb_reviews_backup_20251114 AS 
SELECT * FROM public.gmb_reviews;

-- Normalize review text fields (safe version)
DO $$
DECLARE
  v_columns TEXT[];
  v_update_sql TEXT;  -- Declare at outer scope to be available in all nested blocks
BEGIN
  -- Get list of existing columns
  SELECT array_agg(column_name) INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'gmb_reviews';
  
  -- Consolidate review content into 'review_text'
  IF 'comment' = ANY(v_columns) THEN
    UPDATE public.gmb_reviews
    SET review_text = COALESCE(review_text, comment)
    WHERE review_text IS NULL AND comment IS NOT NULL;
  END IF;
  
  -- Consolidate reply content into 'reply_text'
  -- Build dynamic query based on existing columns
  DECLARE
    v_coalesce_parts TEXT[] := ARRAY['reply_text'];
  BEGIN
    IF 'review_reply' = ANY(v_columns) THEN
      v_coalesce_parts := array_append(v_coalesce_parts, 'review_reply');
    END IF;
    
    IF 'response_text' = ANY(v_columns) THEN
      v_coalesce_parts := array_append(v_coalesce_parts, 'response_text');
    END IF;
    
    IF 'response' = ANY(v_columns) THEN
      v_coalesce_parts := array_append(v_coalesce_parts, 'response');
    END IF;
    
    -- Only update if we have multiple columns to consolidate
    IF array_length(v_coalesce_parts, 1) > 1 THEN
      v_update_sql := format(
        'UPDATE public.gmb_reviews SET reply_text = COALESCE(%s) WHERE reply_text IS NULL',
        array_to_string(v_coalesce_parts, ', ')
      );
      EXECUTE v_update_sql;
    END IF;
  END;
  
  -- Update has_reply flag
  UPDATE public.gmb_reviews
  SET has_reply = (reply_text IS NOT NULL AND reply_text != '')
  WHERE has_reply IS NULL OR has_reply != (reply_text IS NOT NULL AND reply_text != '');
  
  -- Update replied_at timestamp
  DECLARE
    v_date_parts TEXT[] := ARRAY['replied_at'];
  BEGIN
    IF 'reply_date' = ANY(v_columns) THEN
      v_date_parts := array_append(v_date_parts, 'reply_date');
    END IF;
    
    IF 'responded_at' = ANY(v_columns) THEN
      v_date_parts := array_append(v_date_parts, 'responded_at');
    END IF;
    
    v_date_parts := array_append(v_date_parts, 'CASE WHEN reply_text IS NOT NULL THEN updated_at END');
    
    v_update_sql := format(
      'UPDATE public.gmb_reviews SET replied_at = COALESCE(%s) WHERE replied_at IS NULL AND reply_text IS NOT NULL',
      array_to_string(v_date_parts, ', ')
    );
    EXECUTE v_update_sql;
  END;
END $$;

-- Add constraints to ensure data consistency
ALTER TABLE public.gmb_reviews 
  DROP CONSTRAINT IF EXISTS check_has_reply_consistency;

ALTER TABLE public.gmb_reviews
  ADD CONSTRAINT check_has_reply_consistency 
  CHECK (
    (has_reply = true AND reply_text IS NOT NULL) OR
    (has_reply = false OR has_reply IS NULL)
  );

-- Create or replace trigger to maintain consistency
CREATE OR REPLACE FUNCTION maintain_review_reply_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Update has_reply based on reply_text
  NEW.has_reply := (NEW.reply_text IS NOT NULL AND NEW.reply_text != '');
  
  -- Set replied_at if reply_text is provided and replied_at is null
  IF NEW.reply_text IS NOT NULL AND NEW.replied_at IS NULL THEN
    NEW.replied_at := NOW();
  END IF;
  
  -- Clear replied_at if reply is removed
  IF NEW.reply_text IS NULL OR NEW.reply_text = '' THEN
    NEW.replied_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_maintain_review_reply_consistency ON public.gmb_reviews;
CREATE TRIGGER trigger_maintain_review_reply_consistency
  BEFORE INSERT OR UPDATE ON public.gmb_reviews
  FOR EACH ROW
  EXECUTE FUNCTION maintain_review_reply_consistency();

-- Add comments for clarity
COMMENT ON COLUMN public.gmb_reviews.review_text IS 'The customer review text content';
COMMENT ON COLUMN public.gmb_reviews.reply_text IS 'The business reply to the review';
COMMENT ON COLUMN public.gmb_reviews.has_reply IS 'Whether the review has been replied to (auto-maintained)';
COMMENT ON COLUMN public.gmb_reviews.replied_at IS 'Timestamp when the reply was posted';

-- Create index on the normalized fields if not exists
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_review_text_fts 
  ON public.gmb_reviews USING gin(to_tsvector('english', COALESCE(review_text, '')));

CREATE INDEX IF NOT EXISTS idx_gmb_reviews_reply_status
  ON public.gmb_reviews(has_reply, replied_at DESC)
  WHERE has_reply = true;

-- Update statistics
ANALYZE public.gmb_reviews;

-- =====================================================
-- 4. ADD RESPONSE RATE FUNCTION
-- =====================================================

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

-- =====================================================
-- 5. ADD HEALTH SCORE CALCULATION (Fixed)
-- =====================================================

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
  
  -- Business hours (FIXED - removed regularhours)
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

-- =====================================================
-- 6. ADD DASHBOARD TRENDS FUNCTION
-- =====================================================

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

-- =====================================================
-- 7. ADD ML SENTIMENT FIELDS
-- =====================================================

-- Add columns to gmb_reviews table for ML sentiment analysis
ALTER TABLE public.gmb_reviews 
  ADD COLUMN IF NOT EXISTS ai_sentiment_score NUMERIC(3,2) CHECK (ai_sentiment_score >= 0 AND ai_sentiment_score <= 1),
  ADD COLUMN IF NOT EXISTS ai_sentiment_analysis JSONB;

-- Create index on sentiment score for performance
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_ai_sentiment_score 
  ON public.gmb_reviews(ai_sentiment_score) 
  WHERE ai_sentiment_score IS NOT NULL;

-- Create GIN index on JSONB analysis data for efficient querying
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_ai_analysis 
  ON public.gmb_reviews USING gin(ai_sentiment_analysis);

-- Add composite index for sentiment queries
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_sentiment_composite
  ON public.gmb_reviews(ai_sentiment, ai_sentiment_score)
  WHERE ai_sentiment IS NOT NULL;

-- Function to extract topics from sentiment analysis
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

-- Function to get average aspect score
CREATE OR REPLACE FUNCTION get_aspect_score(analysis JSONB, aspect TEXT)
RETURNS NUMERIC AS $$
BEGIN
  IF analysis IS NULL OR analysis->'aspects' IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN (analysis->'aspects'->>aspect)::NUMERIC;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for sentiment insights
CREATE OR REPLACE VIEW v_sentiment_insights AS
SELECT 
  l.id as location_id,
  l.location_name,
  l.user_id,
  COUNT(r.id) as total_reviews,
  COUNT(r.id) FILTER (WHERE r.ai_sentiment = 'positive') as positive_count,
  COUNT(r.id) FILTER (WHERE r.ai_sentiment = 'negative') as negative_count,
  COUNT(r.id) FILTER (WHERE r.ai_sentiment = 'neutral') as neutral_count,
  COUNT(r.id) FILTER (WHERE r.ai_sentiment = 'mixed') as mixed_count,
  AVG(r.ai_sentiment_score) as avg_sentiment_score,
  
  -- Aspect averages
  AVG(get_aspect_score(r.ai_sentiment_analysis, 'service')) as avg_service_score,
  AVG(get_aspect_score(r.ai_sentiment_analysis, 'quality')) as avg_quality_score,
  AVG(get_aspect_score(r.ai_sentiment_analysis, 'price')) as avg_price_score,
  AVG(get_aspect_score(r.ai_sentiment_analysis, 'cleanliness')) as avg_cleanliness_score,
  AVG(get_aspect_score(r.ai_sentiment_analysis, 'atmosphere')) as avg_atmosphere_score,
  
  -- Most common topics
  array_agg(DISTINCT topic ORDER BY topic) FILTER (WHERE topic IS NOT NULL) as all_topics
FROM public.gmb_locations l
LEFT JOIN public.gmb_reviews r ON l.id = r.location_id
LEFT JOIN LATERAL unnest(extract_sentiment_topics(r.ai_sentiment_analysis)) AS topic ON true
WHERE l.is_active = true
GROUP BY l.id, l.location_name, l.user_id;

-- Create materialized view for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sentiment_summary AS
SELECT 
  user_id,
  COUNT(DISTINCT location_id) as locations_analyzed,
  COUNT(*) as total_reviews_analyzed,
  AVG(ai_sentiment_score) as overall_sentiment_score,
  
  -- Sentiment distribution
  ROUND(COUNT(*) FILTER (WHERE ai_sentiment = 'positive')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as positive_percentage,
  ROUND(COUNT(*) FILTER (WHERE ai_sentiment = 'negative')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as negative_percentage,
  ROUND(COUNT(*) FILTER (WHERE ai_sentiment = 'neutral')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as neutral_percentage,
  
  -- Top emotions
  AVG((ai_sentiment_analysis->'emotions'->>'joy')::NUMERIC) as avg_joy,
  AVG((ai_sentiment_analysis->'emotions'->>'anger')::NUMERIC) as avg_anger,
  AVG((ai_sentiment_analysis->'emotions'->>'sadness')::NUMERIC) as avg_sadness,
  AVG((ai_sentiment_analysis->'emotions'->>'surprise')::NUMERIC) as avg_surprise,
  AVG((ai_sentiment_analysis->'emotions'->>'trust')::NUMERIC) as avg_trust,
  
  -- Top keywords (aggregate as JSONB)
  jsonb_agg(DISTINCT keyword) FILTER (WHERE keyword IS NOT NULL) as top_keywords
  
FROM public.gmb_reviews r
JOIN public.gmb_locations l ON r.location_id = l.id
LEFT JOIN LATERAL jsonb_array_elements_text(r.ai_sentiment_analysis->'keywords') AS keyword ON true
WHERE l.is_active = true 
  AND r.ai_sentiment_analysis IS NOT NULL
GROUP BY user_id;

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_sentiment_user 
  ON mv_sentiment_summary(user_id);

-- Function to refresh sentiment summary
CREATE OR REPLACE FUNCTION refresh_sentiment_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sentiment_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON v_sentiment_insights TO authenticated;
GRANT SELECT ON mv_sentiment_summary TO authenticated;
GRANT EXECUTE ON FUNCTION extract_sentiment_topics TO authenticated;
GRANT EXECUTE ON FUNCTION get_aspect_score TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_sentiment_summary TO authenticated;

-- Comments
COMMENT ON COLUMN public.gmb_reviews.ai_sentiment_score IS 'ML confidence score for sentiment (0-1)';
COMMENT ON COLUMN public.gmb_reviews.ai_sentiment_analysis IS 'Full ML sentiment analysis results including aspects, emotions, topics';
COMMENT ON VIEW v_sentiment_insights IS 'Aggregated sentiment insights per location';
COMMENT ON MATERIALIZED VIEW mv_sentiment_summary IS 'Pre-aggregated sentiment summary for performance';

-- =====================================================
-- 8. CREATE MONITORING TABLES
-- =====================================================

-- MONITORING METRICS TABLE
CREATE TABLE IF NOT EXISTS public.monitoring_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT CHECK (unit IN ('count', 'milliseconds', 'bytes', 'percentage', 'custom')),
  tags JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Indexing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for metrics queries
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name 
  ON public.monitoring_metrics(name);

CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_timestamp 
  ON public.monitoring_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_user 
  ON public.monitoring_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_tags 
  ON public.monitoring_metrics USING gin(tags);

-- Composite index for time-series queries
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name_time 
  ON public.monitoring_metrics(name, timestamp DESC);

-- MONITORING ALERTS TABLE
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('error', 'warning', 'info')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  service TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Acknowledgment fields
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  
  -- Resolution fields
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Indexing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for alerts queries
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity 
  ON public.monitoring_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_acknowledged 
  ON public.monitoring_alerts(acknowledged);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_timestamp 
  ON public.monitoring_alerts(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_user 
  ON public.monitoring_alerts(user_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_service 
  ON public.monitoring_alerts(service) 
  WHERE service IS NOT NULL;

-- Composite index for unacknowledged alerts
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_unack 
  ON public.monitoring_alerts(severity, timestamp DESC) 
  WHERE acknowledged = false;

-- HEALTH CHECK RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.health_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  message TEXT,
  duration INTEGER, -- milliseconds
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for health check queries
CREATE INDEX IF NOT EXISTS idx_health_check_service 
  ON public.health_check_results(service);

CREATE INDEX IF NOT EXISTS idx_health_check_status 
  ON public.health_check_results(status);

CREATE INDEX IF NOT EXISTS idx_health_check_timestamp 
  ON public.health_check_results(timestamp DESC);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.monitoring_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_check_results ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
-- Monitoring metrics policies
CREATE POLICY "Users can insert their own metrics" ON public.monitoring_metrics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own metrics" ON public.monitoring_metrics
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Monitoring alerts policies
CREATE POLICY "Users can view their own alerts" ON public.monitoring_alerts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own alerts" ON public.monitoring_alerts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Health check results are public (no PII)
CREATE POLICY "Anyone can view health checks" ON public.health_check_results
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert health checks" ON public.health_check_results
  FOR INSERT TO service_role
  WITH CHECK (true);

-- FUNCTIONS
-- Function to clean old monitoring data
CREATE OR REPLACE FUNCTION public.clean_old_monitoring_data()
RETURNS void AS $$
BEGIN
  -- Delete metrics older than 30 days
  DELETE FROM public.monitoring_metrics
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  -- Delete resolved alerts older than 90 days
  DELETE FROM public.monitoring_alerts
  WHERE resolved = true 
  AND resolved_at < NOW() - INTERVAL '90 days';
  
  -- Delete health check results older than 7 days
  DELETE FROM public.health_check_results
  WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get metric statistics
CREATE OR REPLACE FUNCTION public.get_metric_stats(
  p_metric_name TEXT,
  p_user_id UUID,
  p_start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  p_end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  sum_value NUMERIC,
  count_value BIGINT,
  p95_value NUMERIC,
  p99_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    SUM(value) as sum_value,
    COUNT(*) as count_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99_value
  FROM public.monitoring_metrics
  WHERE name = p_metric_name
    AND user_id = p_user_id
    AND timestamp >= p_start_time
    AND timestamp <= p_end_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- VIEWS
-- View for alert summary
CREATE OR REPLACE VIEW v_alert_summary AS
SELECT 
  user_id,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'high') as high_count,
  COUNT(*) FILTER (WHERE severity = 'medium') as medium_count,
  COUNT(*) FILTER (WHERE severity = 'low') as low_count,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours') as last_24h,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '7 days') as last_7d
FROM public.monitoring_alerts
WHERE resolved = false
GROUP BY user_id;

-- GRANTS
GRANT ALL ON public.monitoring_metrics TO service_role;
GRANT INSERT, SELECT ON public.monitoring_metrics TO authenticated;

GRANT ALL ON public.monitoring_alerts TO service_role;
GRANT SELECT, UPDATE ON public.monitoring_alerts TO authenticated;

GRANT ALL ON public.health_check_results TO service_role;
GRANT SELECT ON public.health_check_results TO anon, authenticated;

GRANT SELECT ON v_alert_summary TO authenticated;

GRANT EXECUTE ON FUNCTION public.clean_old_monitoring_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_metric_stats TO authenticated;

-- COMMENTS
COMMENT ON TABLE public.monitoring_metrics IS 'Stores application performance and business metrics';
COMMENT ON TABLE public.monitoring_alerts IS 'Stores monitoring alerts and notifications';
COMMENT ON TABLE public.health_check_results IS 'Stores health check results for all services';
COMMENT ON VIEW v_alert_summary IS 'Summary view of active alerts per user';

-- =====================================================
-- FINAL STATISTICS UPDATE
-- =====================================================
ANALYZE;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'جميع الترحيلات تمت بنجاح!';
  RAISE NOTICE '======================================';
  RAISE NOTICE '';
  RAISE NOTICE 'تم تنفيذ:';
  RAISE NOTICE '✅ فهارس الأداء';
  RAISE NOTICE '✅ تطبيع حقول المراجعات';
  RAISE NOTICE '✅ دوال معدل الاستجابة';
  RAISE NOTICE '✅ دوال نقاط الصحة';
  RAISE NOTICE '✅ دوال الاتجاهات';
  RAISE NOTICE '✅ حقول ML للتحليل';
  RAISE NOTICE '✅ جداول المراقبة';
  RAISE NOTICE '';
  RAISE NOTICE 'النظام جاهز للإنتاج! 🚀';
  RAISE NOTICE '======================================';
END $$;
