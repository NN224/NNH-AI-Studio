-- Add metadata column to store Event/Offer post data
alter table public.gmb_posts add column if not exists metadata jsonb;

-- Add post_type column to distinguish post types
alter table public.gmb_posts add column if not exists post_type text check (post_type in ('whats_new', 'event', 'offer')) default 'whats_new';

-- Add index for post_type
create index if not exists gmb_posts_post_type_idx on public.gmb_posts(user_id, post_type);

