-- 2025-11-04: Ensure weekly_task_recommendations table matches application expectations

-- Create table if it does not exist
CREATE TABLE IF NOT EXISTS public.weekly_task_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT CHECK (priority IN ('high','medium','low')) DEFAULT 'medium',
  effort_level TEXT CHECK (effort_level IN ('quick','moderate','extensive')) DEFAULT 'moderate',
  estimated_minutes INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending','in_progress','completed','dismissed')) DEFAULT 'pending',
  reasoning TEXT,
  expected_impact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_start_date, title)
);

-- Add missing columns if the table already existed with a reduced schema
ALTER TABLE public.weekly_task_recommendations
  ADD COLUMN IF NOT EXISTS week_start_date DATE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS effort_level TEXT,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS reasoning TEXT,
  ADD COLUMN IF NOT EXISTS expected_impact TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure constraints/defaults exist
ALTER TABLE public.weekly_task_recommendations
  ALTER COLUMN week_start_date SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN priority SET DEFAULT 'medium',
  ALTER COLUMN effort_level SET DEFAULT 'moderate',
  ALTER COLUMN estimated_minutes SET DEFAULT 0,
  ALTER COLUMN status SET DEFAULT 'pending';

-- Recreate check constraints safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_task_recommendations_priority_check'
  ) THEN
    ALTER TABLE public.weekly_task_recommendations
      ADD CONSTRAINT weekly_task_recommendations_priority_check
      CHECK (priority IN ('high','medium','low'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_task_recommendations_effort_level_check'
  ) THEN
    ALTER TABLE public.weekly_task_recommendations
      ADD CONSTRAINT weekly_task_recommendations_effort_level_check
      CHECK (effort_level IN ('quick','moderate','extensive'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_task_recommendations_status_check'
  ) THEN
    ALTER TABLE public.weekly_task_recommendations
      ADD CONSTRAINT weekly_task_recommendations_status_check
      CHECK (status IN ('pending','in_progress','completed','dismissed'));
  END IF;
END
$$;

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_user_id
  ON public.weekly_task_recommendations(user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_tasks_week_start
  ON public.weekly_task_recommendations(week_start_date);

-- Enable RLS and add policy
ALTER TABLE public.weekly_task_recommendations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  policyname = 'Users manage their weekly tasks'
      AND  tablename = 'weekly_task_recommendations'
  ) THEN
    CREATE POLICY "Users manage their weekly tasks"
      ON public.weekly_task_recommendations
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_weekly_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_weekly_task_updated_at
  ON public.weekly_task_recommendations;

CREATE TRIGGER tr_weekly_task_updated_at
  BEFORE UPDATE ON public.weekly_task_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_weekly_task_updated_at();
