-- Fix for gmb_media indexes
-- The column is named 'type' not 'media_type'
-- The 'category' column doesn't exist

-- Drop incorrect indexes if they were created
DROP INDEX IF EXISTS public.idx_gmb_media_type;
DROP INDEX IF EXISTS public.idx_gmb_media_category;

-- Create correct index on 'type' column
CREATE INDEX IF NOT EXISTS idx_gmb_media_type 
  ON public.gmb_media(type);

-- Note: Skipping category index as the column doesn't exist
