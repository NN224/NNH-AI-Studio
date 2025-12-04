-- =====================================================
-- Simple Fix - Drop and Recreate Tables Safely
-- =====================================================

-- Drop tables if they exist (with CASCADE to handle dependencies)
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;

-- Create user_achievements fresh
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  points INTEGER DEFAULT 0,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint
ALTER TABLE user_achievements
ADD CONSTRAINT user_achievements_user_id_achievement_type_key
UNIQUE(user_id, achievement_type);

-- Create indexes
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_type ON user_achievements(achievement_type);

-- Create user_progress fresh
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  current_value INTEGER DEFAULT 0,
  target_value INTEGER,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint
ALTER TABLE user_progress
ADD CONSTRAINT user_progress_user_id_metric_type_key
UNIQUE(user_id, metric_type);

-- Create indexes
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_metric_type ON user_progress(metric_type);

-- Enable RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage achievements" ON user_achievements
  FOR ALL USING (true);

CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage progress" ON user_progress
  FOR ALL USING (true);

-- Success
SELECT
  '✅ Tables recreated successfully!' as status,
  'user_achievements and user_progress are ready' as message;
