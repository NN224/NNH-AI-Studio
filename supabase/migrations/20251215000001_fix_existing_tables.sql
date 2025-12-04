-- =====================================================
-- Fix/Update Existing Tables Structure
-- =====================================================
-- This handles tables that might already exist with different structure
-- =====================================================

-- =====================================================
-- FIX USER_ACHIEVEMENTS TABLE
-- =====================================================

-- Check if table exists and add missing columns
DO $$
BEGIN
  -- Check if user_achievements table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_achievements'
  ) THEN
    -- Add achievement_type column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'user_achievements'
      AND column_name = 'achievement_type'
    ) THEN
      ALTER TABLE user_achievements ADD COLUMN achievement_type TEXT;
      UPDATE user_achievements SET achievement_type = 'default' WHERE achievement_type IS NULL;
      ALTER TABLE user_achievements ALTER COLUMN achievement_type SET NOT NULL;
      RAISE NOTICE 'Added achievement_type column to user_achievements';
    END IF;

    -- Add achievement_name column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'user_achievements'
      AND column_name = 'achievement_name'
    ) THEN
      ALTER TABLE user_achievements ADD COLUMN achievement_name TEXT;
      UPDATE user_achievements SET achievement_name = COALESCE(achievement_type, 'Unknown') WHERE achievement_name IS NULL;
      ALTER TABLE user_achievements ALTER COLUMN achievement_name SET NOT NULL;
      RAISE NOTICE 'Added achievement_name column to user_achievements';
    END IF;

    -- Add other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'achievement_description') THEN
      ALTER TABLE user_achievements ADD COLUMN achievement_description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'points') THEN
      ALTER TABLE user_achievements ADD COLUMN points INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'unlocked_at') THEN
      ALTER TABLE user_achievements ADD COLUMN unlocked_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'metadata') THEN
      ALTER TABLE user_achievements ADD COLUMN metadata JSONB DEFAULT '{}'::JSONB;
    END IF;

  ELSE
    -- Create table if it doesn't exist
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
    RAISE NOTICE 'Created user_achievements table';
  END IF;

  -- Add unique constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_achievements_user_id_achievement_type_key'
  ) THEN
    ALTER TABLE user_achievements
    ADD CONSTRAINT user_achievements_user_id_achievement_type_key
    UNIQUE(user_id, achievement_type);
    RAISE NOTICE 'Added unique constraint to user_achievements';
  END IF;

  -- Create indexes if not exist
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_achievements_user_id') THEN
    CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_achievements_type') THEN
    CREATE INDEX idx_user_achievements_type ON user_achievements(achievement_type);
  END IF;
END $$;

-- =====================================================
-- FIX USER_PROGRESS TABLE
-- =====================================================

DO $$
BEGIN
  -- Check if user_progress table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_progress'
  ) THEN
    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'metric_type') THEN
      ALTER TABLE user_progress ADD COLUMN metric_type TEXT;
      UPDATE user_progress SET metric_type = 'general' WHERE metric_type IS NULL;
      ALTER TABLE user_progress ALTER COLUMN metric_type SET NOT NULL;
    END IF;

    -- Add other columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'current_value') THEN
      ALTER TABLE user_progress ADD COLUMN current_value INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'target_value') THEN
      ALTER TABLE user_progress ADD COLUMN target_value INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'level') THEN
      ALTER TABLE user_progress ADD COLUMN level INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'experience_points') THEN
      ALTER TABLE user_progress ADD COLUMN experience_points INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'streak_days') THEN
      ALTER TABLE user_progress ADD COLUMN streak_days INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'last_activity') THEN
      ALTER TABLE user_progress ADD COLUMN last_activity TIMESTAMPTZ DEFAULT NOW();
    END IF;

  ELSE
    -- Create table if it doesn't exist
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
    RAISE NOTICE 'Created user_progress table';
  END IF;

  -- Add unique constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_progress_user_id_metric_type_key'
  ) THEN
    ALTER TABLE user_progress
    ADD CONSTRAINT user_progress_user_id_metric_type_key
    UNIQUE(user_id, metric_type);
  END IF;
END $$;

-- =====================================================
-- Enable RLS on all tables
-- =====================================================

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage achievements" ON user_achievements;
CREATE POLICY "System can manage achievements" ON user_achievements
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage progress" ON user_progress;
CREATE POLICY "System can manage progress" ON user_progress
  FOR ALL USING (true);

-- =====================================================
-- Success Message
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tables fixed/updated successfully!';
  RAISE NOTICE 'user_achievements and user_progress are ready';
END $$;
