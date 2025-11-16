-- ============================================
-- 🔍 عدد الصفوف لكل جدول مشكوك فيه
-- ============================================

-- 1️⃣ أكبر جدول - gmb_search_keywords (5.7 MB!)
SELECT 'gmb_search_keywords' as table_name, COUNT(*) as rows FROM gmb_search_keywords;

-- 2️⃣ Autopilot (تحقق من التكرار)
SELECT 'ai_autopilot_logs' as table_name, COUNT(*) as rows FROM ai_autopilot_logs
UNION ALL
SELECT 'autopilot_logs', COUNT(*) FROM autopilot_logs
UNION ALL
SELECT 'ai_autopilot_settings', COUNT(*) FROM ai_autopilot_settings
UNION ALL
SELECT 'autopilot_settings', COUNT(*) FROM autopilot_settings;

-- 3️⃣ GMB Extended
SELECT 'gmb_performance_metrics' as table_name, COUNT(*) as rows FROM gmb_performance_metrics
UNION ALL
SELECT 'gmb_sync_logs', COUNT(*) FROM gmb_sync_logs
UNION ALL
SELECT 'gmb_attributes', COUNT(*) FROM gmb_attributes
UNION ALL
SELECT 'gmb_insights', COUNT(*) FROM gmb_insights
UNION ALL
SELECT 'gmb_metrics', COUNT(*) FROM gmb_metrics
UNION ALL
SELECT 'gmb_rankings', COUNT(*) FROM gmb_rankings
UNION ALL
SELECT 'gmb_dashboard_reports', COUNT(*) FROM gmb_dashboard_reports;

-- 4️⃣ Citations
SELECT 'citation_listings' as table_name, COUNT(*) as rows FROM citation_listings
UNION ALL
SELECT 'citation_sources', COUNT(*) FROM citation_sources
UNION ALL
SELECT 'gmb_citations', COUNT(*) FROM gmb_citations;

-- 5️⃣ AI Extended
SELECT 'auto_reply_queue' as table_name, COUNT(*) as rows FROM auto_reply_queue
UNION ALL
SELECT 'auto_reply_settings', COUNT(*) FROM auto_reply_settings
UNION ALL
SELECT 'content_generations', COUNT(*) FROM content_generations
UNION ALL
SELECT 'review_ai_analysis', COUNT(*) FROM review_ai_analysis
UNION ALL
SELECT 'question_templates', COUNT(*) FROM question_templates;

-- 6️⃣ Other (اللي عطيتني إياها)
SELECT 'business_profile_history' as table_name, COUNT(*) as rows FROM business_profile_history
UNION ALL
SELECT 'competitor_tracking', COUNT(*) FROM competitor_tracking
UNION ALL
SELECT 'keyword_rankings', COUNT(*) FROM keyword_rankings
UNION ALL
SELECT 'weekly_tasks', COUNT(*) FROM weekly_tasks;

