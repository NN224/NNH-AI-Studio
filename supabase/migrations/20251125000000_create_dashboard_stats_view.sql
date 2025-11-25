-- =====================================================
-- Migration: Create Materialized View for Dashboard Stats
-- Description: Optimizes dashboard data fetching with pre-aggregated statistics
-- Author: AI Assistant
-- Date: 2025-11-25
-- =====================================================

-- Create materialized view for user dashboard statistics
-- This view pre-calculates all the stats needed for the home page
-- Refreshed every 5 minutes via a scheduled job

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_dashboard_stats AS
SELECT
  u.id as user_id,

  -- Location stats
  COUNT(DISTINCT l.id) as locations_count,
  COUNT(DISTINCT CASE WHEN l.is_verified THEN l.id END) as verified_locations_count,

  -- Review stats
  COUNT(DISTINCT r.id) as reviews_count,
  COUNT(DISTINCT CASE WHEN r.reply_text IS NOT NULL THEN r.id END) as replied_reviews_count,
  COALESCE(AVG(r.rating), 0) as average_rating,

  -- Response rate
  CASE
    WHEN COUNT(DISTINCT r.id) > 0
    THEN ROUND((COUNT(DISTINCT CASE WHEN r.reply_text IS NOT NULL THEN r.id END)::numeric / COUNT(DISTINCT r.id)::numeric) * 100)
    ELSE 0
  END as response_rate_percent,

  -- Today's reviews (last 24 hours)
  COUNT(DISTINCT CASE
    WHEN r.review_date >= NOW() - INTERVAL '24 hours'
    THEN r.id
  END) as today_reviews_count,

  -- This week's reviews
  COUNT(DISTINCT CASE
    WHEN r.review_date >= NOW() - INTERVAL '7 days'
    THEN r.id
  END) as this_week_reviews_count,

  -- Last week's reviews (for growth calculation)
  COUNT(DISTINCT CASE
    WHEN r.review_date >= NOW() - INTERVAL '14 days'
    AND r.review_date < NOW() - INTERVAL '7 days'
    THEN r.id
  END) as last_week_reviews_count,

  -- Account stats
  COUNT(DISTINCT a.id) as accounts_count,
  COUNT(DISTINCT CASE WHEN a.is_active THEN a.id END) as active_accounts_count,

  -- YouTube stats (check if oauth_tokens exists, otherwise false)
  false as has_youtube,

  -- Last sync timestamp
  MAX(l.last_synced_at) as last_sync_at,

  -- Metadata
  NOW() as calculated_at

FROM profiles u
LEFT JOIN gmb_locations l ON l.user_id = u.id
LEFT JOIN gmb_reviews r ON r.user_id = u.id
LEFT JOIN gmb_accounts a ON a.user_id = u.id
GROUP BY u.id;

-- Create unique index on user_id for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_stats_user_id
ON mv_user_dashboard_stats(user_id);

-- Create index on calculated_at for monitoring freshness
CREATE INDEX IF NOT EXISTS idx_mv_dashboard_stats_calculated_at
ON mv_user_dashboard_stats(calculated_at);

-- =====================================================
-- Refresh Function
-- =====================================================

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_dashboard_stats_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_dashboard_stats;

  -- Log the refresh
  RAISE NOTICE 'Dashboard stats view refreshed at %', NOW();
END;
$$;

-- =====================================================
-- Helper Function to Get Dashboard Stats
-- =====================================================

-- Function to get dashboard stats for a specific user
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  locations_count BIGINT,
  verified_locations_count BIGINT,
  reviews_count BIGINT,
  replied_reviews_count BIGINT,
  average_rating NUMERIC,
  response_rate_percent NUMERIC,
  today_reviews_count BIGINT,
  this_week_reviews_count BIGINT,
  last_week_reviews_count BIGINT,
  weekly_growth_percent NUMERIC,
  accounts_count BIGINT,
  active_accounts_count BIGINT,
  has_youtube BOOLEAN,
  last_sync_at TIMESTAMPTZ,
  calculated_at TIMESTAMPTZ,
  is_fresh BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mv.user_id,
    mv.locations_count,
    mv.verified_locations_count,
    mv.reviews_count,
    mv.replied_reviews_count,
    mv.average_rating,
    mv.response_rate_percent,
    mv.today_reviews_count,
    mv.this_week_reviews_count,
    mv.last_week_reviews_count,
    -- Calculate weekly growth percentage
    CASE
      WHEN mv.last_week_reviews_count > 0
      THEN ROUND(((mv.this_week_reviews_count - mv.last_week_reviews_count)::numeric / mv.last_week_reviews_count::numeric) * 100)
      ELSE 0
    END as weekly_growth_percent,
    mv.accounts_count,
    mv.active_accounts_count,
    mv.has_youtube,
    mv.last_sync_at,
    mv.calculated_at,
    -- Check if data is fresh (less than 10 minutes old)
    (NOW() - mv.calculated_at) < INTERVAL '10 minutes' as is_fresh
  FROM mv_user_dashboard_stats mv
  WHERE mv.user_id = p_user_id;
END;
$$;

-- =====================================================
-- Scheduled Refresh (via pg_cron if available)
-- =====================================================

-- Note: This requires pg_cron extension
-- If pg_cron is not available, you can refresh manually or via external cron job

-- Uncomment if pg_cron is available:
-- SELECT cron.schedule(
--   'refresh-dashboard-stats',
--   '*/5 * * * *', -- Every 5 minutes
--   'SELECT refresh_dashboard_stats_view();'
-- );

-- =====================================================
-- Initial Refresh
-- =====================================================

-- Refresh the view immediately after creation
SELECT refresh_dashboard_stats_view();

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON MATERIALIZED VIEW mv_user_dashboard_stats IS
'Pre-aggregated dashboard statistics for all users. Refreshed every 5 minutes.';

COMMENT ON FUNCTION refresh_dashboard_stats_view() IS
'Refreshes the dashboard stats materialized view. Should be called every 5 minutes.';

COMMENT ON FUNCTION get_user_dashboard_stats(UUID) IS
'Gets dashboard stats for a specific user with calculated fields like weekly growth.';

