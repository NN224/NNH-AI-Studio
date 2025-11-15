-- =====================================================
-- Dashboard Production Tables Migration
-- =====================================================
-- This migration adds tables required for production dashboard features:
-- 1. Notifications system
-- 2. Rate limiting
-- 3. Performance metrics
-- 4. Enhanced error logging
-- =====================================================

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('review', 'question', 'post', 'location', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- =====================================================
-- 2. RATE LIMITING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_limit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Can be user ID or IP address
  endpoint TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_time ON rate_limit_requests(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint ON rate_limit_requests(endpoint, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_created_at ON rate_limit_requests(created_at);

-- Function to clean up old rate limit records (call via cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_requests()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_requests
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. PERFORMANCE METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(name, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);

-- RLS policies for performance metrics
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics"
  ON performance_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON performance_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to clean up old performance metrics (call via cron)
CREATE OR REPLACE FUNCTION cleanup_performance_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM performance_metrics
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. ENHANCED ERROR LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB,
  severity INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved, created_at DESC);

-- RLS policies for error logs
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own error logs"
  ON error_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own error logs"
  ON error_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to clean up old error logs (call via cron)
CREATE OR REPLACE FUNCTION cleanup_error_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND resolved = true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log error
CREATE OR REPLACE FUNCTION log_error(
  p_user_id UUID,
  p_message TEXT,
  p_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT NULL,
  p_severity INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
  v_error_id UUID;
BEGIN
  INSERT INTO error_logs (user_id, message, stack, context, severity)
  VALUES (p_user_id, p_message, p_stack, p_context, p_severity)
  RETURNING id INTO v_error_id;
  
  RETURN v_error_id;
END;
$$ LANGUAGE plpgsql;

-- Function to track performance metric
CREATE OR REPLACE FUNCTION track_performance(
  p_user_id UUID,
  p_name TEXT,
  p_value NUMERIC,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_metric_id UUID;
BEGIN
  INSERT INTO performance_metrics (user_id, name, value, metadata)
  VALUES (p_user_id, p_name, p_value, p_metadata)
  RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGERS FOR AUTO-NOTIFICATIONS
-- =====================================================

-- Trigger to notify on new review
CREATE OR REPLACE FUNCTION notify_new_review()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.user_id,
    'review',
    'New Review Received',
    'You have received a new ' || NEW.star_rating || '-star review',
    '/dashboard/reviews?id=' || NEW.id::text,
    jsonb_build_object('review_id', NEW.id, 'rating', NEW.star_rating)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_review
  AFTER INSERT ON gmb_reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_review();

-- Trigger to notify on new question
CREATE OR REPLACE FUNCTION notify_new_question()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.user_id,
    'question',
    'New Question Asked',
    'A customer has asked a new question',
    '/dashboard/questions?id=' || NEW.id::text,
    jsonb_build_object('question_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_question
  AFTER INSERT ON gmb_questions
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_question();

-- =====================================================
-- 7. VIEWS FOR ANALYTICS
-- =====================================================

-- View for performance metrics summary
CREATE OR REPLACE VIEW v_performance_summary AS
SELECT
  user_id,
  name,
  COUNT(*) as measurement_count,
  AVG(value) as avg_value,
  MIN(value) as min_value,
  MAX(value) as max_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
  MAX(timestamp) as last_measured
FROM performance_metrics
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY user_id, name;

-- View for error logs summary
CREATE OR REPLACE VIEW v_error_summary AS
SELECT
  user_id,
  severity,
  COUNT(*) as error_count,
  COUNT(CASE WHEN resolved THEN 1 END) as resolved_count,
  MAX(created_at) as last_error
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id, severity;

-- View for notification summary
CREATE OR REPLACE VIEW v_notification_summary AS
SELECT
  user_id,
  type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN NOT read THEN 1 END) as unread_count,
  MAX(created_at) as last_notification
FROM notifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, type;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT ON rate_limit_requests TO authenticated;
GRANT SELECT, INSERT ON performance_metrics TO authenticated;
GRANT SELECT, INSERT ON error_logs TO authenticated;

-- Grant permissions on views
GRANT SELECT ON v_performance_summary TO authenticated;
GRANT SELECT ON v_error_summary TO authenticated;
GRANT SELECT ON v_notification_summary TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add comment to track migration
COMMENT ON TABLE notifications IS 'Dashboard notifications system - Added in production migration';
COMMENT ON TABLE rate_limit_requests IS 'Rate limiting tracking - Added in production migration';
COMMENT ON TABLE performance_metrics IS 'Performance monitoring - Added in production migration';
COMMENT ON TABLE error_logs IS 'Enhanced error logging - Added in production migration';

