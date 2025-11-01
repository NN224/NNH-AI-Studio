# 🔧 Fix Missing Columns in gmb_reviews

## Problem

The `gmb_reviews` table has `author_name` but the code expects `reviewer_name`.
Also missing `status` column.

## Solution

Run this SQL to add the missing columns:

```sql
-- Rename author_name to reviewer_name
ALTER TABLE public.gmb_reviews 
RENAME COLUMN author_name TO reviewer_name;

-- Add missing status column
ALTER TABLE public.gmb_reviews 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'responded'));
```

## Verification

After running, verify with:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gmb_reviews'
ORDER BY ordinal_position;
```

Expected columns should include:
- reviewer_name (not author_name)
- status

