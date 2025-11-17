-- ============================================
-- COMPLETE SUPABASE SCHEMA FOR NNH-AI-STUDIO
-- ============================================

-- 1. GMB ACCOUNTS TABLE
-- Stores Google My Business account credentials
CREATE TABLE IF NOT EXISTS public.gmb_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL, -- GMB account ID from Google
  account_name TEXT,
  email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_id)
);

-- Indexes for gmb_accounts
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_user_id ON public.gmb_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_account_id ON public.gmb_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_is_active ON public.gmb_accounts(is_active) WHERE is_active = true;

-- 2. GMB LOCATIONS TABLE
-- Stores business location information from GMB
CREATE TABLE IF NOT EXISTS public.gmb_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID NOT NULL REFERENCES public.gmb_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL, -- Full resource name from GMB (e.g., locations/12345)
  normalized_location_id TEXT, -- Just the numeric ID
  location_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  category TEXT, -- Primary category
  additional_categories TEXT[], -- Array of additional categories
  description TEXT,
  short_description TEXT,
  
  -- Media URLs
  logo_url TEXT,
  cover_photo_url TEXT,
  
  -- Special Links
  menu_url TEXT,
  booking_url TEXT,
  order_url TEXT,
  appointment_url TEXT,
  
  -- Reviews & Rating
  rating NUMERIC(3,2), -- e.g., 4.75
  review_count INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2), -- e.g., 98.50
  calculated_response_rate NUMERIC(5,2),
  
  -- Business Hours (JSON)
  business_hours JSONB,
  regularhours JSONB,
  
  -- Attributes & Features
  from_the_business TEXT[], -- Array of attribute strings
  
  -- Status & Settings
  is_active BOOLEAN DEFAULT true,
  is_syncing BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  service_area_enabled BOOLEAN DEFAULT false,
  opening_date DATE,
  
  -- Profile Completeness
  profile_completeness INTEGER DEFAULT 0,
  
  -- Geolocation
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  latlng JSONB,
  
  -- Metadata (stores full GMB API response)
  metadata JSONB,
  
  -- AI & Health
  ai_insights JSONB,
  health_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  
  -- Timestamps
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(gmb_account_id, location_id)
);

-- Indexes for gmb_locations
CREATE INDEX IF NOT EXISTS idx_gmb_locations_user_id ON public.gmb_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_locations_gmb_account_id ON public.gmb_locations(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_gmb_locations_location_id ON public.gmb_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_locations_is_active ON public.gmb_locations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gmb_locations_logo_url ON public.gmb_locations(logo_url) WHERE logo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gmb_locations_cover_photo_url ON public.gmb_locations(cover_photo_url) WHERE cover_photo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gmb_locations_metadata_gin ON public.gmb_locations USING gin(metadata);

-- 3. GMB REVIEWS TABLE
-- Stores customer reviews from GMB
CREATE TABLE IF NOT EXISTS public.gmb_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES public.gmb_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Review Identifiers
  review_id TEXT NOT NULL, -- Full resource name from GMB
  external_review_id TEXT, -- GMB's reviewId
  
  -- Review Content
  reviewer_name TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  review_text TEXT, -- Alias for comment
  review_date TIMESTAMPTZ NOT NULL,
  
  -- Reply Information
  has_reply BOOLEAN DEFAULT false,
  has_response BOOLEAN DEFAULT false, -- Alias for has_reply
  reply_text TEXT,
  review_reply TEXT, -- Alias for reply_text
  response_text TEXT, -- Another alias for reply_text
  replied_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ, -- Alias for replied_at
  
  -- AI Analysis
  ai_sentiment TEXT, -- positive, neutral, negative
  ai_summary TEXT,
  ai_suggested_reply TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, replied, archived
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(location_id, review_id)
);

-- Indexes for gmb_reviews
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_location_id ON public.gmb_reviews(location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_user_id ON public.gmb_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_has_reply ON public.gmb_reviews(has_reply);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_review_date ON public.gmb_reviews(review_date DESC);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_rating ON public.gmb_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_status ON public.gmb_reviews(status);

-- 4. GMB QUESTIONS TABLE
-- Stores Q&A from GMB
CREATE TABLE IF NOT EXISTS public.gmb_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES public.gmb_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Question Identifiers
  question_id TEXT NOT NULL, -- Full resource name from GMB
  external_question_id TEXT,
  
  -- Question Content
  author_name TEXT,
  question_text TEXT NOT NULL,
  question_date TIMESTAMPTZ NOT NULL,
  
  -- Answer Information
  answer_text TEXT,
  answer_status TEXT DEFAULT 'pending', -- pending, answered
  answer_date TIMESTAMPTZ,
  
  -- AI Analysis
  ai_suggested_answer TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(location_id, question_id)
);

-- Indexes for gmb_questions
CREATE INDEX IF NOT EXISTS idx_gmb_questions_location_id ON public.gmb_questions(location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_questions_user_id ON public.gmb_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_questions_answer_status ON public.gmb_questions(answer_status);
CREATE INDEX IF NOT EXISTS idx_gmb_questions_question_date ON public.gmb_questions(question_date DESC);

-- 5. GMB MEDIA TABLE
-- Stores media items (photos, videos) from GMB
CREATE TABLE IF NOT EXISTS public.gmb_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES public.gmb_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Media Identifiers
  external_media_id TEXT NOT NULL, -- Full resource name from GMB
  
  -- Media Information
  type TEXT, -- PHOTO, VIDEO
  category TEXT, -- LOGO, COVER, PROFILE, EXTERIOR, INTERIOR, ADDITIONAL, etc.
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(location_id, external_media_id)
);

-- Indexes for gmb_media
CREATE INDEX IF NOT EXISTS idx_gmb_media_location_id ON public.gmb_media(location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_media_user_id ON public.gmb_media(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_media_category ON public.gmb_media(category);
CREATE INDEX IF NOT EXISTS idx_gmb_media_type ON public.gmb_media(type);

-- 6. SYNC STATUS TABLE
-- Tracks sync operations
CREATE TABLE IF NOT EXISTS public.sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID REFERENCES public.gmb_accounts(id) ON DELETE CASCADE,
  
  -- Sync Information
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100
  phase TEXT, -- locations, reviews, questions, media, metrics
  
  -- Results
  counts JSONB, -- { locations: 5, reviews: 120, questions: 8, media: 45 }
  error TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sync_status
CREATE INDEX IF NOT EXISTS idx_sync_status_user_id ON public.sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_gmb_account_id ON public.sync_status(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_status ON public.sync_status(status);
CREATE INDEX IF NOT EXISTS idx_sync_status_started_at ON public.sync_status(started_at DESC);

-- 7. AUTO REPLY SETTINGS TABLE (Optional)
-- Stores auto-reply configuration for reviews
CREATE TABLE IF NOT EXISTS public.auto_reply_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  
  -- Settings
  enabled BOOLEAN DEFAULT false,
  auto_reply_enabled BOOLEAN DEFAULT false,
  reply_to_positive BOOLEAN DEFAULT true,
  reply_to_neutral BOOLEAN DEFAULT true,
  reply_to_negative BOOLEAN DEFAULT true,
  min_rating INTEGER DEFAULT 1,
  max_rating INTEGER DEFAULT 5,
  
  -- Templates
  template_positive TEXT,
  template_neutral TEXT,
  template_negative TEXT,
  
  -- AI Settings
  use_ai BOOLEAN DEFAULT true,
  ai_tone TEXT DEFAULT 'professional', -- professional, friendly, casual
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, location_id)
);

-- Indexes for auto_reply_settings
CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_user_id ON public.auto_reply_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_location_id ON public.auto_reply_settings(location_id);
CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_enabled ON public.auto_reply_settings(enabled) WHERE enabled = true;

-- 8. NOTIFICATIONS TABLE (Optional)
-- Stores in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification Content
  type TEXT NOT NULL, -- review, question, sync, system
  title TEXT NOT NULL,
  message TEXT,
  
  -- Status
  read BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false, -- Alias for read
  
  -- Related Data
  related_id UUID, -- ID of related review, question, etc.
  related_type TEXT, -- review, question, sync
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- ============================================
-- VIEWS
-- ============================================

-- Dashboard Statistics View
CREATE OR REPLACE VIEW v_dashboard_stats AS
WITH location_stats AS (
  SELECT 
    l.user_id,
    COUNT(DISTINCT l.id) AS total_locations,
    SUM(l.review_count) AS total_reviews_from_locations,
    AVG(l.calculated_response_rate) AS avg_response_rate
  FROM gmb_locations l
  WHERE l.is_active = true
  GROUP BY l.user_id
),
review_stats AS (
  SELECT 
    r.user_id,
    COUNT(DISTINCT r.id) AS total_reviews,
    AVG(r.rating) FILTER (WHERE r.rating IS NOT NULL AND r.rating > 0) AS avg_rating,
    COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = false OR r.has_reply IS NULL) AS pending_reviews,
    COUNT(DISTINCT r.id) FILTER (WHERE r.created_at > NOW() - INTERVAL '7 days') AS recent_reviews,
    COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = true) AS replied_reviews
  FROM gmb_reviews r
  WHERE r.rating IS NOT NULL
  GROUP BY r.user_id
),
question_stats AS (
  SELECT 
    q.user_id,
    COUNT(DISTINCT q.id) FILTER (WHERE q.answer_status = 'pending' OR q.answer_text IS NULL) AS pending_questions
  FROM gmb_questions q
  GROUP BY q.user_id
)
SELECT 
  COALESCE(ls.user_id, rs.user_id, qs.user_id) AS user_id,
  COALESCE(ls.total_locations, 0) AS total_locations,
  COALESCE(rs.total_reviews, 0) AS total_reviews,
  COALESCE(rs.avg_rating, 0) AS avg_rating,
  COALESCE(rs.pending_reviews, 0) AS pending_reviews,
  COALESCE(rs.replied_reviews, 0) AS replied_reviews,
  COALESCE(qs.pending_questions, 0) AS pending_questions,
  COALESCE(rs.recent_reviews, 0) AS recent_reviews,
  COALESCE(ls.avg_response_rate, 0) AS avg_response_rate,
  CASE 
    WHEN COALESCE(rs.total_reviews, 0) > 0 
    THEN ROUND((COALESCE(rs.replied_reviews, 0)::NUMERIC / rs.total_reviews::NUMERIC) * 100, 2)
    ELSE 0
  END AS calculated_response_rate
FROM location_stats ls
FULL JOIN review_stats rs ON ls.user_id = rs.user_id
FULL JOIN question_stats qs ON COALESCE(ls.user_id, rs.user_id) = qs.user_id;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.gmb_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmb_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmb_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmb_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmb_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_reply_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gmb_accounts
CREATE POLICY "Users can view own accounts" ON public.gmb_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.gmb_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.gmb_accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.gmb_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for gmb_locations
CREATE POLICY "Users can view own locations" ON public.gmb_locations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own locations" ON public.gmb_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own locations" ON public.gmb_locations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own locations" ON public.gmb_locations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for gmb_reviews
CREATE POLICY "Users can view own reviews" ON public.gmb_reviews
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON public.gmb_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.gmb_reviews
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.gmb_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for gmb_questions
CREATE POLICY "Users can view own questions" ON public.gmb_questions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own questions" ON public.gmb_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own questions" ON public.gmb_questions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own questions" ON public.gmb_questions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for gmb_media
CREATE POLICY "Users can view own media" ON public.gmb_media
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own media" ON public.gmb_media
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own media" ON public.gmb_media
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own media" ON public.gmb_media
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sync_status
CREATE POLICY "Users can view own sync status" ON public.sync_status
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sync status" ON public.sync_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sync status" ON public.sync_status
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for auto_reply_settings
CREATE POLICY "Users can view own settings" ON public.auto_reply_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.auto_reply_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.auto_reply_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_gmb_accounts_updated_at BEFORE UPDATE ON public.gmb_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gmb_locations_updated_at BEFORE UPDATE ON public.gmb_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gmb_reviews_updated_at BEFORE UPDATE ON public.gmb_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gmb_questions_updated_at BEFORE UPDATE ON public.gmb_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gmb_media_updated_at BEFORE UPDATE ON public.gmb_media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sync_status_updated_at BEFORE UPDATE ON public.sync_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auto_reply_settings_updated_at BEFORE UPDATE ON public.auto_reply_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if all tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'gmb_accounts', 'gmb_locations', 'gmb_reviews', 'gmb_questions',
      'gmb_media', 'sync_status', 'auto_reply_settings', 'notifications'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'gmb_accounts', 'gmb_locations', 'gmb_reviews', 'gmb_questions',
    'gmb_media', 'sync_status', 'auto_reply_settings', 'notifications'
  )
ORDER BY table_name;

-- Check gmb_locations columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_locations'
ORDER BY ordinal_position;

