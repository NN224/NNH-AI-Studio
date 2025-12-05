-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔧 MAKE refresh_token NULLABLE IN gmb_secrets
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Purpose: Allow NULL refresh_token values to handle Google OAuth re-authorization
--          where Google may not issue a new refresh_token.
--
-- Why: Google OAuth behavior:
--      - First authorization: Returns access_token + refresh_token
--      - Subsequent authorizations: May only return access_token (no refresh_token)
--      - Force consent (prompt=consent): Always returns refresh_token
--
-- Issue: Current schema has NOT NULL constraint on refresh_token, causing:
--        "null value in column "refresh_token" of relation "gmb_secrets"
--         violates not-null constraint"
--
-- Solution: Make refresh_token nullable while ensuring at least one token exists
--
-- Impact:
--   - Allows re-authentication without refresh_token
--   - User will need to reconnect when access_token expires (if no refresh_token)
--   - No data loss - existing refresh_tokens remain intact
--
-- Created: 2025-12-04
-- Author: Claude Code (OAuth Flow Audit)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Step 1: Make refresh_token nullable
ALTER TABLE gmb_secrets
ALTER COLUMN refresh_token DROP NOT NULL;

-- Step 2: Add check constraint to ensure at least one token exists
ALTER TABLE gmb_secrets
DROP CONSTRAINT IF EXISTS check_has_token;

ALTER TABLE gmb_secrets
ADD CONSTRAINT check_has_token CHECK (
  access_token IS NOT NULL OR refresh_token IS NOT NULL
);

-- Step 3: Add helpful comment explaining the nullable column
COMMENT ON COLUMN gmb_secrets.refresh_token IS
'OAuth refresh token from Google. May be NULL in re-authorization scenarios where Google does not issue a new refresh_token. When NULL, user must re-authenticate when access_token expires. Always encrypted using AES-256-GCM when present.';

-- Step 4: Add comment on the constraint
COMMENT ON CONSTRAINT check_has_token ON gmb_secrets IS
'Ensures at least one token (access or refresh) is always present. Both cannot be NULL simultaneously.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION QUERIES (for testing)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Verify column is now nullable:
-- SELECT
--   column_name,
--   is_nullable,
--   data_type
-- FROM information_schema.columns
-- WHERE table_name = 'gmb_secrets'
-- AND column_name = 'refresh_token';
-- Expected: is_nullable = 'YES'

-- Verify constraint exists:
-- SELECT
--   conname as constraint_name,
--   pg_get_constraintdef(oid) as definition
-- FROM pg_constraint
-- WHERE conrelid = 'gmb_secrets'::regclass
-- AND conname = 'check_has_token';
-- Expected: Shows CHECK constraint definition

-- Count accounts with NULL refresh_token:
-- SELECT
--   COUNT(*) as total_accounts,
--   COUNT(refresh_token) as with_refresh_token,
--   COUNT(*) - COUNT(refresh_token) as without_refresh_token
-- FROM gmb_secrets;
-- Expected: Shows distribution of NULL vs non-NULL refresh_tokens

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ROLLBACK INSTRUCTIONS (if needed)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- WARNING: Only run rollback if NO accounts have NULL refresh_token
-- Check first with: SELECT COUNT(*) FROM gmb_secrets WHERE refresh_token IS NULL;

-- Step 1: Remove constraint
-- ALTER TABLE gmb_secrets DROP CONSTRAINT IF EXISTS check_has_token;

-- Step 2: Make column NOT NULL again (only if no NULLs exist!)
-- ALTER TABLE gmb_secrets ALTER COLUMN refresh_token SET NOT NULL;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
