-- Migration: Normalize review text fields
-- Created: 2025-11-14
-- Description: Consolidates multiple review text fields into consistent columns

-- First, let's analyze the current state
DO $$
BEGIN
  -- Check if we have data in different columns
  RAISE NOTICE 'Analyzing review text field usage...';
  
  -- Log statistics
  PERFORM 
    COUNT(*) FILTER (WHERE review_text IS NOT NULL) as review_text_count,
    COUNT(*) FILTER (WHERE comment IS NOT NULL) as comment_count,
    COUNT(*) FILTER (WHERE review_reply IS NOT NULL) as review_reply_count,
    COUNT(*) FILTER (WHERE reply_text IS NOT NULL) as reply_text_count,
    COUNT(*) FILTER (WHERE response_text IS NOT NULL) as response_text_count
  FROM public.gmb_reviews;
END $$;

-- Backup existing data before normalization
CREATE TABLE IF NOT EXISTS public.gmb_reviews_backup_20251114 AS 
SELECT * FROM public.gmb_reviews;

-- Normalize review text fields
-- Consolidate review content into 'review_text'
UPDATE public.gmb_reviews
SET review_text = COALESCE(review_text, comment)
WHERE review_text IS NULL AND comment IS NOT NULL;

-- Consolidate reply content into 'reply_text'  
UPDATE public.gmb_reviews
SET reply_text = COALESCE(
  reply_text,
  review_reply,
  response_text,
  response
)
WHERE reply_text IS NULL 
AND (review_reply IS NOT NULL OR response_text IS NOT NULL OR response IS NOT NULL);

-- Update has_reply flag based on consolidated reply_text
UPDATE public.gmb_reviews
SET has_reply = (reply_text IS NOT NULL AND reply_text != '')
WHERE has_reply IS NULL OR has_reply != (reply_text IS NOT NULL AND reply_text != '');

-- Update replied_at timestamp
UPDATE public.gmb_reviews
SET replied_at = COALESCE(
  replied_at,
  reply_date,
  responded_at,
  CASE WHEN reply_text IS NOT NULL THEN updated_at END
)
WHERE replied_at IS NULL 
AND reply_text IS NOT NULL;

-- Add constraints to ensure data consistency
ALTER TABLE public.gmb_reviews 
  DROP CONSTRAINT IF EXISTS check_has_reply_consistency;

ALTER TABLE public.gmb_reviews
  ADD CONSTRAINT check_has_reply_consistency 
  CHECK (
    (has_reply = true AND reply_text IS NOT NULL) OR
    (has_reply = false OR has_reply IS NULL)
  );

-- Create or replace trigger to maintain consistency
CREATE OR REPLACE FUNCTION maintain_review_reply_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Update has_reply based on reply_text
  NEW.has_reply := (NEW.reply_text IS NOT NULL AND NEW.reply_text != '');
  
  -- Set replied_at if reply_text is provided and replied_at is null
  IF NEW.reply_text IS NOT NULL AND NEW.replied_at IS NULL THEN
    NEW.replied_at := NOW();
  END IF;
  
  -- Clear replied_at if reply is removed
  IF NEW.reply_text IS NULL OR NEW.reply_text = '' THEN
    NEW.replied_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_maintain_review_reply_consistency ON public.gmb_reviews;
CREATE TRIGGER trigger_maintain_review_reply_consistency
  BEFORE INSERT OR UPDATE ON public.gmb_reviews
  FOR EACH ROW
  EXECUTE FUNCTION maintain_review_reply_consistency();

-- Drop redundant columns (commented out for safety - run manually after verification)
-- ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS comment;
-- ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS review_reply;
-- ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS response_text;
-- ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS response;
-- ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS has_response;
-- ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS responded_at;
-- ALTER TABLE public.gmb_reviews DROP COLUMN IF EXISTS reply_date;

-- Add comments for clarity
COMMENT ON COLUMN public.gmb_reviews.review_text IS 'The customer review text content';
COMMENT ON COLUMN public.gmb_reviews.reply_text IS 'The business reply to the review';
COMMENT ON COLUMN public.gmb_reviews.has_reply IS 'Whether the review has been replied to (auto-maintained)';
COMMENT ON COLUMN public.gmb_reviews.replied_at IS 'Timestamp when the reply was posted';

-- Create index on the normalized fields if not exists
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_review_text_fts 
  ON public.gmb_reviews USING gin(to_tsvector('english', COALESCE(review_text, '')));

CREATE INDEX IF NOT EXISTS idx_gmb_reviews_reply_status
  ON public.gmb_reviews(has_reply, replied_at DESC)
  WHERE has_reply = true;

-- Update statistics
ANALYZE public.gmb_reviews;
