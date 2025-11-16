-- ============================================
-- 🔍 Database Audit Script - فحص شامل لقاعدة البيانات
-- ============================================
-- يفحص: الجداول، الأعمدة، الفهارس، الـ Views، الـ Functions، الـ Policies
-- ============================================

-- 1️⃣ عرض جميع الجداول مع عدد الصفوف
-- ============================================
SELECT 
    schemaname as schema,
    tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = schemaname AND table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 2️⃣ عرض جميع الأعمدة لكل جدول
-- ============================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3️⃣ عرض جميع الفهارس (Indexes)
-- ============================================
SELECT 
    schemaname as schema,
    tablename as table_name,
    indexname as index_name,
    indexdef as index_definition,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- 4️⃣ البحث عن Indexes مكررة (نفس الأعمدة)
-- ============================================
SELECT 
    idx1.schemaname,
    idx1.tablename,
    idx1.indexname as index1,
    idx2.indexname as index2,
    idx1.indexdef as definition1,
    idx2.indexdef as definition2
FROM pg_indexes idx1
JOIN pg_indexes idx2 
    ON idx1.tablename = idx2.tablename 
    AND idx1.indexname < idx2.indexname
    AND idx1.indexdef = idx2.indexdef
WHERE idx1.schemaname = 'public';

-- 5️⃣ عرض جميع الـ Views
-- ============================================
SELECT 
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 6️⃣ عرض جميع الـ Functions
-- ============================================
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 7️⃣ عرض جميع الـ Triggers
-- ============================================
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table as table_name,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 8️⃣ عرض جميع الـ Foreign Keys
-- ============================================
SELECT
    tc.table_name as from_table,
    kcu.column_name as from_column,
    ccu.table_name as to_table,
    ccu.column_name as to_column,
    tc.constraint_name
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

-- 9️⃣ عرض جميع الـ RLS Policies
-- ============================================
SELECT 
    schemaname as schema,
    tablename as table_name,
    policyname as policy_name,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 🔟 البحث عن جداول فارغة (بدون صفوف)
-- ============================================
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = pg_tables.schemaname
        AND t.table_name = pg_tables.tablename
        AND t.table_type = 'VIEW'
    )
ORDER BY tablename;

-- 1️⃣1️⃣ البحث عن Indexes غير مستخدمة
-- ============================================
SELECT 
    schemaname as schema,
    tablename as table_name,
    indexname as index_name,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 1️⃣2️⃣ البحث عن أعمدة NULL في كل الصفوف
-- ============================================
-- ملاحظة: هذا الاستعلام يحتاج تشغيل يدوي لكل جدول
-- مثال:
-- SELECT 'table_name' as table_name, 'column_name' as column_name, COUNT(*) as total_rows, 
--        COUNT(column_name) as non_null_rows
-- FROM table_name;

-- 1️⃣3️⃣ عرض العلاقات بين الجداول (Foreign Keys Graph)
-- ============================================
SELECT 
    tc.table_name as parent_table,
    kcu.column_name as parent_column,
    ccu.table_name as child_table,
    ccu.column_name as child_column,
    'FK: ' || tc.constraint_name as relationship
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 1️⃣4️⃣ البحث عن Constraints مكررة
-- ============================================
SELECT 
    table_name,
    constraint_name,
    constraint_type,
    COUNT(*) as count
FROM information_schema.table_constraints
WHERE table_schema = 'public'
GROUP BY table_name, constraint_name, constraint_type
HAVING COUNT(*) > 1;

-- 1️⃣5️⃣ عرض أكبر الجداول حسب الحجم
-- ============================================
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                   pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- 1️⃣6️⃣ البحث عن Sequences (للـ Auto-increment)
-- ============================================
SELECT 
    sequence_schema,
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- 1️⃣7️⃣ عرض Extensions المثبتة
-- ============================================
SELECT 
    extname as extension_name,
    extversion as version,
    extrelocatable as relocatable
FROM pg_extension
ORDER BY extname;

-- 1️⃣8️⃣ البحث عن Materialized Views
-- ============================================
SELECT 
    schemaname,
    matviewname as view_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
    ispopulated as is_populated
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;

-- 1️⃣9️⃣ عرض Enum Types
-- ============================================
SELECT 
    n.nspname as schema,
    t.typname as enum_name,
    e.enumlabel as enum_value,
    e.enumsortorder as sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- 2️⃣0️⃣ البحث عن جداول بدون Primary Key
-- ============================================
SELECT 
    t.table_name
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
-- 📊 ملخص الإحصائيات
-- ============================================
SELECT 
    'Tables' as type,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    'Views' as type,
    COUNT(*) as count
FROM information_schema.views
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'Functions' as type,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
UNION ALL
SELECT 
    'Indexes' as type,
    COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Triggers' as type,
    COUNT(*) as count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
UNION ALL
SELECT 
    'Policies' as type,
    COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public';

