-- ============================================
-- NNH AI Studio - Complete SQL Setup
-- ============================================
-- Run this in Supabase SQL Editor to set up all tables
-- Date: 2025-01-02

-- ============================================
-- 1. Update oauth_tokens for YouTube support
-- ============================================
ALTER TABLE IF EXISTS public.oauth_tokens 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'gmb',
ADD COLUMN IF NOT EXISTS account_id TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Unique constraint for (user_id, provider)
DROP INDEX IF EXISTS public.idx_oauth_tokens_user_provider_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_tokens_user_provider_unique 
ON public.oauth_tokens(user_id, provider);

-- ============================================
-- 2. Create youtube_drafts table
-- ============================================
CREATE TABLE IF NOT EXISTS public.youtube_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  hashtags TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_youtube_drafts_user_id ON public.youtube_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_drafts_created_at ON public.youtube_drafts(created_at DESC);

-- Enable RLS
ALTER TABLE public.youtube_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own drafts" ON public.youtube_drafts;
CREATE POLICY "Users can view their own drafts"
  ON public.youtube_drafts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own drafts" ON public.youtube_drafts;
CREATE POLICY "Users can insert their own drafts"
  ON public.youtube_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own drafts" ON public.youtube_drafts;
CREATE POLICY "Users can update their own drafts"
  ON public.youtube_drafts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own drafts" ON public.youtube_drafts;
CREATE POLICY "Users can delete their own drafts"
  ON public.youtube_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.youtube_drafts IS 'Stores YouTube composer drafts';
COMMENT ON COLUMN public.youtube_drafts.title IS 'Video title';
COMMENT ON COLUMN public.youtube_drafts.description IS 'Video description';
COMMENT ON COLUMN public.youtube_drafts.hashtags IS 'Comma-separated hashtags';

-- ============================================
-- Success message
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE 'YouTube tables created successfully!';
END $$;

