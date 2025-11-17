-- Step 1: Find YOUR user ID from email
-- Replace YOUR_EMAIL with your actual email
SELECT 
  id as your_user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com';

-- OR if you don't know the email, see all users:
SELECT 
  au.id as user_id,
  au.email,
  au.created_at,
  COUNT(gl.id) as locations_count
FROM auth.users au
LEFT JOIN gmb_locations gl ON gl.user_id = au.id
GROUP BY au.id, au.email, au.created_at
ORDER BY au.created_at DESC;

-- Step 2: After you get the user_id, use it in the update
-- Example: If your user_id is 'd59e890d-5914-417a-8049-12c77dd464bf'
-- Then run:
/*
UPDATE gmb_locations 
SET user_id = 'd59e890d-5914-417a-8049-12c77dd464bf'
WHERE id IN (
  '2e4514ad-d683-4729-9be3-82e913503806',
  '8a606c17-5706-4d89-ac5a-8fd651b24c33'
);
*/
