-- ============================================
-- 📊 تقرير قاعدة البيانات المفصل - كل شي من A to Z
-- ============================================

-- ============================================
-- 1️⃣ جميع الجداول مع التفاصيل الكاملة
-- ============================================
SELECT 
    'TABLE' as object_type,
    schemaname as schema,
    tablename as name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = schemaname AND table_name = tablename) as columns_count,
    (SELECT COUNT(*) FROM pg_indexes 
     WHERE schemaname = pg_tables.schemaname AND tablename = pg_tables.tablename) as indexes_count,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE schemaname = pg_tables.schemaname AND tablename = pg_tables.tablename) as policies_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- 2️⃣ جميع الـ Views
-- ============================================
SELECT 
    'VIEW' as object_type,
    table_schema as schema,
    table_name as name,
    LENGTH(view_definition) as definition_length,
    view_definition as definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 3️⃣ جميع الـ Functions مع التفاصيل
-- ============================================
SELECT 
    'FUNCTION' as object_type,
    n.nspname as schema,
    p.proname as name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    CASE 
        WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
        WHEN p.provolatile = 's' THEN 'STABLE'
        WHEN p.provolatile = 'v' THEN 'VOLATILE'
    END as volatility,
    LENGTH(pg_get_functiondef(p.oid)) as definition_length
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ============================================
-- 4️⃣ جميع الـ Indexes مع الاستخدام
-- ============================================
SELECT 
    'INDEX' as object_type,
    schemaname as schema,
    tablename as table_name,
    indexname as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    CASE 
        WHEN idx_scan = 0 THEN '❌ غير مستخدم'
        WHEN idx_scan < 10 THEN '⚠️ استخدام قليل'
        WHEN idx_scan < 100 THEN '✅ استخدام متوسط'
        ELSE '🔥 استخدام عالي'
    END as usage_status,
    indexdef as definition
FROM pg_stat_user_indexes
JOIN pg_indexes ON pg_stat_user_indexes.indexrelname = pg_indexes.indexname
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- ============================================
-- 5️⃣ جميع الـ Triggers
-- ============================================
SELECT 
    'TRIGGER' as object_type,
    trigger_schema as schema,
    event_object_table as table_name,
    trigger_name as name,
    event_manipulation as event,
    action_timing as timing,
    action_statement as action
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 6️⃣ جميع الـ Policies
-- ============================================
SELECT 
    'POLICY' as object_type,
    schemaname as schema,
    tablename as table_name,
    policyname as policy_name,
    permissive as permissive,
    roles::text as roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 7️⃣ جميع الـ Foreign Keys
-- ============================================
SELECT 
    'FOREIGN_KEY' as object_type,
    tc.table_schema as schema,
    tc.table_name as from_table,
    kcu.column_name as from_column,
    ccu.table_name as to_table,
    ccu.column_name as to_column,
    tc.constraint_name as constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- 8️⃣ الفهارس غير المستخدمة (المرشحة للحذف)
-- ============================================
SELECT 
    'UNUSED_INDEX' as object_type,
    schemaname as schema,
    relname as table_name,
    indexrelname as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as wasted_size,
    idx_scan as times_used,
    '⚠️ مرشح للحذف' as recommendation
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
    AND indexrelname NOT LIKE '%_unique'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================
-- 9️⃣ الفهارس المكررة (نفس التعريف)
-- ============================================
SELECT 
    'DUPLICATE_INDEX' as object_type,
    idx1.schemaname as schema,
    idx1.tablename as table_name,
    idx1.indexname as index1,
    idx2.indexname as index2,
    '⚠️ فهرس مكرر - احذف واحد' as recommendation
FROM pg_indexes idx1
JOIN pg_indexes idx2 
    ON idx1.tablename = idx2.tablename 
    AND idx1.indexname < idx2.indexname
    AND idx1.indexdef = idx2.indexdef
WHERE idx1.schemaname = 'public';

-- ============================================
-- 🔟 الجداول الفارغة (بدون بيانات)
-- ============================================
-- ملاحظة: هذا يحتاج تشغيل يدوي لكل جدول
-- سنعرض قائمة الجداول فقط
SELECT 
    'EMPTY_TABLE_CHECK' as object_type,
    schemaname as schema,
    tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    '⚠️ تحقق يدوياً من البيانات' as note
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 1️⃣1️⃣ الجداول بدون Primary Key
-- ============================================
SELECT 
    'NO_PRIMARY_KEY' as object_type,
    t.table_schema as schema,
    t.table_name as name,
    '❌ لا يوجد Primary Key' as issue,
    '⚠️ أضف Primary Key' as recommendation
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints tc
    ON t.table_name = tc.table_name
    AND tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND tc.constraint_name IS NULL
ORDER BY t.table_name;

-- ============================================
-- 1️⃣2️⃣ أكبر 10 جداول
-- ============================================
SELECT 
    'LARGEST_TABLE' as object_type,
    schemaname as schema,
    tablename as name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                   pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- ============================================
-- 1️⃣3️⃣ Extensions المثبتة
-- ============================================
SELECT 
    'EXTENSION' as object_type,
    extname as name,
    extversion as version,
    extrelocatable as relocatable
FROM pg_extension
ORDER BY extname;

-- ============================================
-- 1️⃣4️⃣ Enum Types
-- ============================================
SELECT 
    'ENUM_TYPE' as object_type,
    n.nspname as schema,
    t.typname as enum_name,
    e.enumlabel as enum_value,
    e.enumsortorder as sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- ============================================
-- 1️⃣5️⃣ ملخص الحجم الإجمالي
-- ============================================
SELECT 
    'DATABASE_SIZE' as object_type,
    current_database() as database_name,
    pg_size_pretty(pg_database_size(current_database())) as total_size,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as tables_count,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') as views_count,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public') as functions_count;

