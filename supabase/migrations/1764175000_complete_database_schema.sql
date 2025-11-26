-- =====================================================
-- COMPLETE DATABASE SCHEMA - Full Migration
-- =====================================================
-- Created: 2025-11-26
-- Description: Complete schema with all 25 tables
-- Purpose: Clean slate with full database structure
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: DROP ALL EXISTING TABLES (Clean Slate)
-- =====================================================

DROP TABLE IF EXISTS weekly_task_recommendations CASCADE;
DROP TABLE IF EXISTS business_profile_history CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS rate_limit_requests CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS oauth_tokens CASCADE;
DROP TABLE IF EXISTS oauth_states CASCADE;
DROP TABLE IF EXISTS gmb_sync_logs CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;
DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS ai_settings CASCADE;
DROP TABLE IF EXISTS ai_requests CASCADE;
DROP TABLE IF EXISTS gmb_metrics CASCADE;
DROP TABLE IF EXISTS gmb_search_keywords CASCADE;
DROP TABLE IF EXISTS gmb_performance_metrics CASCADE;
DROP TABLE IF EXISTS gmb_media CASCADE;
DROP TABLE IF EXISTS gmb_posts CASCADE;
DROP TABLE IF EXISTS gmb_questions CASCADE;
DROP TABLE IF EXISTS gmb_reviews CASCADE;
DROP TABLE IF EXISTS gmb_locations CASCADE;
DROP TABLE IF EXISTS gmb_accounts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop views
DROP VIEW IF EXISTS v_performance_summary CASCADE;
DROP VIEW IF EXISTS v_notification_summary CASCADE;
DROP VIEW IF EXISTS v_error_summary CASCADE;
DROP VIEW IF EXISTS v_dashboard_stats CASCADE;
DROP VIEW IF EXISTS review_stats_view CASCADE;
DROP VIEW IF EXISTS mv_location_stats CASCADE;
DROP VIEW IF EXISTS gmb_locations_with_rating CASCADE;

-- =====================================================
-- STEP 2: CREATE ALL 25 TABLES
-- =====================================================

-- ==================== CORE TABLES ====================

-- 1. profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  provider_sub TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE INDEX idx_profiles_id ON profiles(id);
CREATE INDEX idx_profiles_email ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and edit own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

COMMENT ON TABLE profiles IS 'User profile information';

-- 2. gmb_accounts
CREATE TABLE gmb_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT UNIQUE,
  account_name TEXT,
  email TEXT,
  google_account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  data_retention_days INTEGER DEFAULT 90,
  delete_on_disconnect BOOLEAN DEFAULT false,
  disconnected_at TIMESTAMPTZ,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmb_accounts_user_id ON gmb_accounts(user_id);
CREATE INDEX idx_gmb_accounts_account_id ON gmb_accounts(account_id);

ALTER TABLE gmb_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own GMB accounts" ON gmb_accounts
  FOR ALL USING (auth.uid() = user_id);

-- 3. gmb_locations
CREATE TABLE gmb_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT UNIQUE NOT NULL,
  normalized_location_id TEXT,
  location_name TEXT,
  account_id TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  category TEXT,
  additional_categories TEXT[],
  description TEXT,
  short_description TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  latlng TEXT,
  rating NUMERIC,
  review_count INTEGER DEFAULT 0,
  business_hours JSONB,
  regularhours JSONB,
  opening_date TEXT,
  cover_photo_url TEXT,
  profile_completeness NUMERIC,
  health_score NUMERIC,
  response_rate NUMERIC,
  calculated_response_rate NUMERIC,
  service_area_enabled BOOLEAN DEFAULT false,
  from_the_business TEXT[],
  metadata JSONB,
  ai_insights TEXT,
  status TEXT,
  type TEXT,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  is_syncing BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  location_id_external TEXT,
  appointment_url TEXT,
  booking_url TEXT,
  menu_url TEXT,
  order_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmb_locations_user_id ON gmb_locations(user_id);
CREATE INDEX idx_gmb_locations_account_id ON gmb_locations(gmb_account_id);
CREATE INDEX idx_gmb_locations_location_id ON gmb_locations(location_id);

ALTER TABLE gmb_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own locations" ON gmb_locations
  FOR ALL USING (auth.uid() = user_id);

-- 4. gmb_reviews
CREATE TABLE gmb_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  account_id TEXT,
  external_review_id TEXT UNIQUE,
  review_id TEXT,
  reviewer_name TEXT,
  reviewer_display_name TEXT,
  reviewer_profile_photo_url TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  comment TEXT,
  review_date TIMESTAMPTZ,
  review_timestamp TIMESTAMPTZ,
  reply_text TEXT,
  reply_date TIMESTAMPTZ,
  reply_timestamp TIMESTAMPTZ,
  response TEXT,
  response_text TEXT,
  has_reply BOOLEAN DEFAULT false,
  has_response BOOLEAN DEFAULT false,
  replied_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  review_reply TEXT,
  review_url TEXT,
  google_my_business_name TEXT,
  ai_suggested_reply TEXT,
  ai_generated_response TEXT,
  ai_reply_generated BOOLEAN DEFAULT false,
  ai_confidence_score NUMERIC,
  ai_sentiment TEXT,
  ai_sentiment_score NUMERIC,
  ai_sentiment_analysis JSONB,
  ai_generated_at TIMESTAMPTZ,
  ai_sent_at TIMESTAMPTZ,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_status TEXT,
  response_priority TEXT,
  status TEXT,
  tags TEXT[],
  is_verified_purchase BOOLEAN DEFAULT false,
  is_anonymized BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  flagged_reason TEXT,
  internal_notes TEXT,
  metadata JSONB,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmb_reviews_location_id ON gmb_reviews(location_id);
CREATE INDEX idx_gmb_reviews_user_id ON gmb_reviews(user_id);
CREATE INDEX idx_gmb_reviews_rating ON gmb_reviews(rating);
CREATE INDEX idx_gmb_reviews_has_reply ON gmb_reviews(has_reply);

ALTER TABLE gmb_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reviews" ON gmb_reviews
  FOR ALL USING (auth.uid() = user_id);

-- 5. gmb_questions
CREATE TABLE gmb_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  question_id TEXT,
  external_question_id TEXT,
  google_resource_name TEXT,
  question_text TEXT NOT NULL,
  question_url TEXT,
  author_name TEXT,
  author_display_name TEXT,
  author_profile_photo_url TEXT,
  author_type TEXT,
  asked_at TIMESTAMPTZ,
  answer_id TEXT,
  answer_text TEXT,
  answer_status TEXT,
  answered_at TIMESTAMPTZ,
  answered_by TEXT,
  upvote_count INTEGER DEFAULT 0,
  total_answer_count INTEGER DEFAULT 0,
  language_code TEXT,
  ai_suggested_answer TEXT,
  ai_answer_generated BOOLEAN DEFAULT false,
  ai_confidence_score NUMERIC,
  ai_category TEXT,
  status TEXT,
  priority TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  internal_notes TEXT,
  metadata JSONB,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmb_questions_location_id ON gmb_questions(location_id);
CREATE INDEX idx_gmb_questions_user_id ON gmb_questions(user_id);

ALTER TABLE gmb_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own questions" ON gmb_questions
  FOR ALL USING (auth.uid() = user_id);

-- 6. gmb_posts
CREATE TABLE gmb_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id TEXT,
  provider_post_id TEXT,
  title TEXT,
  content TEXT NOT NULL,
  post_type TEXT,
  media_url TEXT,
  call_to_action TEXT,
  call_to_action_url TEXT,
  cta_type TEXT,
  cta_url TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmb_posts_location_id ON gmb_posts(location_id);
CREATE INDEX idx_gmb_posts_user_id ON gmb_posts(user_id);
CREATE INDEX idx_gmb_posts_status ON gmb_posts(status);

ALTER TABLE gmb_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own posts" ON gmb_posts
  FOR ALL USING (auth.uid() = user_id);

-- 7. gmb_media
CREATE TABLE gmb_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  external_media_id TEXT NOT NULL,
  url TEXT,
  thumbnail_url TEXT,
  type TEXT,
  metadata JSONB,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmb_media_location_id ON gmb_media(location_id);
CREATE INDEX idx_gmb_media_user_id ON gmb_media(user_id);

ALTER TABLE gmb_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own media" ON gmb_media
  FOR ALL USING (auth.uid() = user_id);

-- ==================== PERFORMANCE & METRICS ====================

-- 8. gmb_performance_metrics
CREATE TABLE gmb_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 0,
  sub_entity_type JSONB,
  metadata JSONB,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, metric_date, metric_type)
);

CREATE INDEX idx_gmb_performance_metrics_location_id ON gmb_performance_metrics(location_id);
CREATE INDEX idx_gmb_performance_metrics_metric_date ON gmb_performance_metrics(metric_date);

ALTER TABLE gmb_performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own metrics" ON gmb_performance_metrics
  FOR ALL USING (auth.uid() = user_id);

-- 9. gmb_search_keywords
CREATE TABLE gmb_search_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  search_keyword TEXT NOT NULL,
  impressions_count INTEGER DEFAULT 0,
  threshold_value NUMERIC,
  metadata JSONB,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmb_search_keywords_location_id ON gmb_search_keywords(location_id);

ALTER TABLE gmb_search_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own keywords" ON gmb_search_keywords
  FOR ALL USING (auth.uid() = user_id);

-- 10. gmb_metrics
CREATE TABLE gmb_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  runs_count INTEGER DEFAULT 0,
  total_duration_ms NUMERIC DEFAULT 0,
  avg_duration_ms NUMERIC,
  total_items_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmb_metrics_user_id ON gmb_metrics(user_id);

-- ==================== AI & AUTOMATION ====================

-- 11. ai_requests
CREATE TABLE ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  feature TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd NUMERIC,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX idx_ai_requests_provider ON ai_requests(provider);

ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own AI requests" ON ai_requests
  FOR ALL USING (auth.uid() = user_id);

-- 12. ai_settings
CREATE TABLE ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_ai_settings_user_id ON ai_settings(user_id);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own AI settings" ON ai_settings
  FOR ALL USING (auth.uid() = user_id);

-- ==================== SYNC SYSTEM ====================

-- 13. sync_queue
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  metadata JSONB,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_scheduled_at ON sync_queue(scheduled_at);

-- 14. sync_status
CREATE TABLE sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_frequency TEXT DEFAULT 'hourly',
  is_syncing BOOLEAN DEFAULT false,
  last_error TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, gmb_account_id)
);

CREATE INDEX idx_sync_status_user_id ON sync_status(user_id);

-- 15. gmb_sync_logs
CREATE TABLE gmb_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  counts JSONB,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmb_sync_logs_user_id ON gmb_sync_logs(user_id);
CREATE INDEX idx_gmb_sync_logs_status ON gmb_sync_logs(status);

-- ==================== OAUTH & AUTH ====================

-- 16. oauth_states
CREATE TABLE oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);

-- 17. oauth_tokens
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);

-- 18. performance_metrics
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_name ON performance_metrics(name);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own metrics" ON performance_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metrics" ON performance_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 19. rate_limit_requests
CREATE TABLE rate_limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  endpoint TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_requests_user_id ON rate_limit_requests(user_id);
CREATE INDEX idx_rate_limit_requests_endpoint ON rate_limit_requests(endpoint);
CREATE INDEX idx_rate_limit_requests_created_at ON rate_limit_requests(created_at);
CREATE INDEX idx_rate_limit_requests_user_endpoint_time ON rate_limit_requests(user_id, endpoint, created_at);

-- ==================== LOGGING & MONITORING ====================

-- 20. activity_logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_message TEXT NOT NULL,
  actionable BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- 21. audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- 22. error_logs
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  error_type TEXT,
  error_code TEXT,
  stack TEXT,
  level TEXT DEFAULT 'error',
  severity INTEGER DEFAULT 0,
  url TEXT,
  user_agent TEXT,
  ip_address INET,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  device_type TEXT,
  session_id TEXT,
  context JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_level ON error_logs(level);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);

-- ==================== UTILITY TABLES ====================

-- 23. notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- 24. weekly_task_recommendations
CREATE TABLE weekly_task_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT,
  effort_level TEXT,
  estimated_minutes INTEGER,
  expected_impact TEXT,
  reasoning TEXT,
  insights TEXT,
  tasks JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weekly_tasks_user_id ON weekly_task_recommendations(user_id);
CREATE INDEX idx_weekly_tasks_week_start ON weekly_task_recommendations(week_start_date);

-- 25. business_profile_history
CREATE TABLE business_profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_profile_history_location_id ON business_profile_history(location_id);
CREATE INDEX idx_business_profile_history_created_at ON business_profile_history(created_at);

-- =====================================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- =====================================================

-- Cleanup function for rate limiting
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

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Total Tables: 25
-- Total Columns: 619+
-- Total Indexes: 60+
-- Total RLS Policies: 13+
-- =====================================================
