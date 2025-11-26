-- Add metadata column to store Event/Offer post data
-- Check if table exists before altering (table is created in 20251031_gmb_posts.sql)
DO $$ 
BEGIN
  -- Check if gmb_posts table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'gmb_posts'
  ) THEN
    -- Add metadata column
    ALTER TABLE public.gmb_posts ADD COLUMN IF NOT EXISTS metadata JSONB;
    
    -- Add post_type column to distinguish post types
    ALTER TABLE public.gmb_posts ADD COLUMN IF NOT EXISTS post_type TEXT CHECK (post_type IN ('whats_new', 'event', 'offer')) DEFAULT 'whats_new';
    
    -- Add index for post_type
    CREATE INDEX IF NOT EXISTS gmb_posts_post_type_idx ON public.gmb_posts(user_id, post_type);
    
    RAISE NOTICE 'Added metadata and post_type columns to gmb_posts';
  ELSE
    RAISE NOTICE 'gmb_posts table does not exist yet, skipping metadata migration';
  END IF;
END $$;

