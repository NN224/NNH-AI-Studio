-- Migration: Create missing tables from tables_columns_structure.json
-- Created: 2025-01-05
-- Description: Creates tables that exist in JSON but don't have migrations
-- This ensures database schema matches the JSON structure

-- ============================================
-- 1. CREATE competitor_tracking TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.competitor_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  competitor_gmb_id TEXT,
  distance_miles NUMERIC,
  average_rating NUMERIC,
  review_count INTEGER DEFAULT 0,
  post_frequency INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for competitor_tracking
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_location_id 
  ON public.competitor_tracking(location_id);
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_competitor_gmb_id 
  ON public.competitor_tracking(competitor_gmb_id);

-- Enable RLS
ALTER TABLE public.competitor_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view competitor tracking for their locations"
  ON public.competitor_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = competitor_tracking.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert competitor tracking for their locations"
  ON public.competitor_tracking FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = competitor_tracking.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update competitor tracking for their locations"
  ON public.competitor_tracking FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = competitor_tracking.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete competitor tracking for their locations"
  ON public.competitor_tracking FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = competitor_tracking.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.competitor_tracking IS 'Tracks competitor businesses for GMB locations';
COMMENT ON COLUMN public.competitor_tracking.location_id IS 'Foreign key to gmb_locations(id)';

-- ============================================
-- 2. CREATE autopilot_logs TABLE (preferred over ai_autopilot_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS public.autopilot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  details JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for autopilot_logs
CREATE INDEX IF NOT EXISTS idx_autopilot_logs_location_id 
  ON public.autopilot_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_logs_status 
  ON public.autopilot_logs(status);
CREATE INDEX IF NOT EXISTS idx_autopilot_logs_action_type 
  ON public.autopilot_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_autopilot_logs_created_at 
  ON public.autopilot_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.autopilot_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view autopilot logs for their locations"
  ON public.autopilot_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = autopilot_logs.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert autopilot logs for their locations"
  ON public.autopilot_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = autopilot_logs.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update autopilot logs for their locations"
  ON public.autopilot_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = autopilot_logs.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete autopilot logs for their locations"
  ON public.autopilot_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = autopilot_logs.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.autopilot_logs IS 'Logs for autopilot actions on GMB locations';
COMMENT ON COLUMN public.autopilot_logs.location_id IS 'Foreign key to gmb_locations(id)';

-- ============================================
-- 3. CREATE autopilot_settings TABLE (preferred over ai_autopilot_settings)
-- ============================================
CREATE TABLE IF NOT EXISTS public.autopilot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_min_rating INTEGER DEFAULT 1,
  reply_tone TEXT DEFAULT 'professional' CHECK (reply_tone IN ('professional', 'friendly', 'casual', 'formal')),
  smart_posting_enabled BOOLEAN DEFAULT false,
  post_frequency INTEGER DEFAULT 3,
  post_days JSONB DEFAULT '[]'::jsonb,
  post_times JSONB DEFAULT '[]'::jsonb,
  content_preferences JSONB DEFAULT '{}'::jsonb,
  competitor_monitoring_enabled BOOLEAN DEFAULT false,
  insights_reports_enabled BOOLEAN DEFAULT false,
  report_frequency TEXT DEFAULT 'weekly' CHECK (report_frequency IN ('daily', 'weekly', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id)
);

-- Indexes for autopilot_settings
CREATE INDEX IF NOT EXISTS idx_autopilot_settings_location_id 
  ON public.autopilot_settings(location_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_settings_user_id 
  ON public.autopilot_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_settings_enabled 
  ON public.autopilot_settings(is_enabled) WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE public.autopilot_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own autopilot settings"
  ON public.autopilot_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own autopilot settings"
  ON public.autopilot_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own autopilot settings"
  ON public.autopilot_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own autopilot settings"
  ON public.autopilot_settings FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.autopilot_settings IS 'Autopilot settings for GMB locations';
COMMENT ON COLUMN public.autopilot_settings.location_id IS 'Foreign key to gmb_locations(id)';
COMMENT ON COLUMN public.autopilot_settings.user_id IS 'Foreign key to auth.users(id)';

-- ============================================
-- 4. CREATE citation_listings TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.citation_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.citation_sources(id) ON DELETE CASCADE,
  listing_url TEXT,
  business_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'claimed', 'unclaimed', 'error')),
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  consistency_score INTEGER DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for citation_listings
CREATE INDEX IF NOT EXISTS idx_citation_listings_location_id 
  ON public.citation_listings(location_id);
CREATE INDEX IF NOT EXISTS idx_citation_listings_source_id 
  ON public.citation_listings(source_id);
CREATE INDEX IF NOT EXISTS idx_citation_listings_status 
  ON public.citation_listings(status);
CREATE INDEX IF NOT EXISTS idx_citation_listings_consistency_score 
  ON public.citation_listings(consistency_score);

-- Enable RLS
ALTER TABLE public.citation_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view citation listings for their locations"
  ON public.citation_listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = citation_listings.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert citation listings for their locations"
  ON public.citation_listings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = citation_listings.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update citation listings for their locations"
  ON public.citation_listings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = citation_listings.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete citation listings for their locations"
  ON public.citation_listings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.gmb_locations 
      WHERE gmb_locations.id = citation_listings.location_id 
      AND gmb_locations.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.citation_listings IS 'Citation listings for GMB locations';
COMMENT ON COLUMN public.citation_listings.location_id IS 'Foreign key to gmb_locations(id)';

-- ============================================
-- 5. CREATE citation_sources TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.citation_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  url_pattern TEXT,
  domain_authority INTEGER DEFAULT 0 CHECK (domain_authority >= 0 AND domain_authority <= 100),
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for citation_sources
CREATE INDEX IF NOT EXISTS idx_citation_sources_name 
  ON public.citation_sources(name);
CREATE INDEX IF NOT EXISTS idx_citation_sources_category 
  ON public.citation_sources(category);
CREATE INDEX IF NOT EXISTS idx_citation_sources_active 
  ON public.citation_sources(is_active) WHERE is_active = true;

-- Enable RLS (citation_sources is public read-only)
ALTER TABLE public.citation_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow all authenticated users to read
CREATE POLICY "Anyone can view citation sources"
  ON public.citation_sources FOR SELECT
  USING (true);

-- Only admins can modify (if needed, add admin check)
-- For now, we'll allow authenticated users to insert/update
CREATE POLICY "Authenticated users can manage citation sources"
  ON public.citation_sources FOR ALL
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.citation_sources IS 'Citation sources for business listings';
COMMENT ON COLUMN public.citation_sources.domain_authority IS 'Domain authority score (0-100)';

-- ============================================
-- 6. CREATE ai_requests TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.gmb_locations(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'groq', 'deepseek', 'together', 'anthropic')),
  model TEXT NOT NULL,
  feature TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ai_requests
CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id 
  ON public.ai_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_location_id 
  ON public.ai_requests(location_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_provider 
  ON public.ai_requests(provider);
CREATE INDEX IF NOT EXISTS idx_ai_requests_feature 
  ON public.ai_requests(feature);
CREATE INDEX IF NOT EXISTS idx_ai_requests_created_at 
  ON public.ai_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_user_created 
  ON public.ai_requests(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own AI requests"
  ON public.ai_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI requests"
  ON public.ai_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI requests"
  ON public.ai_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI requests"
  ON public.ai_requests FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_requests IS 'Tracks AI API requests for analytics and billing';
COMMENT ON COLUMN public.ai_requests.user_id IS 'Foreign key to auth.users(id)';
COMMENT ON COLUMN public.ai_requests.location_id IS 'Foreign key to gmb_locations(id), nullable';

-- ============================================
-- 7. CREATE ai_settings TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'groq', 'deepseek', 'together', 'anthropic')),
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 999,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Indexes for ai_settings
CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id 
  ON public.ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_settings_provider 
  ON public.ai_settings(provider);
CREATE INDEX IF NOT EXISTS idx_ai_settings_active 
  ON public.ai_settings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_settings_priority 
  ON public.ai_settings(priority);

-- Enable RLS
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own AI settings"
  ON public.ai_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI settings"
  ON public.ai_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings"
  ON public.ai_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI settings"
  ON public.ai_settings FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_settings IS 'AI provider settings for users';
COMMENT ON COLUMN public.ai_settings.user_id IS 'Foreign key to auth.users(id)';
COMMENT ON COLUMN public.ai_settings.priority IS 'Lower number = higher priority when multiple providers are active';

-- ============================================
-- 8. CREATE TRIGGER FUNCTIONS FOR updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_update_competitor_tracking_updated_at
  BEFORE UPDATE ON public.competitor_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_autopilot_logs_updated_at
  BEFORE UPDATE ON public.autopilot_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_autopilot_settings_updated_at
  BEFORE UPDATE ON public.autopilot_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_citation_listings_updated_at
  BEFORE UPDATE ON public.citation_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_citation_sources_updated_at
  BEFORE UPDATE ON public.citation_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_ai_settings_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

