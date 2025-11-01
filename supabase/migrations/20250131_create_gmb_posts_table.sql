-- Migration: Create gmb_posts table if it doesn't exist
-- Created: 2025-01-31
-- Description: Creates the gmb_posts table for composing and scheduling Business Profile posts

-- GMB Posts table for composing and scheduling Business Profile posts
CREATE TABLE IF NOT EXISTS public.gmb_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  call_to_action TEXT,
  call_to_action_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','published','failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  provider_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.gmb_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "gmb_posts_select_own" ON public.gmb_posts
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "gmb_posts_insert_own" ON public.gmb_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "gmb_posts_update_own" ON public.gmb_posts
    FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "gmb_posts_delete_own" ON public.gmb_posts
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS gmb_posts_user_loc_idx ON public.gmb_posts(user_id, location_id, status);

COMMENT ON TABLE public.gmb_posts IS 'Stores GMB posts for composing and scheduling Business Profile posts';

