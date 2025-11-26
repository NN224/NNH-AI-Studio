-- =====================================================
-- Migration: Create Achievements System
-- Created: 2025-11-25
-- Description: Create tables for user progress and achievements
-- =====================================================

-- =====================================================
-- 1. Create user_progress table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  total_points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_level ON public.user_progress(current_level);
CREATE INDEX IF NOT EXISTS idx_user_progress_points ON public.user_progress(total_points DESC);

-- Add RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER set_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add comments
COMMENT ON TABLE public.user_progress IS 'Tracks user gamification progress (level, points, streak)';
COMMENT ON COLUMN public.user_progress.current_level IS 'User current level (1-10)';
COMMENT ON COLUMN public.user_progress.total_points IS 'Total points earned';
COMMENT ON COLUMN public.user_progress.streak_days IS 'Current activity streak in days';

-- =====================================================
-- 2. Create user_achievements table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  category TEXT NOT NULL CHECK (category IN ('reviews', 'growth', 'engagement', 'special')),
  points INTEGER DEFAULT 0,
  level TEXT NOT NULL CHECK (level IN ('bronze', 'silver', 'gold', 'platinum')),
  progress NUMERIC DEFAULT 0,
  max_progress NUMERIC,
  unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  reward_type TEXT CHECK (reward_type IN ('badge', 'feature', 'discount', 'bonus')),
  reward_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_category ON public.user_achievements(category);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON public.user_achievements(unlocked);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_unlocked
  ON public.user_achievements(user_id, unlocked);

-- Add RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
  ON public.user_achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER set_user_achievements_updated_at
  BEFORE UPDATE ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add comments
COMMENT ON TABLE public.user_achievements IS 'Tracks individual achievement progress and unlocks';
COMMENT ON COLUMN public.user_achievements.achievement_id IS 'Unique achievement identifier (e.g., first-reply, speed-demon)';
COMMENT ON COLUMN public.user_achievements.progress IS 'Current progress towards achievement';
COMMENT ON COLUMN public.user_achievements.max_progress IS 'Required progress to unlock';

-- =====================================================
-- 3. Create function to initialize user progress
-- =====================================================
CREATE OR REPLACE FUNCTION public.initialize_user_progress(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert user progress if not exists
  INSERT INTO public.user_progress (user_id, current_level, total_points, streak_days)
  VALUES (p_user_id, 1, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert default achievements
  INSERT INTO public.user_achievements (
    user_id, achievement_id, achievement_name, achievement_description,
    category, points, level, max_progress, unlocked
  ) VALUES
    -- Reviews achievements
    (p_user_id, 'first-reply', 'First Response', 'Reply to your first review',
     'reviews', 50, 'bronze', 1, false),
    (p_user_id, 'speed-demon', 'Speed Demon', 'Reply to 10 reviews within 1 hour',
     'reviews', 200, 'silver', 10, false),
    (p_user_id, 'centurion', 'Centurion', 'Reply to 100 reviews',
     'reviews', 500, 'gold', 100, false),

    -- Growth achievements
    (p_user_id, 'rising-star', 'Rising Star', 'Achieve 4.5+ average rating',
     'growth', 300, 'silver', 4.5, false),
    (p_user_id, 'growth-master', 'Growth Master', 'Increase reviews by 50% in a month',
     'growth', 750, 'gold', 50, false),

    -- Engagement achievements
    (p_user_id, 'streak-warrior', 'Streak Warrior', 'Maintain a 30-day login streak',
     'engagement', 400, 'silver', 30, false),
    (p_user_id, 'ai-pioneer', 'AI Pioneer', 'Use AI features 100 times',
     'engagement', 250, 'bronze', 100, false),

    -- Special achievements
    (p_user_id, 'early-adopter', 'Early Adopter', 'Join during beta period',
     'special', 1000, 'platinum', 1, true),
    (p_user_id, 'perfect-month', 'Perfect Month', '100% response rate for a full month',
     'special', 1500, 'platinum', 1, false)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.initialize_user_progress IS 'Initialize progress and achievements for a new user';

-- =====================================================
-- 4. Create function to calculate user achievements
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_user_achievements(p_user_id UUID)
RETURNS TABLE (
  achievement_id TEXT,
  current_progress NUMERIC,
  should_unlock BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      -- Reviews stats
      COUNT(DISTINCT r.id) as total_reviews,
      COUNT(DISTINCT CASE WHEN r.reply_text IS NOT NULL THEN r.id END) as replied_reviews,
      COALESCE(AVG(r.rating), 0) as avg_rating,
      -- AI usage
      COUNT(DISTINCT ai.id) as ai_requests_count,
      -- Streak (from user_progress)
      COALESCE(up.streak_days, 0) as current_streak
    FROM profiles p
    LEFT JOIN gmb_reviews r ON r.user_id = p.id
    LEFT JOIN ai_requests ai ON ai.user_id = p.id
    LEFT JOIN user_progress up ON up.user_id = p.id
    WHERE p.id = p_user_id
    GROUP BY p.id, up.streak_days
  )
  SELECT
    ua.achievement_id,
    CASE
      WHEN ua.achievement_id = 'first-reply' THEN us.replied_reviews::NUMERIC
      WHEN ua.achievement_id = 'speed-demon' THEN 0::NUMERIC -- Complex calculation needed
      WHEN ua.achievement_id = 'centurion' THEN us.replied_reviews::NUMERIC
      WHEN ua.achievement_id = 'rising-star' THEN us.avg_rating
      WHEN ua.achievement_id = 'growth-master' THEN 0::NUMERIC -- Complex calculation needed
      WHEN ua.achievement_id = 'streak-warrior' THEN us.current_streak::NUMERIC
      WHEN ua.achievement_id = 'ai-pioneer' THEN us.ai_requests_count::NUMERIC
      WHEN ua.achievement_id = 'early-adopter' THEN 1::NUMERIC
      WHEN ua.achievement_id = 'perfect-month' THEN 0::NUMERIC -- Complex calculation needed
      ELSE 0::NUMERIC
    END as current_progress,
    CASE
      WHEN ua.achievement_id = 'first-reply' THEN us.replied_reviews >= 1
      WHEN ua.achievement_id = 'centurion' THEN us.replied_reviews >= 100
      WHEN ua.achievement_id = 'rising-star' THEN us.avg_rating >= 4.5
      WHEN ua.achievement_id = 'streak-warrior' THEN us.current_streak >= 30
      WHEN ua.achievement_id = 'ai-pioneer' THEN us.ai_requests_count >= 100
      WHEN ua.achievement_id = 'early-adopter' THEN true
      ELSE false
    END as should_unlock
  FROM user_achievements ua
  CROSS JOIN user_stats us
  WHERE ua.user_id = p_user_id
    AND ua.unlocked = false;
END;
$$;

COMMENT ON FUNCTION public.calculate_user_achievements IS 'Calculate current progress for all user achievements';

-- =====================================================
-- 5. Create function to update achievements
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_user_achievements(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unlocked_count INTEGER := 0;
  v_total_points INTEGER := 0;
  v_achievement RECORD;
BEGIN
  -- Calculate and update achievements
  FOR v_achievement IN
    SELECT * FROM public.calculate_user_achievements(p_user_id)
  LOOP
    -- Update progress
    UPDATE public.user_achievements
    SET
      progress = v_achievement.current_progress,
      unlocked = CASE
        WHEN v_achievement.should_unlock AND NOT unlocked THEN true
        ELSE unlocked
      END,
      unlocked_at = CASE
        WHEN v_achievement.should_unlock AND NOT unlocked THEN NOW()
        ELSE unlocked_at
      END,
      updated_at = NOW()
    WHERE user_id = p_user_id
      AND achievement_id = v_achievement.achievement_id;

    -- Count newly unlocked
    IF v_achievement.should_unlock THEN
      v_unlocked_count := v_unlocked_count + 1;
    END IF;
  END LOOP;

  -- Calculate total points
  SELECT COALESCE(SUM(points), 0) INTO v_total_points
  FROM public.user_achievements
  WHERE user_id = p_user_id AND unlocked = true;

  -- Update user progress
  UPDATE public.user_progress
  SET
    total_points = v_total_points,
    current_level = CASE
      WHEN v_total_points >= 10000 THEN 10
      WHEN v_total_points >= 6000 THEN 9
      WHEN v_total_points >= 4000 THEN 8
      WHEN v_total_points >= 2500 THEN 7
      WHEN v_total_points >= 1500 THEN 6
      WHEN v_total_points >= 1000 THEN 5
      WHEN v_total_points >= 600 THEN 4
      WHEN v_total_points >= 300 THEN 3
      WHEN v_total_points >= 100 THEN 2
      ELSE 1
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_unlocked_count;
END;
$$;

COMMENT ON FUNCTION public.update_user_achievements IS 'Update achievement progress and unlock new achievements';

-- =====================================================
-- 6. Initialize for existing users
-- =====================================================
-- This will be run manually or via a separate script
-- DO $$
-- DECLARE
--   v_user RECORD;
-- BEGIN
--   FOR v_user IN SELECT id FROM profiles LOOP
--     PERFORM public.initialize_user_progress(v_user.id);
--     PERFORM public.update_user_achievements(v_user.id);
--   END LOOP;
-- END $$;

