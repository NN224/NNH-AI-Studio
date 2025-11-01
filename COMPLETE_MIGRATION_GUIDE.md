# Complete GMB Database Migration Guide

## ⚠️ CRITICAL: Run These Migrations in Order

Your GMB Dashboard is not working because the database schema is missing or incomplete. You **MUST** run these migrations in the exact order below.

---

## Step 1: Access Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

---

## Migration 1: Create gmb_posts Table (CRITICAL)

**File**: `supabase/migrations/20251031_gmb_posts.sql`

**Copy and run this ENTIRE script:**

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

**Expected Result**: Should complete without errors

---

## Migration 2: Add post_type and metadata

**File**: `supabase/migrations/20250102_gmb_posts_metadata.sql`

**Copy and run this ENTIRE script:**

```sql
-- Add metadata column to store Event/Offer post data
ALTER TABLE public.gmb_posts ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add post_type column to distinguish post types
ALTER TABLE public.gmb_posts ADD COLUMN IF NOT EXISTS post_type TEXT CHECK (post_type IN ('whats_new', 'event', 'offer')) DEFAULT 'whats_new';

-- Add index for post_type
CREATE INDEX IF NOT EXISTS gmb_posts_post_type_idx ON public.gmb_posts(user_id, post_type);
```

**Expected Result**: Should complete without errors

---

## Migration 3: Add missing columns to gmb_accounts

**File**: `supabase/migrations/20250131_add_email_to_gmb_accounts.sql`

**Copy and run this ENTIRE script:**

```sql
-- Add email column if not exists
ALTER TABLE public.gmb_accounts
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add google_account_id column if not exists  
ALTER TABLE public.gmb_accounts
ADD COLUMN IF NOT EXISTS google_account_id TEXT;

-- Create index for google_account_id
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_google_id ON public.gmb_accounts(google_account_id);

COMMENT ON COLUMN public.gmb_accounts.email IS 'Email address of the Google account';
COMMENT ON COLUMN public.gmb_accounts.google_account_id IS 'Google user ID from OAuth';
```

**Expected Result**: Should complete without errors

---

## Migration 4: Fix gmb_reviews columns

**File**: `supabase/migrations/20250131_fix_gmb_reviews_columns.sql`

**Copy and run this ENTIRE script:**

```sql
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

-- Add missing columns
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS external_review_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS review_text TEXT,
ADD COLUMN IF NOT EXISTS review_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reply_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS has_reply BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gmb_account_id UUID REFERENCES public.gmb_accounts(id) ON DELETE CASCADE;

-- Add index for gmb_account_id
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_gmb_account ON public.gmb_reviews(gmb_account_id);
```

**Expected Result**: Should complete without errors

---

## Migration 5: Ensure ai_sentiment exists

**File**: `supabase/migrations/20250131_add_missing_columns.sql`

**Copy and run this ENTIRE script:**

```sql
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
    
    CREATE INDEX IF NOT EXISTS idx_gmb_reviews_sentiment ON public.gmb_reviews(ai_sentiment);
    
    RAISE NOTICE 'Added ai_sentiment column to gmb_reviews';
  ELSE
    RAISE NOTICE 'ai_sentiment column already exists in gmb_reviews';
  END IF;
END $$;
```

**Expected Result**: Should complete without errors

---

## Verification

After running all migrations, verify by running:

```sql
-- Check gmb_posts table exists and has correct columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gmb_posts'
ORDER BY ordinal_position;

-- Check gmb_accounts has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gmb_accounts'
AND column_name IN ('email', 'google_account_id');

-- Check gmb_reviews has correct columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gmb_reviews'
AND column_name IN ('external_review_id', 'review_text', 'gmb_account_id');
```

**Expected Result**: All columns should exist

---

## Testing After Migrations

1. Reload your GMB Dashboard: `https://nnh.ae/gmb-dashboard`
2. The Posts section should now load without errors
3. Try clicking "Create Post" - should work without database errors

---

## Still Having Issues?

If you still see errors after running all migrations:
1. Check the error message in browser console
2. Run verification queries above
3. Take screenshots of errors
4. Share the error details for further troubleshooting

---

**Note**: These migrations are **idempotent** - safe to run multiple times. They use `IF NOT EXISTS` and `IF EXISTS` checks.

