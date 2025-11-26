-- ============================================================================
-- Q&A Auto-Answer Complete Setup
-- ============================================================================
-- This migration creates the question_auto_answers_log table and adds
-- essential security policies, indexes, validations, and helper functions.
-- 
-- Created: 2024-11-19
-- Purpose: Complete the Q&A Auto-Answer feature from scratch
-- ============================================================================

-- ============================================================================
-- 0. CREATE TABLE & UPDATE SETTINGS (Foundation)
-- ============================================================================

-- Create the question_auto_answers_log table
CREATE TABLE IF NOT EXISTS question_auto_answers_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES gmb_questions(id),
  user_id UUID REFERENCES auth.users(id),
  answer_text TEXT NOT NULL,
  confidence_score DECIMAL(5,2),
  ai_provider TEXT,
  ai_model TEXT,
  context_used JSONB,
  question_category TEXT,
  language_detected TEXT,
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update the auto_reply_settings table (add new columns if they don't exist)
DO $$ 
BEGIN
  -- Add columns one by one with IF NOT EXISTS check
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'auto_reply_settings' 
                 AND column_name = 'answer_hours_questions') THEN
    ALTER TABLE auto_reply_settings
    ADD COLUMN answer_hours_questions BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'auto_reply_settings' 
                 AND column_name = 'answer_location_questions') THEN
    ALTER TABLE auto_reply_settings
    ADD COLUMN answer_location_questions BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'auto_reply_settings' 
                 AND column_name = 'answer_services_questions') THEN
    ALTER TABLE auto_reply_settings
    ADD COLUMN answer_services_questions BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'auto_reply_settings' 
                 AND column_name = 'answer_pricing_questions') THEN
    ALTER TABLE auto_reply_settings
    ADD COLUMN answer_pricing_questions BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'auto_reply_settings' 
                 AND column_name = 'answer_general_questions') THEN
    ALTER TABLE auto_reply_settings
    ADD COLUMN answer_general_questions BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'auto_reply_settings' 
                 AND column_name = 'language_preference') THEN
    ALTER TABLE auto_reply_settings
    ADD COLUMN language_preference TEXT DEFAULT 'auto';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'auto_reply_settings' 
                 AND column_name = 'tone') THEN
    ALTER TABLE auto_reply_settings
    ADD COLUMN tone TEXT DEFAULT 'professional';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'auto_reply_settings' 
                 AND column_name = 'include_business_name') THEN
    ALTER TABLE auto_reply_settings
    ADD COLUMN include_business_name BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'auto_reply_settings' 
                 AND column_name = 'add_call_to_action') THEN
    ALTER TABLE auto_reply_settings
    ADD COLUMN add_call_to_action BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ============================================================================
-- 1. ROW LEVEL SECURITY (RLS) POLICIES - CRITICAL FOR SECURITY
-- ============================================================================

-- Enable RLS on question_auto_answers_log table
ALTER TABLE question_auto_answers_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own auto-answer logs
CREATE POLICY "Users can view own auto-answer logs"
  ON question_auto_answers_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own auto-answer logs
CREATE POLICY "Users can insert own auto-answer logs"
  ON question_auto_answers_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own auto-answer logs (for status changes)
CREATE POLICY "Users can update own auto-answer logs"
  ON question_auto_answers_log
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own auto-answer logs
CREATE POLICY "Users can delete own auto-answer logs"
  ON question_auto_answers_log
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================================

-- Index on question_id for fast lookups by question
CREATE INDEX IF NOT EXISTS idx_question_auto_answers_question_id 
  ON question_auto_answers_log(question_id);

-- Index on user_id for filtering by user
CREATE INDEX IF NOT EXISTS idx_question_auto_answers_user_id 
  ON question_auto_answers_log(user_id);

-- Index on status for filtering by processing status
CREATE INDEX IF NOT EXISTS idx_question_auto_answers_status 
  ON question_auto_answers_log(status);

-- Index on created_at for sorting by date (descending for latest first)
CREATE INDEX IF NOT EXISTS idx_question_auto_answers_created_at 
  ON question_auto_answers_log(created_at DESC);

-- Composite index for common query patterns (user + status)
CREATE INDEX IF NOT EXISTS idx_question_auto_answers_user_status 
  ON question_auto_answers_log(user_id, status);

-- Index on posted_at for filtering posted answers
CREATE INDEX IF NOT EXISTS idx_question_auto_answers_posted_at 
  ON question_auto_answers_log(posted_at) 
  WHERE posted_at IS NOT NULL;

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT and INSERT permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON question_auto_answers_log TO authenticated;

-- Grant UPDATE on auto_reply_settings for the new columns
GRANT UPDATE ON auto_reply_settings TO authenticated;

-- ============================================================================
-- 4. DATA VALIDATION CONSTRAINTS
-- ============================================================================

-- Add constraints only if they don't exist
DO $$ 
BEGIN
  -- Ensure confidence score is between 0 and 100
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'confidence_score_range' 
    AND conrelid = 'question_auto_answers_log'::regclass
  ) THEN
    ALTER TABLE question_auto_answers_log
    ADD CONSTRAINT confidence_score_range 
      CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100));
  END IF;

  -- Ensure status has valid values
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_status' 
    AND conrelid = 'question_auto_answers_log'::regclass
  ) THEN
    ALTER TABLE question_auto_answers_log
    ADD CONSTRAINT valid_status 
      CHECK (status IN ('pending', 'posted', 'failed', 'rejected', 'draft'));
  END IF;

  -- Ensure processing time is non-negative
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_processing_time' 
    AND conrelid = 'question_auto_answers_log'::regclass
  ) THEN
    ALTER TABLE question_auto_answers_log
    ADD CONSTRAINT valid_processing_time 
      CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0);
  END IF;

  -- Ensure tokens used is non-negative
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_tokens_used' 
    AND conrelid = 'question_auto_answers_log'::regclass
  ) THEN
    ALTER TABLE question_auto_answers_log
    ADD CONSTRAINT valid_tokens_used 
      CHECK (tokens_used IS NULL OR tokens_used >= 0);
  END IF;

  -- Ensure cost is non-negative
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_cost' 
    AND conrelid = 'question_auto_answers_log'::regclass
  ) THEN
    ALTER TABLE question_auto_answers_log
    ADD CONSTRAINT valid_cost 
      CHECK (cost_usd IS NULL OR cost_usd >= 0);
  END IF;
END $$;

-- ============================================================================
-- 5. TABLE AND COLUMN COMMENTS (Documentation)
-- ============================================================================

-- Table comment
COMMENT ON TABLE question_auto_answers_log IS 
  'Comprehensive logging of all AI-generated answers for questions. Tracks performance, cost, and quality metrics for monitoring and optimization.';

-- Column comments
COMMENT ON COLUMN question_auto_answers_log.id IS 
  'Unique identifier for each auto-answer log entry';

COMMENT ON COLUMN question_auto_answers_log.question_id IS 
  'Reference to the original GMB question';

COMMENT ON COLUMN question_auto_answers_log.user_id IS 
  'Reference to the user who owns this business location';

COMMENT ON COLUMN question_auto_answers_log.answer_text IS 
  'The AI-generated answer text';

COMMENT ON COLUMN question_auto_answers_log.confidence_score IS 
  'AI confidence score (0-100) indicating the quality/certainty of the answer';

COMMENT ON COLUMN question_auto_answers_log.ai_provider IS 
  'The AI provider used (e.g., anthropic, openai, google, groq)';

COMMENT ON COLUMN question_auto_answers_log.ai_model IS 
  'The specific AI model used (e.g., claude-3-5-sonnet, gpt-4)';

COMMENT ON COLUMN question_auto_answers_log.context_used IS 
  'JSON object containing the business context used for generation (name, category, location, etc.)';

COMMENT ON COLUMN question_auto_answers_log.question_category IS 
  'Detected category of the question (hours, location, services, pricing, general)';

COMMENT ON COLUMN question_auto_answers_log.language_detected IS 
  'Detected language of the question (ar, en, auto)';

COMMENT ON COLUMN question_auto_answers_log.processing_time_ms IS 
  'Time taken to generate the answer in milliseconds';

COMMENT ON COLUMN question_auto_answers_log.tokens_used IS 
  'Number of tokens consumed for this generation';

COMMENT ON COLUMN question_auto_answers_log.cost_usd IS 
  'Cost in USD for this AI generation';

COMMENT ON COLUMN question_auto_answers_log.status IS 
  'Current status: pending (awaiting posting), posted (successfully posted), failed (error occurred), rejected (declined by user), draft (needs review)';

COMMENT ON COLUMN question_auto_answers_log.error_message IS 
  'Error message if status is failed';

COMMENT ON COLUMN question_auto_answers_log.posted_at IS 
  'Timestamp when the answer was successfully posted to GMB';

COMMENT ON COLUMN question_auto_answers_log.created_at IS 
  'Timestamp when the log entry was created';

-- auto_reply_settings new columns comments
COMMENT ON COLUMN auto_reply_settings.answer_hours_questions IS 
  'Enable auto-answering for questions about business hours';

COMMENT ON COLUMN auto_reply_settings.answer_location_questions IS 
  'Enable auto-answering for questions about location/directions';

COMMENT ON COLUMN auto_reply_settings.answer_services_questions IS 
  'Enable auto-answering for questions about services offered';

COMMENT ON COLUMN auto_reply_settings.answer_pricing_questions IS 
  'Enable auto-answering for questions about pricing';

COMMENT ON COLUMN auto_reply_settings.answer_general_questions IS 
  'Enable auto-answering for general questions (disabled by default for safety)';

COMMENT ON COLUMN auto_reply_settings.language_preference IS 
  'Preferred language for answers: auto (detect from question), ar (Arabic), en (English)';

COMMENT ON COLUMN auto_reply_settings.tone IS 
  'Tone of the answers: professional, friendly, casual';

COMMENT ON COLUMN auto_reply_settings.include_business_name IS 
  'Include business name in the answer for personalization';

COMMENT ON COLUMN auto_reply_settings.add_call_to_action IS 
  'Add a call-to-action (e.g., visit us, call us) at the end of answers';

-- ============================================================================
-- 6. HELPER FUNCTION: Get Auto-Answer Statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_auto_answer_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_answers BIGINT,
  posted_answers BIGINT,
  failed_answers BIGINT,
  avg_confidence NUMERIC,
  avg_processing_time_ms NUMERIC,
  total_tokens_used BIGINT,
  total_cost_usd NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_answers,
    COUNT(*) FILTER (WHERE status = 'posted') as posted_answers,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_answers,
    ROUND(AVG(confidence_score), 2) as avg_confidence,
    ROUND(AVG(processing_time_ms), 0) as avg_processing_time_ms,
    SUM(tokens_used) as total_tokens_used,
    SUM(cost_usd) as total_cost_usd
  FROM question_auto_answers_log
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_auto_answer_stats(UUID, INTEGER) TO authenticated;

-- Comment on the function
COMMENT ON FUNCTION get_auto_answer_stats IS 
  'Get aggregated statistics for auto-answers over a specified period. Returns counts, averages, and totals for monitoring performance and costs.';

-- ============================================================================
-- 7. TRIGGER: Auto-update timestamps
-- ============================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_question_auto_answers_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Update posted_at when status changes to 'posted'
  IF NEW.status = 'posted' AND OLD.status != 'posted' THEN
    NEW.posted_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_question_auto_answers_log_timestamp ON question_auto_answers_log;
CREATE TRIGGER trigger_update_question_auto_answers_log_timestamp
  BEFORE UPDATE ON question_auto_answers_log
  FOR EACH ROW
  EXECUTE FUNCTION update_question_auto_answers_log_timestamp();

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify success)
-- ============================================================================

-- Uncomment to verify the migration was successful:

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'question_auto_answers_log';

-- Check all policies
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'question_auto_answers_log';

-- Check all indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'question_auto_answers_log';

-- Check constraints
-- SELECT conname, contype, pg_get_constraintdef(oid) as definition
-- FROM pg_constraint
-- WHERE conrelid = 'question_auto_answers_log'::regclass;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
