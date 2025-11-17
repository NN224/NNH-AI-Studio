-- Check if logo and cover URLs exist
SELECT 
  location_name,
  logo_url IS NOT NULL as has_logo,
  cover_photo_url IS NOT NULL as has_cover,
  LEFT(logo_url, 50) as logo_preview,
  LEFT(cover_photo_url, 50) as cover_preview,
  is_active
FROM gmb_locations
WHERE is_active = true
ORDER BY location_name;

-- Check which location is currently active for each user
SELECT 
  u.email,
  COUNT(gl.id) as total_locations,
  COUNT(gl.id) FILTER (WHERE gl.is_active = true) as active_locations,
  COUNT(gl.id) FILTER (WHERE gl.logo_url IS NOT NULL) as with_logo,
  COUNT(gl.id) FILTER (WHERE gl.cover_photo_url IS NOT NULL) as with_cover
FROM auth.users u
LEFT JOIN gmb_locations gl ON gl.user_id = u.id
GROUP BY u.email
ORDER BY u.email;
