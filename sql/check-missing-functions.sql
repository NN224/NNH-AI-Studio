-- ============================================
-- 🔍 فحص Functions المفقودة
-- ============================================
-- يفحص إذا في triggers تستدعي functions غير موجودة
-- ============================================

-- 1️⃣ كل الـ Functions الموجودة حالياً
SELECT 
    'EXISTING_FUNCTION' as status,
    n.nspname as schema,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 2️⃣ كل الـ Triggers وال Functions اللي تستدعيها
SELECT 
    trigger_schema,
    event_object_table,
    trigger_name,
    action_statement,
    CASE 
        WHEN action_statement LIKE '%notify_new_question%' THEN '❌ MISSING'
        WHEN action_statement LIKE '%notify_new_review%' THEN '❌ MISSING'
        ELSE '✅ OK'
    END as function_status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 3️⃣ فحص مباشر للـ Functions المحذوفة
DO $$
DECLARE
    missing_functions TEXT[] := ARRAY[
        'notify_new_question',
        'notify_new_review',
        'calculate_health_score',
        'get_pending_reviews_count'
    ];
    func TEXT;
    func_exists BOOLEAN;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'فحص Functions المحذوفة';
    RAISE NOTICE '============================================';
    
    FOREACH func IN ARRAY missing_functions
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = func
        ) INTO func_exists;
        
        IF func_exists THEN
            RAISE NOTICE '✅ % موجودة', func;
        ELSE
            RAISE NOTICE '❌ % محذوفة', func;
        END IF;
    END LOOP;
END $$;

