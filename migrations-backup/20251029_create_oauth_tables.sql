-- Migration: Create OAuth tables for Google My Business authentication
-- Created: 2025-10-29
-- Description: Creates oauth_states and oauth_tokens tables to support OAuth flow

-- Create oauth_states table for storing OAuth state parameters
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create oauth_tokens table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON public.oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON public.oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON public.oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_used ON public.oauth_states(used);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON public.oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON public.oauth_tokens(expires_at);

-- Enable Row Level Security
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oauth_states table
CREATE POLICY "Users can view their own oauth states"
  ON public.oauth_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own oauth states"
  ON public.oauth_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own oauth states"
  ON public.oauth_states FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own oauth states"
  ON public.oauth_states FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for oauth_tokens table
CREATE POLICY "Users can view their own oauth tokens"
  ON public.oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own oauth tokens"
  ON public.oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own oauth tokens"
  ON public.oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own oauth tokens"
  ON public.oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.oauth_states IS 'Stores temporary OAuth state parameters for secure OAuth flow';
COMMENT ON COLUMN public.oauth_states.state IS 'Unique random state parameter for OAuth security';
COMMENT ON COLUMN public.oauth_states.user_id IS 'Reference to the user initiating the OAuth flow';
COMMENT ON COLUMN public.oauth_states.expires_at IS 'When this state expires (typically 30 minutes)';
COMMENT ON COLUMN public.oauth_states.used IS 'Whether this state has been used in the callback';

COMMENT ON TABLE public.oauth_tokens IS 'Stores OAuth tokens for authenticated services';
COMMENT ON COLUMN public.oauth_tokens.user_id IS 'Reference to the user who owns these tokens';
COMMENT ON COLUMN public.oauth_tokens.access_token IS 'OAuth access token for API calls';
COMMENT ON COLUMN public.oauth_tokens.refresh_token IS 'OAuth refresh token for renewing access';
COMMENT ON COLUMN public.oauth_tokens.expires_at IS 'When the access token expires';

COMMENT ON POLICY "Users can view their own oauth states" ON public.oauth_states 
  IS 'Allow users to view only their own OAuth state records';
COMMENT ON POLICY "Users can view their own oauth tokens" ON public.oauth_tokens 
  IS 'Allow users to view only their own OAuth tokens';