-- =====================================================
-- Migration: Sync Production Schema
-- Description: Add missing tables, remove duplicates, clean up
-- Author: AI Assistant
-- Date: 2025-11-25
-- =====================================================

-- =====================================================
-- 1. Add Missing oauth_tokens Table
-- =====================================================

-- Create oauth_tokens table (was missing in production)
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google', 'youtube', etc.
  access_token TEXT,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON public.oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON public.oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON public.oauth_tokens(expires_at);

-- Enable Row Level Security
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oauth_tokens
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

-- Add updated_at trigger
CREATE TRIGGER set_oauth_tokens_updated_at
  BEFORE UPDATE ON public.oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Add comment
COMMENT ON TABLE public.oauth_tokens IS
'Stores OAuth tokens for authenticated services (Google, YouTube, etc.)';

-- =====================================================
-- 2. Clean Up Duplicate RLS Policies
-- =====================================================

-- ai_settings - remove old duplicates
DROP POLICY IF EXISTS "ai_settings_delete_owner" ON public.ai_settings;
DROP POLICY IF EXISTS "ai_settings_insert_owner" ON public.ai_settings;
DROP POLICY IF EXISTS "ai_settings_select_owner" ON public.ai_settings;
DROP POLICY IF EXISTS "ai_settings_update_owner" ON public.ai_settings;

-- gmb_accounts - remove old duplicates
DROP POLICY IF EXISTS "gmb_accounts_delete_own" ON public.gmb_accounts;
DROP POLICY IF EXISTS "gmb_accounts_insert_own" ON public.gmb_accounts;
DROP POLICY IF EXISTS "gmb_accounts_select_own" ON public.gmb_accounts;
DROP POLICY IF EXISTS "gmb_accounts_update_own" ON public.gmb_accounts;

-- gmb_locations - remove old duplicates (keep newer ones)
DROP POLICY IF EXISTS "gmb_locations_delete" ON public.gmb_locations;
DROP POLICY IF EXISTS "gmb_locations_insert" ON public.gmb_locations;
DROP POLICY IF EXISTS "gmb_locations_select" ON public.gmb_locations;
DROP POLICY IF EXISTS "gmb_locations_update" ON public.gmb_locations;
DROP POLICY IF EXISTS "gmb_locations_delete_owner" ON public.gmb_locations;
DROP POLICY IF EXISTS "gmb_locations_insert_owner" ON public.gmb_locations;
DROP POLICY IF EXISTS "gmb_locations_select_owner" ON public.gmb_locations;
DROP POLICY IF EXISTS "gmb_locations_update_owner" ON public.gmb_locations;

-- gmb_posts - remove old duplicates
DROP POLICY IF EXISTS "gmb_posts_delete_own" ON public.gmb_posts;
DROP POLICY IF EXISTS "gmb_posts_insert_own" ON public.gmb_posts;
DROP POLICY IF EXISTS "gmb_posts_select_own" ON public.gmb_posts;
DROP POLICY IF EXISTS "gmb_posts_update_own" ON public.gmb_posts;

-- profiles - remove old duplicates
DROP POLICY IF EXISTS "profiles_delete_owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;

-- activity_logs - remove duplicates
DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_logs;

-- ai_requests - remove duplicates
DROP POLICY IF EXISTS "Users can insert own AI requests" ON public.ai_requests;
DROP POLICY IF EXISTS "Users can read own AI requests" ON public.ai_requests;

-- notifications - remove duplicates
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

-- profiles - remove duplicates
DROP POLICY IF EXISTS "User can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "User can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "User can view own profile" ON public.profiles;

-- =====================================================
-- 3. Clean Up Duplicate Triggers
-- =====================================================

-- ai_settings - keep only one updated_at trigger
DROP TRIGGER IF EXISTS trigger_update_ai_settings_updated_at ON public.ai_settings;

-- gmb_reviews - keep only one updated_at trigger
DROP TRIGGER IF EXISTS trigger_update_gmb_reviews_updated_at ON public.gmb_reviews;

-- profiles - keep only one updated_at trigger
DROP TRIGGER IF EXISTS set_timestamp_on_profiles ON public.profiles;

-- sync_queue - keep only one updated_at trigger
DROP TRIGGER IF EXISTS update_sync_queue_updated_at ON public.sync_queue;

-- =====================================================
-- 4. Update mv_user_dashboard_stats to use oauth_tokens
-- =====================================================

-- Drop and recreate the materialized view with oauth_tokens support
DROP MATERIALIZED VIEW IF EXISTS mv_user_dashboard_stats CASCADE;

CREATE MATERIALIZED VIEW mv_user_dashboard_stats AS
SELECT
  u.id as user_id,

  -- Location stats
  COUNT(DISTINCT l.id) as locations_count,
  COUNT(DISTINCT CASE WHEN l.is_verified THEN l.id END) as verified_locations_count,

  -- Review stats
  COUNT(DISTINCT r.id) as reviews_count,
  COUNT(DISTINCT CASE WHEN r.reply_text IS NOT NULL THEN r.id END) as replied_reviews_count,
  COALESCE(AVG(r.rating), 0) as average_rating,

  -- Response rate
  CASE
    WHEN COUNT(DISTINCT r.id) > 0
    THEN ROUND((COUNT(DISTINCT CASE WHEN r.reply_text IS NOT NULL THEN r.id END)::numeric / COUNT(DISTINCT r.id)::numeric) * 100)
    ELSE 0
  END as response_rate_percent,

  -- Today's reviews (last 24 hours)
  COUNT(DISTINCT CASE
    WHEN r.review_date >= NOW() - INTERVAL '24 hours'
    THEN r.id
  END) as today_reviews_count,

  -- This week's reviews
  COUNT(DISTINCT CASE
    WHEN r.review_date >= NOW() - INTERVAL '7 days'
    THEN r.id
  END) as this_week_reviews_count,

  -- Last week's reviews (for growth calculation)
  COUNT(DISTINCT CASE
    WHEN r.review_date >= NOW() - INTERVAL '14 days'
    AND r.review_date < NOW() - INTERVAL '7 days'
    THEN r.id
  END) as last_week_reviews_count,

  -- Account stats
  COUNT(DISTINCT a.id) as accounts_count,
  COUNT(DISTINCT CASE WHEN a.is_active THEN a.id END) as active_accounts_count,

  -- YouTube stats (now using oauth_tokens)
  EXISTS(
    SELECT 1 FROM oauth_tokens ot
    WHERE ot.user_id = u.id
    AND ot.provider = 'youtube'
  ) as has_youtube,

  -- Last sync timestamp
  MAX(l.last_synced_at) as last_sync_at,

  -- Metadata
  NOW() as calculated_at

FROM profiles u
LEFT JOIN gmb_locations l ON l.user_id = u.id
LEFT JOIN gmb_reviews r ON r.user_id = u.id
LEFT JOIN gmb_accounts a ON a.user_id = u.id
GROUP BY u.id;

-- Recreate indexes
CREATE UNIQUE INDEX idx_mv_dashboard_stats_user_id
ON mv_user_dashboard_stats(user_id);

CREATE INDEX idx_mv_dashboard_stats_calculated_at
ON mv_user_dashboard_stats(calculated_at);

-- Refresh the view
SELECT refresh_dashboard_stats_view();

-- =====================================================
-- 5. Add Comments
-- =====================================================

COMMENT ON TABLE public.oauth_tokens IS
'OAuth tokens for external services - SYNCED with production on 2025-11-25';

COMMENT ON MATERIALIZED VIEW mv_user_dashboard_stats IS
'Pre-aggregated dashboard statistics - UPDATED to use oauth_tokens on 2025-11-25';

-- =====================================================
-- Success Message
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Schema sync complete!';
  RAISE NOTICE '- Added: oauth_tokens table';
  RAISE NOTICE '- Cleaned: duplicate RLS policies';
  RAISE NOTICE '- Cleaned: duplicate triggers';
  RAISE NOTICE '- Updated: mv_user_dashboard_stats to use oauth_tokens';
END $$;

