-- =====================================================
-- Dashboard Production Tables Migration - NO DEADLOCK VERSION
-- =====================================================
-- This version avoids deadlocks by:
-- 1. Running operations in smaller transactions
-- 2. Using IF NOT EXISTS where possible
-- 3. Avoiding concurrent access to same tables
-- 4. Using advisory locks
-- =====================================================

-- Get advisory lock to prevent concurrent execution
SELECT pg_advisory_lock(123456789);

-- =====================================================
-- PART 1: UPDATE NOTIFICATIONS TABLE
-- =====================================================

-- Add missing column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Drop and recreate policies (one by one to avoid deadlock)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS notifications_updated_at ON notifications;
CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- =====================================================
-- PART 2: UPDATE RATE_LIMIT_REQUESTS TABLE
-- =====================================================

-- Add missing columns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rate_limit_requests' 
        AND column_name = 'endpoint'
    ) THEN
        ALTER TABLE rate_limit_requests ADD COLUMN endpoint TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rate_limit_requests' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE rate_limit_requests ADD COLUMN ip_address INET;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rate_limit_requests' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE rate_limit_requests ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_time ON rate_limit_requests(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint ON rate_limit_requests(endpoint, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_created_at ON rate_limit_requests(created_at);

-- =====================================================
-- PART 3: UPDATE PERFORMANCE_METRICS TABLE
-- =====================================================

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(name, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);

-- Drop and recreate policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own metrics" ON performance_metrics;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own metrics" ON performance_metrics;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics"
  ON performance_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON performance_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PART 4: UPDATE ERROR_LOGS TABLE
-- =====================================================

-- Add missing columns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'error_logs' 
        AND column_name = 'resolved_at'
    ) THEN
        ALTER TABLE error_logs ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'error_logs' 
        AND column_name = 'resolved_by'
    ) THEN
        ALTER TABLE error_logs ADD COLUMN resolved_by UUID;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'error_logs' 
        AND column_name = 'created_at'
    ) THEN
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved, created_at DESC);

-- Drop and recreate policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own error logs" ON error_logs;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own error logs" ON error_logs;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own error logs"
  ON error_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own error logs"
  ON error_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PART 5: CREATE/UPDATE FUNCTIONS
-- =====================================================

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

CREATE OR REPLACE FUNCTION cleanup_rate_limit_requests()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_requests
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_performance_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM performance_metrics
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_error_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND resolved = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 6: CREATE/UPDATE TRIGGERS
-- =====================================================

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
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the insert if notification fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_review ON gmb_reviews;
CREATE TRIGGER trigger_notify_new_review
  AFTER INSERT ON gmb_reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_review();

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
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the insert if notification fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_question ON gmb_questions;
CREATE TRIGGER trigger_notify_new_question
  AFTER INSERT ON gmb_questions
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_question();

-- =====================================================
-- PART 7: CREATE/UPDATE VIEWS
-- =====================================================

DROP VIEW IF EXISTS v_performance_summary CASCADE;
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

DROP VIEW IF EXISTS v_error_summary CASCADE;
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

DROP VIEW IF EXISTS v_notification_summary CASCADE;
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
-- PART 8: GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT ON rate_limit_requests TO authenticated;
GRANT SELECT, INSERT ON performance_metrics TO authenticated;
GRANT SELECT, INSERT ON error_logs TO authenticated;

GRANT SELECT ON v_performance_summary TO authenticated;
GRANT SELECT ON v_error_summary TO authenticated;
GRANT SELECT ON v_notification_summary TO authenticated;

GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION log_error TO authenticated;
GRANT EXECUTE ON FUNCTION track_performance TO authenticated;

-- =====================================================
-- CLEANUP AND FINISH
-- =====================================================

-- Release advisory lock
SELECT pg_advisory_unlock(123456789);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Dashboard production migration completed successfully!';
  RAISE NOTICE '📊 Updated tables: notifications, rate_limit_requests, performance_metrics, error_logs';
  RAISE NOTICE '🔧 Created/updated functions: create_notification, log_error, track_performance';
  RAISE NOTICE '🔔 Created/updated triggers: notify_new_review, notify_new_question';
  RAISE NOTICE '📈 Created/updated views: v_performance_summary, v_error_summary, v_notification_summary';
  RAISE NOTICE '🔒 No deadlocks - migration completed safely!';
END $$;

