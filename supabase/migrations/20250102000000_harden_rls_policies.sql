-- =====================================================
-- RLS HARDENING MIGRATION
-- =====================================================
-- Created: 2025-01-02
-- Purpose: Enforce strict Row Level Security on all critical tables
-- Security: Defense in Depth - assume API layer could be bypassed
-- =====================================================

BEGIN;

-- =====================================================
-- PART 1: AUDIT - Ensure RLS is ENABLED on ALL tables
-- =====================================================
-- This section ensures RLS is enabled even if it was somehow disabled

-- Core user data tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Sync system tables
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_worker_runs ENABLE ROW LEVEL SECURITY;

-- OAuth and security tables
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Logging tables
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Gamification tables
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Team tables (from 20251127 migration)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: DROP OVERLY PERMISSIVE POLICIES
-- =====================================================
-- Remove any policies that might allow unintended access

-- Drop any "public" or overly broad policies if they exist
DROP POLICY IF EXISTS "Allow public read" ON profiles;
DROP POLICY IF EXISTS "Allow public read" ON gmb_accounts;
DROP POLICY IF EXISTS "Allow public read" ON gmb_locations;
DROP POLICY IF EXISTS "Allow public read" ON gmb_reviews;
DROP POLICY IF EXISTS "Allow public read" ON gmb_posts;
DROP POLICY IF EXISTS "Allow public read" ON gmb_questions;

-- =====================================================
-- PART 3: ENFORCE STRICT USER ISOLATION POLICIES
-- =====================================================
-- Rule: Users can ONLY access rows where user_id = auth.uid()

-- -------------------- PROFILES --------------------
-- Drop existing policy and recreate with explicit operations
DROP POLICY IF EXISTS "Users can view and edit own profile" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- -------------------- GMB ACCOUNTS --------------------
DROP POLICY IF EXISTS "Users can manage own GMB accounts" ON gmb_accounts;

CREATE POLICY "gmb_accounts_select_own" ON gmb_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gmb_accounts_insert_own" ON gmb_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gmb_accounts_update_own" ON gmb_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "gmb_accounts_delete_own" ON gmb_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- -------------------- GMB LOCATIONS --------------------
DROP POLICY IF EXISTS "Users can manage own locations" ON gmb_locations;

CREATE POLICY "gmb_locations_select_own" ON gmb_locations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gmb_locations_insert_own" ON gmb_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gmb_locations_update_own" ON gmb_locations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "gmb_locations_delete_own" ON gmb_locations
  FOR DELETE USING (auth.uid() = user_id);

-- -------------------- GMB REVIEWS --------------------
DROP POLICY IF EXISTS "Users can manage own reviews" ON gmb_reviews;

CREATE POLICY "gmb_reviews_select_own" ON gmb_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gmb_reviews_insert_own" ON gmb_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gmb_reviews_update_own" ON gmb_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "gmb_reviews_delete_own" ON gmb_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- -------------------- GMB QUESTIONS --------------------
DROP POLICY IF EXISTS "Users can manage own questions" ON gmb_questions;

CREATE POLICY "gmb_questions_select_own" ON gmb_questions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gmb_questions_insert_own" ON gmb_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gmb_questions_update_own" ON gmb_questions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "gmb_questions_delete_own" ON gmb_questions
  FOR DELETE USING (auth.uid() = user_id);

-- -------------------- GMB POSTS --------------------
DROP POLICY IF EXISTS "Users can manage own posts" ON gmb_posts;

CREATE POLICY "gmb_posts_select_own" ON gmb_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gmb_posts_insert_own" ON gmb_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gmb_posts_update_own" ON gmb_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "gmb_posts_delete_own" ON gmb_posts
  FOR DELETE USING (auth.uid() = user_id);

-- -------------------- GMB MEDIA --------------------
DROP POLICY IF EXISTS "Users can manage own media" ON gmb_media;

CREATE POLICY "gmb_media_select_own" ON gmb_media
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gmb_media_insert_own" ON gmb_media
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gmb_media_update_own" ON gmb_media
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "gmb_media_delete_own" ON gmb_media
  FOR DELETE USING (auth.uid() = user_id);

-- -------------------- GMB PERFORMANCE METRICS --------------------
DROP POLICY IF EXISTS "Users can view own performance metrics" ON gmb_performance_metrics;

CREATE POLICY "gmb_performance_metrics_select_own" ON gmb_performance_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gmb_performance_metrics_insert_own" ON gmb_performance_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gmb_performance_metrics_update_own" ON gmb_performance_metrics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "gmb_performance_metrics_delete_own" ON gmb_performance_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- -------------------- USER PROGRESS --------------------
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;

CREATE POLICY "user_progress_select_own" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_progress_insert_own" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_progress_update_own" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_progress_delete_own" ON user_progress
  FOR DELETE USING (auth.uid() = user_id);

-- -------------------- USER ACHIEVEMENTS --------------------
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can update own achievements" ON user_achievements;

CREATE POLICY "user_achievements_select_own" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_insert_own" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_achievements_update_own" ON user_achievements
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_delete_own" ON user_achievements
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- PART 4: SECURE SERVICE-ONLY TABLES
-- =====================================================
-- These tables should ONLY be accessible by service_role

-- GMB Secrets - CRITICAL: Contains OAuth tokens
-- Ensure NO user access policies exist
DROP POLICY IF EXISTS "Service role has full access to gmb_secrets" ON gmb_secrets;
DROP POLICY IF EXISTS "Block all user access to gmb_secrets" ON gmb_secrets;
DROP POLICY IF EXISTS "Block all anon access to gmb_secrets" ON gmb_secrets;

CREATE POLICY "gmb_secrets_service_only" ON gmb_secrets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "gmb_secrets_block_authenticated" ON gmb_secrets
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "gmb_secrets_block_anon" ON gmb_secrets
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Sync Worker Runs - Internal system table
DROP POLICY IF EXISTS "Service role has full access to sync_worker_runs" ON sync_worker_runs;

CREATE POLICY "sync_worker_runs_service_only" ON sync_worker_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "sync_worker_runs_block_authenticated" ON sync_worker_runs
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "sync_worker_runs_block_anon" ON sync_worker_runs
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- =====================================================
-- PART 5: HYBRID ACCESS TABLES (User + Service Role)
-- =====================================================
-- These tables need user read access but service role write access

-- Sync Queue
DROP POLICY IF EXISTS "Users can view own sync jobs" ON sync_queue;
DROP POLICY IF EXISTS "Users can insert own sync jobs" ON sync_queue;
DROP POLICY IF EXISTS "Service role has full access to sync_queue" ON sync_queue;

CREATE POLICY "sync_queue_select_own" ON sync_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sync_queue_insert_own" ON sync_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users cannot update/delete - only service role can
CREATE POLICY "sync_queue_service_update" ON sync_queue
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "sync_queue_service_delete" ON sync_queue
  FOR DELETE TO service_role USING (true);

-- Sync Status
DROP POLICY IF EXISTS "Users can view own sync status" ON sync_status;
DROP POLICY IF EXISTS "Service role has full access to sync_status" ON sync_status;

CREATE POLICY "sync_status_select_own" ON sync_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sync_status_service_all" ON sync_status
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Activity Logs - Users can read, service can write
DROP POLICY IF EXISTS "Users can view own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Service role can insert activity logs" ON activity_logs;

CREATE POLICY "activity_logs_select_own" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "activity_logs_service_insert" ON activity_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- Error Logs - Users can read own, service can manage all
DROP POLICY IF EXISTS "Users can view own error logs" ON error_logs;
DROP POLICY IF EXISTS "Service role can manage error logs" ON error_logs;

CREATE POLICY "error_logs_select_own" ON error_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "error_logs_service_all" ON error_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- PART 6: OAUTH STATES - Special handling
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own OAuth states" ON oauth_states;
DROP POLICY IF EXISTS "Service role can cleanup expired states" ON oauth_states;

CREATE POLICY "oauth_states_select_own" ON oauth_states
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "oauth_states_insert_own" ON oauth_states
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "oauth_states_update_own" ON oauth_states
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "oauth_states_delete_own" ON oauth_states
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can cleanup expired states
CREATE POLICY "oauth_states_service_cleanup" ON oauth_states
  FOR DELETE TO service_role USING (expires_at < NOW());

-- =====================================================
-- PART 7: RATE LIMIT TABLE - No user access
-- =====================================================
-- Rate limit requests should only be managed by the system

ALTER TABLE rate_limit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_service_only" ON rate_limit_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "rate_limit_block_authenticated" ON rate_limit_requests
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "rate_limit_block_anon" ON rate_limit_requests
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- =====================================================
-- PART 8: FORCE RLS ON ALL TABLES (CRITICAL)
-- =====================================================
-- This ensures RLS cannot be bypassed even by table owners

ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE gmb_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE gmb_secrets FORCE ROW LEVEL SECURITY;
ALTER TABLE gmb_locations FORCE ROW LEVEL SECURITY;
ALTER TABLE gmb_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE gmb_questions FORCE ROW LEVEL SECURITY;
ALTER TABLE gmb_posts FORCE ROW LEVEL SECURITY;
ALTER TABLE gmb_media FORCE ROW LEVEL SECURITY;
ALTER TABLE gmb_performance_metrics FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_queue FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_status FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_worker_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE oauth_states FORCE ROW LEVEL SECURITY;
ALTER TABLE activity_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE error_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE user_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE user_achievements FORCE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_requests FORCE ROW LEVEL SECURITY;

-- Team tables
ALTER TABLE teams FORCE ROW LEVEL SECURITY;
ALTER TABLE team_members FORCE ROW LEVEL SECURITY;
ALTER TABLE team_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE autopilot_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE question_templates FORCE ROW LEVEL SECURITY;

-- =====================================================
-- PART 9: VERIFICATION QUERY (for auditing)
-- =====================================================
-- Run this query to verify RLS status:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

COMMENT ON TABLE gmb_secrets IS 'SECURE: OAuth tokens - service_role ONLY. User access BLOCKED.';
COMMENT ON TABLE sync_worker_runs IS 'INTERNAL: Worker execution logs - service_role ONLY.';
COMMENT ON TABLE rate_limit_requests IS 'INTERNAL: Rate limiting - service_role ONLY.';

COMMIT;
