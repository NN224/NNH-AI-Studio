# ⚠️ Database Migration Required

## Problem
The `gmb_posts` table does not exist in your production database. This is causing errors when trying to access the Posts section.

## Solution
You need to run the `20251031_gmb_posts.sql` migration in your Supabase database.

## Steps to Fix

### 1. Go to Supabase Dashboard
- Open: https://supabase.com/dashboard
- Select your project

### 2. Run SQL Migration
- Go to **SQL Editor**
- Click **New Query**

### 3. Paste and Execute
Copy the entire contents of `supabase/migrations/20251031_gmb_posts.sql`:

```sql
-- GMB Posts table for composing and scheduling Business Profile posts
CREATE TABLE IF NOT EXISTS public.gmb_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  call_to_action TEXT,
  call_to_action_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','published','failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  provider_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.gmb_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "gmb_posts_select_own" ON public.gmb_posts
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "gmb_posts_insert_own" ON public.gmb_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "gmb_posts_update_own" ON public.gmb_posts
    FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "gmb_posts_delete_own" ON public.gmb_posts
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS gmb_posts_user_loc_idx ON public.gmb_posts(user_id, location_id, status);

COMMENT ON TABLE public.gmb_posts IS 'Stores GMB posts for composing and scheduling Business Profile posts';
```

### 4. Run Additional Migrations (if needed)
After the main table is created, also run:

1. `20250102_gmb_posts_metadata.sql` - Adds `metadata` and `post_type` columns
2. `20250131_add_missing_columns.sql` - Ensures all columns exist

### 5. Verify
After running the migrations, check that the table exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gmb_posts';
```

## Expected Result
After running these migrations, the Posts section should work without errors.

---

**Note:** This migration is critical for the GMB Dashboard Posts feature to work properly.

