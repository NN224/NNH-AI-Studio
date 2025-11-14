-- Migration: Create monitoring tables
-- Created: 2025-11-14
-- Description: Creates tables for storing monitoring metrics and alerts

-- =====================================================
-- MONITORING METRICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.monitoring_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT CHECK (unit IN ('count', 'milliseconds', 'bytes', 'percentage', 'custom')),
  tags JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Indexing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for metrics queries
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name 
  ON public.monitoring_metrics(name);

CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_timestamp 
  ON public.monitoring_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_user 
  ON public.monitoring_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_tags 
  ON public.monitoring_metrics USING gin(tags);

-- Composite index for time-series queries
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name_time 
  ON public.monitoring_metrics(name, timestamp DESC);

-- =====================================================
-- MONITORING ALERTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('error', 'warning', 'info')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  service TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Acknowledgment fields
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  
  -- Resolution fields
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Indexing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for alerts queries
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity 
  ON public.monitoring_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_acknowledged 
  ON public.monitoring_alerts(acknowledged);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_timestamp 
  ON public.monitoring_alerts(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_user 
  ON public.monitoring_alerts(user_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_service 
  ON public.monitoring_alerts(service) 
  WHERE service IS NOT NULL;

-- Composite index for unacknowledged alerts
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_unack 
  ON public.monitoring_alerts(severity, timestamp DESC) 
  WHERE acknowledged = false;

-- =====================================================
-- HEALTH CHECK RESULTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  message TEXT,
  duration INTEGER, -- milliseconds
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for health check queries
CREATE INDEX IF NOT EXISTS idx_health_check_service 
  ON public.health_check_results(service);

CREATE INDEX IF NOT EXISTS idx_health_check_status 
  ON public.health_check_results(status);

CREATE INDEX IF NOT EXISTS idx_health_check_timestamp 
  ON public.health_check_results(timestamp DESC);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.monitoring_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_check_results ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Monitoring metrics policies
CREATE POLICY "Users can insert their own metrics" ON public.monitoring_metrics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own metrics" ON public.monitoring_metrics
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Monitoring alerts policies
CREATE POLICY "Users can view their own alerts" ON public.monitoring_alerts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own alerts" ON public.monitoring_alerts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Health check results are public (no PII)
CREATE POLICY "Anyone can view health checks" ON public.health_check_results
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert health checks" ON public.health_check_results
  FOR INSERT TO service_role
  WITH CHECK (true);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to clean old metrics
CREATE OR REPLACE FUNCTION public.clean_old_monitoring_data()
RETURNS void AS $$
BEGIN
  -- Delete metrics older than 30 days
  DELETE FROM public.monitoring_metrics
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  -- Delete resolved alerts older than 90 days
  DELETE FROM public.monitoring_alerts
  WHERE resolved = true 
  AND resolved_at < NOW() - INTERVAL '90 days';
  
  -- Delete health check results older than 7 days
  DELETE FROM public.health_check_results
  WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get metric statistics
CREATE OR REPLACE FUNCTION public.get_metric_stats(
  p_metric_name TEXT,
  p_user_id UUID,
  p_start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  p_end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  sum_value NUMERIC,
  count_value BIGINT,
  p95_value NUMERIC,
  p99_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    SUM(value) as sum_value,
    COUNT(*) as count_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99_value
  FROM public.monitoring_metrics
  WHERE name = p_metric_name
    AND user_id = p_user_id
    AND timestamp >= p_start_time
    AND timestamp <= p_end_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- VIEWS
-- =====================================================

-- View for alert summary
CREATE OR REPLACE VIEW v_alert_summary AS
SELECT 
  user_id,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'high') as high_count,
  COUNT(*) FILTER (WHERE severity = 'medium') as medium_count,
  COUNT(*) FILTER (WHERE severity = 'low') as low_count,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours') as last_24h,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '7 days') as last_7d
FROM public.monitoring_alerts
WHERE resolved = false
GROUP BY user_id;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON public.monitoring_metrics TO service_role;
GRANT INSERT, SELECT ON public.monitoring_metrics TO authenticated;

GRANT ALL ON public.monitoring_alerts TO service_role;
GRANT SELECT, UPDATE ON public.monitoring_alerts TO authenticated;

GRANT ALL ON public.health_check_results TO service_role;
GRANT SELECT ON public.health_check_results TO anon, authenticated;

GRANT SELECT ON v_alert_summary TO authenticated;

GRANT EXECUTE ON FUNCTION public.clean_old_monitoring_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_metric_stats TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.monitoring_metrics IS 'Stores application performance and business metrics';
COMMENT ON TABLE public.monitoring_alerts IS 'Stores monitoring alerts and notifications';
COMMENT ON TABLE public.health_check_results IS 'Stores health check results for all services';
COMMENT ON VIEW v_alert_summary IS 'Summary view of active alerts per user';
