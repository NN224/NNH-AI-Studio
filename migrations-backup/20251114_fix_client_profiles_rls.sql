-- Fix client_profiles RLS policies to allow proper access

-- Drop existing policies if they exist (safer approach)
DROP POLICY IF EXISTS "Users can view their own client profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Users can insert their own client profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Users can update their own client profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Users can delete their own client profile" ON public.client_profiles;

-- Re-create RLS policies with better error handling
CREATE POLICY "Users can view their own client profile"
  ON public.client_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own client profile"
  ON public.client_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client profile"
  ON public.client_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client profile"
  ON public.client_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Grant explicit permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_profiles TO service_role;

-- Ensure RLS is still enabled
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

