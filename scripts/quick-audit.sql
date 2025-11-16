-- ============================================
-- 🔍 فحص سريع - شوف كل الجداول بالتفصيل
-- ============================================

-- 1️⃣ كل الجداول مع الأحجام
SELECT 
    tablename as table_name,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = tablename) as columns
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

