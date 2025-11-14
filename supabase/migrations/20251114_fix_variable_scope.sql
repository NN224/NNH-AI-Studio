-- Fix for variable scope error in review fields normalization
-- This is the corrected version of the normalize review fields migration

-- Add columns if they don't exist
ALTER TABLE public.gmb_reviews 
  ADD COLUMN IF NOT EXISTS review_text TEXT,
  ADD COLUMN IF NOT EXISTS reply_text TEXT,
  ADD COLUMN IF NOT EXISTS has_reply BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- Normalize review text fields (fixed version)
DO $$
DECLARE
  v_columns TEXT[];
  v_update_sql TEXT;  -- Declared at outer scope
  v_coalesce_parts TEXT[];
  v_date_parts TEXT[];
BEGIN
  -- Get list of existing columns
  SELECT array_agg(column_name) INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'gmb_reviews';
  
  -- Consolidate review content into 'review_text'
  IF 'comment' = ANY(v_columns) THEN
    UPDATE public.gmb_reviews
    SET review_text = COALESCE(review_text, comment)
    WHERE review_text IS NULL AND comment IS NOT NULL;
  END IF;
  
  -- Consolidate reply content into 'reply_text'
  v_coalesce_parts := ARRAY['reply_text'];
  
  IF 'review_reply' = ANY(v_columns) THEN
    v_coalesce_parts := array_append(v_coalesce_parts, 'review_reply');
  END IF;
  
  IF 'response_text' = ANY(v_columns) THEN
    v_coalesce_parts := array_append(v_coalesce_parts, 'response_text');
  END IF;
  
  IF 'response' = ANY(v_columns) THEN
    v_coalesce_parts := array_append(v_coalesce_parts, 'response');
  END IF;
  
  -- Only update if we have multiple columns to consolidate
  IF array_length(v_coalesce_parts, 1) > 1 THEN
    v_update_sql := format(
      'UPDATE public.gmb_reviews SET reply_text = COALESCE(%s) WHERE reply_text IS NULL',
      array_to_string(v_coalesce_parts, ', ')
    );
    EXECUTE v_update_sql;
  END IF;
  
  -- Update has_reply flag
  UPDATE public.gmb_reviews
  SET has_reply = (reply_text IS NOT NULL AND reply_text != '')
  WHERE has_reply IS NULL OR has_reply != (reply_text IS NOT NULL AND reply_text != '');
  
  -- Update replied_at timestamp
  v_date_parts := ARRAY['replied_at'];
  
  IF 'reply_date' = ANY(v_columns) THEN
    v_date_parts := array_append(v_date_parts, 'reply_date');
  END IF;
  
  IF 'responded_at' = ANY(v_columns) THEN
    v_date_parts := array_append(v_date_parts, 'responded_at');
  END IF;
  
  v_date_parts := array_append(v_date_parts, 'CASE WHEN reply_text IS NOT NULL THEN updated_at END');
  
  v_update_sql := format(
    'UPDATE public.gmb_reviews SET replied_at = COALESCE(%s) WHERE replied_at IS NULL AND reply_text IS NOT NULL',
    array_to_string(v_date_parts, ', ')
  );
  EXECUTE v_update_sql;
END $$;

-- Continue with the rest of the migration...
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

-- Create index on the normalized fields if not exists
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_review_text_fts 
  ON public.gmb_reviews USING gin(to_tsvector('english', COALESCE(review_text, '')));

CREATE INDEX IF NOT EXISTS idx_gmb_reviews_reply_status
  ON public.gmb_reviews(has_reply, replied_at DESC)
  WHERE has_reply = true;

-- Update statistics
ANALYZE public.gmb_reviews;
