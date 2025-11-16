-- ============================================
-- 🗑️ حذف جدول واحد في كل مرة (بدون deadlock)
-- ============================================
-- شغّل كل استعلام لحاله، واحد بعد واحد
-- ============================================

-- 1️⃣ Backup Table (608 kB)
DROP TABLE IF EXISTS gmb_reviews_backup_20251114 CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 2️⃣ YouTube Drafts (40 kB)
DROP TABLE IF EXISTS youtube_drafts CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 3️⃣ YouTube Videos (112 kB)
DROP TABLE IF EXISTS youtube_videos CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 4️⃣ Team Members (40 kB)
DROP TABLE IF EXISTS team_members CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 5️⃣ Monitoring Alerts (32 kB)
DROP TABLE IF EXISTS monitoring_alerts CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 6️⃣ Monitoring Metrics (40 kB)
DROP TABLE IF EXISTS monitoring_metrics CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 7️⃣ Users (120 kB)
DROP TABLE IF EXISTS users CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 8️⃣ Client Profiles (64 kB)
DROP TABLE IF EXISTS client_profiles CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 9️⃣ Secret Keys (32 kB)
DROP TABLE IF EXISTS secret_keys CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 🔟 System Settings (32 kB)
DROP TABLE IF EXISTS system_settings CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 1️⃣1️⃣ Room Members (24 kB)
DROP TABLE IF EXISTS room_members CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 1️⃣2️⃣ OAuth Events (32 kB)
DROP TABLE IF EXISTS oauth_events CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 1️⃣3️⃣ Security Logs (48 kB)
DROP TABLE IF EXISTS security_logs CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 1️⃣4️⃣ Review Activity Log (48 kB)
DROP TABLE IF EXISTS review_activity_log CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 1️⃣5️⃣ Health Check Results (40 kB)
DROP TABLE IF EXISTS health_check_results CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 1️⃣6️⃣ Jobs Log (16 kB)
DROP TABLE IF EXISTS jobs_log CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 1️⃣7️⃣ Sync Runs (16 kB)
DROP TABLE IF EXISTS sync_runs CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 1️⃣8️⃣ Sync Results (40 kB)
DROP TABLE IF EXISTS sync_results CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 1️⃣9️⃣ Sync Status (64 kB)
DROP TABLE IF EXISTS sync_status CASCADE;
-- انتظر حتى ينتهي، ثم شغّل التالي

-- 2️⃣0️⃣ Content Generation (24 kB)
DROP TABLE IF EXISTS content_generation CASCADE;
-- انتظر حتى ينتهي

-- ============================================
-- ✅ خلصنا! شوف النتيجة
-- ============================================
SELECT 
    COUNT(*) as remaining_tables,
    pg_size_pretty(SUM(pg_total_relation_size('public.'||tablename))) as total_size
FROM pg_tables
WHERE schemaname = 'public';

