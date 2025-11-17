-- Check the status column constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'gmb_locations'::regclass
  AND conname LIKE '%status%';

-- Also check what values we have currently
SELECT DISTINCT status
FROM gmb_locations;

