-- Migration: Add ML sentiment analysis fields
-- Created: 2025-11-14  
-- Description: Adds columns to store ML-based sentiment analysis results

-- Add columns to gmb_reviews table for ML sentiment analysis
ALTER TABLE public.gmb_reviews 
  ADD COLUMN IF NOT EXISTS ai_sentiment_score NUMERIC(3,2) CHECK (ai_sentiment_score >= 0 AND ai_sentiment_score <= 1),
  ADD COLUMN IF NOT EXISTS ai_sentiment_analysis JSONB;

-- Create index on sentiment score for performance
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_ai_sentiment_score 
  ON public.gmb_reviews(ai_sentiment_score) 
  WHERE ai_sentiment_score IS NOT NULL;

-- Create GIN index on JSONB analysis data for efficient querying
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_ai_analysis 
  ON public.gmb_reviews USING gin(ai_sentiment_analysis);

-- Add composite index for sentiment queries
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_sentiment_composite
  ON public.gmb_reviews(ai_sentiment, ai_sentiment_score)
  WHERE ai_sentiment IS NOT NULL;

-- Function to extract topics from sentiment analysis
CREATE OR REPLACE FUNCTION extract_sentiment_topics(analysis JSONB)
RETURNS TEXT[] AS $$
DECLARE
  topics TEXT[] := '{}';
  topic JSONB;
BEGIN
  IF analysis IS NULL OR analysis->'topics' IS NULL THEN
    RETURN topics;
  END IF;
  
  FOR topic IN SELECT * FROM jsonb_array_elements(analysis->'topics')
  LOOP
    topics := array_append(topics, topic->>'topic');
  END LOOP;
  
  RETURN topics;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get average aspect score
CREATE OR REPLACE FUNCTION get_aspect_score(analysis JSONB, aspect TEXT)
RETURNS NUMERIC AS $$
BEGIN
  IF analysis IS NULL OR analysis->'aspects' IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN (analysis->'aspects'->>aspect)::NUMERIC;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for sentiment insights
CREATE OR REPLACE VIEW v_sentiment_insights AS
SELECT 
  l.id as location_id,
  l.location_name,
  l.user_id,
  COUNT(r.id) as total_reviews,
  COUNT(r.id) FILTER (WHERE r.ai_sentiment = 'positive') as positive_count,
  COUNT(r.id) FILTER (WHERE r.ai_sentiment = 'negative') as negative_count,
  COUNT(r.id) FILTER (WHERE r.ai_sentiment = 'neutral') as neutral_count,
  COUNT(r.id) FILTER (WHERE r.ai_sentiment = 'mixed') as mixed_count,
  AVG(r.ai_sentiment_score) as avg_sentiment_score,
  
  -- Aspect averages
  AVG(get_aspect_score(r.ai_sentiment_analysis, 'service')) as avg_service_score,
  AVG(get_aspect_score(r.ai_sentiment_analysis, 'quality')) as avg_quality_score,
  AVG(get_aspect_score(r.ai_sentiment_analysis, 'price')) as avg_price_score,
  AVG(get_aspect_score(r.ai_sentiment_analysis, 'cleanliness')) as avg_cleanliness_score,
  AVG(get_aspect_score(r.ai_sentiment_analysis, 'atmosphere')) as avg_atmosphere_score,
  
  -- Most common topics
  array_agg(DISTINCT topic ORDER BY topic) FILTER (WHERE topic IS NOT NULL) as all_topics
FROM public.gmb_locations l
LEFT JOIN public.gmb_reviews r ON l.id = r.location_id
LEFT JOIN LATERAL unnest(extract_sentiment_topics(r.ai_sentiment_analysis)) AS topic ON true
WHERE l.is_active = true
GROUP BY l.id, l.location_name, l.user_id;

-- Create materialized view for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sentiment_summary AS
SELECT 
  user_id,
  COUNT(DISTINCT location_id) as locations_analyzed,
  COUNT(*) as total_reviews_analyzed,
  AVG(ai_sentiment_score) as overall_sentiment_score,
  
  -- Sentiment distribution
  ROUND(COUNT(*) FILTER (WHERE ai_sentiment = 'positive')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as positive_percentage,
  ROUND(COUNT(*) FILTER (WHERE ai_sentiment = 'negative')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as negative_percentage,
  ROUND(COUNT(*) FILTER (WHERE ai_sentiment = 'neutral')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as neutral_percentage,
  
  -- Top emotions
  AVG((ai_sentiment_analysis->'emotions'->>'joy')::NUMERIC) as avg_joy,
  AVG((ai_sentiment_analysis->'emotions'->>'anger')::NUMERIC) as avg_anger,
  AVG((ai_sentiment_analysis->'emotions'->>'sadness')::NUMERIC) as avg_sadness,
  AVG((ai_sentiment_analysis->'emotions'->>'surprise')::NUMERIC) as avg_surprise,
  AVG((ai_sentiment_analysis->'emotions'->>'trust')::NUMERIC) as avg_trust,
  
  -- Top keywords (aggregate as JSONB)
  jsonb_agg(DISTINCT keyword) FILTER (WHERE keyword IS NOT NULL) as top_keywords
  
FROM public.gmb_reviews r
JOIN public.gmb_locations l ON r.location_id = l.id
LEFT JOIN LATERAL jsonb_array_elements_text(r.ai_sentiment_analysis->'keywords') AS keyword ON true
WHERE l.is_active = true 
  AND r.ai_sentiment_analysis IS NOT NULL
GROUP BY user_id;

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_sentiment_user 
  ON mv_sentiment_summary(user_id);

-- Function to refresh sentiment summary
CREATE OR REPLACE FUNCTION refresh_sentiment_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sentiment_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON v_sentiment_insights TO authenticated;
GRANT SELECT ON mv_sentiment_summary TO authenticated;
GRANT EXECUTE ON FUNCTION extract_sentiment_topics TO authenticated;
GRANT EXECUTE ON FUNCTION get_aspect_score TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_sentiment_summary TO authenticated;

-- Comments
COMMENT ON COLUMN public.gmb_reviews.ai_sentiment_score IS 'ML confidence score for sentiment (0-1)';
COMMENT ON COLUMN public.gmb_reviews.ai_sentiment_analysis IS 'Full ML sentiment analysis results including aspects, emotions, topics';
COMMENT ON VIEW v_sentiment_insights IS 'Aggregated sentiment insights per location';
COMMENT ON MATERIALIZED VIEW mv_sentiment_summary IS 'Pre-aggregated sentiment summary for performance';
