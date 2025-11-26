-- Migration: Add performance_metrics table
-- Created: 2025-11-26
-- Description: Track application performance metrics (Web Vitals, API calls, etc.)

BEGIN;

-- =====================================================
-- CREATE TABLE: performance_metrics
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metric Info
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,

  -- Metadata
  metadata JSONB,

  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id
  ON performance_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name
  ON performance_metrics(name);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp
  ON performance_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_name
  ON performance_metrics(user_id, name, timestamp);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view their own metrics
CREATE POLICY "Users can view own performance metrics"
  ON performance_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own metrics
CREATE POLICY "Users can insert own performance metrics"
  ON performance_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE performance_metrics IS 'Application performance metrics tracking (Web Vitals, API calls, page loads)';
COMMENT ON COLUMN performance_metrics.id IS 'Primary key UUID';
COMMENT ON COLUMN performance_metrics.user_id IS 'Foreign key to auth.users';
COMMENT ON COLUMN performance_metrics.name IS 'Metric name (e.g., api_call, page_load, web_vitals_fcp, web_vitals_lcp, etc.)';
COMMENT ON COLUMN performance_metrics.value IS 'Metric value (duration in ms, count, size in bytes, etc.)';
COMMENT ON COLUMN performance_metrics.unit IS 'Unit of measurement (ms, count, bytes, etc.)';
COMMENT ON COLUMN performance_metrics.metadata IS 'Additional context data (JSONB)';
COMMENT ON COLUMN performance_metrics.timestamp IS 'When the metric was recorded';

COMMIT;
