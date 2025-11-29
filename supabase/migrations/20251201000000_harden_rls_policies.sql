-- =====================================================
-- RLS HARDENING MIGRATION (FAIL-SAFE VERSION)
-- =====================================================
-- Created: 2025-01-02 (Optimized)
-- Purpose: Enforce strict RLS with existence checks to prevent errors
-- =====================================================

BEGIN;

-- =====================================================
-- HELPER FUNCTION: Safe Policy Creation
-- =====================================================
-- This allows us to try dropping/creating policies without crashing if table is missing
CREATE OR REPLACE FUNCTION pg_temp.safe_create_policy(
    t_name text,
    p_name text,
    p_cmd text,
    p_role text,
    p_using text,
    p_check text
) RETURNS void AS $$
BEGIN
    -- Only proceed if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t_name);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t_name);

        -- Drop existing policy to avoid conflict
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_name, t_name);

        -- Construct Query
        DECLARE
            q text := format('CREATE POLICY %I ON %I FOR %s TO %s', p_name, t_name, p_cmd, p_role);
        BEGIN
            IF p_using IS NOT NULL THEN
                q := q || format(' USING (%s)', p_using);
            END IF;
            IF p_check IS NOT NULL THEN
                q := q || format(' WITH CHECK (%s)', p_check);
            END IF;

            EXECUTE q;
        END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 1: CORE TABLES (High Certainty they exist)
-- =====================================================

-- 1. PROFILES
SELECT pg_temp.safe_create_policy('profiles', 'profiles_select_own', 'SELECT', 'public', 'auth.uid() = id', NULL);
SELECT pg_temp.safe_create_policy('profiles', 'profiles_update_own', 'UPDATE', 'public', 'auth.uid() = id', NULL);
SELECT pg_temp.safe_create_policy('profiles', 'profiles_insert_own', 'INSERT', 'public', NULL, 'auth.uid() = id');

-- 2. GMB ACCOUNTS
SELECT pg_temp.safe_create_policy('gmb_accounts', 'gmb_accounts_user_all', 'ALL', 'public', 'auth.uid() = user_id', 'auth.uid() = user_id');

-- 3. GMB LOCATIONS
SELECT pg_temp.safe_create_policy('gmb_locations', 'gmb_locations_user_all', 'ALL', 'public', 'auth.uid() = user_id', 'auth.uid() = user_id');

-- 4. GMB REVIEWS
SELECT pg_temp.safe_create_policy('gmb_reviews', 'gmb_reviews_user_all', 'ALL', 'public', 'auth.uid() = user_id', 'auth.uid() = user_id');

-- 5. GMB POSTS
SELECT pg_temp.safe_create_policy('gmb_posts', 'gmb_posts_user_all', 'ALL', 'public', 'auth.uid() = user_id', 'auth.uid() = user_id');

-- 6. GMB MEDIA
SELECT pg_temp.safe_create_policy('gmb_media', 'gmb_media_user_all', 'ALL', 'public', 'auth.uid() = user_id', 'auth.uid() = user_id');

-- 7. GMB QUESTIONS
SELECT pg_temp.safe_create_policy('gmb_questions', 'gmb_questions_user_all', 'ALL', 'public', 'auth.uid() = user_id', 'auth.uid() = user_id');

-- =====================================================
-- PART 2: SENSITIVE & SERVICE TABLES (Strict Locking)
-- =====================================================

-- GMB Secrets (Service Role Only)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'gmb_secrets') THEN
        ALTER TABLE gmb_secrets ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "service_only" ON gmb_secrets;
        CREATE POLICY "service_only" ON gmb_secrets FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Rate Limit Requests (Service Role Only)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'rate_limit_requests') THEN
        ALTER TABLE rate_limit_requests ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "service_only" ON rate_limit_requests;
        CREATE POLICY "service_only" ON rate_limit_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- =====================================================
-- PART 3: CONDITIONAL TABLES (Fixes your Error)
-- =====================================================
-- These blocks check if the table exists first. If not, they do nothing.

-- Gamification: user_progress
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_progress') THEN
        ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "user_progress_own" ON user_progress;
        CREATE POLICY "user_progress_own" ON user_progress FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Gamification: user_achievements
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_achievements') THEN
        ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "user_achievements_own" ON user_achievements;
        CREATE POLICY "user_achievements_own" ON user_achievements FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Teams
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'teams') THEN
        ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "teams_member_access" ON teams;
        -- Complex policy usually needed here, simple placeholder for safety
        CREATE POLICY "teams_member_access" ON teams FOR SELECT USING (
            EXISTS (SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = auth.uid())
        );
    END IF;
END $$;

-- Sync Queue (Hybrid Access)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'sync_queue') THEN
        ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "user_view_insert_queue" ON sync_queue;
        CREATE POLICY "user_view_insert_queue" ON sync_queue FOR ALL USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "service_manage_queue" ON sync_queue;
        CREATE POLICY "service_manage_queue" ON sync_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- =====================================================
-- PART 4: CLEANUP
-- =====================================================

-- Drop the temporary helper function
DROP FUNCTION pg_temp.safe_create_policy;

COMMIT;
