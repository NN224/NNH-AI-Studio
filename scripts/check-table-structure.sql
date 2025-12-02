-- =====================================================
-- Check Current Table Structure
-- =====================================================
-- This will show us what columns exist in the tables
-- =====================================================

-- Check if user_achievements table exists and show its structure
SELECT
    'user_achievements' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_achievements'
ORDER BY ordinal_position;

-- Check constraints on user_achievements
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_achievements'::regclass;

-- Check if user_progress table exists and show its structure
SELECT
    'user_progress' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_progress'
ORDER BY ordinal_position;

-- Check what tables exist
SELECT
    table_name,
    CASE
        WHEN table_name IN ('user_achievements', 'user_progress', 'chat_messages', 'chat_conversations', 'ai_requests', 'ai_settings')
        THEN '⭐ Feature Table'
        ELSE 'Other'
    END as table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'user_achievements',
    'user_progress',
    'chat_messages',
    'chat_conversations',
    'ai_requests',
    'ai_settings'
)
ORDER BY table_name;
