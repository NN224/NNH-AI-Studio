-- =====================================================
-- Fix Error Logs Table - Add Missing Columns
-- =====================================================
-- Handles existing error_logs table
-- =====================================================

-- Check if error_logs exists and add missing columns
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'error_logs'
  ) THEN
    -- Add severity column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'error_logs'
      AND column_name = 'severity'
    ) THEN
      ALTER TABLE error_logs
      ADD COLUMN severity TEXT DEFAULT 'error'
      CHECK (severity IN ('info', 'warning', 'error', 'critical'));
      RAISE NOTICE 'Added severity column to error_logs';
    END IF;

    -- Add other missing columns if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'error_code') THEN
      ALTER TABLE error_logs ADD COLUMN error_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'stack_trace') THEN
      ALTER TABLE error_logs ADD COLUMN stack_trace TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'url') THEN
      ALTER TABLE error_logs ADD COLUMN url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'method') THEN
      ALTER TABLE error_logs ADD COLUMN method TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'user_agent') THEN
      ALTER TABLE error_logs ADD COLUMN user_agent TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'ip_address') THEN
      ALTER TABLE error_logs ADD COLUMN ip_address TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'context') THEN
      ALTER TABLE error_logs ADD COLUMN context JSONB DEFAULT '{}'::JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'resolved') THEN
      ALTER TABLE error_logs ADD COLUMN resolved BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'resolved_at') THEN
      ALTER TABLE error_logs ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'resolved_by') THEN
      ALTER TABLE error_logs ADD COLUMN resolved_by UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'error_logs' AND column_name = 'notes') THEN
      ALTER TABLE error_logs ADD COLUMN notes TEXT;
    END IF;

    RAISE NOTICE 'error_logs table updated with all required columns';

  ELSE
    -- Create the table if it doesn't exist
    CREATE TABLE error_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      error_type TEXT NOT NULL,
      error_message TEXT NOT NULL,
      error_code TEXT,
      stack_trace TEXT,
      url TEXT,
      method TEXT,
      user_agent TEXT,
      ip_address TEXT,
      context JSONB DEFAULT '{}'::JSONB,
      severity TEXT DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
      resolved BOOLEAN DEFAULT false,
      resolved_at TIMESTAMPTZ,
      resolved_by UUID REFERENCES auth.users(id),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created error_logs table';
  END IF;

  -- Create indexes if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_error_logs_user_id') THEN
    CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_error_logs_created_at') THEN
    CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_error_logs_error_type') THEN
    CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_error_logs_severity') THEN
    CREATE INDEX idx_error_logs_severity ON error_logs(severity);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_error_logs_resolved') THEN
    CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view own errors" ON error_logs;
CREATE POLICY "Users can view own errors" ON error_logs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "System can insert errors" ON error_logs;
CREATE POLICY "System can insert errors" ON error_logs
  FOR INSERT WITH CHECK (true);

-- Now add activity_logs and notifications if they don't exist
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  resource_name TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own activities" ON activity_logs;
CREATE POLICY "Users can view own activities" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert activities" ON activity_logs;
CREATE POLICY "System can insert activities" ON activity_logs
  FOR INSERT WITH CHECK (true);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'gmb', 'review', 'question', 'system', 'achievement', 'alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  icon TEXT,
  color TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage notifications" ON notifications;
CREATE POLICY "System can manage notifications" ON notifications
  FOR ALL USING (true);

-- Success
SELECT
  '✅ All logging tables fixed/created!' as status,
  'error_logs, activity_logs, notifications ready' as message;
