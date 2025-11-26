-- Add automatic activity logging for dashboard
-- This will populate the Recent Activity section

-- Function to log review activities
CREATE OR REPLACE FUNCTION log_review_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log new review
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (user_id, activity_type, activity_message, created_at)
    VALUES (
      NEW.user_id,
      'review_received',
      'New review received: ' || COALESCE(NEW.rating::text, '0') || ' stars from ' || COALESCE(NEW.reviewer_name, 'Anonymous'),
      NEW.created_at
    );
  END IF;
  
  -- Log review reply
  IF TG_OP = 'UPDATE' AND OLD.reply_text IS NULL AND NEW.reply_text IS NOT NULL THEN
    INSERT INTO activity_logs (user_id, activity_type, activity_message, created_at)
    VALUES (
      NEW.user_id,
      'review_responded',
      'Replied to review from ' || COALESCE(NEW.reviewer_name, 'Anonymous'),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log question activities
CREATE OR REPLACE FUNCTION log_question_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log new question
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (user_id, activity_type, activity_message, created_at)
    VALUES (
      NEW.user_id,
      'question_received',
      'New question received: ' || LEFT(COALESCE(NEW.question_text, 'Question'), 50),
      NEW.created_at
    );
  END IF;
  
  -- Log question answer
  IF TG_OP = 'UPDATE' AND OLD.answer_text IS NULL AND NEW.answer_text IS NOT NULL THEN
    INSERT INTO activity_logs (user_id, activity_type, activity_message, created_at)
    VALUES (
      NEW.user_id,
      'question_answered',
      'Answered a customer question',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log post activities
CREATE OR REPLACE FUNCTION log_post_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (user_id, activity_type, activity_message, created_at)
    VALUES (
      NEW.user_id,
      'post_published',
      'Published new post: ' || LEFT(COALESCE(NEW.summary, 'Post'), 50),
      NEW.created_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_log_review_activity ON gmb_reviews;
DROP TRIGGER IF EXISTS trigger_log_question_activity ON gmb_questions;
DROP TRIGGER IF EXISTS trigger_log_post_activity ON gmb_posts;

-- Create triggers
CREATE TRIGGER trigger_log_review_activity
  AFTER INSERT OR UPDATE ON gmb_reviews
  FOR EACH ROW
  EXECUTE FUNCTION log_review_activity();

CREATE TRIGGER trigger_log_question_activity
  AFTER INSERT OR UPDATE ON gmb_questions
  FOR EACH ROW
  EXECUTE FUNCTION log_question_activity();

CREATE TRIGGER trigger_log_post_activity
  AFTER INSERT ON gmb_posts
  FOR EACH ROW
  EXECUTE FUNCTION log_post_activity();

-- Backfill recent activity from existing data (last 30 days only)
INSERT INTO activity_logs (user_id, activity_type, activity_message, created_at)
SELECT 
  user_id,
  'review_received',
  'Review received: ' || rating::text || ' stars from ' || COALESCE(reviewer_name, 'Anonymous'),
  created_at
FROM gmb_reviews
WHERE created_at > NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM activity_logs al 
    WHERE al.user_id = gmb_reviews.user_id 
    AND al.created_at = gmb_reviews.created_at
  )
ORDER BY created_at DESC
LIMIT 50;

COMMENT ON FUNCTION log_review_activity() IS 'Automatically logs review activities to activity_logs table';
COMMENT ON FUNCTION log_question_activity() IS 'Automatically logs question activities to activity_logs table';
COMMENT ON FUNCTION log_post_activity() IS 'Automatically logs post activities to activity_logs table';

