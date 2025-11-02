-- ============================================
-- GMB Dashboard Database Audit Script
-- ============================================
-- This script performs a comprehensive audit of the GMB database
-- Run this to identify issues, duplicates, and inconsistencies

-- ============================================
-- 1. SCHEMA VERIFICATION
-- ============================================

-- Check if all required tables exist
SELECT 
  'TABLE_CHECK' as check_type,
  table_name,
  CASE 
    WHEN table_name IN (
      'gmb_accounts', 'gmb_locations', 'gmb_reviews', 
      'gmb_posts', 'gmb_media', 'gmb_performance_metrics',
      'gmb_search_keywords', 'profiles', 'activity_logs', 'oauth_states'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'gmb_%' 
  OR table_name IN ('profiles', 'activity_logs', 'oauth_states')
ORDER BY table_name;

-- ============================================
-- 2. DUPLICATE LOCATIONS ANALYSIS
-- ============================================

-- Find locations with duplicate location_id (normalized)
-- This is the main issue we need to identify
SELECT 
  'DUPLICATE_LOCATIONS' as issue_type,
  CASE 
    WHEN location_id LIKE 'locations/%' THEN 
      SUBSTRING(location_id FROM 'locations/([^/]+)$')
    WHEN location_id LIKE 'accounts/%/locations/%' THEN 
      SUBSTRING(location_id FROM 'locations/([^/]+)$')
    ELSE location_id
  END as normalized_location_id,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as location_ids,
  STRING_AGG(location_name, ' | ') as location_names,
  STRING_AGG(gmb_account_id::text, ', ') as account_ids
FROM gmb_locations
GROUP BY 
  CASE 
    WHEN location_id LIKE 'locations/%' THEN 
      SUBSTRING(location_id FROM 'locations/([^/]+)$')
    WHEN location_id LIKE 'accounts/%/locations/%' THEN 
      SUBSTRING(location_id FROM 'locations/([^/]+)$')
    ELSE location_id
  END
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Detailed view of duplicate locations
SELECT 
  'DUPLICATE_LOCATIONS_DETAIL' as issue_type,
  l1.id,
  l1.location_id,
  l1.location_name,
  l1.gmb_account_id,
  l1.user_id,
  l1.created_at,
  l1.updated_at,
  CASE 
    WHEN l1.location_id LIKE 'locations/%' THEN 
      SUBSTRING(l1.location_id FROM 'locations/([^/]+)$')
    WHEN l1.location_id LIKE 'accounts/%/locations/%' THEN 
      SUBSTRING(l1.location_id FROM 'locations/([^/]+)$')
    ELSE l1.location_id
  END as normalized_location_id
FROM gmb_locations l1
WHERE EXISTS (
  SELECT 1 FROM gmb_locations l2
  WHERE l1.id != l2.id
    AND (
      CASE 
        WHEN l1.location_id LIKE 'locations/%' THEN 
          SUBSTRING(l1.location_id FROM 'locations/([^/]+)$')
        WHEN l1.location_id LIKE 'accounts/%/locations/%' THEN 
          SUBSTRING(l1.location_id FROM 'locations/([^/]+)$')
        ELSE l1.location_id
      END = 
      CASE 
        WHEN l2.location_id LIKE 'locations/%' THEN 
          SUBSTRING(l2.location_id FROM 'locations/([^/]+)$')
        WHEN l2.location_id LIKE 'accounts/%/locations/%' THEN 
          SUBSTRING(l2.location_id FROM 'locations/([^/]+)$')
        ELSE l2.location_id
      END
    )
)
ORDER BY normalized_location_id, l1.created_at;

-- ============================================
-- 3. DATA INTEGRITY CHECKS
-- ============================================

-- Check for locations without accounts
SELECT 
  'ORPHANED_LOCATIONS' as issue_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as location_ids
FROM gmb_locations
WHERE gmb_account_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM gmb_accounts 
     WHERE id = gmb_locations.gmb_account_id
   );

-- Check for reviews without locations
SELECT 
  'ORPHANED_REVIEWS' as issue_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as review_ids
FROM gmb_reviews
WHERE location_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM gmb_locations 
     WHERE id = gmb_reviews.location_id
   );

-- Check for posts without locations
SELECT 
  'ORPHANED_POSTS' as issue_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as post_ids
FROM gmb_posts
WHERE location_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM gmb_locations 
     WHERE id = gmb_posts.location_id
   );

-- Check for locations without user_id
SELECT 
  'LOCATIONS_WITHOUT_USER' as issue_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as location_ids
FROM gmb_locations
WHERE user_id IS NULL;

-- Check for reviews without user_id
SELECT 
  'REVIEWS_WITHOUT_USER' as issue_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as review_ids
FROM gmb_reviews
WHERE user_id IS NULL;

-- Check for accounts without user_id
SELECT 
  'ACCOUNTS_WITHOUT_USER' as issue_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as account_ids
FROM gmb_accounts
WHERE user_id IS NULL;

-- ============================================
-- 4. CONSTRAINT ISSUES
-- ============================================

-- Check for missing unique constraints
SELECT 
  'MISSING_CONSTRAINTS' as issue_type,
  'gmb_locations' as table_name,
  'No unique constraint on (gmb_account_id, normalized_location_id)' as issue
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'gmb_locations'
    AND tc.constraint_type = 'UNIQUE'
    AND ccu.column_name IN ('gmb_account_id', 'location_id')
);

-- Check for duplicate external_review_id
SELECT 
  'DUPLICATE_EXTERNAL_REVIEW_IDS' as issue_type,
  external_review_id,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as review_ids
FROM gmb_reviews
WHERE external_review_id IS NOT NULL
GROUP BY external_review_id
HAVING COUNT(*) > 1;

-- Check for duplicate external_media_id
SELECT 
  'DUPLICATE_EXTERNAL_MEDIA_IDS' as issue_type,
  external_media_id,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as media_ids
FROM gmb_media
WHERE external_media_id IS NOT NULL
GROUP BY external_media_id
HAVING COUNT(*) > 1;

-- ============================================
-- 5. INDEX ANALYSIS
-- ============================================

-- Check for missing indexes on foreign keys
SELECT 
  'MISSING_INDEXES' as issue_type,
  'gmb_locations' as table_name,
  'gmb_account_id' as column_name,
  'Foreign key without index' as issue
WHERE NOT EXISTS (
  SELECT 1 FROM pg_indexes 
  WHERE tablename = 'gmb_locations' 
    AND indexdef LIKE '%gmb_account_id%'
);

-- List all indexes
SELECT 
  'INDEX_INFO' as info_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename LIKE 'gmb_%' OR tablename IN ('profiles', 'oauth_states'))
ORDER BY tablename, indexname;

-- ============================================
-- 6. RLS POLICY CHECK
-- ============================================

-- Check RLS status
SELECT 
  'RLS_STATUS' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'gmb_%' OR tablename IN ('profiles', 'oauth_states', 'activity_logs'))
ORDER BY tablename;

-- List all RLS policies
SELECT 
  'RLS_POLICIES' as info_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (tablename LIKE 'gmb_%' OR tablename IN ('profiles', 'oauth_states', 'activity_logs'))
ORDER BY tablename, policyname;

-- ============================================
-- 7. DATA QUALITY CHECKS
-- ============================================

-- Check for null critical fields
SELECT 
  'NULL_CRITICAL_FIELDS' as issue_type,
  'gmb_locations' as table_name,
  COUNT(*) FILTER (WHERE location_id IS NULL) as null_location_id,
  COUNT(*) FILTER (WHERE location_name IS NULL) as null_location_name,
  COUNT(*) FILTER (WHERE gmb_account_id IS NULL) as null_account_id,
  COUNT(*) FILTER (WHERE user_id IS NULL) as null_user_id
FROM gmb_locations;

SELECT 
  'NULL_CRITICAL_FIELDS' as issue_type,
  'gmb_reviews' as table_name,
  COUNT(*) FILTER (WHERE location_id IS NULL) as null_location_id,
  COUNT(*) FILTER (WHERE external_review_id IS NULL) as null_external_review_id,
  COUNT(*) FILTER (WHERE reviewer_name IS NULL) as null_reviewer_name,
  COUNT(*) FILTER (WHERE user_id IS NULL) as null_user_id
FROM gmb_reviews;

SELECT 
  'NULL_CRITICAL_FIELDS' as issue_type,
  'gmb_accounts' as table_name,
  COUNT(*) FILTER (WHERE user_id IS NULL) as null_user_id,
  COUNT(*) FILTER (WHERE account_id IS NULL) as null_account_id,
  COUNT(*) FILTER (WHERE account_name IS NULL) as null_account_name
FROM gmb_accounts;

-- Check for invalid ratings
SELECT 
  'INVALID_RATINGS' as issue_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as review_ids
FROM gmb_reviews
WHERE rating IS NOT NULL 
  AND (rating < 1 OR rating > 5);

-- Check for invalid status values
SELECT 
  'INVALID_STATUS' as issue_type,
  'gmb_reviews' as table_name,
  status,
  COUNT(*) as count
FROM gmb_reviews
WHERE status NOT IN ('new', 'in_progress', 'responded')
GROUP BY status;

-- ============================================
-- 8. PERFORMANCE ISSUES
-- ============================================

-- Check table sizes
SELECT 
  'TABLE_SIZES' as info_type,
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'gmb_%' OR tablename IN ('profiles', 'oauth_states', 'activity_logs'))
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for tables without primary keys (performance issue)
SELECT 
  'MISSING_PRIMARY_KEYS' as issue_type,
  t.table_name
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints tc 
  ON t.table_schema = tc.table_schema 
  AND t.table_name = tc.table_name 
  AND tc.constraint_type = 'PRIMARY KEY'
WHERE t.table_schema = 'public'
  AND (t.table_name LIKE 'gmb_%' OR t.table_name IN ('profiles', 'oauth_states', 'activity_logs'))
  AND tc.constraint_name IS NULL;

-- ============================================
-- 9. REFERENTIAL INTEGRITY
-- ============================================

-- Check foreign key constraints
SELECT 
  'FOREIGN_KEYS' as info_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (tc.table_name LIKE 'gmb_%' OR tc.table_name IN ('profiles', 'oauth_states', 'activity_logs'))
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 10. STATISTICS SUMMARY
-- ============================================

SELECT 
  'STATISTICS' as info_type,
  'gmb_accounts' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_accounts,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_accounts
FROM gmb_accounts;

SELECT 
  'STATISTICS' as info_type,
  'gmb_locations' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT gmb_account_id) as unique_accounts,
  COUNT(*) FILTER (WHERE is_active = true) as active_locations,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_locations,
  COUNT(*) FILTER (WHERE rating > 0) as locations_with_rating
FROM gmb_locations;

SELECT 
  'STATISTICS' as info_type,
  'gmb_reviews' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT location_id) as unique_locations,
  COUNT(*) FILTER (WHERE status = 'new') as new_reviews,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_reviews,
  COUNT(*) FILTER (WHERE status = 'responded') as responded_reviews,
  COUNT(*) FILTER (WHERE rating = 5) as five_star_reviews,
  COUNT(*) FILTER (WHERE rating = 1) as one_star_reviews,
  AVG(rating) as average_rating
FROM gmb_reviews
WHERE rating IS NOT NULL;

SELECT 
  'STATISTICS' as info_type,
  'gmb_posts' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_posts,
  COUNT(*) FILTER (WHERE status = 'published') as published_posts,
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_posts,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_posts
FROM gmb_posts;

-- ============================================
-- END OF AUDIT
-- ============================================
