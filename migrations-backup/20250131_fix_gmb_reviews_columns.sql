-- Migration: Fix gmb_reviews column names to match schema
-- Created: 2025-01-31
-- Description: Renames columns to match actual database schema

-- Rename review_id to external_review_id if exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gmb_reviews' 
    AND column_name = 'review_id'
  ) THEN
    ALTER TABLE public.gmb_reviews RENAME COLUMN review_id TO external_review_id;
    RAISE NOTICE 'Renamed review_id to external_review_id';
  ELSE
    RAISE NOTICE 'review_id column does not exist, no rename needed';
  END IF;
END $$;

-- Rename comment to review_text if exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gmb_reviews' 
    AND column_name = 'comment'
  ) THEN
    ALTER TABLE public.gmb_reviews RENAME COLUMN comment TO review_text;
    RAISE NOTICE 'Renamed comment to review_text';
  ELSE
    RAISE NOTICE 'comment column does not exist, no rename needed';
  END IF;
END $$;

-- Rename replied_at to reply_date if exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gmb_reviews' 
    AND column_name = 'replied_at'
  ) THEN
    ALTER TABLE public.gmb_reviews RENAME COLUMN replied_at TO reply_date;
    RAISE NOTICE 'Renamed replied_at to reply_date';
  ELSE
    RAISE NOTICE 'replied_at column does not exist, no rename needed';
  END IF;
END $$;

-- Rename ai_suggested_reply to ai_generated_response if exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gmb_reviews' 
    AND column_name = 'ai_suggested_reply'
  ) THEN
    ALTER TABLE public.gmb_reviews RENAME COLUMN ai_suggested_reply TO ai_generated_response;
    RAISE NOTICE 'Renamed ai_suggested_reply to ai_generated_response';
  ELSE
    RAISE NOTICE 'ai_suggested_reply column does not exist, no rename needed';
  END IF;
END $$;

-- Add review_date column if it doesn't exist
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS review_date TIMESTAMPTZ;

-- Add external_review_id column if it doesn't exist (with unique constraint)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gmb_reviews' 
    AND column_name = 'external_review_id'
  ) THEN
    ALTER TABLE public.gmb_reviews 
    ADD COLUMN external_review_id TEXT UNIQUE;
    RAISE NOTICE 'Added external_review_id column';
  ELSE
    RAISE NOTICE 'external_review_id column already exists';
  END IF;
END $$;

-- Add review_text column if it doesn't exist
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS review_text TEXT;

-- Add reply_date column if it doesn't exist
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS reply_date TIMESTAMPTZ;

-- Add has_reply column if it doesn't exist
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS has_reply BOOLEAN DEFAULT false;

-- Add gmb_account_id column if it doesn't exist
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS gmb_account_id UUID REFERENCES public.gmb_accounts(id) ON DELETE CASCADE;

-- Add index for gmb_account_id
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_gmb_account ON public.gmb_reviews(gmb_account_id);

COMMENT ON COLUMN public.gmb_reviews.external_review_id IS 'External review ID from Google';
COMMENT ON COLUMN public.gmb_reviews.review_text IS 'Review comment text';
COMMENT ON COLUMN public.gmb_reviews.review_date IS 'Date the review was created';
COMMENT ON COLUMN public.gmb_reviews.reply_date IS 'Date the reply was created';
COMMENT ON COLUMN public.gmb_reviews.has_reply IS 'Whether the review has a reply';
COMMENT ON COLUMN public.gmb_reviews.gmb_account_id IS 'Foreign key to gmb_accounts table';

