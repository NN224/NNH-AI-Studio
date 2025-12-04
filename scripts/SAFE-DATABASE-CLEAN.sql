-- =====================================================
-- ⚠️ SAFE DATABASE WIPE - Checks if tables exist ⚠️
-- =====================================================
-- This will DELETE ALL USER DATA from EXISTING TABLES ONLY!
-- =====================================================

-- Start transaction
BEGIN;

-- =====================================================
-- Helper function to delete from table if exists
-- =====================================================

DO $$
DECLARE
    tbl_name TEXT;
BEGIN
    -- List of all tables to clean (in order of dependencies)
    FOR tbl_name IN
        -- Child tables first (foreign key dependencies)
        SELECT unnest(ARRAY[
            'ai_requests',
            'ai_settings',
            'chat_messages',
            'chat_conversations',
            'content_generations',
            'gmb_reviews',
            'gmb_questions',
            'gmb_posts',
            'gmb_media',
            'gmb_metrics',
            'gmb_messages',
            'gmb_performance_metrics',
            'gmb_products',
            'gmb_search_keywords',
            'gmb_services',
            'gmb_sync_logs',
            'gmb_locations',
            'business_profile_history',
            'gmb_accounts',
            'oauth_tokens',
            'oauth_states',
            'gmb_secrets',
            'activity_logs',
            'audit_logs',
            'error_logs',
            'token_audit_log',
            'user_achievements',
            'user_progress',
            'user_suggestion_actions',
            'weekly_task_recommendations',
            'sync_queue',
            'sync_status',
            'sync_worker_runs',
            'auto_reply_settings',
            'user_preferences',
            'review_reply_drafts',
            'notifications',
            'newsletter_subscriptions',
            'contact_submissions',
            'performance_metrics',
            'team_members',
            'teams',
            'profiles'
        ])
    LOOP
        -- Check if table exists before deleting
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = tbl_name
        ) THEN
            EXECUTE format('DELETE FROM %I', tbl_name);
            RAISE NOTICE 'Cleaned table: %', tbl_name;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping', tbl_name;
        END IF;
    END LOOP;

    -- Clean Vault if exists
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'vault') THEN
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'vault'
            AND table_name = 'secrets'
        ) THEN
            DELETE FROM vault.secrets;
            RAISE NOTICE 'Cleaned vault.secrets';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'vault'
            AND table_name = 'audit_log'
        ) THEN
            DELETE FROM vault.audit_log;
            RAISE NOTICE 'Cleaned vault.audit_log';
        END IF;
    END IF;
END $$;

-- =====================================================
-- Reset sequences for existing tables
-- =====================================================

DO $$
DECLARE
    seq RECORD;
BEGIN
    FOR seq IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', seq.sequence_name);
            RAISE NOTICE 'Reset sequence: %', seq.sequence_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not reset sequence: %', seq.sequence_name;
        END;
    END LOOP;
END $$;

-- =====================================================
-- Commit the transaction
-- =====================================================

COMMIT;

-- =====================================================
-- Show results
-- =====================================================

-- Count remaining rows in all tables
SELECT
    schemaname,
    tablename,
    n_live_tup as remaining_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND n_live_tup > 0
ORDER BY n_live_tup DESC;

-- If no results, everything is clean!
SELECT
    '✅ DATABASE CLEANED SUCCESSFULLY!' as status,
    'All existing tables have been wiped' as message,
    'You can now start fresh' as next_step;

-- =====================================================
-- Optional: Run VACUUM separately to reclaim space
-- =====================================================
-- VACUUM FULL ANALYZE;
