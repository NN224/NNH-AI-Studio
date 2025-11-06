-- Remove duplicate migration entry if needed
-- WARNING: Only run this if you're sure the migration was partially applied
-- and you want to re-run it

-- Step 1: Check current migration status for gmb_posts related migrations
SELECT 
    version,
    name,
    inserted_at
FROM supabase_migrations.schema_migrations 
WHERE version LIKE '%20250102%' 
   OR version LIKE '%20251031%'
   OR version LIKE '%20250106%'
ORDER BY version;

-- Step 2: If you see 20250102 exists but columns are missing, 
-- you can remove it to allow re-running (ONLY if safe to do so)
-- Uncomment the line below if you need to remove the migration entry:

-- DELETE FROM supabase_migrations.schema_migrations WHERE version = '20250102';

-- Step 3: After removing, you can either:
-- A) Re-run the fixed 20250102_gmb_posts_metadata.sql (now with table existence check)
-- B) OR simply run the new 20250106_fix_gmb_posts_columns.sql which will add missing columns

-- Recommended: Use option B (run 20250106) - it's safer and idempotent

