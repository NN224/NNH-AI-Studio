-- =============================================================================
-- Verification Script for New Tables
-- =============================================================================
-- Purpose: Verify that performance_metrics and rate_limit_requests exist
-- Usage: Run this in Supabase SQL Editor after applying migrations
-- =============================================================================

-- Header
SELECT '========================================' as "Script";
SELECT 'Database Verification' as "Purpose";
SELECT CURRENT_TIMESTAMP as "Run At";
SELECT '========================================' as "";

-- =============================================================================
-- 1. Check if tables exist
-- =============================================================================

SELECT '1️⃣ TABLE EXISTENCE CHECK' as "Step";

SELECT
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'performance_metrics'
    ) THEN '✅ performance_metrics EXISTS'
    ELSE '❌ performance_metrics MISSING'
  END as "Performance Metrics";

SELECT
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'rate_limit_requests'
    ) THEN '✅ rate_limit_requests EXISTS'
    ELSE '❌ rate_limit_requests MISSING'
  END as "Rate Limit Requests";

-- =============================================================================
-- 2. Check columns
-- =============================================================================

SELECT '2️⃣ COLUMN COUNT CHECK' as "Step";

SELECT
  table_name,
  COUNT(*) as column_count,
  CASE
    WHEN table_name = 'performance_metrics' AND COUNT(*) = 7 THEN '✅'
    WHEN table_name = 'rate_limit_requests' AND COUNT(*) = 6 THEN '✅'
    ELSE '❌'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('performance_metrics', 'rate_limit_requests')
GROUP BY table_name
ORDER BY table_name;

-- =============================================================================
-- 3. Check indexes
-- =============================================================================

SELECT '3️⃣ INDEX CHECK' as "Step";

SELECT
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('performance_metrics', 'rate_limit_requests')
GROUP BY tablename
ORDER BY tablename;

-- Expected:
-- performance_metrics: 4 indexes
-- rate_limit_requests: 4 indexes

-- =============================================================================
-- 4. Check RLS policies
-- =============================================================================

SELECT '4️⃣ RLS POLICY CHECK' as "Step";

SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('performance_metrics', 'rate_limit_requests')
GROUP BY tablename
ORDER BY tablename;

-- Expected:
-- performance_metrics: 2 policies

-- =============================================================================
-- 5. List all columns with types
-- =============================================================================

SELECT '5️⃣ COLUMN DETAILS' as "Step";

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('performance_metrics', 'rate_limit_requests')
ORDER BY table_name, ordinal_position;

-- =============================================================================
-- 6. Test insert (optional - will fail if no user logged in)
-- =============================================================================

SELECT '6️⃣ INSERT TEST (Optional)' as "Step";

-- Uncomment to test:
-- INSERT INTO performance_metrics (user_id, name, value, unit)
-- VALUES (auth.uid(), 'test_metric', 100, 'ms');

-- INSERT INTO rate_limit_requests (user_id, action, endpoint)
-- VALUES (auth.uid()::text, 'test_action', '/api/test');

-- =============================================================================
-- 7. Summary
-- =============================================================================

SELECT '7️⃣ SUMMARY' as "Step";

SELECT
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public') as total_tables,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public') as total_columns,
  (SELECT COUNT(*) FROM pg_indexes
   WHERE schemaname = 'public') as total_indexes,
  (SELECT COUNT(*) FROM pg_policies) as total_policies;

-- =============================================================================
-- 8. Final check
-- =============================================================================

SELECT '8️⃣ FINAL CHECK' as "Step";

SELECT
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('performance_metrics', 'rate_limit_requests')
    ) = 2
    THEN '🎉 SUCCESS! Both tables exist and are ready to use'
    ELSE '❌ FAILED! One or more tables are missing'
  END as result;

-- =============================================================================
-- End of verification script
-- =============================================================================

SELECT '========================================' as "End";
SELECT 'Verification Complete' as "Status";
SELECT CURRENT_TIMESTAMP as "Finished At";
SELECT '========================================' as "";
