-- Migration: Add missing columns to gmb_reviews and gmb_posts
-- Created: 2025-01-31
-- Description: Adds ai_sentiment to gmb_reviews and ensures title exists in gmb_posts

-- Add ai_sentiment column to gmb_reviews if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gmb_reviews' 
    AND column_name = 'ai_sentiment'
  ) THEN
    ALTER TABLE public.gmb_reviews 
    ADD COLUMN ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative'));
    
    -- Add index for the new column
    CREATE INDEX IF NOT EXISTS idx_gmb_reviews_sentiment ON public.gmb_reviews(ai_sentiment);
    
    RAISE NOTICE 'Added ai_sentiment column to gmb_reviews';
  ELSE
    RAISE NOTICE 'ai_sentiment column already exists in gmb_reviews';
  END IF;
END $$;

-- Ensure title column exists in gmb_posts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gmb_posts' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE public.gmb_posts 
    ADD COLUMN title TEXT;
    
    RAISE NOTICE 'Added title column to gmb_posts';
  ELSE
    RAISE NOTICE 'title column already exists in gmb_posts';
  END IF;
END $$;

