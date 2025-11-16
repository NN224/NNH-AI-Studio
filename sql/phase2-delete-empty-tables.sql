-- ============================================
-- 🗑️ المرحلة 2: حذف الجداول الفارغة
-- ============================================
-- بناءً على نتائج الفحص
-- ============================================

-- ✅ مؤكد فارغة - احذفها واحد واحد

-- 1️⃣ competitor_tracking (0 rows, 40 kB)
DROP TABLE IF EXISTS competitor_tracking CASCADE;
-- انتظر، ثم شغّل التالي

-- 2️⃣ keyword_rankings (0 rows, 48 kB)
DROP TABLE IF EXISTS keyword_rankings CASCADE;
-- انتظر، ثم شغّل التالي

-- 3️⃣ weekly_tasks (0 rows, 56 kB)
DROP TABLE IF EXISTS weekly_tasks CASCADE;
-- انتظر، ثم شغّل التالي

-- ============================================
-- ⚠️ احتمال فارغة - تحقق أولاً
-- ============================================

-- 4️⃣ gmb_search_keywords (5.7 MB!) - تحقق أولاً!
-- شغّل هذا أولاً:
SELECT COUNT(*) as rows FROM gmb_search_keywords;
-- إذا النتيجة 0 أو < 100 → شغّل هذا:
-- DROP TABLE IF EXISTS gmb_search_keywords CASCADE;

-- 5️⃣ Autopilot Duplicates - تحقق أي واحد فارغ
-- شغّل هذا أولاً:
SELECT 'ai_autopilot_logs' as name, COUNT(*) as rows FROM ai_autopilot_logs
UNION ALL SELECT 'autopilot_logs', COUNT(*) FROM autopilot_logs
UNION ALL SELECT 'ai_autopilot_settings', COUNT(*) FROM ai_autopilot_settings
UNION ALL SELECT 'autopilot_settings', COUNT(*) FROM autopilot_settings;
-- احذف الفارغ من الاثنين

-- 6️⃣ Citations - تحقق
SELECT 'citation_listings' as name, COUNT(*) as rows FROM citation_listings
UNION ALL SELECT 'citation_sources', COUNT(*) FROM citation_sources
UNION ALL SELECT 'gmb_citations', COUNT(*) FROM gmb_citations;
-- إذا كلهم فارغة:
-- DROP TABLE IF EXISTS citation_listings CASCADE;
-- DROP TABLE IF EXISTS citation_sources CASCADE;
-- DROP TABLE IF EXISTS gmb_citations CASCADE;

-- 7️⃣ GMB Extended - تحقق
SELECT 'gmb_performance_metrics' as name, COUNT(*) as rows FROM gmb_performance_metrics
UNION ALL SELECT 'gmb_sync_logs', COUNT(*) FROM gmb_sync_logs
UNION ALL SELECT 'gmb_attributes', COUNT(*) FROM gmb_attributes
UNION ALL SELECT 'gmb_insights', COUNT(*) FROM gmb_insights
UNION ALL SELECT 'gmb_metrics', COUNT(*) FROM gmb_metrics
UNION ALL SELECT 'gmb_rankings', COUNT(*) FROM gmb_rankings
UNION ALL SELECT 'gmb_dashboard_reports', COUNT(*) FROM gmb_dashboard_reports;
-- احذف الفارغة فقط

-- 8️⃣ AI Extended - تحقق
SELECT 'auto_reply_queue' as name, COUNT(*) as rows FROM auto_reply_queue
UNION ALL SELECT 'auto_reply_settings', COUNT(*) FROM auto_reply_settings
UNION ALL SELECT 'content_generations', COUNT(*) FROM content_generations
UNION ALL SELECT 'review_ai_analysis', COUNT(*) FROM review_ai_analysis
UNION ALL SELECT 'question_templates', COUNT(*) FROM question_templates;
-- احذف الفارغة فقط

-- ============================================
-- 📊 فحص النتيجة النهائية
-- ============================================
SELECT 
    COUNT(*) as remaining_tables,
    pg_size_pretty(SUM(pg_total_relation_size('public.'||tablename))) as total_size
FROM pg_tables
WHERE schemaname = 'public';

