-- ============================================
-- 🔍 فحص سريع للجداول المشكوك فيها
-- ============================================

-- 1️⃣ أكبر جدول: gmb_search_keywords (5.7 MB!)
SELECT 
    'gmb_search_keywords' as table_name,
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.gmb_search_keywords')) as size,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ فارغ - احذفه فوراً'
        WHEN COUNT(*) < 100 THEN '⚠️ بيانات قليلة - احذفه'
        ELSE '✅ يحتوي بيانات مهمة'
    END as recommendation
FROM gmb_search_keywords;

-- 2️⃣ Autopilot Duplicates - أي واحد مستخدم؟
SELECT 'ai_autopilot_logs' as table_name, COUNT(*) as rows, 
       pg_size_pretty(pg_total_relation_size('public.ai_autopilot_logs')) as size
FROM ai_autopilot_logs
UNION ALL
SELECT 'autopilot_logs' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.autopilot_logs')) as size
FROM autopilot_logs
UNION ALL
SELECT 'ai_autopilot_settings' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.ai_autopilot_settings')) as size
FROM ai_autopilot_settings
UNION ALL
SELECT 'autopilot_settings' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.autopilot_settings')) as size
FROM autopilot_settings;

-- 3️⃣ GMB Performance Metrics (808 kB)
SELECT 
    'gmb_performance_metrics' as table_name,
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.gmb_performance_metrics')) as size,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ فارغ - احذفه'
        WHEN COUNT(*) < 100 THEN '⚠️ بيانات قليلة'
        ELSE '✅ يحتوي بيانات'
    END as recommendation
FROM gmb_performance_metrics;

-- 4️⃣ GMB Sync Logs (432 kB)
SELECT 
    'gmb_sync_logs' as table_name,
    COUNT(*) as rows,
    pg_size_pretty(pg_total_relation_size('public.gmb_sync_logs')) as size,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ فارغ - احذفه'
        ELSE '✅ يحتوي بيانات'
    END as recommendation
FROM gmb_sync_logs;

-- 5️⃣ Citations
SELECT 'citation_listings' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.citation_listings')) as size
FROM citation_listings
UNION ALL
SELECT 'citation_sources' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.citation_sources')) as size
FROM citation_sources
UNION ALL
SELECT 'gmb_citations' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.gmb_citations')) as size
FROM gmb_citations;

-- 6️⃣ GMB Extended Features
SELECT 'gmb_attributes' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.gmb_attributes')) as size
FROM gmb_attributes
UNION ALL
SELECT 'gmb_insights' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.gmb_insights')) as size
FROM gmb_insights
UNION ALL
SELECT 'gmb_metrics' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.gmb_metrics')) as size
FROM gmb_metrics
UNION ALL
SELECT 'gmb_rankings' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.gmb_rankings')) as size
FROM gmb_rankings
UNION ALL
SELECT 'gmb_dashboard_reports' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.gmb_dashboard_reports')) as size
FROM gmb_dashboard_reports;

-- 7️⃣ AI Extended
SELECT 'auto_reply_queue' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.auto_reply_queue')) as size
FROM auto_reply_queue
UNION ALL
SELECT 'auto_reply_settings' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.auto_reply_settings')) as size
FROM auto_reply_settings
UNION ALL
SELECT 'content_generations' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.content_generations')) as size
FROM content_generations
UNION ALL
SELECT 'review_ai_analysis' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.review_ai_analysis')) as size
FROM review_ai_analysis
UNION ALL
SELECT 'question_templates' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.question_templates')) as size
FROM question_templates;

-- 8️⃣ Other Features
SELECT 'business_profile_history' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.business_profile_history')) as size
FROM business_profile_history
UNION ALL
SELECT 'competitor_tracking' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.competitor_tracking')) as size
FROM competitor_tracking
UNION ALL
SELECT 'keyword_rankings' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.keyword_rankings')) as size
FROM keyword_rankings
UNION ALL
SELECT 'weekly_tasks' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('public.weekly_tasks')) as size
FROM weekly_tasks;

