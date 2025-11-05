-- CRITICAL: Composite index for date-filtered review queries
-- This index is used in ALL date range queries on gmb_reviews
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_user_location_date 
ON gmb_reviews (user_id, location_id, review_date DESC);

-- CRITICAL: Composite index for unanswered questions
CREATE INDEX IF NOT EXISTS idx_gmb_questions_user_location_answer 
ON gmb_questions (user_id, location_id, answer_text);

-- CRITICAL: Partial index for pending reviews (no reply)
-- Significantly improves query performance for pending reviews count
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_pending 
ON gmb_reviews (user_id, location_id) 
WHERE review_reply IS NULL OR review_reply = '';

-- CRITICAL: Partial index for unanswered questions
CREATE INDEX IF NOT EXISTS idx_gmb_questions_unanswered 
ON gmb_questions (user_id, location_id) 
WHERE answer_text IS NULL;

-- HIGH: Index for GMB account lookups (filtered by active status)
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_user_active 
ON gmb_accounts (user_id, is_active) 
WHERE is_active = true;

-- HIGH: Index for location lookups by account
CREATE INDEX IF NOT EXISTS idx_gmb_locations_user_account 
ON gmb_locations (user_id, gmb_account_id);

-- HIGH: Index for date-filtered location creation
CREATE INDEX IF NOT EXISTS idx_gmb_locations_created 
ON gmb_locations (user_id, created_at DESC);

-- HIGH: Index for task filtering by user, week, and status
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_user_week_status 
ON weekly_task_recommendations (user_id, week_start_date, status);

-- HIGH: Index for last_sync lookups (used in sync checks)
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_last_sync 
ON gmb_accounts (last_sync DESC) 
WHERE is_active = true;

