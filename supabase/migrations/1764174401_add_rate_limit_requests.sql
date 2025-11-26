-- Migration: Add rate_limit_requests table
-- Created: 2025-11-26
-- Description: Track API rate limiting per user/endpoint for request throttling

BEGIN;

-- =====================================================
-- CREATE TABLE: rate_limit_requests
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Request Info
  action TEXT NOT NULL,
  endpoint TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_user_id
  ON rate_limit_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_endpoint
  ON rate_limit_requests(endpoint);

CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_created_at
  ON rate_limit_requests(created_at);

-- Composite index for rate limit checks (most common query)
CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_user_endpoint_time
  ON rate_limit_requests(user_id, endpoint, created_at);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE rate_limit_requests IS 'API rate limiting tracking for request throttling';
COMMENT ON COLUMN rate_limit_requests.id IS 'Primary key UUID';
COMMENT ON COLUMN rate_limit_requests.user_id IS 'User identifier (UUID or IP address as TEXT)';
COMMENT ON COLUMN rate_limit_requests.action IS 'Action performed (e.g., api_request, review_reply)';
COMMENT ON COLUMN rate_limit_requests.endpoint IS 'API endpoint path';
COMMENT ON COLUMN rate_limit_requests.ip_address IS 'Client IP address (INET type)';
COMMENT ON COLUMN rate_limit_requests.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN rate_limit_requests.created_at IS 'When the request was made';

-- =====================================================
-- CLEANUP FUNCTION (Optional - for maintenance)
-- =====================================================

-- Function to clean up old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limit_requests
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

COMMENT ON FUNCTION cleanup_rate_limit_requests() IS 'Clean up rate limit records older than 1 hour';

COMMIT;
