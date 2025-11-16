-- ============================================
-- 📋 تصدير بنية قاعدة البيانات الكاملة
-- ============================================
-- هذا السكريبت يطلع كل التفاصيل في جدول واحد
-- يمكنك تصديره كـ CSV من Supabase
-- ============================================

-- جدول موحد لكل الكائنات
WITH all_objects AS (
  -- الجداول
  SELECT 
    'TABLE' as type,
    schemaname as schema,
    tablename as name,
    NULL as parent,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = schemaname AND table_name = tablename)::text as details,
    'columns' as details_type
  FROM pg_tables
  WHERE schemaname = 'public'
  
  UNION ALL
  
  -- الأعمدة
  SELECT 
    'COLUMN' as type,
    table_schema as schema,
    column_name as name,
    table_name as parent,
    NULL as size,
    data_type || 
    CASE WHEN character_maximum_length IS NOT NULL 
         THEN '(' || character_maximum_length || ')' 
         ELSE '' END ||
    CASE WHEN is_nullable = 'YES' THEN ' NULL' ELSE ' NOT NULL' END as details,
    'data_type' as details_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
  
  UNION ALL
  
  -- الفهارس
  SELECT 
    'INDEX' as type,
    schemaname as schema,
    indexname as name,
    tablename as parent,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size,
    COALESCE((SELECT idx_scan::text FROM pg_stat_user_indexes 
              WHERE indexrelname = indexname AND schemaname = 'public'), '0') as details,
    'usage_count' as details_type
  FROM pg_indexes
  WHERE schemaname = 'public'
  
  UNION ALL
  
  -- الـ Views
  SELECT 
    'VIEW' as type,
    table_schema as schema,
    table_name as name,
    NULL as parent,
    NULL as size,
    LEFT(view_definition, 100) as details,
    'definition' as details_type
  FROM information_schema.views
  WHERE table_schema = 'public'
  
  UNION ALL
  
  -- الـ Functions
  SELECT 
    'FUNCTION' as type,
    n.nspname as schema,
    p.proname as name,
    NULL as parent,
    NULL as size,
    pg_get_function_arguments(p.oid) as details,
    'arguments' as details_type
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  
  UNION ALL
  
  -- الـ Triggers
  SELECT 
    'TRIGGER' as type,
    trigger_schema as schema,
    trigger_name as name,
    event_object_table as parent,
    NULL as size,
    event_manipulation || ' ' || action_timing as details,
    'event' as details_type
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  
  UNION ALL
  
  -- الـ Policies
  SELECT 
    'POLICY' as type,
    schemaname as schema,
    policyname as name,
    tablename as parent,
    NULL as size,
    cmd::text as details,
    'command' as details_type
  FROM pg_policies
  WHERE schemaname = 'public'
  
  UNION ALL
  
  -- الـ Foreign Keys
  SELECT 
    'FOREIGN_KEY' as type,
    tc.table_schema as schema,
    tc.constraint_name as name,
    tc.table_name as parent,
    NULL as size,
    kcu.column_name || ' -> ' || ccu.table_name || '.' || ccu.column_name as details,
    'relationship' as details_type
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
)
SELECT 
  type,
  schema,
  name,
  parent,
  size,
  details,
  details_type
FROM all_objects
ORDER BY 
  CASE type
    WHEN 'TABLE' THEN 1
    WHEN 'COLUMN' THEN 2
    WHEN 'INDEX' THEN 3
    WHEN 'FOREIGN_KEY' THEN 4
    WHEN 'POLICY' THEN 5
    WHEN 'TRIGGER' THEN 6
    WHEN 'VIEW' THEN 7
    WHEN 'FUNCTION' THEN 8
  END,
  parent NULLS FIRST,
  name;

