-- Fix oauth_states table for OAuth callback flow
-- Created: 2025-11-27
-- Description: Add missing 'used' and 'provider' columns

-- Add 'used' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_states' AND column_name = 'used'
  ) THEN
    ALTER TABLE oauth_states ADD COLUMN used BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add 'provider' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_states' AND column_name = 'provider'
  ) THEN
    ALTER TABLE oauth_states ADD COLUMN provider TEXT DEFAULT 'google';
  END IF;
END $$;

-- Add index for faster state lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_state_used ON oauth_states(state, used);

-- Clean up expired states (older than 1 hour)
DELETE FROM oauth_states WHERE expires_at < NOW() - INTERVAL '1 hour';

COMMENT ON COLUMN oauth_states.used IS 'Whether this state has been consumed by the OAuth callback';
