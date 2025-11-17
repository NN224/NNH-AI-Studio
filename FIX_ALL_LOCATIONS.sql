-- 1. First run GET_CURRENT_USER_ID.sql to find your user_id

-- 2. Replace YOUR_USER_ID with the actual ID from step 1
UPDATE gmb_locations 
SET user_id = 'YOUR_USER_ID_HERE'
WHERE id IN (
  '2e4514ad-d683-4729-9be3-82e913503806',
  '8a606c17-5706-4d89-ac5a-8fd651b24c33', 
  'bb460df5-56bd-4c14-bdf2-43aacbe121e1',
  'cac0834a-d472-43f5-9940-7ee82f75bb53'
);

-- 3. Trigger rating calculation based on reviews
UPDATE gmb_locations gl
SET rating = COALESCE(
  (SELECT AVG(rating)::numeric(3,2) 
   FROM gmb_reviews gr 
   WHERE gr.location_id = gl.id 
     AND gr.rating > 0),
  0
)
WHERE gl.rating IS NULL;

-- 4. Update calculated response rate
UPDATE gmb_locations gl
SET calculated_response_rate = COALESCE(
  (SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE has_reply = true) * 100.0 / COUNT(*))::numeric(5,2)
    END
   FROM gmb_reviews gr
   WHERE gr.location_id = gl.id),
  0
);

-- 5. Fix health scores
UPDATE gmb_locations
SET health_score = CASE
  WHEN logo_url IS NOT NULL AND cover_photo_url IS NOT NULL THEN 75
  WHEN logo_url IS NOT NULL OR cover_photo_url IS NOT NULL THEN 50
  ELSE 25
END
WHERE health_score = 0;

-- 6. Check results
SELECT 
  location_name,
  user_id,
  rating,
  review_count,
  calculated_response_rate,
  health_score,
  logo_url IS NOT NULL as has_logo,
  cover_photo_url IS NOT NULL as has_cover
FROM gmb_locations
ORDER BY location_name;
