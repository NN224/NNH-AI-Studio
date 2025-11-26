-- Migration: Create error_logs table for centralized error tracking
-- Created: 2025-11-14
-- Description: Stores client and server-side errors for monitoring and debugging

-- Create error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  message TEXT NOT NULL,
  stack TEXT,
  level TEXT DEFAULT 'error' CHECK (level IN ('error', 'warning', 'info')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  context JSONB,
  user_agent TEXT,
  url TEXT,
  
  -- Indexing fields for querying
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional metadata
  session_id TEXT,
  ip_address INET,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  device_type TEXT,
  
  -- Error categorization
  error_type TEXT, -- e.g., 'TypeError', 'NetworkError', etc.
  error_code TEXT, -- Custom error codes
  severity INTEGER DEFAULT 3 CHECK (severity BETWEEN 1 AND 5), -- 1=critical, 5=info
  
  -- Resolution tracking
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON public.error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON public.error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);

-- Create GIN index for JSONB context field for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_context ON public.error_logs USING gin(context);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only authenticated users can insert their own errors
CREATE POLICY "Users can insert their own errors" ON public.error_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only admins can view all errors
CREATE POLICY "Admins can view all errors" ON public.error_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can view their own errors
CREATE POLICY "Users can view their own errors" ON public.error_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only admins can update errors (for resolution tracking)
CREATE POLICY "Admins can update errors" ON public.error_logs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create function to automatically clean old error logs
CREATE OR REPLACE FUNCTION public.clean_old_error_logs()
RETURNS void AS $$
BEGIN
  -- Delete error logs older than 90 days
  DELETE FROM public.error_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND resolved = true;
  
  -- Delete info level logs older than 30 days
  DELETE FROM public.error_logs
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND level = 'info';
  
  -- Delete warning level logs older than 60 days
  DELETE FROM public.error_logs
  WHERE created_at < NOW() - INTERVAL '60 days'
  AND level = 'warning';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean old logs (requires pg_cron extension)
-- Note: This needs to be set up in Supabase dashboard or via SQL editor with appropriate permissions
-- SELECT cron.schedule('clean-error-logs', '0 2 * * *', 'SELECT public.clean_old_error_logs();');

-- Grant permissions
GRANT ALL ON public.error_logs TO service_role;
GRANT INSERT, SELECT ON public.error_logs TO authenticated;

-- Add comment to table
COMMENT ON TABLE public.error_logs IS 'Centralized error logging for client and server-side errors';
