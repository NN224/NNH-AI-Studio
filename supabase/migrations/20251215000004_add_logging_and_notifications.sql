-- =====================================================
-- Add Error Logging, Activity Logs, and Notifications
-- =====================================================
-- Essential tables for debugging, tracking, and user communication
-- =====================================================

-- =====================================================
-- ERROR LOGS TABLE (للـ debugging)
-- =====================================================

CREATE TABLE IF NOT EXISTS error_logs (
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own errors" ON error_logs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can insert errors" ON error_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage all errors" ON error_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN (
        SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))
      )
    )
  );

-- =====================================================
-- ACTIVITY LOGS TABLE (للـ analytics & tracking)
-- =====================================================

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id ON activity_logs(resource_id);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own activities" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activities" ON activity_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- NOTIFICATIONS TABLE (للإشعارات)
-- =====================================================

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage notifications" ON notifications
  FOR ALL USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to log errors easily
CREATE OR REPLACE FUNCTION log_error(
  p_error_type TEXT,
  p_error_message TEXT,
  p_context JSONB DEFAULT '{}'::JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_error_id UUID;
BEGIN
  INSERT INTO error_logs (
    user_id,
    error_type,
    error_message,
    context,
    created_at
  ) VALUES (
    COALESCE(p_user_id, auth.uid()),
    p_error_type,
    p_error_message,
    p_context,
    NOW()
  ) RETURNING id INTO v_error_id;

  RETURN v_error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activity_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    created_at
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata,
    NOW()
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_category TEXT DEFAULT 'general',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    category,
    title,
    message,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_type,
    p_category,
    p_title,
    p_message,
    p_metadata,
    NOW()
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_error TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_activity TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated, service_role;

-- =====================================================
-- VIEWS FOR EASY ACCESS
-- =====================================================

-- Recent errors view
CREATE OR REPLACE VIEW recent_errors AS
SELECT
  id,
  user_id,
  error_type,
  error_message,
  severity,
  resolved,
  created_at
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- User activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  user_id,
  DATE(created_at) as activity_date,
  COUNT(*) as action_count,
  COUNT(DISTINCT action) as unique_actions,
  COUNT(DISTINCT resource_type) as resource_types_accessed
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, DATE(created_at);

-- Unread notifications count
CREATE OR REPLACE VIEW unread_notifications_count AS
SELECT
  user_id,
  COUNT(*) as unread_count,
  COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_count,
  COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count
FROM notifications
WHERE read = false
AND (expires_at IS NULL OR expires_at > NOW())
GROUP BY user_id;

-- Grant permissions on views
GRANT SELECT ON recent_errors TO authenticated;
GRANT SELECT ON user_activity_summary TO authenticated;
GRANT SELECT ON unread_notifications_count TO authenticated;

-- =====================================================
-- Success Message
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Logging and Notifications tables created successfully!';
  RAISE NOTICE '📊 Tables added:';
  RAISE NOTICE '  - error_logs: For debugging and error tracking';
  RAISE NOTICE '  - activity_logs: For user activity analytics';
  RAISE NOTICE '  - notifications: For in-app notifications';
  RAISE NOTICE '🔧 Helper functions added:';
  RAISE NOTICE '  - log_error(): Easy error logging';
  RAISE NOTICE '  - log_activity(): Track user actions';
  RAISE NOTICE '  - create_notification(): Send notifications';
  RAISE NOTICE '📈 Views added for easy access to data';
END $$;
