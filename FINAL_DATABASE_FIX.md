# 🚨 FINAL DATABASE FIX - Run This Now!

## The Problem
Your GMB Dashboard is showing errors because the database schema is incomplete.

## The Solution - Run ALL these migrations:

---

## 🔧 Migration 1: Fix gmb_reviews Table

**Copy and run this in Supabase SQL Editor:**

```sql
-- Add all missing columns to gmb_reviews
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS gmb_account_id UUID REFERENCES public.gmb_accounts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS review_text TEXT,
ADD COLUMN IF NOT EXISTS review_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reply_text TEXT,
ADD COLUMN IF NOT EXISTS reply_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS has_reply BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative')),
ADD COLUMN IF NOT EXISTS ai_generated_response TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_gmb_account ON public.gmb_reviews(gmb_account_id);

-- Keep backward compatibility: add review_id if it doesn't exist
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS review_id TEXT UNIQUE;

-- Keep backward compatibility: add comment if it doesn't exist  
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS comment TEXT;

-- Keep backward compatibility: add review_reply if it doesn't exist
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS review_reply TEXT;

-- Keep backward compatibility: add replied_at if it doesn't exist
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- Keep backward compatibility: add ai_suggested_reply if it doesn't exist
ALTER TABLE public.gmb_reviews
ADD COLUMN IF NOT EXISTS ai_suggested_reply TEXT;
```

---

## 🔧 Migration 2: Ensure gmb_posts Table Exists

**Copy and run this:**

```sql
-- Create gmb_posts table if it doesn't exist
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

ALTER TABLE public.gmb_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "gmb_posts_select_own" ON public.gmb_posts FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "gmb_posts_insert_own" ON public.gmb_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "gmb_posts_update_own" ON public.gmb_posts FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "gmb_posts_delete_own" ON public.gmb_posts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS gmb_posts_user_loc_idx ON public.gmb_posts(user_id, location_id, status);

-- Add metadata and post_type
ALTER TABLE public.gmb_posts ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.gmb_posts ADD COLUMN IF NOT EXISTS post_type TEXT CHECK (post_type IN ('whats_new', 'event', 'offer')) DEFAULT 'whats_new';
CREATE INDEX IF NOT EXISTS gmb_posts_post_type_idx ON public.gmb_posts(user_id, post_type);
```

---

## 🔧 Migration 3: Ensure gmb_accounts Has Required Columns

**Copy and run this:**

```sql
ALTER TABLE public.gmb_accounts
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS google_account_id TEXT;

CREATE INDEX IF NOT EXISTS idx_gmb_accounts_google_id ON public.gmb_accounts(google_account_id);
```

---

## ✅ Verification Query

After running all migrations, run this to verify:

```sql
-- Check gmb_reviews columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gmb_reviews'
ORDER BY ordinal_position;

-- Check gmb_posts exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gmb_posts'
ORDER BY ordinal_position;

-- Check gmb_accounts has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gmb_accounts'
ORDER BY ordinal_position;
```

**Expected Results:**
- ✅ `gmb_reviews` should have: `id, location_id, user_id, gmb_account_id, review_id, external_review_id, reviewer_name, rating, comment, review_text, review_reply, reply_text, review_date, replied_at, reply_date, has_reply, ai_sentiment, ai_suggested_reply, ai_generated_response, status, created_at, updated_at`
- ✅ `gmb_posts` should have: `id, user_id, location_id, title, content, media_url, call_to_action, call_to_action_url, status, scheduled_at, published_at, provider_post_id, error_message, metadata, post_type, created_at, updated_at`
- ✅ `gmb_accounts` should have: `id, user_id, account_id, account_name, email, google_account_id, access_token, refresh_token, token_expires_at, is_active, last_sync, settings, created_at, updated_at`

---

## 🎯 After Running Migrations

1. **Refresh your browser** on the GMB Dashboard
2. **Click "Sync Data"** button if connected
3. **Test the Posts tab** - should work without errors

---

## 📝 Notes

- All migrations use `IF NOT EXISTS` - safe to run multiple times
- Migrations are backward compatible
- Keep both old and new column names for smooth transition

