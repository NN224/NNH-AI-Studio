-- =====================================================
-- Dashboard Production Tables Migration - SAFE VERSION
-- =====================================================
-- This migration safely adds/updates tables for production dashboard
-- It checks for existing tables and policies before creating them
-- =====================================================

-- =====================================================
-- 1. NOTIFICATIONS TABLE (Already exists - skip creation)
-- =====================================================
-- Table already exists in database (line 899 in CSV)
-- Just add missing columns if any

DO $$ 
BEGIN
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Drop existing policies if they exist, then recreate
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
    DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
END $$;

-- Recreate RLS policies
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

-- Update trigger for notifications
DROP TRIGGER IF EXISTS notifications_updated_at ON notifications;

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
-- 2. RATE LIMIT REQUESTS TABLE (Already exists - skip creation)
-- =====================================================
-- Table already exists in database (line 905 in CSV)
-- Just ensure it has the right columns

DO $$ 
BEGIN
    -- Add endpoint column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rate_limit_requests' 
        AND column_name = 'endpoint'
    ) THEN
        ALTER TABLE rate_limit_requests ADD COLUMN endpoint TEXT;
    END IF;

    -- Add ip_address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rate_limit_requests' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE rate_limit_requests ADD COLUMN ip_address INET;
    END IF;

    -- Add user_agent column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rate_limit_requests' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE rate_limit_requests ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_time ON rate_limit_requests(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint ON rate_limit_requests(endpoint, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_created_at ON rate_limit_requests(created_at);

-- =====================================================
-- 3. PERFORMANCE METRICS TABLE (Already exists - skip creation)
-- =====================================================
-- Table already exists in database (line 902 in CSV)
-- Just ensure it has the right structure

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(name, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);

-- Drop existing policies if they exist, then recreate
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own metrics" ON performance_metrics;
    DROP POLICY IF EXISTS "Users can insert their own metrics" ON performance_metrics;
END $$;

-- Recreate RLS policies
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics"
  ON performance_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON performance_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. ERROR LOGS TABLE (Already exists - update structure)
-- =====================================================
-- Table already exists in database (line 877 in CSV)
-- Add missing columns for production features

DO $$ 
BEGIN
    -- Add resolved_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'error_logs' 
        AND column_name = 'resolved_at'
    ) THEN
        ALTER TABLE error_logs ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;

    -- Add resolved_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'error_logs' 
        AND column_name = 'resolved_by'
    ) THEN
        ALTER TABLE error_logs ADD COLUMN resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Add created_at column if it doesn't exist (rename from timestamp)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'error_logs' 
        AND column_name = 'created_at'
    ) THEN
        -- If timestamp column exists, rename it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'error_logs' 
            AND column_name = 'timestamp'
        ) THEN
            ALTER TABLE error_logs RENAME COLUMN timestamp TO created_at;
        ELSE
            ALTER TABLE error_logs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved, created_at DESC);

-- Drop existing policies if they exist, then recreate
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own error logs" ON error_logs;
    DROP POLICY IF EXISTS "Users can insert their own error logs" ON error_logs;
END $$;

-- Recreate RLS policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own error logs"
  ON error_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own error logs"
  ON error_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. HELPER FUNCTIONS (Safe to recreate)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. CLEANUP FUNCTIONS (Safe to recreate)
-- =====================================================

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_rate_limit_requests()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_requests
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old performance metrics
CREATE OR REPLACE FUNCTION cleanup_performance_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM performance_metrics
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old error logs
CREATE OR REPLACE FUNCTION cleanup_error_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND resolved = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. AUTO-NOTIFICATION TRIGGERS (Safe to recreate)
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_new_review ON gmb_reviews;
DROP TRIGGER IF EXISTS trigger_notify_new_question ON gmb_questions;

-- Trigger to notify on new review
CREATE OR REPLACE FUNCTION notify_new_review()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.user_id,
    'review',
    'New Review Received',
    'You have received a new ' || NEW.rating || '-star review',
    '/dashboard/reviews?id=' || NEW.id::text,
    jsonb_build_object('review_id', NEW.id, 'rating', NEW.rating)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_question
  AFTER INSERT ON gmb_questions
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_question();

-- =====================================================
-- 8. VIEWS FOR ANALYTICS (Safe to recreate)
-- =====================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS v_performance_summary;
DROP VIEW IF EXISTS v_error_summary;
DROP VIEW IF EXISTS v_notification_summary;

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
-- 9. GRANT PERMISSIONS
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

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION log_error TO authenticated;
GRANT EXECUTE ON FUNCTION track_performance TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add comment to track migration
COMMENT ON TABLE notifications IS 'Dashboard notifications system - Updated in production migration (safe)';
COMMENT ON TABLE rate_limit_requests IS 'Rate limiting tracking - Updated in production migration (safe)';
COMMENT ON TABLE performance_metrics IS 'Performance monitoring - Updated in production migration (safe)';
COMMENT ON TABLE error_logs IS 'Enhanced error logging - Updated in production migration (safe)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Dashboard production migration completed successfully!';
  RAISE NOTICE '📊 Updated tables: notifications, rate_limit_requests, performance_metrics, error_logs';
  RAISE NOTICE '🔧 Created/updated functions: create_notification, log_error, track_performance';
  RAISE NOTICE '🔔 Created/updated triggers: notify_new_review, notify_new_question';
  RAISE NOTICE '📈 Created/updated views: v_performance_summary, v_error_summary, v_notification_summary';
END $$;

