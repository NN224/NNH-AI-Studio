-- Add disconnect and archive columns to GMB tables

-- GMB Accounts
ALTER TABLE gmb_accounts 
ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS delete_on_disconnect BOOLEAN DEFAULT FALSE;

-- GMB Locations
ALTER TABLE gmb_locations 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- GMB Reviews
ALTER TABLE gmb_reviews 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT FALSE;

-- GMB Questions
ALTER TABLE gmb_questions 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- GMB Posts
ALTER TABLE gmb_posts 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for archived data queries
CREATE INDEX IF NOT EXISTS idx_gmb_locations_archived 
ON gmb_locations(user_id, is_archived) 
WHERE is_archived = true;

CREATE INDEX IF NOT EXISTS idx_gmb_reviews_archived 
ON gmb_reviews(is_archived, archived_at) 
WHERE is_archived = true;

CREATE INDEX IF NOT EXISTS idx_gmb_questions_archived 
ON gmb_questions(is_archived) 
WHERE is_archived = true;

CREATE INDEX IF NOT EXISTS idx_gmb_posts_archived 
ON gmb_posts(is_archived) 
WHERE is_archived = true;

CREATE INDEX IF NOT EXISTS idx_gmb_accounts_disconnected 
ON gmb_accounts(user_id, disconnected_at) 
WHERE disconnected_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN gmb_accounts.disconnected_at IS 'Timestamp when account was disconnected';
COMMENT ON COLUMN gmb_accounts.data_retention_days IS 'Number of days to retain archived data before permanent deletion';
COMMENT ON COLUMN gmb_accounts.delete_on_disconnect IS 'If true, delete all data immediately on disconnect';
COMMENT ON COLUMN gmb_locations.is_archived IS 'Location is archived (disconnected but data retained)';
COMMENT ON COLUMN gmb_reviews.is_anonymized IS 'Personal data has been anonymized';
