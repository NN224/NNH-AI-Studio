-- Ensure client_profiles table exists and has correct structure

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  primary_color TEXT DEFAULT '#FFA500',
  secondary_color TEXT DEFAULT '#1A1A1A',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_client_profiles_user_id 
  ON public.client_profiles(user_id);

-- Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own client profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Users can insert their own client profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Users can update their own client profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Users can delete their own client profile" ON public.client_profiles;

-- Re-create RLS policies
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

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_client_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_client_profiles_updated_at ON public.client_profiles;
CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_profiles_updated_at();

