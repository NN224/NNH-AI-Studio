-- ============================================================================
-- Migration: Deprecate Database-Based Rate Limiting
-- ============================================================================
--
-- This migration removes the legacy database-based rate limiting in favor of
-- the Redis-based rate limiting system (lib/rate-limit.ts using Upstash Redis).
--
-- The database-based approach was causing performance issues due to:
-- 1. Write-per-request overhead
-- 2. Database connection exhaustion under load
-- 3. Inefficient for serverless environments
--
-- The new Redis-based system provides:
-- 1. Sub-millisecond rate limit checks
-- 2. Distributed rate limiting across all edge functions
-- 3. In-memory fallback for development/testing
--
-- ============================================================================

-- Drop the cleanup function first (depends on the table)
DROP FUNCTION IF EXISTS cleanup_rate_limit_requests();

-- Drop indexes before dropping the table
DROP INDEX IF EXISTS idx_rate_limit_requests_user_id;
DROP INDEX IF EXISTS idx_rate_limit_requests_endpoint;
DROP INDEX IF EXISTS idx_rate_limit_requests_created_at;
DROP INDEX IF EXISTS idx_rate_limit_requests_user_endpoint_time;

-- Drop any RLS policies on the table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rate_limit_requests') THEN
        -- Drop all policies on the table
        DROP POLICY IF EXISTS "service_only" ON rate_limit_requests;
        DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limit_requests;
        DROP POLICY IF EXISTS "System can manage rate limits" ON rate_limit_requests;
    END IF;
END $$;

-- Drop the deprecated rate_limit_requests table
DROP TABLE IF EXISTS rate_limit_requests CASCADE;

-- Add a comment to document this change
COMMENT ON SCHEMA public IS 'Rate limiting has been moved from database to Redis (Upstash) for better performance. See lib/rate-limit.ts for the new implementation.';
