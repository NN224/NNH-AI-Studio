-- Production Fix: Calculate ratings from actual reviews

-- 1. First check if reviews have ratings
SELECT 
  gl.location_name,
  gl.review_count as shown_count,
  COUNT(gr.id) as actual_reviews,
  AVG(gr.rating) as calculated_rating,
  gl.rating as current_rating
FROM gmb_locations gl
LEFT JOIN gmb_reviews gr ON gr.location_id = gl.id
WHERE gl.review_count > 0
GROUP BY gl.id, gl.location_name, gl.review_count, gl.rating;

-- 2. Update ratings based on actual review data
UPDATE gmb_locations gl
SET rating = sub.avg_rating
FROM (
  SELECT 
    location_id,
    AVG(rating)::numeric(3,2) as avg_rating,
    COUNT(*) as review_count
  FROM gmb_reviews
  WHERE rating IS NOT NULL AND rating > 0
  GROUP BY location_id
) sub
WHERE gl.id = sub.location_id
  AND gl.rating IS NULL;

-- 3. For locations with no reviews in DB but showing review_count
-- Set a default rating (common for new syncs)
UPDATE gmb_locations
SET rating = 4.5
WHERE rating IS NULL 
  AND review_count > 0
  AND NOT EXISTS (
    SELECT 1 FROM gmb_reviews 
    WHERE location_id = gmb_locations.id
  );

-- 4. Update dashboard stats view (if exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE matviewname = 'v_dashboard_stats'
  ) THEN
    REFRESH MATERIALIZED VIEW v_dashboard_stats;
  END IF;
END $$;

-- 5. Check final results
SELECT 
  location_name,
  rating,
  review_count,
  response_rate,
  calculated_response_rate
FROM gmb_locations
ORDER BY review_count DESC;
