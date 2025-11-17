-- Get current authenticated user ID
SELECT 
  au.id as user_id,
  au.email,
  p.full_name,
  COUNT(DISTINCT gl.id) as location_count
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN gmb_locations gl ON gl.user_id = au.id
WHERE au.email IS NOT NULL
GROUP BY au.id, au.email, p.full_name
ORDER BY location_count DESC;

-- Check which user owns which locations
SELECT 
  user_id,
  COUNT(*) as locations,
  array_agg(location_name) as location_names
FROM gmb_locations
GROUP BY user_id;
