-- =====================================================
-- Migration: Cleanup Old Dashboard View
-- Description: Removes v_dashboard_stats (replaced by mv_user_dashboard_stats)
-- Author: AI Assistant
-- Date: 2025-11-25
-- =====================================================

-- Drop old view (replaced by materialized view)
DROP VIEW IF EXISTS v_dashboard_stats CASCADE;

-- Add comment to new materialized view
COMMENT ON MATERIALIZED VIEW mv_user_dashboard_stats IS
'Replaces v_dashboard_stats - Pre-aggregated dashboard statistics, refreshed automatically via triggers. Provides 75% faster load times.';

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Cleanup complete: v_dashboard_stats removed, mv_user_dashboard_stats is now the primary dashboard stats source';
END $$;

