-- Migration: Create gmb_locations and gamification tables
-- Created: 2025-12-03
-- Purpose: Add missing tables for GMB locations and user gamification

BEGIN;

-- ============================================================================
-- 1. GMB LOCATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmb_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
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
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  latlng TEXT,
  rating DECIMAL(2, 1),
  review_count INTEGER DEFAULT 0,
  business_hours JSONB,
  regularhours JSONB,
  opening_date DATE,
  cover_photo_url TEXT,
  logo_url TEXT,
  profile_completeness INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 0,
  response_rate DECIMAL(5, 2) DEFAULT 0,
  calculated_response_rate DECIMAL(5, 2),
  service_area_enabled BOOLEAN DEFAULT false,
  from_the_business TEXT[],
  metadata JSONB,
  ai_insights TEXT,
  status TEXT DEFAULT 'active',
  type TEXT,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  is_syncing BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  location_id_external TEXT,
  appointment_url TEXT,
  booking_url TEXT,
  menu_url TEXT,
  order_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT gmb_locations_location_id_unique UNIQUE (location_id)
);

CREATE INDEX IF NOT EXISTS idx_gmb_locations_gmb_account_id ON gmb_locations(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_gmb_locations_user_id ON gmb_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_locations_location_id ON gmb_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_locations_is_active ON gmb_locations(is_active);

ALTER TABLE gmb_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own locations" ON gmb_locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own locations" ON gmb_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own locations" ON gmb_locations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own locations" ON gmb_locations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role has full access to gmb_locations" ON gmb_locations FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 2. USER PROGRESS TABLE (Gamification)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  current_level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date TIMESTAMPTZ,
  badges_earned INTEGER DEFAULT 0,
  reviews_replied INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  posts_created INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT user_progress_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_level ON user_progress(level);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role has full access to user_progress" ON user_progress FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 3. USER ACHIEVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('reviews', 'growth', 'engagement', 'special', 'general')),
  points INTEGER DEFAULT 0,
  level TEXT DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'platinum')),
  progress INTEGER DEFAULT 0,
  max_progress INTEGER,
  unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  reward_type TEXT CHECK (reward_type IN ('badge', 'feature', 'discount', 'bonus')),
  reward_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT user_achievements_unique UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_category ON user_achievements(category);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(unlocked);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own achievements" ON user_achievements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role has full access to user_achievements" ON user_achievements FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 4. FUNCTION: Initialize User Progress
-- ============================================================================
CREATE OR REPLACE FUNCTION initialize_user_progress(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_progress (user_id, level, xp, total_xp)
  VALUES (p_user_id, 1, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. UPDATE TRIGGERS
-- ============================================================================
CREATE TRIGGER update_gmb_locations_updated_at
  BEFORE UPDATE ON gmb_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================
COMMENT ON TABLE gmb_locations IS 'Google My Business locations linked to user accounts';
COMMENT ON TABLE user_progress IS 'User gamification progress (level, XP, streaks)';
COMMENT ON TABLE user_achievements IS 'User achievements and badges';

COMMIT;
