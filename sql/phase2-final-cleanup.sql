-- ============================================
-- 🗑️ المرحلة 2: الحذف النهائي (16 جدول)
-- ============================================
-- كلهم فارغة أو شبه فارغة
-- 💾 التوفير: ~772 kB
-- ============================================

-- شغّل واحد واحد، انتظر بين كل واحد

-- 1️⃣ Autopilot (فارغة - كلها!)
DROP TABLE IF EXISTS ai_autopilot_logs CASCADE;
-- انتظر

DROP TABLE IF EXISTS autopilot_logs CASCADE;
-- انتظر

DROP TABLE IF EXISTS ai_autopilot_settings CASCADE;
-- انتظر

DROP TABLE IF EXISTS autopilot_settings CASCADE;
-- انتظر

-- 2️⃣ Citations (فارغة - كلها!)
DROP TABLE IF EXISTS citation_listings CASCADE;
-- انتظر

DROP TABLE IF EXISTS citation_sources CASCADE;
-- انتظر

DROP TABLE IF EXISTS gmb_citations CASCADE;
-- انتظر

-- 3️⃣ GMB Extended (الفارغة فقط)
DROP TABLE IF EXISTS gmb_attributes CASCADE;
-- انتظر

DROP TABLE IF EXISTS gmb_insights CASCADE;
-- انتظر

DROP TABLE IF EXISTS gmb_rankings CASCADE;
-- انتظر

DROP TABLE IF EXISTS gmb_dashboard_reports CASCADE;
-- انتظر (صف واحد فقط - غير مهم)

-- 4️⃣ AI Extended (فارغة - كلها!)
DROP TABLE IF EXISTS auto_reply_queue CASCADE;
-- انتظر

DROP TABLE IF EXISTS auto_reply_settings CASCADE;
-- انتظر

DROP TABLE IF EXISTS content_generations CASCADE;
-- انتظر

DROP TABLE IF EXISTS review_ai_analysis CASCADE;
-- انتظر

DROP TABLE IF EXISTS question_templates CASCADE;
-- انتظر

-- ============================================
-- ✅ خلصنا! شوف النتيجة النهائية
-- ============================================
SELECT 
    COUNT(*) as remaining_tables,
    pg_size_pretty(SUM(pg_total_relation_size('public.'||tablename))) as total_size
FROM pg_tables
WHERE schemaname = 'public';

-- عرض الجداول المتبقية (أكبر 20)
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC
LIMIT 20;

