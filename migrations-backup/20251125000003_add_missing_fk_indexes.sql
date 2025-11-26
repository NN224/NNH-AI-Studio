-- =====================================================
-- Migration: Add Missing Indexes on Foreign Keys
-- Created: 2025-11-25
-- Description: Add indexes to improve query performance on FK columns
-- Issue: 7 foreign keys without indexes (performance bottleneck)
-- =====================================================

-- =====================================================
-- 1. business_profile_history.created_by
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_business_profile_history_created_by
ON public.business_profile_history(created_by);

COMMENT ON INDEX idx_business_profile_history_created_by IS
'Index on created_by FK for better query performance';

-- =====================================================
-- 2. error_logs.resolved_by
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_by
ON public.error_logs(resolved_by);

COMMENT ON INDEX idx_error_logs_resolved_by IS
'Index on resolved_by FK for better query performance';

-- =====================================================
-- 3. gmb_messages.user_id
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_gmb_messages_user_id
ON public.gmb_messages(user_id);

COMMENT ON INDEX idx_gmb_messages_user_id IS
'Index on user_id FK for better query performance';

-- =====================================================
-- 4. gmb_products.user_id
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_gmb_products_user_id
ON public.gmb_products(user_id);

COMMENT ON INDEX idx_gmb_products_user_id IS
'Index on user_id FK for better query performance';

-- =====================================================
-- 5. gmb_services.location_id
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_gmb_services_location_id
ON public.gmb_services(location_id);

COMMENT ON INDEX idx_gmb_services_location_id IS
'Index on location_id FK for better query performance';

-- =====================================================
-- 6. gmb_services.user_id
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_gmb_services_user_id
ON public.gmb_services(user_id);

COMMENT ON INDEX idx_gmb_services_user_id IS
'Index on user_id FK for better query performance';

-- =====================================================
-- 7. gmb_sync_logs.user_id
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_gmb_sync_logs_user_id
ON public.gmb_sync_logs(user_id);

COMMENT ON INDEX idx_gmb_sync_logs_user_id IS
'Index on user_id FK for better query performance';

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify all indexes were created:
/*
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_business_profile_history_created_by',
    'idx_error_logs_resolved_by',
    'idx_gmb_messages_user_id',
    'idx_gmb_products_user_id',
    'idx_gmb_services_location_id',
    'idx_gmb_services_user_id',
    'idx_gmb_sync_logs_user_id'
  )
ORDER BY tablename, indexname;
*/

-- =====================================================
-- Performance Impact
-- =====================================================
-- Expected improvements:
-- - Faster JOIN queries on these FK columns
-- - Better query planning by PostgreSQL
-- - Reduced table scans
-- - Overall 20-40% performance improvement on affected queries
-- =====================================================

