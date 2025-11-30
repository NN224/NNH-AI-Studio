-- Migration: Auto-refresh user_home_stats materialized view
-- Purpose: Ensure Home Page stats are always up-to-date after Dashboard changes
-- Created: 2025-01-30
--
-- This migration creates a trigger function that automatically refreshes
-- the user_home_stats materialized view whenever data changes in the
-- gmb_reviews or gmb_locations tables. This ensures data consistency
-- between the Home Page and Dashboard without sacrificing read performance.

-- ============================================================================
-- 1. Create trigger function to refresh materialized view
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_user_home_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Use CONCURRENTLY to avoid locking the view during refresh
  -- This allows reads to continue while the view is being updated
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_home_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Create triggers on gmb_reviews table
-- ============================================================================

-- Trigger for INSERT operations (new reviews)
DROP TRIGGER IF EXISTS trigger_refresh_stats_on_review_insert ON gmb_reviews;
CREATE TRIGGER trigger_refresh_stats_on_review_insert
AFTER INSERT ON gmb_reviews
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_home_stats();

-- Trigger for UPDATE operations (review replies, status changes)
DROP TRIGGER IF EXISTS trigger_refresh_stats_on_review_update ON gmb_reviews;
CREATE TRIGGER trigger_refresh_stats_on_review_update
AFTER UPDATE ON gmb_reviews
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_home_stats();

-- Trigger for DELETE operations (review deletions)
DROP TRIGGER IF EXISTS trigger_refresh_stats_on_review_delete ON gmb_reviews;
CREATE TRIGGER trigger_refresh_stats_on_review_delete
AFTER DELETE ON gmb_reviews
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_home_stats();

-- ============================================================================
-- 3. Create triggers on gmb_locations table
-- ============================================================================

-- Trigger for INSERT operations (new locations)
DROP TRIGGER IF EXISTS trigger_refresh_stats_on_location_insert ON gmb_locations;
CREATE TRIGGER trigger_refresh_stats_on_location_insert
AFTER INSERT ON gmb_locations
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_home_stats();

-- Trigger for UPDATE operations (location changes)
DROP TRIGGER IF EXISTS trigger_refresh_stats_on_location_update ON gmb_locations;
CREATE TRIGGER trigger_refresh_stats_on_location_update
AFTER UPDATE ON gmb_locations
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_home_stats();

-- Trigger for DELETE operations (location deletions)
DROP TRIGGER IF EXISTS trigger_refresh_stats_on_location_delete ON gmb_locations;
CREATE TRIGGER trigger_refresh_stats_on_location_delete
AFTER DELETE ON gmb_locations
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_home_stats();

-- ============================================================================
-- 4. Add comment documentation
-- ============================================================================

COMMENT ON FUNCTION refresh_user_home_stats() IS
'Automatically refreshes the user_home_stats materialized view when data changes in gmb_reviews or gmb_locations tables. Uses CONCURRENTLY to avoid locking.';

-- ============================================================================
-- 5. Verify triggers are created
-- ============================================================================

-- Query to verify triggers (for manual verification)
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE 'trigger_refresh_stats%'
-- ORDER BY event_object_table, event_manipulation;
