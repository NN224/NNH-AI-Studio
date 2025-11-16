-- ============================================
-- 🔍 المرحلة 2: فحص قبل الحذف
-- ============================================
-- هذا السكريبت يفحص الجداول المشكوك فيها
-- ============================================

-- ============================================
-- 1️⃣ فحص gmb_search_keywords (أكبر جدول - 5.7 MB!)
-- ============================================
SELECT 
    'gmb_search_keywords' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('public.gmb_search_keywords')) as size,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ فارغ - احذفه'
        WHEN COUNT(*) < 10 THEN '⚠️ بيانات قليلة - تحقق'
        ELSE '✅ يحتوي بيانات'
    END as recommendation
FROM gmb_search_keywords;

-- شوف آخر تحديث
SELECT 
    'gmb_search_keywords' as table_name,
    MAX(created_at) as last_created,
    MAX(updated_at) as last_updated
FROM gmb_search_keywords;

-- ============================================
-- 2️⃣ فحص Autopilot Duplicates
-- ============================================
-- أي واحد مستخدم؟
SELECT 'ai_autopilot_logs' as table_name, COUNT(*) as rows FROM ai_autopilot_logs
UNION ALL
SELECT 'autopilot_logs' as table_name, COUNT(*) as rows FROM autopilot_logs
UNION ALL
SELECT 'ai_autopilot_settings' as table_name, COUNT(*) as rows FROM ai_autopilot_settings
UNION ALL
SELECT 'autopilot_settings' as table_name, COUNT(*) as rows FROM autopilot_settings;

-- ============================================
-- 3️⃣ فحص GMB Performance Metrics (808 kB)
-- ============================================
SELECT 
    'gmb_performance_metrics' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('public.gmb_performance_metrics')) as size,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ فارغ - احذفه'
        ELSE '✅ يحتوي بيانات'
    END as recommendation
FROM gmb_performance_metrics;

-- ============================================
-- 4️⃣ فحص GMB Sync Logs (432 kB)
-- ============================================
SELECT 
    'gmb_sync_logs' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('public.gmb_sync_logs')) as size,
    MAX(created_at) as last_log,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ فارغ - احذفه'
        WHEN MAX(created_at) < NOW() - INTERVAL '30 days' THEN '⚠️ قديم - احذفه'
        ELSE '✅ نشط'
    END as recommendation
FROM gmb_sync_logs;

-- ============================================
-- 5️⃣ فحص Citations
-- ============================================
SELECT 'citation_listings' as table_name, COUNT(*) as rows FROM citation_listings
UNION ALL
SELECT 'citation_sources' as table_name, COUNT(*) as rows FROM citation_sources
UNION ALL
SELECT 'gmb_citations' as table_name, COUNT(*) as rows FROM gmb_citations;

-- ============================================
-- 6️⃣ فحص GMB Extended Features
-- ============================================
SELECT 
    'gmb_attributes' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.gmb_attributes')) as size
FROM gmb_attributes
UNION ALL
SELECT 
    'gmb_insights' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.gmb_insights')) as size
FROM gmb_insights
UNION ALL
SELECT 
    'gmb_metrics' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.gmb_metrics')) as size
FROM gmb_metrics
UNION ALL
SELECT 
    'gmb_rankings' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.gmb_rankings')) as size
FROM gmb_rankings
UNION ALL
SELECT 
    'gmb_dashboard_reports' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.gmb_dashboard_reports')) as size
FROM gmb_dashboard_reports;

-- ============================================
-- 7️⃣ فحص AI Extended
-- ============================================
SELECT 
    'auto_reply_queue' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.auto_reply_queue')) as size
FROM auto_reply_queue
UNION ALL
SELECT 
    'auto_reply_settings' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.auto_reply_settings')) as size
FROM auto_reply_settings
UNION ALL
SELECT 
    'content_generations' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.content_generations')) as size
FROM content_generations
UNION ALL
SELECT 
    'review_ai_analysis' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.review_ai_analysis')) as size
FROM review_ai_analysis
UNION ALL
SELECT 
    'question_templates' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.question_templates')) as size
FROM question_templates;

-- ============================================
-- 8️⃣ فحص Other Features
-- ============================================
SELECT 
    'business_profile_history' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.business_profile_history')) as size
FROM business_profile_history
UNION ALL
SELECT 
    'competitor_tracking' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.competitor_tracking')) as size
FROM competitor_tracking
UNION ALL
SELECT 
    'keyword_rankings' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.keyword_rankings')) as size
FROM keyword_rankings
UNION ALL
SELECT 
    'weekly_tasks' as table_name, 
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.weekly_tasks')) as size
FROM weekly_tasks;

-- ============================================
-- 📊 ملخص التوصيات
-- ============================================
-- بناءً على النتائج:
-- - إذا row_count = 0 → احذف فوراً
-- - إذا row_count < 10 → تحقق من الاستخدام
-- - إذا last_updated قديم → احذف
-- ============================================

