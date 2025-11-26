-- ============================================
-- Migration: Cleanup Old Sync System
-- Date: 2025-11-24
-- Description: Remove old individual sync functions that are replaced by global sync system
-- ============================================

-- Note: This migration is OPTIONAL cleanup
-- The old sync system has been removed from the codebase
-- These database objects are no longer referenced
-- Run this ONLY if you want to clean up unused database objects

-- ============================================
-- 1. DROP OLD SYNC-RELATED FUNCTIONS (if they exist)
-- ============================================

-- Drop old sync location function (if exists from gmb-sync.ts)
DROP FUNCTION IF EXISTS public.sync_location(uuid);
DROP FUNCTION IF EXISTS public.sync_all_locations(uuid);

-- Drop old individual sync functions (if they exist)
DROP FUNCTION IF EXISTS public.sync_reviews_from_google(uuid, text);
DROP FUNCTION IF EXISTS public.sync_questions_from_google(uuid, text);
DROP FUNCTION IF EXISTS public.sync_posts_from_google(uuid, text);

-- ============================================
-- 2. VERIFY CURRENT SYNC SYSTEM
-- ============================================

-- Verify that the new transactional sync function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'sync_gmb_data_transactional'
  ) THEN
    RAISE EXCEPTION 'ERROR: New sync function sync_gmb_data_transactional does not exist. Please run 20251124_update_sync_rpc_with_posts_media.sql first!';
  END IF;

  RAISE NOTICE 'SUCCESS: New sync system verified - sync_gmb_data_transactional exists';
END $$;

-- ============================================
-- 3. CLEANUP OLD SYNC QUEUE ENTRIES (OPTIONAL)
-- ============================================

-- Archive old sync queue entries older than 30 days
-- Comment this out if you want to keep historical sync data
/*
UPDATE sync_queue
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{archived}',
  'true'::jsonb
)
WHERE created_at < NOW() - INTERVAL '30 days'
  AND status IN ('completed', 'failed');
*/

-- ============================================
-- 4. ADD MIGRATION TRACKING
-- ============================================

-- Track that cleanup was performed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'migration_log'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.migration_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      migration_name text NOT NULL,
      applied_at timestamptz DEFAULT NOW(),
      notes text
    );
  END IF;

  INSERT INTO public.migration_log (migration_name, notes)
  VALUES (
    '20251124_cleanup_old_sync_system',
    'Removed old individual sync functions. New global sync system (sync_gmb_data_transactional) is active.'
  );
END $$;

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify cleanup:

-- Check that old functions are gone
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition_preview
FROM pg_proc
WHERE proname LIKE '%sync%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Check current sync queue status
SELECT
  status,
  COUNT(*) as count,
  MAX(created_at) as last_sync
FROM sync_queue
GROUP BY status
ORDER BY status;

-- Verify new sync function signature
SELECT
  proname,
  pronargs as num_args,
  proargnames as arg_names
FROM pg_proc
WHERE proname = 'sync_gmb_data_transactional';

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

/*
-- If you need to rollback this migration:
-- The old sync functions were in application code (server actions)
-- not in the database, so there's nothing to rollback

-- Just note that this migration only cleaned up unused database objects
-- The actual sync logic is now in:
-- - server/actions/gmb-sync-v2.ts (NEW - active)
-- - Removed: server/actions/gmb-sync.ts (OLD - deleted)
*/
