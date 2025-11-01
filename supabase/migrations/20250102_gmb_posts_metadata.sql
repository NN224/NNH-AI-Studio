-- Add metadata column to store Event/Offer post data
ALTER TABLE public.gmb_posts ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add post_type column to distinguish post types
ALTER TABLE public.gmb_posts ADD COLUMN IF NOT EXISTS post_type TEXT CHECK (post_type IN ('whats_new', 'event', 'offer')) DEFAULT 'whats_new';

-- Add index for post_type
CREATE INDEX IF NOT EXISTS gmb_posts_post_type_idx ON public.gmb_posts(user_id, post_type);

