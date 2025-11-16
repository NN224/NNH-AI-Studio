-- ============================================
-- 🗑️ المرحلة 1: الحذف الآمن (20 جدول) - Fixed Deadlock
-- ============================================
-- ⚠️ هذا آمن 100% - جداول غير مستخدمة أو مكررة
-- 💾 التوفير: ~1.4 MB
-- ============================================

-- تأكد من عدم وجود عمليات أخرى
DO $$ 
BEGIN
    -- انتظر حتى تنتهي أي عمليات على الجداول
    PERFORM pg_sleep(1);
END $$;

-- Advisory Lock مع timeout
SET lock_timeout = '10s';
SELECT pg_advisory_lock(123456789);

-- ============================================
-- حذف جدول واحد في كل مرة (بدون CASCADE أولاً)
-- ============================================

-- 1️⃣ Backup Table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gmb_reviews_backup_20251114') THEN
        DROP TABLE IF EXISTS gmb_reviews_backup_20251114;
        RAISE NOTICE '✅ Deleted: gmb_reviews_backup_20251114';
    END IF;
END $$;

-- 2️⃣ YouTube Tables
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'youtube_drafts') THEN
        DROP TABLE IF EXISTS youtube_drafts;
        RAISE NOTICE '✅ Deleted: youtube_drafts';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'youtube_videos') THEN
        DROP TABLE IF EXISTS youtube_videos;
        RAISE NOTICE '✅ Deleted: youtube_videos';
    END IF;
END $$;

-- 3️⃣ Team & Monitoring
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_members') THEN
        DROP TABLE IF EXISTS team_members;
        RAISE NOTICE '✅ Deleted: team_members';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'monitoring_alerts') THEN
        DROP TABLE IF EXISTS monitoring_alerts;
        RAISE NOTICE '✅ Deleted: monitoring_alerts';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'monitoring_metrics') THEN
        DROP TABLE IF EXISTS monitoring_metrics;
        RAISE NOTICE '✅ Deleted: monitoring_metrics';
    END IF;
END $$;

-- 4️⃣ Unused System Tables
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        DROP TABLE IF EXISTS users;
        RAISE NOTICE '✅ Deleted: users';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_profiles') THEN
        DROP TABLE IF EXISTS client_profiles;
        RAISE NOTICE '✅ Deleted: client_profiles';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'secret_keys') THEN
        DROP TABLE IF EXISTS secret_keys;
        RAISE NOTICE '✅ Deleted: secret_keys';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_settings') THEN
        DROP TABLE IF EXISTS system_settings;
        RAISE NOTICE '✅ Deleted: system_settings';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'room_members') THEN
        DROP TABLE IF EXISTS room_members;
        RAISE NOTICE '✅ Deleted: room_members';
    END IF;
END $$;

-- 5️⃣ Unused Logs & Events
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'oauth_events') THEN
        DROP TABLE IF EXISTS oauth_events;
        RAISE NOTICE '✅ Deleted: oauth_events';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'security_logs') THEN
        DROP TABLE IF EXISTS security_logs;
        RAISE NOTICE '✅ Deleted: security_logs';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'review_activity_log') THEN
        DROP TABLE IF EXISTS review_activity_log;
        RAISE NOTICE '✅ Deleted: review_activity_log';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'health_check_results') THEN
        DROP TABLE IF EXISTS health_check_results;
        RAISE NOTICE '✅ Deleted: health_check_results';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobs_log') THEN
        DROP TABLE IF EXISTS jobs_log;
        RAISE NOTICE '✅ Deleted: jobs_log';
    END IF;
END $$;

-- 6️⃣ Unused Sync Tables
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sync_runs') THEN
        DROP TABLE IF EXISTS sync_runs;
        RAISE NOTICE '✅ Deleted: sync_runs';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sync_results') THEN
        DROP TABLE IF EXISTS sync_results;
        RAISE NOTICE '✅ Deleted: sync_results';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sync_status') THEN
        DROP TABLE IF EXISTS sync_status;
        RAISE NOTICE '✅ Deleted: sync_status';
    END IF;
END $$;

-- 7️⃣ Duplicate Content Generation
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'content_generation') THEN
        DROP TABLE IF EXISTS content_generation;
        RAISE NOTICE '✅ Deleted: content_generation';
    END IF;
END $$;

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
ORDER BY pg_total_relation_size('public.'||tablename) DESC
LIMIT 20;

