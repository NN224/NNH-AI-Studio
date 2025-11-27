-- Create achievements tables for gamification feature
-- Created: 2025-11-27

-- User Progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  total_points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User Achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  category TEXT CHECK (category IN ('reviews', 'growth', 'engagement', 'special')),
  points INTEGER DEFAULT 0,
  level TEXT CHECK (level IN ('bronze', 'silver', 'gold', 'platinum')),
  progress INTEGER DEFAULT 0,
  max_progress INTEGER,
  unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  reward_type TEXT CHECK (reward_type IN ('badge', 'feature', 'discount', 'bonus')),
  reward_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(user_id, unlocked);

-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own achievements" ON user_achievements
  FOR ALL USING (auth.uid() = user_id);

-- Function to initialize user progress (stub - returns success)
CREATE OR REPLACE FUNCTION initialize_user_progress(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_progress (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user achievements (stub - returns 0)
CREATE OR REPLACE FUNCTION update_user_achievements(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
