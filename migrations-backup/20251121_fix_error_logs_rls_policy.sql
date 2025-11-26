-- Migration: Fix error_logs RLS policy to allow anonymous users to insert errors
-- Created: 2025-11-21
-- Description: Allow both authenticated and anonymous users to insert errors
--              while keeping read/update restrictions for security

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert their own errors" ON public.error_logs;

-- Create new policy that allows anyone (authenticated or anonymous) to insert errors
CREATE POLICY "Anyone can insert errors" ON public.error_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Note: Read and update policies remain unchanged for security:
-- - Only admins can view all errors
-- - Users can view their own errors
-- - Only admins can update errors

COMMENT ON POLICY "Anyone can insert errors" ON public.error_logs IS 
'Allows both anonymous and authenticated users to log errors. This is necessary for error tracking from visitors and unauthenticated users.';
