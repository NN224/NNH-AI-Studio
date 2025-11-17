-- ============================================
-- QUICK SCHEMA VERIFICATION SCRIPT
-- Run this to check if your Supabase schema is correct
-- ============================================

-- 1. Check if all required tables exist
SELECT 
  'gmb_accounts' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gmb_accounts'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'gmb_locations' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'gmb_reviews' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gmb_reviews'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'gmb_questions' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gmb_questions'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'gmb_media' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gmb_media'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'sync_status' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sync_status'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 2. Check critical columns in gmb_locations
SELECT 
  'logo_url' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'logo_url'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN logo_url TEXT;' END as status
UNION ALL
SELECT 
  'cover_photo_url' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'cover_photo_url'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN cover_photo_url TEXT;' END as status
UNION ALL
SELECT 
  'rating' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'rating'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN rating NUMERIC(3,2);' END as status
UNION ALL
SELECT 
  'calculated_response_rate' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'calculated_response_rate'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN calculated_response_rate NUMERIC(5,2);' END as status
UNION ALL
SELECT 
  'menu_url' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'menu_url'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN menu_url TEXT;' END as status
UNION ALL
SELECT 
  'booking_url' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'booking_url'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN booking_url TEXT;' END as status
UNION ALL
SELECT 
  'order_url' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'order_url'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN order_url TEXT;' END as status
UNION ALL
SELECT 
  'appointment_url' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'appointment_url'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN appointment_url TEXT;' END as status
UNION ALL
SELECT 
  'from_the_business' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'from_the_business'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN from_the_business TEXT[];' END as status
UNION ALL
SELECT 
  'additional_categories' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'additional_categories'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN additional_categories TEXT[];' END as status
UNION ALL
SELECT 
  'business_hours' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'business_hours'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN business_hours JSONB;' END as status
UNION ALL
SELECT 
  'metadata' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_locations' AND column_name = 'metadata'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_locations ADD COLUMN metadata JSONB;' END as status;

-- 3. Check critical columns in gmb_reviews
SELECT 
  'has_reply' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_reviews' AND column_name = 'has_reply'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_reviews ADD COLUMN has_reply BOOLEAN DEFAULT false;' END as status
UNION ALL
SELECT 
  'reply_text' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_reviews' AND column_name = 'reply_text'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: ALTER TABLE gmb_reviews ADD COLUMN reply_text TEXT;' END as status
UNION ALL
SELECT 
  'review_reply' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_reviews' AND column_name = 'review_reply'
  ) THEN '✅ EXISTS' ELSE '⚠️ OPTIONAL - Alias for reply_text' END as status
UNION ALL
SELECT 
  'response_text' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gmb_reviews' AND column_name = 'response_text'
  ) THEN '✅ EXISTS' ELSE '⚠️ OPTIONAL - Alias for reply_text' END as status;

-- 4. Check if v_dashboard_stats view exists
SELECT 
  'v_dashboard_stats' as view_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'v_dashboard_stats'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run the view creation script' END as status;

-- 5. Check RLS is enabled
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('gmb_accounts', 'gmb_locations', 'gmb_reviews', 'gmb_questions', 'gmb_media', 'sync_status')
ORDER BY tablename;

-- 6. Summary
SELECT 
  'SCHEMA VERIFICATION COMPLETE' as message,
  'Check results above for any ❌ MISSING items' as action;

