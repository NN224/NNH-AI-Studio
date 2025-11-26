-- Migration: Add comprehensive performance indexes
-- Created: 2025-11-14
-- Description: Adds missing indexes to improve query performance and fix N+1 problems

-- =====================================================
-- LOCATIONS TABLE INDEXES
-- =====================================================

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

-- Index for location name searches (using trigram for better performance)
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

-- =====================================================
-- REVIEWS TABLE INDEXES
-- =====================================================

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

-- =====================================================
-- QUESTIONS TABLE INDEXES
-- =====================================================

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

-- =====================================================
-- GMB_ACCOUNTS TABLE INDEXES
-- =====================================================

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_user_id 
  ON public.gmb_accounts(user_id);

-- Index for active accounts
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_active 
  ON public.gmb_accounts(user_id, is_active) 
  WHERE is_active = true;

-- =====================================================
-- POSTS TABLE INDEXES
-- =====================================================

-- Index for location queries
CREATE INDEX IF NOT EXISTS idx_gmb_posts_location_id 
  ON public.gmb_posts(location_id);

-- Index for user queries  
CREATE INDEX IF NOT EXISTS idx_gmb_posts_user_id 
  ON public.gmb_posts(user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_gmb_posts_status 
  ON public.gmb_posts(status);

-- Index for scheduled posts
CREATE INDEX IF NOT EXISTS idx_gmb_posts_scheduled 
  ON public.gmb_posts(scheduled_at, status) 
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- =====================================================
-- ATTRIBUTES TABLE INDEXES
-- =====================================================

-- Index for location queries
CREATE INDEX IF NOT EXISTS idx_gmb_attributes_location_id 
  ON public.gmb_attributes(location_id);

-- Index for attribute names
CREATE INDEX IF NOT EXISTS idx_gmb_attributes_name 
  ON public.gmb_attributes(attribute_name);

-- Composite index for lookups
CREATE INDEX IF NOT EXISTS idx_gmb_attributes_location_name 
  ON public.gmb_attributes(location_id, attribute_name);

-- =====================================================
-- MEDIA TABLE INDEXES
-- =====================================================

-- Index for location queries
CREATE INDEX IF NOT EXISTS idx_gmb_media_location_id 
  ON public.gmb_media(location_id);

-- Index for media type filtering (FIXED: use 'type' column)
CREATE INDEX IF NOT EXISTS idx_gmb_media_type 
  ON public.gmb_media(type);

-- Note: 'category' column doesn't exist in gmb_media table
-- Skipping category index

-- =====================================================
-- CLIENT_PROFILES TABLE INDEXES
-- =====================================================

-- Index for user lookup (should be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_profiles_user_id 
  ON public.client_profiles(user_id);

-- =====================================================
-- ERROR_LOGS TABLE INDEXES (if not already created)
-- =====================================================

-- Ensure error_logs indexes exist
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp 
  ON public.error_logs(timestamp DESC);
  
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id 
  ON public.error_logs(user_id);
  
CREATE INDEX IF NOT EXISTS idx_error_logs_level 
  ON public.error_logs(level);

-- =====================================================
-- ANALYZE TABLES FOR STATISTICS
-- =====================================================

-- Update table statistics for query planner
ANALYZE public.gmb_locations;
ANALYZE public.gmb_reviews;
ANALYZE public.gmb_questions;
ANALYZE public.gmb_accounts;
ANALYZE public.gmb_posts;
ANALYZE public.gmb_attributes;
ANALYZE public.gmb_media;
ANALYZE public.client_profiles;
ANALYZE public.error_logs;

-- =====================================================
-- CREATE MATERIALIZED VIEWS FOR EXPENSIVE AGGREGATIONS
-- =====================================================

-- Materialized view for location stats (updated periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_location_stats AS
SELECT 
  l.id,
  l.user_id,
  l.gmb_account_id,
  COUNT(DISTINCT r.id) as total_reviews,
  AVG(r.rating)::numeric(3,2) as avg_rating,
  COUNT(DISTINCT CASE WHEN r.has_reply = false THEN r.id END) as pending_reviews,
  COUNT(DISTINCT q.id) as total_questions,
  COUNT(DISTINCT CASE WHEN q.answer_status = 'unanswered' THEN q.id END) as unanswered_questions,
  COUNT(DISTINCT p.id) as total_posts,
  MAX(l.updated_at) as last_updated
FROM public.gmb_locations l
LEFT JOIN public.gmb_reviews r ON l.id = r.location_id
LEFT JOIN public.gmb_questions q ON l.id = q.location_id
LEFT JOIN public.gmb_posts p ON l.id = p.location_id
WHERE l.is_active = true
GROUP BY l.id, l.user_id, l.gmb_account_id;

-- Create index on materialized view
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

-- Schedule periodic refresh (requires pg_cron)
-- SELECT cron.schedule('refresh-location-stats', '*/15 * * * *', 'SELECT refresh_location_stats();');

-- =====================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON INDEX idx_gmb_locations_name_trgm IS 'Trigram index for fuzzy text search on location names';
COMMENT ON INDEX idx_gmb_locations_user_active IS 'Composite index for dashboard queries filtering by user and active status';
COMMENT ON INDEX idx_gmb_reviews_pending IS 'Partial index for quickly finding reviews that need responses';
COMMENT ON MATERIALIZED VIEW mv_location_stats IS 'Pre-aggregated location statistics for dashboard performance';
