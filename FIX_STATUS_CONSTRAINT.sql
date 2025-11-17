-- 1. Check current constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'gmb_locations'::regclass
  AND conname LIKE '%status%';

-- 2. Check what status values exist currently
SELECT DISTINCT status, COUNT(*) as count
FROM gmb_locations
GROUP BY status;

-- 3. If constraint is too restrictive, drop it
-- ALTER TABLE gmb_locations DROP CONSTRAINT IF EXISTS gmb_locations_status_check;

-- 4. Add a more flexible constraint (or no constraint)
-- ALTER TABLE gmb_locations ADD CONSTRAINT gmb_locations_status_check 
--   CHECK (status IN ('active', 'inactive', 'pending', 'closed', NULL));

