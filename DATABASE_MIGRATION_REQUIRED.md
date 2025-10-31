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
create table if not exists public.gmb_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.gmb_locations(id) on delete cascade,
  title text,
  content text not null,
  media_url text,
  call_to_action text,
  call_to_action_url text,
  status text not null default 'draft' check (status in ('draft','queued','published','failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  provider_post_id text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.gmb_posts enable row level security;

do $$ begin
  create policy "gmb_posts_select_own" on public.gmb_posts
    for select using (auth.uid() = user_id);
  create policy "gmb_posts_insert_own" on public.gmb_posts
    for insert with check (auth.uid() = user_id);
  create policy "gmb_posts_update_own" on public.gmb_posts
    for update using (auth.uid() = user_id);
  create policy "gmb_posts_delete_own" on public.gmb_posts
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- helpful index
create index if not exists gmb_posts_user_loc_idx on public.gmb_posts(user_id, location_id, status);
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

