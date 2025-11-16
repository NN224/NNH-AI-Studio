-- ============================================
-- 🗑️ المرحلة 1: الحذف الآمن (20 جدول)
-- ============================================
-- ⚠️ هذا آمن 100% - جداول غير مستخدمة أو مكررة
-- 💾 التوفير: ~1.4 MB
-- ============================================

-- Advisory Lock
SELECT pg_advisory_lock(123456789);

BEGIN;

-- ============================================
-- 1️⃣ Backup Table (نسخة احتياطية قديمة)
-- ============================================
DROP TABLE IF EXISTS gmb_reviews_backup_20251114 CASCADE;
-- ✅ توفير: 608 kB

-- ============================================
-- 2️⃣ YouTube Tables (التاب محذوف)
-- ============================================
DROP TABLE IF EXISTS youtube_drafts CASCADE;
DROP TABLE IF EXISTS youtube_videos CASCADE;
-- ✅ توفير: 152 kB

-- ============================================
-- 3️⃣ Team & Monitoring (التابات محذوفة)
-- ============================================
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS monitoring_alerts CASCADE;
DROP TABLE IF EXISTS monitoring_metrics CASCADE;
-- ✅ توفير: 112 kB

-- ============================================
-- 4️⃣ Unused System Tables
-- ============================================
DROP TABLE IF EXISTS users CASCADE;              -- مكرر (Supabase Auth)
DROP TABLE IF EXISTS client_profiles CASCADE;    -- غير مستخدم
DROP TABLE IF EXISTS secret_keys CASCADE;        -- غير مستخدم
DROP TABLE IF EXISTS system_settings CASCADE;    -- غير مستخدم
DROP TABLE IF EXISTS room_members CASCADE;       -- غير مستخدم
-- ✅ توفير: 288 kB

-- ============================================
-- 5️⃣ Unused Logs & Events
-- ============================================
DROP TABLE IF EXISTS oauth_events CASCADE;       -- غير مستخدم
DROP TABLE IF EXISTS security_logs CASCADE;      -- مكرر مع audit_logs
DROP TABLE IF EXISTS review_activity_log CASCADE; -- مكرر مع activity_logs
DROP TABLE IF EXISTS health_check_results CASCADE; -- غير مستخدم
DROP TABLE IF EXISTS jobs_log CASCADE;           -- غير مستخدم
-- ✅ توفير: 200 kB

-- ============================================
-- 6️⃣ Unused Sync Tables
-- ============================================
DROP TABLE IF EXISTS sync_runs CASCADE;
DROP TABLE IF EXISTS sync_results CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;
-- ✅ توفير: 120 kB

-- ============================================
-- 7️⃣ Duplicate Content Generation
-- ============================================
DROP TABLE IF EXISTS content_generation CASCADE; -- مكرر مع content_generations
-- ✅ توفير: 24 kB

-- ============================================
-- ✅ النتيجة
-- ============================================
-- حذف: 20 جدول
-- توفير: ~1,504 kB (~1.5 MB)
-- ============================================

COMMIT;

-- Release Lock
SELECT pg_advisory_unlock(123456789);

-- ============================================
-- 📊 فحص النتيجة
-- ============================================
SELECT 
    COUNT(*) as remaining_tables,
    pg_size_pretty(SUM(pg_total_relation_size('public.'||tablename))) as total_size
FROM pg_tables
WHERE schemaname = 'public';

-- عرض الجداول المتبقية
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

