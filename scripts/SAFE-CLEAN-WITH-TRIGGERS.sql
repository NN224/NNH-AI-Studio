-- =====================================================
-- ⚠️ SAFE DATABASE WIPE WITH TRIGGER HANDLING ⚠️
-- =====================================================
-- This will DELETE ALL USER DATA and handle triggers safely
-- =====================================================

-- Start transaction
BEGIN;

-- =====================================================
-- STEP 1: Disable all triggers temporarily
-- =====================================================

DO $$
DECLARE
    tbl RECORD;
BEGIN
    -- Disable all triggers on all tables
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE TRIGGER ALL', tbl.tablename);
        RAISE NOTICE 'Disabled triggers on table: %', tbl.tablename;
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: Delete data from all existing tables
-- =====================================================

DO $$
DECLARE
    tbl_name TEXT;
    row_count INTEGER;
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
            -- Get count before deletion
            EXECUTE format('SELECT COUNT(*) FROM %I', tbl_name) INTO row_count;

            -- Delete all rows
            EXECUTE format('DELETE FROM %I', tbl_name);

            RAISE NOTICE 'Cleaned table % (deleted % rows)', tbl_name, row_count;
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
-- STEP 3: Re-enable all triggers
-- =====================================================

DO $$
DECLARE
    tbl RECORD;
BEGIN
    -- Re-enable all triggers on all tables
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE TRIGGER ALL', tbl.tablename);
        RAISE NOTICE 'Re-enabled triggers on table: %', tbl.tablename;
    END LOOP;
END $$;

-- =====================================================
-- STEP 4: Reset sequences for existing tables
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
    'Table Check' as check_type,
    tablename,
    n_live_tup as remaining_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND n_live_tup > 0
ORDER BY n_live_tup DESC;

-- Final success message
SELECT
    '✅ DATABASE CLEANED SUCCESSFULLY!' as status,
    'All triggers were handled safely' as message,
    'All existing tables have been wiped' as result,
    'You can now start fresh' as next_step;

-- =====================================================
-- Optional: Run VACUUM separately to reclaim space
-- =====================================================
-- VACUUM FULL ANALYZE;
