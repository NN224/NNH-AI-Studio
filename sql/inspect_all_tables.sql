-- ========================================
-- SUPABASE DATABASE INSPECTION QUERY
-- Run this in Supabase SQL Editor to see all table structures
-- ========================================

-- 1. List all tables in public schema
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check gmb_accounts table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'gmb_accounts'
ORDER BY ordinal_position;

-- 3. Check oauth_tokens table structure (if exists)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'oauth_tokens'
ORDER BY ordinal_position;

-- 4. Check gmb_locations table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'gmb_locations'
ORDER BY ordinal_position;

-- 5. Check gmb_reviews table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'gmb_reviews'
ORDER BY ordinal_position;

-- 6. Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 7. Show all foreign keys for gmb_accounts
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='gmb_accounts';

-- 8. Check indexes on gmb_accounts
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'gmb_accounts';

-- 9. Count records in each table
SELECT 
  'gmb_accounts' as table_name,
  COUNT(*) as record_count
FROM gmb_accounts
UNION ALL
SELECT 
  'gmb_locations',
  COUNT(*)
FROM gmb_locations
UNION ALL
SELECT 
  'gmb_reviews',
  COUNT(*)
FROM gmb_reviews
UNION ALL
SELECT 
  'oauth_tokens',
  COUNT(*)
FROM oauth_tokens
UNION ALL
SELECT 
  'oauth_states',
  COUNT(*)
FROM oauth_states
UNION ALL
SELECT 
  'profiles',
  COUNT(*)
FROM profiles;
