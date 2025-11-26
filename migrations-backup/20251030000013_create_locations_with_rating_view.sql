-- Create view for locations with aggregated rating data from reviews
DROP VIEW IF EXISTS gmb_locations_with_rating;

CREATE VIEW gmb_locations_with_rating AS
SELECT 
  l.id,
  l.gmb_account_id,
  l.user_id,
  l.location_id,
  l.location_name,
  l.address,
  l.phone,
  l.website,
  l.category,
  l.is_active,
  l.is_syncing,
  l.metadata,
  l.ai_insights,
  l.created_at,
  l.updated_at,
  COALESCE(AVG(r.rating), 0)::numeric(3,2) as rating,
  COUNT(r.id)::integer as reviews_count,
  MAX(r.created_at) as last_review_date
FROM gmb_locations l
LEFT JOIN gmb_reviews r ON r.location_id = l.id
GROUP BY 
  l.id,
  l.gmb_account_id,
  l.user_id,
  l.location_id,
  l.location_name,
  l.address,
  l.phone,
  l.website,
  l.category,
  l.is_active,
  l.is_syncing,
  l.metadata,
  l.ai_insights,
  l.created_at,
  l.updated_at;
