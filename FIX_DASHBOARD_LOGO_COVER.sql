-- 1. Check which user is logged in and their active locations
SELECT 
  gl.id,
  gl.location_name,
  gl.user_id,
  gl.is_active,
  gl.logo_url IS NOT NULL as has_logo,
  gl.cover_photo_url IS NOT NULL as has_cover,
  u.email
FROM gmb_locations gl
JOIN auth.users u ON u.id = gl.user_id
WHERE gl.location_name LIKE '%XO Club Dubai Foad%'
ORDER BY gl.is_active DESC;

-- 2. Make sure the location with logo/cover is active
UPDATE gmb_locations
SET is_active = true
WHERE location_name = 'XO Club Dubai Foad | اكس او كلوب دبي'
  AND logo_url IS NOT NULL
  AND cover_photo_url IS NOT NULL;

-- 3. Make sure only ONE location is active per user
WITH ranked_locations AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY 
      CASE WHEN logo_url IS NOT NULL AND cover_photo_url IS NOT NULL THEN 0 ELSE 1 END,
      created_at DESC
    ) as rn
  FROM gmb_locations
)
UPDATE gmb_locations gl
SET is_active = (rl.rn = 1)
FROM ranked_locations rl
WHERE gl.id = rl.id;

-- 4. Verify the fix
SELECT 
  location_name,
  is_active,
  logo_url IS NOT NULL as has_logo,
  cover_photo_url IS NOT NULL as has_cover
FROM gmb_locations
WHERE user_id = (
  SELECT user_id 
  FROM gmb_locations 
  WHERE location_name LIKE '%XO Club Dubai Foad%'
  LIMIT 1
)
ORDER BY is_active DESC;
