-- Safe fix for gmb_posts table - can be run directly in Supabase SQL Editor
-- This script will add missing columns without requiring migration system
-- It's completely idempotent and safe to run multiple times

DO $$ 
BEGIN
  -- Check if gmb_posts table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'gmb_posts'
  ) THEN
    
    RAISE NOTICE '✅ gmb_posts table exists';
    
    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'gmb_posts' 
      AND column_name = 'metadata'
    ) THEN
      ALTER TABLE public.gmb_posts 
      ADD COLUMN metadata JSONB DEFAULT '{}';
      
      RAISE NOTICE '✅ Added metadata column to gmb_posts';
    ELSE
      RAISE NOTICE 'ℹ️  metadata column already exists in gmb_posts';
    END IF;
    
    -- Add post_type column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'gmb_posts' 
      AND column_name = 'post_type'
    ) THEN
      ALTER TABLE public.gmb_posts 
      ADD COLUMN post_type TEXT CHECK (post_type IN ('whats_new', 'event', 'offer')) DEFAULT 'whats_new';
      
      RAISE NOTICE '✅ Added post_type column to gmb_posts';
    ELSE
      RAISE NOTICE 'ℹ️  post_type column already exists in gmb_posts';
    END IF;
    
    -- Add index for post_type if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'gmb_posts' 
      AND indexname = 'gmb_posts_post_type_idx'
    ) THEN
      CREATE INDEX gmb_posts_post_type_idx ON public.gmb_posts(user_id, post_type);
      
      RAISE NOTICE '✅ Added post_type index to gmb_posts';
    ELSE
      RAISE NOTICE 'ℹ️  post_type index already exists in gmb_posts';
    END IF;
    
    RAISE NOTICE '✅ All gmb_posts columns are now in place!';
    
  ELSE
    RAISE NOTICE '⚠️  gmb_posts table does not exist - please run migration 20251031_gmb_posts.sql first';
  END IF;
END $$;

-- Verify the result
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'gmb_posts'
    AND column_name IN ('metadata', 'post_type')
ORDER BY column_name;

