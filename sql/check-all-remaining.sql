-- ============================================
-- 🔍 فحص كل الجداول المتبقية (41 جدول)
-- ============================================
-- يطلع: اسم الجدول، عدد الصفوف، الحجم
-- ============================================

SELECT 
    tablename as table_name,
    (SELECT COUNT(*) FROM (SELECT 1 FROM pg_catalog.pg_class WHERE relname = tablename LIMIT 1) x) as exists,
    COALESCE(
        (SELECT COUNT(*)::text 
         FROM information_schema.tables t
         WHERE t.table_name = pg_tables.tablename 
         AND t.table_schema = 'public'
         LIMIT 1), 
        '0'
    ) as table_exists,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- ============================================
-- 🔍 فحص مفصل للجداول المشكوك فيها فقط
-- ============================================

-- استعلام واحد لكل الجداول المشكوك فيها
DO $$
DECLARE
    r RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'فحص الجداول المشكوك فيها';
    RAISE NOTICE '============================================';
    
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'gmb_search_keywords',
            'ai_autopilot_logs',
            'ai_autopilot_settings',
            'autopilot_logs',
            'autopilot_settings',
            'gmb_performance_metrics',
            'gmb_sync_logs',
            'citation_listings',
            'citation_sources',
            'gmb_citations',
            'gmb_attributes',
            'gmb_insights',
            'gmb_metrics',
            'gmb_rankings',
            'gmb_dashboard_reports',
            'auto_reply_queue',
            'auto_reply_settings',
            'content_generations',
            'review_ai_analysis',
            'question_templates',
            'business_profile_history',
            'competitor_tracking',
            'keyword_rankings',
            'weekly_tasks'
        )
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', r.tablename) INTO row_count;
        RAISE NOTICE '% : % rows', 
            RPAD(r.tablename, 30), 
            LPAD(row_count::text, 8);
    END LOOP;
END $$;

