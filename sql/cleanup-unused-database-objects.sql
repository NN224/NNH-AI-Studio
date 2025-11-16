-- ============================================
-- 🗑️ Database Cleanup Script - حذف الأشياء غير المستخدمة
-- ============================================
-- ⚠️ تحذير: اعمل Backup قبل التشغيل!
-- ============================================

-- استخدم Advisory Lock لمنع التنفيذ المتزامن
SELECT pg_advisory_lock(123456789);

BEGIN;

-- ============================================
-- 1️⃣ حذف الـ Views غير المستخدمة
-- ============================================

-- ✅ نحتفظ بـ v_dashboard_stats (مستخدم 6 مرات)
-- ❌ نحذف الباقي (غير مستخدمة)

DROP VIEW IF EXISTS v_location_performance CASCADE;
DROP VIEW IF EXISTS v_review_summary CASCADE;
DROP VIEW IF EXISTS v_question_summary CASCADE;
DROP VIEW IF EXISTS v_post_summary CASCADE;

-- ============================================
-- 2️⃣ حذف الـ Functions غير المستخدمة
-- ============================================

-- ⚠️ ملاحظة: بعض الـ Functions قد تكون مستخدمة في Triggers
-- تحقق أولاً قبل الحذف

-- Function للـ Health Score (غير مستخدم)
DROP FUNCTION IF EXISTS calculate_health_score(uuid) CASCADE;

-- Function لعدد التقييمات المعلقة (غير مستخدم)
DROP FUNCTION IF EXISTS get_pending_reviews_count(uuid) CASCADE;

-- ⚠️ لا نحذف update_updated_at_column لأنه قد يكون في Triggers
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Functions للإشعارات (غير مستخدمة)
DROP FUNCTION IF EXISTS notify_new_review() CASCADE;
DROP FUNCTION IF EXISTS notify_new_question() CASCADE;

-- ============================================
-- 3️⃣ حذف الجداول غير المستخدمة
-- ============================================

-- ⚠️ تحذير: CASCADE يحذف كل ما يعتمد على الجدول

-- جداول Auth القديمة (Supabase Auth يستخدم schema منفصل)
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS email_verification_tokens CASCADE;

-- جداول الصلاحيات (غير مستخدمة)
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- جداول الـ Webhooks (غير مستخدمة)
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;

-- جداول أخرى غير مستخدمة
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS saved_filters CASCADE;
DROP TABLE IF EXISTS dashboard_widgets CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- جداول الـ Sync (غير مستخدمة)
-- ⚠️ تحقق أولاً: قد تكون مستخدمة في المستقبل
-- DROP TABLE IF EXISTS sync_errors CASCADE;
-- DROP TABLE IF EXISTS sync_transactions CASCADE;

-- جداول الـ Location Features & Branding (غير مستخدمة)
-- ⚠️ تحقق أولاً: قد تكون مستخدمة في صفحة Features
-- DROP TABLE IF EXISTS location_branding CASCADE;
-- DROP TABLE IF EXISTS location_features CASCADE;

-- جدول Users (غير مستخدم)
-- ⚠️ لا نحذفه لأن Supabase Auth قد يعتمد عليه
-- DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 4️⃣ حذف الـ Indexes غير المستخدمة
-- ============================================

-- ⚠️ ملاحظة: هذا يحتاج فحص من الـ SQL الأول
-- مثال:
-- DROP INDEX IF EXISTS idx_unused_index;

-- ============================================
-- 5️⃣ حذف الـ Policies للجداول المحذوفة
-- ============================================

-- الـ Policies تُحذف تلقائياً مع CASCADE
-- لكن إذا كان هناك policies يدوية:

-- مثال:
-- DROP POLICY IF EXISTS "policy_name" ON table_name;

-- ============================================
-- 6️⃣ تنظيف وتحسين
-- ============================================

-- تحديث الإحصائيات
VACUUM ANALYZE;

COMMIT;

-- إطلاق الـ Lock
SELECT pg_advisory_unlock(123456789);

-- ============================================
-- ✅ النتيجة المتوقعة
-- ============================================
-- 
-- قبل:
-- - 35 جدول
-- - 5 views
-- - 5+ functions
-- 
-- بعد:
-- - 22-25 جدول (حذف 10-13 جدول)
-- - 1 view (حذف 4 views)
-- - 1-2 functions (حذف 3-4 functions)
-- 
-- توفير: ~30% من الحجم
-- ============================================

-- ============================================
-- 📊 فحص النتيجة
-- ============================================

-- عدد الجداول المتبقية
SELECT COUNT(*) as remaining_tables 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- عدد الـ Views المتبقية
SELECT COUNT(*) as remaining_views 
FROM information_schema.views 
WHERE table_schema = 'public';

-- عدد الـ Functions المتبقية
SELECT COUNT(*) as remaining_functions 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

-- حجم قاعدة البيانات
SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;

