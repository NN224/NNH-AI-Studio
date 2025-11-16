-- ========================================
-- GMB NOTIFICATIONS MIGRATION
-- نسخ هذا الملف والصقه في Supabase SQL Editor
-- ========================================

-- Add new columns to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS notification_type TEXT,
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS review_name TEXT,
ADD COLUMN IF NOT EXISTS question_name TEXT,
ADD COLUMN IF NOT EXISTS answer_name TEXT,
ADD COLUMN IF NOT EXISTS media_name TEXT,
ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_notification_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_location_id ON notifications(location_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Add check constraint for notification_type
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type IN (
  'NEW_REVIEW',
  'UPDATED_REVIEW',
  'NEW_QUESTION',
  'UPDATED_QUESTION',
  'NEW_ANSWER',
  'UPDATED_ANSWER',
  'NEW_CUSTOMER_MEDIA',
  'GOOGLE_UPDATE',
  'DUPLICATE_LOCATION',
  'VOICE_OF_MERCHANT_UPDATED'
));

-- Add column to gmb_accounts for storing notification settings
ALTER TABLE gmb_accounts 
ADD COLUMN IF NOT EXISTS notification_settings JSONB;

-- Create index on notification_settings
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_notification_settings 
ON gmb_accounts USING gin(notification_settings);

-- Add comments
COMMENT ON COLUMN notifications.notification_type IS 'Type of Google Business Profile notification (e.g., NEW_REVIEW, NEW_QUESTION)';
COMMENT ON COLUMN notifications.location_name IS 'Google resource name for the location (e.g., locations/12345)';
COMMENT ON COLUMN notifications.review_name IS 'Google resource name for the review (e.g., locations/12345/reviews/67890)';
COMMENT ON COLUMN notifications.question_name IS 'Google resource name for the question';
COMMENT ON COLUMN notifications.answer_name IS 'Google resource name for the answer';
COMMENT ON COLUMN notifications.media_name IS 'Google resource name for the media item';
COMMENT ON COLUMN notifications.raw_data IS 'Complete notification data from Google Pub/Sub';
COMMENT ON COLUMN gmb_accounts.notification_settings IS 'Google Business Profile notification settings (pubsubTopic, notificationTypes)';

-- Create function to clean up old notifications (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND read = true;
  
  RAISE NOTICE 'Cleaned up old read notifications';
END;
$$;

-- Create function to get unread notification count by type
CREATE OR REPLACE FUNCTION get_unread_notifications_by_type(p_user_id UUID)
RETURNS TABLE(
  notification_type TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.notification_type,
    COUNT(*)::BIGINT
  FROM notifications n
  WHERE n.user_id = p_user_id
  AND n.read = false
  AND n.notification_type IS NOT NULL
  GROUP BY n.notification_type
  ORDER BY COUNT(*) DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notifications_by_type(UUID) TO authenticated;

-- Add RLS policies if not exists
DO $$ 
BEGIN
  -- Policy for users to view their own notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
      ON notifications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for users to update their own notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON notifications FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for users to delete their own notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can delete own notifications'
  ) THEN
    CREATE POLICY "Users can delete own notifications"
      ON notifications FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for system to insert notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'System can insert notifications'
  ) THEN
    CREATE POLICY "System can insert notifications"
      ON notifications FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create a view for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE read = false) as unread_count,
  COUNT(*) FILTER (WHERE read = true) as read_count,
  COUNT(*) FILTER (WHERE notification_type = 'NEW_REVIEW') as new_reviews_count,
  COUNT(*) FILTER (WHERE notification_type = 'NEW_QUESTION') as new_questions_count,
  COUNT(*) FILTER (WHERE notification_type = 'NEW_CUSTOMER_MEDIA') as new_media_count,
  MAX(created_at) FILTER (WHERE read = false) as latest_unread_at
FROM notifications
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON notification_stats TO authenticated;

-- Add comment
COMMENT ON VIEW notification_stats IS 'Statistics about user notifications';

-- ========================================
-- ✅ DONE! Migration completed successfully
-- ========================================

