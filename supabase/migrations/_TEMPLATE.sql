-- ============================================
-- Migration: [وصف التعديل]
-- Date: [YYYY-MM-DD]
-- Author: [اسمك]
-- ============================================
-- Description:
-- [شرح مفصل للتعديل]
-- ============================================

-- ⚠️ IMPORTANT: After running this migration:
-- 1. Export new schema: scripts/export-complete-schema.sql → database-schema.csv
-- 2. Update: google-api-docs/DATABASE_SCHEMA.md
-- 3. Update: google-api-docs/DATABASE_QUICK_REF.md (if needed)
-- 4. Commit all files together!

-- ============================================
-- 1. Schema Changes
-- ============================================

-- Example: Create new table
/*
CREATE TABLE public.table_name (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    name text NOT NULL,
    data jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.table_name IS 'وصف الجدول';
COMMENT ON COLUMN public.table_name.name IS 'وصف العمود';
*/

-- Example: Add column to existing table
/*
ALTER TABLE public.existing_table
ADD COLUMN new_column text;

COMMENT ON COLUMN public.existing_table.new_column IS 'وصف العمود الجديد';
*/

-- Example: Add index
/*
CREATE INDEX idx_table_column ON public.table_name(column_name);
*/

-- ============================================
-- 2. RLS Policies
-- ============================================

-- Enable RLS
/*
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;
*/

-- SELECT policy
/*
CREATE POLICY "Users can view their own data"
    ON public.table_name FOR SELECT
    USING (auth.uid() = user_id);
*/

-- INSERT policy
/*
CREATE POLICY "Users can insert their own data"
    ON public.table_name FOR INSERT
    WITH CHECK (auth.uid() = user_id);
*/

-- UPDATE policy
/*
CREATE POLICY "Users can update their own data"
    ON public.table_name FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
*/

-- DELETE policy
/*
CREATE POLICY "Users can delete their own data"
    ON public.table_name FOR DELETE
    USING (auth.uid() = user_id);
*/

-- ============================================
-- 3. Triggers (Optional)
-- ============================================

-- Example: Updated_at trigger
/*
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_table_name_updated_at
    BEFORE UPDATE ON public.table_name
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
*/

-- ============================================
-- 4. Grants (Optional)
-- ============================================

/*
GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_name TO authenticated;
GRANT SELECT ON public.table_name TO anon;
*/

-- ============================================
-- 5. Initial Data (Optional)
-- ============================================

/*
INSERT INTO public.table_name (name) VALUES ('Default value');
*/

-- ============================================
-- Rollback (Optional - for reference only)
-- ============================================
-- Keep this commented - for manual rollback if needed

/*
-- DROP TABLE IF EXISTS public.table_name CASCADE;
-- ALTER TABLE public.existing_table DROP COLUMN IF EXISTS new_column;
-- DROP INDEX IF EXISTS idx_table_column;
*/

-- ============================================
-- ✅ Checklist after migration:
-- ============================================
-- [ ] Tested locally with `npm run db:push`
-- [ ] Exported new schema to database-schema.csv
-- [ ] Updated DATABASE_SCHEMA.md
-- [ ] Updated DATABASE_QUICK_REF.md (if needed)
-- [ ] Verified RLS policies work correctly
-- [ ] Tested in production (staging first if available)
-- [ ] Committed all files together
-- ============================================

