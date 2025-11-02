-- ========================================
-- سكريبت التحقق من نتائج الإصلاحات
-- ========================================
-- 
-- شغل هذا السكريبت بعد تطبيق الإصلاحات
-- وانسخ النتائج وأرسلها للتأكد من نجاح العملية
--
-- ========================================

-- ========================================
-- 1. التحقق من oauth_states Foreign Key
-- ========================================
SELECT 
  '=== oauth_states Foreign Key ===' as check_type,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.oauth_states'::regclass
  AND conname = 'oauth_states_user_id_fkey';

-- ========================================
-- 2. التحقق من وجود جدول gmb_media
-- ========================================
SELECT 
  '=== gmb_media Table Exists ===' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gmb_media'
  ) as table_exists;

-- ========================================
-- 3. التحقق من أعمدة جدول gmb_media
-- ========================================
SELECT 
  '=== gmb_media Columns ===' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_media'
ORDER BY ordinal_position;

-- ========================================
-- 4. التحقق من Foreign Keys في gmb_media
-- ========================================
SELECT 
  '=== gmb_media Foreign Keys ===' as check_type,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.gmb_media'::regclass
  AND contype = 'f'
ORDER BY conname;

-- ========================================
-- 5. التحقق من Indexes في gmb_media
-- ========================================
SELECT 
  '=== gmb_media Indexes ===' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'gmb_media'
ORDER BY indexname;

-- ========================================
-- 6. التحقق من RLS Policies في oauth_states
-- ========================================
SELECT 
  '=== oauth_states RLS Policies ===' as check_type,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check::text
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'oauth_states'
ORDER BY policyname;

-- ========================================
-- 7. التحقق من RLS Policies في gmb_media
-- ========================================
SELECT 
  '=== gmb_media RLS Policies ===' as check_type,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check::text
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'gmb_media'
ORDER BY policyname;

-- ========================================
-- 8. التحقق من RLS مفعل على الجداول
-- ========================================
SELECT 
  '=== RLS Enabled ===' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('oauth_states', 'gmb_media')
ORDER BY tablename;

-- ========================================
-- 9. إحصائيات oauth_states
-- ========================================
SELECT 
  '=== oauth_states Statistics ===' as check_type,
  COUNT(*) as total_states,
  COUNT(*) FILTER (WHERE used = false) as unused_states,
  COUNT(*) FILTER (WHERE used = true) as used_states,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_states,
  COUNT(*) FILTER (WHERE expires_at >= NOW() AND used = false) as valid_states
FROM public.oauth_states;

-- ========================================
-- 10. التحقق من الجداول المطلوبة موجودة
-- ========================================
SELECT 
  '=== Required Tables Check ===' as check_type,
  table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t.table_name
  ) as exists
FROM (VALUES 
  ('gmb_accounts'),
  ('gmb_locations'),
  ('gmb_media'),
  ('oauth_states')
) AS t(table_name);

-- ========================================
-- 11. ملخص شامل
-- ========================================
SELECT 
  '=== SUMMARY ===' as check_type,
  'oauth_states FK fixed' as item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.oauth_states'::regclass 
      AND conname = 'oauth_states_user_id_fkey'
      AND pg_get_constraintdef(oid) LIKE '%auth.users%'
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status
UNION ALL
SELECT 
  '=== SUMMARY ===' as check_type,
  'gmb_media table exists' as item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'gmb_media'
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status
UNION ALL
SELECT 
  '=== SUMMARY ===' as check_type,
  'gmb_media has gmb_account_id FK' as item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.gmb_media'::regclass 
      AND conname = 'gmb_media_gmb_account_id_fkey'
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status
UNION ALL
SELECT 
  '=== SUMMARY ===' as check_type,
  'gmb_media has location_id FK' as item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.gmb_media'::regclass 
      AND conname = 'gmb_media_location_id_fkey'
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status
UNION ALL
SELECT 
  '=== SUMMARY ===' as check_type,
  'gmb_media has user_id FK' as item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.gmb_media'::regclass 
      AND conname = 'gmb_media_user_id_fkey'
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status
UNION ALL
SELECT 
  '=== SUMMARY ===' as check_type,
  'gmb_media RLS enabled' as item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'gmb_media' 
      AND rowsecurity = true
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status
UNION ALL
SELECT 
  '=== SUMMARY ===' as check_type,
  'oauth_states RLS enabled' as item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'oauth_states' 
      AND rowsecurity = true
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status;

-- ========================================
-- ✅ انتهى السكريبت
-- ========================================
-- 
-- انسخ جميع النتائج من جميع الاستعلامات أعلاه
-- وأرسلها للتأكد من نجاح الإصلاحات
--
-- ========================================

