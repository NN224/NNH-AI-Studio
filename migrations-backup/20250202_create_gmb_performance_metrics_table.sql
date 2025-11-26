-- Migration: Create gmb_performance_metrics table for Business Profile Performance API data
-- Created: 2025-02-02
-- Description: Stores daily metrics and performance data from Business Profile Performance API

-- Table for Daily Metrics Time Series
CREATE TABLE IF NOT EXISTS public.gmb_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID REFERENCES public.gmb_accounts(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.gmb_locations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Metric type (e.g., BUSINESS_IMPRESSIONS_DESKTOP_MAPS, CALL_CLICKS, WEBSITE_CLICKS, etc.)
  metric_type TEXT NOT NULL,
  
  -- Date of the metric
  metric_date DATE NOT NULL,
  
  -- The actual metric value
  metric_value BIGINT NOT NULL DEFAULT 0,
  
  -- Sub-entity type (optional breakdown like dayOfWeek, timeOfDay)
  sub_entity_type JSONB DEFAULT '{}',
  
  -- Metadata for additional info
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one metric per location, date, and type
  UNIQUE(location_id, metric_date, metric_type)
);

-- Table for Search Keywords Impressions
CREATE TABLE IF NOT EXISTS public.gmb_search_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID REFERENCES public.gmb_accounts(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.gmb_locations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- The search keyword (lower-cased)
  search_keyword TEXT NOT NULL,
  
  -- Month for which this data is aggregated
  month_year DATE NOT NULL,
  
  -- The number of impressions (unique users who searched for this keyword)
  impressions_count BIGINT NOT NULL DEFAULT 0,
  
  -- If actual value is below threshold, this will be set
  threshold_value BIGINT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one keyword per location and month
  UNIQUE(location_id, search_keyword, month_year)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gmb_performance_metrics_account 
  ON public.gmb_performance_metrics(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_gmb_performance_metrics_location 
  ON public.gmb_performance_metrics(location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_performance_metrics_user 
  ON public.gmb_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_performance_metrics_date 
  ON public.gmb_performance_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_gmb_performance_metrics_type 
  ON public.gmb_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_gmb_performance_metrics_location_date 
  ON public.gmb_performance_metrics(location_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_gmb_search_keywords_account 
  ON public.gmb_search_keywords(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_gmb_search_keywords_location 
  ON public.gmb_search_keywords(location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_search_keywords_user 
  ON public.gmb_search_keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_search_keywords_month 
  ON public.gmb_search_keywords(month_year DESC);
CREATE INDEX IF NOT EXISTS idx_gmb_search_keywords_keyword 
  ON public.gmb_search_keywords(search_keyword);

-- Enable Row Level Security
ALTER TABLE public.gmb_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmb_search_keywords ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gmb_performance_metrics
CREATE POLICY "Users can view their own performance metrics"
  ON public.gmb_performance_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance metrics"
  ON public.gmb_performance_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance metrics"
  ON public.gmb_performance_metrics
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own performance metrics"
  ON public.gmb_performance_metrics
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for gmb_search_keywords
CREATE POLICY "Users can view their own search keywords"
  ON public.gmb_search_keywords
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search keywords"
  ON public.gmb_search_keywords
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search keywords"
  ON public.gmb_search_keywords
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search keywords"
  ON public.gmb_search_keywords
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.gmb_performance_metrics IS 'Stores daily performance metrics from Business Profile Performance API';
COMMENT ON TABLE public.gmb_search_keywords IS 'Stores search keyword impressions from Business Profile Performance API';
COMMENT ON COLUMN public.gmb_performance_metrics.metric_type IS 'Type of metric (e.g., BUSINESS_IMPRESSIONS_DESKTOP_MAPS, CALL_CLICKS, WEBSITE_CLICKS)';
COMMENT ON COLUMN public.gmb_performance_metrics.metric_value IS 'The actual metric value for the given date';
COMMENT ON COLUMN public.gmb_search_keywords.search_keyword IS 'The lower-cased search keyword that users used to find the business';
COMMENT ON COLUMN public.gmb_search_keywords.impressions_count IS 'Number of unique users who searched for this keyword in the month';

