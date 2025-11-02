-- ========================================
-- فحص سريع - نسخ النتائج وإرسالها
-- ========================================

-- 1. التحقق من oauth_states FK
SELECT 
  'oauth_states FK' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.oauth_states'::regclass 
      AND conname = 'oauth_states_user_id_fkey'
      AND pg_get_constraintdef(oid) LIKE '%auth.users%'
    ) THEN '✅ FIXED'
    ELSE '❌ NOT FIXED'
  END as status,
  pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conrelid = 'public.oauth_states'::regclass AND conname = 'oauth_states_user_id_fkey')) as details;

-- 2. التحقق من gmb_media table
SELECT 
  'gmb_media table' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_media') 
    THEN '✅ EXISTS'
    ELSE '❌ NOT EXISTS'
  END as status,
  (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gmb_media') || ' columns' as details;

-- 3. التحقق من gmb_media Foreign Keys
SELECT 
  'gmb_media FKs' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.gmb_media'::regclass AND conname = 'gmb_media_gmb_account_id_fkey')
      AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.gmb_media'::regclass AND conname = 'gmb_media_location_id_fkey')
      AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.gmb_media'::regclass AND conname = 'gmb_media_user_id_fkey')
    THEN '✅ ALL FKs OK'
    ELSE '❌ MISSING FKs'
  END as status,
  (SELECT COUNT(*)::text FROM pg_constraint WHERE conrelid = 'public.gmb_media'::regclass AND contype = 'f') || ' foreign keys' as details;

-- 4. التحقق من Indexes
SELECT 
  'gmb_media indexes' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'gmb_media' AND indexname = 'idx_gmb_media_account')
      AND EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'gmb_media' AND indexname = 'idx_gmb_media_unique')
    THEN '✅ INDEXES OK'
    ELSE '❌ MISSING INDEXES'
  END as status,
  (SELECT COUNT(*)::text FROM pg_indexes WHERE tablename = 'gmb_media') || ' total indexes' as details;

-- 5. التحقق من RLS
SELECT 
  'RLS enabled' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'oauth_states' AND rowsecurity = true)
      AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gmb_media' AND rowsecurity = true)
    THEN '✅ RLS ENABLED'
    ELSE '❌ RLS NOT ENABLED'
  END as status,
  (SELECT COUNT(*)::text FROM pg_policies WHERE tablename IN ('oauth_states', 'gmb_media')) || ' total policies' as details;

-- ========================================
-- النتيجة النهائية
-- ========================================
SELECT 
  '=== FINAL RESULT ===' as summary,
  CASE 
    WHEN 
      -- oauth_states FK fixed
      EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.oauth_states'::regclass AND conname = 'oauth_states_user_id_fkey' AND pg_get_constraintdef(oid) LIKE '%auth.users%')
      -- gmb_media exists
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_media')
      -- gmb_media has all FKs
      AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.gmb_media'::regclass AND conname = 'gmb_media_gmb_account_id_fkey')
      AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.gmb_media'::regclass AND conname = 'gmb_media_location_id_fkey')
      AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.gmb_media'::regclass AND conname = 'gmb_media_user_id_fkey')
      -- RLS enabled
      AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'oauth_states' AND rowsecurity = true)
      AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gmb_media' AND rowsecurity = true)
    THEN '✅ ALL CHECKS PASSED - EVERYTHING IS FIXED!'
    ELSE '❌ SOME CHECKS FAILED - CHECK DETAILS ABOVE'
  END as result;

