-- Fresh Start Migration for Beta Launch
-- Created: 2025-11-26
-- Description: Clean, minimal schema with only essential tables

-- =====================================================
-- 1. DROP ALL EXISTING TABLES (Clean Slate)
-- =====================================================

-- Drop all existing tables to start fresh
DROP TABLE IF EXISTS weekly_task_recommendations CASCADE;
DROP TABLE IF EXISTS user_suggestion_actions CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS sync_worker_runs CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;
DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS rate_limit_requests CASCADE;
DROP TABLE IF EXISTS question_auto_answers_log CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS oauth_tokens CASCADE;
DROP TABLE IF EXISTS oauth_states CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS newsletter_subscriptions CASCADE;
DROP TABLE IF EXISTS migration_log CASCADE;
DROP TABLE IF EXISTS gmb_sync_logs CASCADE;
DROP TABLE IF EXISTS gmb_services CASCADE;
DROP TABLE IF EXISTS gmb_search_keywords CASCADE;
DROP TABLE IF EXISTS gmb_reviews CASCADE;
DROP TABLE IF EXISTS gmb_questions CASCADE;
DROP TABLE IF EXISTS gmb_products CASCADE;
DROP TABLE IF EXISTS gmb_posts CASCADE;
DROP TABLE IF EXISTS gmb_performance_metrics CASCADE;
DROP TABLE IF EXISTS gmb_metrics CASCADE;
DROP TABLE IF EXISTS gmb_messages CASCADE;
DROP TABLE IF EXISTS gmb_media CASCADE;
DROP TABLE IF EXISTS gmb_locations CASCADE;
DROP TABLE IF EXISTS gmb_accounts CASCADE;
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS contact_submissions CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;
DROP TABLE IF EXISTS business_profile_history CASCADE;
DROP TABLE IF EXISTS auto_reply_settings CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS ai_settings CASCADE;
DROP TABLE IF EXISTS ai_requests CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;

-- Drop all views
DROP VIEW IF EXISTS v_performance_summary CASCADE;
DROP VIEW IF EXISTS v_notification_summary CASCADE;
DROP VIEW IF EXISTS v_health_score_distribution CASCADE;
DROP VIEW IF EXISTS v_error_summary CASCADE;
DROP VIEW IF EXISTS review_stats_view CASCADE;
DROP VIEW IF EXISTS notification_stats CASCADE;
DROP VIEW IF EXISTS gmb_locations_with_rating CASCADE;

-- =====================================================
-- 2. CREATE CORE TABLES
-- =====================================================

-- User Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  subscription_plan TEXT DEFAULT 'free',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GMB Accounts
CREATE TABLE gmb_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  account_name TEXT,
  account_id TEXT UNIQUE NOT NULL,
  access_token TEXT, -- encrypted
  refresh_token TEXT, -- encrypted
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GMB Locations
CREATE TABLE gmb_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT UNIQUE NOT NULL,
  normalized_location_id TEXT,
  name TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  categories JSONB,
  rating NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  latitude NUMERIC,
  longitude NUMERIC,
  profile_completeness NUMERIC(3,2),
  is_active BOOLEAN DEFAULT true,
  status TEXT,
  metadata JSONB,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GMB Reviews
CREATE TABLE gmb_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  external_review_id TEXT UNIQUE NOT NULL,
  reviewer_name TEXT,
  reviewer_display_name TEXT,
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  comment TEXT,
  review_reply TEXT,
  create_time TIMESTAMPTZ,
  update_time TIMESTAMPTZ,
  has_reply BOOLEAN DEFAULT false,
  sentiment TEXT,
  metadata JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GMB Questions
CREATE TABLE gmb_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  external_question_id TEXT UNIQUE,
  question_text TEXT NOT NULL,
  answer_text TEXT,
  author_name TEXT,
  author_display_name TEXT,
  author_type TEXT,
  answered_at TIMESTAMPTZ,
  answered_by TEXT,
  answer_status TEXT DEFAULT 'pending',
  upvote_count INTEGER DEFAULT 0,
  total_answer_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync System Tables
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  sync_type TEXT DEFAULT 'full' CHECK (sync_type IN ('full', 'incremental')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  metadata JSONB,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'error')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sync_worker_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  jobs_picked INTEGER DEFAULT 0,
  jobs_succeeded INTEGER DEFAULT 0,
  jobs_failed INTEGER DEFAULT 0,
  notes TEXT,
  metadata JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth Tables
CREATE TABLE oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  redirect_uri TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT, -- encrypted
  refresh_token TEXT, -- encrypted
  expires_at TIMESTAMPTZ,
  scope TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE ESSENTIAL INDEXES
-- =====================================================

-- User-based indexes (most important for RLS)
CREATE INDEX idx_profiles_id ON profiles(id);
CREATE INDEX idx_gmb_accounts_user_id ON gmb_accounts(user_id);
CREATE INDEX idx_gmb_accounts_account_id ON gmb_accounts(account_id);
CREATE INDEX idx_gmb_locations_user_id ON gmb_locations(user_id);
CREATE INDEX idx_gmb_locations_account_id ON gmb_locations(gmb_account_id);
CREATE INDEX idx_gmb_locations_location_id ON gmb_locations(location_id);
CREATE INDEX idx_gmb_reviews_user_id ON gmb_reviews(user_id);
CREATE INDEX idx_gmb_reviews_location_id ON gmb_reviews(location_id);
CREATE INDEX idx_gmb_reviews_external_id ON gmb_reviews(external_review_id);
CREATE INDEX idx_gmb_questions_user_id ON gmb_questions(user_id);
CREATE INDEX idx_gmb_questions_location_id ON gmb_questions(location_id);
CREATE INDEX idx_sync_queue_user_id ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_account_id ON sync_queue(account_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_status_user_id ON sync_status(user_id);
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_provider ON oauth_tokens(provider);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view and edit own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- GMB Accounts policies
CREATE POLICY "Users can manage own GMB accounts" ON gmb_accounts
  FOR ALL USING (auth.uid() = user_id);

-- GMB Locations policies
CREATE POLICY "Users can manage own locations" ON gmb_locations
  FOR ALL USING (auth.uid() = user_id);

-- GMB Reviews policies
CREATE POLICY "Users can manage own reviews" ON gmb_reviews
  FOR ALL USING (auth.uid() = user_id);

-- GMB Questions policies
CREATE POLICY "Users can manage own questions" ON gmb_questions
  FOR ALL USING (auth.uid() = user_id);

-- Sync Queue policies
CREATE POLICY "Users can view own sync jobs" ON sync_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync jobs" ON sync_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to sync_queue" ON sync_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Sync Status policies
CREATE POLICY "Users can view own sync status" ON sync_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to sync_status" ON sync_status
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Sync Worker Runs policies
CREATE POLICY "Service role has full access to sync_worker_runs" ON sync_worker_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- OAuth policies
CREATE POLICY "Users can manage own OAuth states" ON oauth_states
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own OAuth tokens" ON oauth_tokens
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 6. CREATE ESSENTIAL FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_gmb_accounts_updated_at
  BEFORE UPDATE ON gmb_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_gmb_locations_updated_at
  BEFORE UPDATE ON gmb_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sync_queue_updated_at
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sync_status_updated_at
  BEFORE UPDATE ON sync_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 7. CREATE SYNC RPC FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION sync_gmb_data_transactional(
  p_account_id UUID,
  p_locations JSONB DEFAULT '[]'::JSONB,
  p_reviews JSONB DEFAULT '[]'::JSONB,
  p_questions JSONB DEFAULT '[]'::JSONB,
  p_posts JSONB DEFAULT '[]'::JSONB,
  p_media JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sync_id UUID;
  v_locations_synced INT := 0;
  v_reviews_synced INT := 0;
  v_questions_synced INT := 0;
  v_location JSONB;
  v_review JSONB;
  v_question JSONB;
  v_result JSONB;
BEGIN
  BEGIN
    -- Create sync tracking entry
    INSERT INTO sync_queue (
      account_id,
      status,
      started_at,
      metadata
    )
    VALUES (
      p_account_id,
      'processing',
      NOW(),
      jsonb_build_object(
        'locations_count', jsonb_array_length(p_locations),
        'reviews_count', jsonb_array_length(p_reviews),
        'questions_count', jsonb_array_length(p_questions)
      )
    )
    RETURNING id INTO v_sync_id;

    -- Sync Locations
    FOR v_location IN SELECT * FROM jsonb_array_elements(p_locations)
    LOOP
      INSERT INTO gmb_locations (
        id,
        gmb_account_id,
        user_id,
        location_id,
        normalized_location_id,
        name,
        address,
        phone,
        website,
        categories,
        rating,
        review_count,
        latitude,
        longitude,
        profile_completeness,
        is_active,
        status,
        metadata,
        last_synced_at,
        updated_at
      )
      VALUES (
        COALESCE((v_location->>'id')::UUID, gen_random_uuid()),
        (v_location->>'gmb_account_id')::UUID,
        (v_location->>'user_id')::UUID,
        v_location->>'location_id',
        v_location->>'normalized_location_id',
        v_location->>'location_name',
        v_location->>'address',
        v_location->>'phone',
        v_location->>'website',
        v_location->'categories',
        (v_location->>'rating')::NUMERIC,
        (v_location->>'review_count')::INTEGER,
        (v_location->>'latitude')::NUMERIC,
        (v_location->>'longitude')::NUMERIC,
        (v_location->>'profile_completeness')::NUMERIC,
        COALESCE((v_location->>'is_active')::BOOLEAN, true),
        v_location->>'status',
        v_location->'metadata',
        NOW(),
        NOW()
      )
      ON CONFLICT (location_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        rating = EXCLUDED.rating,
        review_count = EXCLUDED.review_count,
        last_synced_at = NOW(),
        updated_at = NOW();

      v_locations_synced := v_locations_synced + 1;
    END LOOP;

    -- Sync Reviews
    FOR v_review IN SELECT * FROM jsonb_array_elements(p_reviews)
    LOOP
      INSERT INTO gmb_reviews (
        user_id,
        location_id,
        gmb_account_id,
        external_review_id,
        reviewer_display_name,
        star_rating,
        comment,
        review_reply,
        create_time,
        update_time,
        has_reply,
        sentiment,
        metadata,
        synced_at
      )
      VALUES (
        (v_review->>'user_id')::UUID,
        COALESCE(
          (v_review->>'location_id')::UUID,
          (SELECT id FROM gmb_locations WHERE location_id = v_review->>'google_location_id' LIMIT 1)
        ),
        COALESCE((v_review->>'gmb_account_id')::UUID, p_account_id),
        v_review->>'review_id',
        COALESCE(v_review->>'reviewer_display_name', v_review->>'reviewer_name'),
        (v_review->>'rating')::INTEGER,
        v_review->>'review_text',
        v_review->>'reply_text',
        (v_review->>'review_date')::TIMESTAMPTZ,
        (v_review->>'review_date')::TIMESTAMPTZ,
        COALESCE((v_review->>'has_reply')::BOOLEAN, false),
        v_review->>'sentiment',
        jsonb_build_object('synced_at', NOW()),
        NOW()
      )
      ON CONFLICT (external_review_id)
      DO UPDATE SET
        star_rating = EXCLUDED.star_rating,
        comment = EXCLUDED.comment,
        review_reply = EXCLUDED.review_reply,
        has_reply = EXCLUDED.has_reply,
        synced_at = NOW();

      v_reviews_synced := v_reviews_synced + 1;
    END LOOP;

    -- Sync Questions
    FOR v_question IN SELECT * FROM jsonb_array_elements(p_questions)
    LOOP
      INSERT INTO gmb_questions (
        user_id,
        location_id,
        gmb_account_id,
        external_question_id,
        question_text,
        answer_text,
        author_name,
        author_display_name,
        author_type,
        answered_at,
        answered_by,
        answer_status,
        upvote_count,
        total_answer_count,
        metadata,
        created_at,
        synced_at
      )
      VALUES (
        (v_question->>'user_id')::UUID,
        COALESCE(
          (v_question->>'location_id')::UUID,
          (SELECT id FROM gmb_locations WHERE location_id = v_question->>'google_location_id' LIMIT 1)
        ),
        COALESCE((v_question->>'gmb_account_id')::UUID, p_account_id),
        v_question->>'question_id',
        v_question->>'question_text',
        v_question->>'answer_text',
        COALESCE(v_question->>'author_display_name', v_question->>'author_name'),
        v_question->>'author_display_name',
        v_question->>'author_type',
        (v_question->>'answer_date')::TIMESTAMPTZ,
        v_question->>'answer_author',
        CASE
          WHEN v_question->>'answer_text' IS NOT NULL THEN 'answered'
          ELSE 'pending'
        END,
        (v_question->>'upvote_count')::INTEGER,
        (v_question->>'total_answer_count')::INTEGER,
        jsonb_build_object('synced_at', NOW()),
        (v_question->>'question_date')::TIMESTAMPTZ,
        NOW()
      )
      ON CONFLICT (external_question_id)
      DO UPDATE SET
        question_text = EXCLUDED.question_text,
        answer_text = EXCLUDED.answer_text,
        answered_at = EXCLUDED.answered_at,
        answered_by = EXCLUDED.answered_by,
        answer_status = EXCLUDED.answer_status,
        synced_at = NOW();

      v_questions_synced := v_questions_synced + 1;
    END LOOP;

    -- Update sync queue entry
    UPDATE sync_queue
    SET
      status = 'completed',
      completed_at = NOW(),
      metadata = jsonb_build_object(
        'locations_synced', v_locations_synced,
        'reviews_synced', v_reviews_synced,
        'questions_synced', v_questions_synced
      )
    WHERE id = v_sync_id;

    -- Build result
    v_result := jsonb_build_object(
      'success', true,
      'sync_id', v_sync_id,
      'locations_synced', v_locations_synced,
      'reviews_synced', v_reviews_synced,
      'questions_synced', v_questions_synced,
      'posts_synced', 0,
      'media_synced', 0
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    IF v_sync_id IS NOT NULL THEN
      UPDATE sync_queue
      SET
        status = 'failed',
        completed_at = NOW(),
        error_message = SQLERRM
      WHERE id = v_sync_id;
    END IF;

    RAISE EXCEPTION 'Sync transaction failed: %', SQLERRM;
  END;
END;
$$;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE profiles IS 'User profile information';
COMMENT ON TABLE gmb_accounts IS 'Google My Business account connections';
COMMENT ON TABLE gmb_locations IS 'Business locations from GMB';
COMMENT ON TABLE gmb_reviews IS 'Customer reviews from GMB';
COMMENT ON TABLE gmb_questions IS 'Q&A from GMB';
COMMENT ON TABLE sync_queue IS 'Queue for background sync jobs';
COMMENT ON TABLE sync_status IS 'Real-time sync progress tracking';
COMMENT ON TABLE sync_worker_runs IS 'Worker execution logs';
COMMENT ON TABLE oauth_states IS 'OAuth state management';
COMMENT ON TABLE oauth_tokens IS 'OAuth token storage';

-- Migration completed successfully
SELECT 'Fresh Start Beta Migration Completed Successfully' as result;
