-- Migration: Add review_reply_drafts table
-- Purpose: Store AI-generated reply drafts before publishing

CREATE TABLE IF NOT EXISTS review_reply_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES gmb_reviews(id) ON DELETE CASCADE,
  gmb_review_id TEXT NOT NULL,
  location_id TEXT,
  draft_reply TEXT NOT NULL,
  ai_confidence INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Ensure one draft per review
  UNIQUE(review_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_review_reply_drafts_user_id ON review_reply_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_review_reply_drafts_status ON review_reply_drafts(status);
CREATE INDEX IF NOT EXISTS idx_review_reply_drafts_location_id ON review_reply_drafts(location_id);

-- Enable RLS
ALTER TABLE review_reply_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own drafts"
  ON review_reply_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drafts"
  ON review_reply_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
  ON review_reply_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
  ON review_reply_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_review_reply_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_reply_drafts_updated_at
  BEFORE UPDATE ON review_reply_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_review_reply_drafts_updated_at();

-- Comment
COMMENT ON TABLE review_reply_drafts IS 'Stores AI-generated reply drafts before publishing to Google';
