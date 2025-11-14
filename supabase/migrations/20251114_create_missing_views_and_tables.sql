-- Create missing materialized views and tables for production

-- Create materialized view for location stats if it doesn't exist
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_location_stats AS
SELECT 
  l.id,
  l.location_name,
  COUNT(DISTINCT r.id) as total_reviews,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(DISTINCT q.id) as total_questions,
  COUNT(DISTINCT CASE WHEN r.has_reply = true THEN r.id END) as replied_reviews,
  COUNT(DISTINCT CASE WHEN q.answer_status = 'answered' THEN q.id END) as answered_questions,
  MAX(r.review_date) as last_review_date,
  MAX(q.created_at) as last_question_date
FROM public.gmb_locations l
LEFT JOIN public.gmb_reviews r ON l.id = r.location_id
LEFT JOIN public.gmb_questions q ON l.id = q.location_id
WHERE l.user_id IS NOT NULL
GROUP BY l.id, l.location_name;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_location_stats_id ON public.mv_location_stats(id);

-- Create health check results table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.health_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  health_score DECIMAL(5, 2) DEFAULT 0,
  response_rate DECIMAL(5, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  review_sentiment_distribution JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_health_check_location (location_id),
  INDEX idx_health_check_created (checked_at DESC)
);

-- Enable RLS on health_check_results
ALTER TABLE public.health_check_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for health_check_results
CREATE POLICY "Users can view health checks for their locations"
  ON public.health_check_results
  FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM public.gmb_locations 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert health checks for their locations"
  ON public.health_check_results
  FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT id FROM public.gmb_locations 
      WHERE user_id = auth.uid()
    )
  );

-- Create view for health score distribution
CREATE OR REPLACE VIEW public.v_health_score_distribution AS
SELECT 
  l.id as location_id,
  l.location_name,
  COALESCE(hc.health_score, 0) as health_score,
  COALESCE(hc.response_rate, 0) as response_rate,
  COALESCE(hc.average_rating, 0) as average_rating,
  hc.checked_at,
  CASE 
    WHEN COALESCE(hc.health_score, 0) >= 80 THEN 'excellent'
    WHEN COALESCE(hc.health_score, 0) >= 60 THEN 'good'
    WHEN COALESCE(hc.health_score, 0) >= 40 THEN 'fair'
    ELSE 'poor'
  END as health_status
FROM public.gmb_locations l
LEFT JOIN LATERAL (
  SELECT * FROM public.health_check_results 
  WHERE location_id = l.id 
  ORDER BY checked_at DESC 
  LIMIT 1
) hc ON true;

-- Grant permissions
GRANT ALL ON public.mv_location_stats TO authenticated;
GRANT ALL ON public.health_check_results TO authenticated;
GRANT SELECT ON public.v_health_score_distribution TO authenticated;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_location_stats;

