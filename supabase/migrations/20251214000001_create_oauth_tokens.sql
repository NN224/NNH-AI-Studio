-- =====================================================
-- Create OAuth Tokens Table
-- =====================================================
-- This table stores OAuth tokens with encryption support
-- =====================================================

-- Create oauth_tokens table if not exists
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider TEXT DEFAULT 'google',
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  token_type TEXT DEFAULT 'Bearer',
  is_encrypted BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_account_id ON oauth_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

-- Enable RLS
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own tokens" ON oauth_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE oauth_tokens IS 'Stores OAuth tokens for external services';
COMMENT ON COLUMN oauth_tokens.is_encrypted IS 'Indicates if tokens are stored in vault';
COMMENT ON COLUMN oauth_tokens.access_token IS 'Access token - set to VAULT_ENCRYPTED if stored in vault';
COMMENT ON COLUMN oauth_tokens.refresh_token IS 'Refresh token - set to VAULT_ENCRYPTED if stored in vault';

-- =====================================================
-- Create helper functions for token management
-- =====================================================

-- Function to store encrypted token reference
CREATE OR REPLACE FUNCTION store_encrypted_token(
  p_user_id UUID,
  p_account_id TEXT,
  p_access_token TEXT DEFAULT NULL,
  p_refresh_token TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_token_id UUID;
BEGIN
  INSERT INTO oauth_tokens (
    user_id,
    account_id,
    access_token,
    refresh_token,
    expires_at,
    is_encrypted
  ) VALUES (
    p_user_id,
    p_account_id,
    CASE WHEN p_access_token IS NOT NULL THEN 'VAULT_ENCRYPTED' ELSE NULL END,
    CASE WHEN p_refresh_token IS NOT NULL THEN 'VAULT_ENCRYPTED' ELSE NULL END,
    p_expires_at,
    true
  )
  ON CONFLICT (user_id, account_id) DO UPDATE
  SET
    access_token = CASE WHEN p_access_token IS NOT NULL THEN 'VAULT_ENCRYPTED' ELSE oauth_tokens.access_token END,
    refresh_token = CASE WHEN p_refresh_token IS NOT NULL THEN 'VAULT_ENCRYPTED' ELSE oauth_tokens.refresh_token END,
    expires_at = COALESCE(p_expires_at, oauth_tokens.expires_at),
    is_encrypted = true,
    updated_at = NOW()
  RETURNING id INTO v_token_id;

  RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION store_encrypted_token TO authenticated, service_role;

-- =====================================================
-- Create audit table for token operations
-- =====================================================

CREATE TABLE IF NOT EXISTS token_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  operation TEXT NOT NULL CHECK (operation IN ('store', 'retrieve', 'delete', 'migrate', 'refresh')),
  token_type TEXT,
  account_id TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_token_audit_user_id ON token_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_token_audit_created_at ON token_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE token_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit logs
CREATE POLICY "Users can view own token audit logs" ON token_audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Policy: Service role can insert
CREATE POLICY "Service role can insert token audit logs" ON token_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- =====================================================
-- Success Message
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'OAuth tokens table created successfully!';
  RAISE NOTICE 'Tokens can now be encrypted using Supabase Vault';
  RAISE NOTICE 'Use vault-service.ts to store/retrieve encrypted tokens';
END $$;
