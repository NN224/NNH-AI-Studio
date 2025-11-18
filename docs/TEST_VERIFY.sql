-- Verification Script: Check if migration worked
-- Run this in Supabase SQL Editor after running the migration

-- 1. Check if new columns exist
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'auto_reply_settings'
  AND column_name IN (
    'auto_reply_1_star',
    'auto_reply_2_star', 
    'auto_reply_3_star',
    'auto_reply_4_star',
    'auto_reply_5_star',
    'require_approval'
  )
ORDER BY column_name;

-- Expected result: Should see all 6 columns

-- 2. Check existing settings
SELECT 
  id,
  enabled,
  require_approval,
  auto_reply_1_star,
  auto_reply_2_star,
  auto_reply_3_star,
  auto_reply_4_star,
  auto_reply_5_star,
  response_style,
  created_at
FROM auto_reply_settings
ORDER BY created_at DESC
LIMIT 5;

-- Expected result: 
-- - require_approval should be FALSE
-- - auto_reply_X_star should be TRUE

-- 3. Check index was created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'auto_reply_settings'
  AND indexname = 'idx_auto_reply_settings_enabled';

-- Expected result: Should see the index

-- 4. Test insert with new defaults
INSERT INTO auto_reply_settings (
  user_id,
  enabled,
  reply_to_positive,
  reply_to_neutral,
  reply_to_negative,
  response_style,
  language
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Test user ID
  true,
  true,
  true,
  true,
  'friendly',
  'en'
) RETURNING *;

-- Expected result: 
-- - require_approval should be FALSE (default)
-- - auto_reply_X_star should be TRUE (defaults)

-- Clean up test insert
DELETE FROM auto_reply_settings 
WHERE user_id = '00000000-0000-0000-0000-000000000000';

