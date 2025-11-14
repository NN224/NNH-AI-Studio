-- Create missing materialized views and tables for production

-- Create materialized view for location stats if it doesn't exist
-- This view aggregates stats from reviews and questions tables
DO $$
BEGIN
  -- Only create if gmb_locations table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_locations') THEN
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
  END IF;
END $$;

-- Create health check results table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.health_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID,
  health_score DECIMAL(5, 2) DEFAULT 0,
  response_rate DECIMAL(5, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  review_sentiment_distribution JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all required columns exist (add them if missing)
DO $$
BEGIN
  -- Add location_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_check_results' AND column_name = 'location_id') THEN
    ALTER TABLE public.health_check_results ADD COLUMN location_id UUID;
  END IF;
  
  -- Add health_score
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_check_results' AND column_name = 'health_score') THEN
    ALTER TABLE public.health_check_results ADD COLUMN health_score DECIMAL(5, 2) DEFAULT 0;
  END IF;
  
  -- Add response_rate
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_check_results' AND column_name = 'response_rate') THEN
    ALTER TABLE public.health_check_results ADD COLUMN response_rate DECIMAL(5, 2) DEFAULT 0;
  END IF;
  
  -- Add average_rating
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_check_results' AND column_name = 'average_rating') THEN
    ALTER TABLE public.health_check_results ADD COLUMN average_rating DECIMAL(3, 2) DEFAULT 0;
  END IF;
  
  -- Add review_sentiment_distribution
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_check_results' AND column_name = 'review_sentiment_distribution') THEN
    ALTER TABLE public.health_check_results ADD COLUMN review_sentiment_distribution JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  -- Add checked_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_check_results' AND column_name = 'checked_at') THEN
    ALTER TABLE public.health_check_results ADD COLUMN checked_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add foreign key constraint if gmb_locations exists (safely)
DO $$
BEGIN
  -- Check if location_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'health_check_results'
    AND column_name = 'location_id'
  ) THEN
    -- Check if foreign key already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_health_check_location' 
      AND table_name = 'health_check_results'
      AND table_schema = 'public'
    ) THEN
      -- Only add if gmb_locations table exists
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_locations') THEN
        ALTER TABLE public.health_check_results 
        ADD CONSTRAINT fk_health_check_location 
        FOREIGN KEY (location_id) 
        REFERENCES public.gmb_locations(id) ON DELETE CASCADE;
      END IF;
    END IF;
  END IF;
END $$;

-- Create indexes after table creation
CREATE INDEX IF NOT EXISTS idx_health_check_location ON public.health_check_results(location_id);
CREATE INDEX IF NOT EXISTS idx_health_check_created ON public.health_check_results(checked_at DESC);

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
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_locations') THEN
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
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON public.health_check_results TO authenticated;
GRANT SELECT ON public.v_health_score_distribution TO authenticated;

