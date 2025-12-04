-- =====================================================
-- ⚠️ WARNING: COMPLETE DATABASE WIPE ⚠️
-- =====================================================
-- This will DELETE ALL USER DATA from ALL TABLES!
-- Use with EXTREME CAUTION!
-- =====================================================

-- Start transaction (can rollback if needed)
BEGIN;

-- =====================================================
-- STEP 1: Delete from child tables first (foreign keys)
-- =====================================================

-- AI & Chat related
DELETE FROM ai_requests;
DELETE FROM ai_settings;
DELETE FROM chat_messages;
DELETE FROM chat_conversations;
DELETE FROM content_generations;

-- GMB related data
DELETE FROM gmb_reviews;
DELETE FROM gmb_questions;
DELETE FROM gmb_posts;
DELETE FROM gmb_media;
DELETE FROM gmb_metrics;
DELETE FROM gmb_messages;
DELETE FROM gmb_performance_metrics;
DELETE FROM gmb_products;
DELETE FROM gmb_search_keywords;
DELETE FROM gmb_services;
DELETE FROM gmb_sync_logs;

-- Location related
DELETE FROM gmb_locations;
DELETE FROM business_profile_history;

-- Account related
DELETE FROM gmb_accounts;
DELETE FROM oauth_tokens;
DELETE FROM oauth_states;
DELETE FROM gmb_secrets;

-- User activity
DELETE FROM activity_logs;
DELETE FROM audit_logs;
DELETE FROM error_logs;
DELETE FROM token_audit_log;

-- User progress & achievements
DELETE FROM user_achievements;
DELETE FROM user_progress;
DELETE FROM user_suggestion_actions;
DELETE FROM weekly_task_recommendations;

-- Sync related
DELETE FROM sync_queue;
DELETE FROM sync_status;
DELETE FROM sync_worker_runs;

-- Settings
DELETE FROM auto_reply_settings;
DELETE FROM user_preferences;
DELETE FROM review_reply_drafts;

-- Notifications
DELETE FROM notifications;
DELETE FROM newsletter_subscriptions;
DELETE FROM contact_submissions;

-- Performance
DELETE FROM performance_metrics;

-- Teams (if exists)
DELETE FROM team_members WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members');
DELETE FROM teams WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams');

-- =====================================================
-- STEP 2: Delete from main user tables
-- =====================================================

-- Finally, delete user profiles (keeps auth.users intact)
DELETE FROM profiles;

-- =====================================================
-- STEP 3: Reset sequences (auto-increment counters)
-- =====================================================

-- Reset all sequences to 1
DO $$
DECLARE
    seq RECORD;
BEGIN
    FOR seq IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', seq.sequence_name);
    END LOOP;
END $$;

-- =====================================================
-- STEP 4: Clean up Vault (if you want)
-- =====================================================

-- Delete all vault secrets (if vault schema exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'vault') THEN
        DELETE FROM vault.secrets;
        DELETE FROM vault.audit_log;
    END IF;
END $$;

-- =====================================================
-- STEP 5: Vacuum to reclaim space
-- =====================================================

-- Note: VACUUM cannot run inside transaction
-- Run this separately after commit:
-- VACUUM FULL ANALYZE;

-- =====================================================
-- Commit the transaction
-- =====================================================

COMMIT;

-- =====================================================
-- Success message
-- =====================================================

SELECT
    '🗑️ DATABASE COMPLETELY WIPED!' as status,
    'All user data has been deleted' as message,
    'You can now start fresh' as next_step;

-- =====================================================
-- To verify deletion:
-- =====================================================

-- Check row counts (run after commit)
/*
SELECT
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
*/

-- =====================================================
-- ROLLBACK option (if you change your mind)
-- =====================================================
-- If you want to undo, replace COMMIT with:
-- ROLLBACK;
