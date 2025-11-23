-- Add AI-related columns to gmb_posts table
ALTER TABLE public.gmb_posts 
ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS prompt_used text,
ADD COLUMN IF NOT EXISTS tone text;

-- Add RLS policy for gmb_posts if it doesn't exist (or ensure existing one covers new columns)
-- Assuming existing policies cover CRUD based on user_id/location_id
