-- Migration: Create client_profiles table for white-label branding
-- Created: 2025-11-10
-- Description: Adds client_profiles table to store branding assets and preferences

-- Create client_profiles table
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

-- RLS Policies
CREATE POLICY "Users can view their own client profile"
  ON public.client_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own client profile"
  ON public.client_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client profile"
  ON public.client_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client profile"
  ON public.client_profiles FOR DELETE
  USING (auth.uid() = user_id);

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

CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_profiles_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.client_profiles IS 'Stores white-label branding information for each client';
COMMENT ON COLUMN public.client_profiles.user_id IS 'Foreign key to auth.users(id)';
COMMENT ON COLUMN public.client_profiles.brand_name IS 'Custom brand name for the client';
COMMENT ON COLUMN public.client_profiles.logo_url IS 'URL to the client logo in Supabase storage';
COMMENT ON COLUMN public.client_profiles.cover_image_url IS 'URL to the client cover/banner image in Supabase storage';
COMMENT ON COLUMN public.client_profiles.primary_color IS 'Primary brand color (hex format)';
COMMENT ON COLUMN public.client_profiles.secondary_color IS 'Secondary brand color (hex format)';
