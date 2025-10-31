-- Migration: Add phone number support to profiles table
-- Created: 2025-01-31
-- Description: Adds phone column to profiles and updates trigger to handle phone authentication

-- Add phone column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) 
WHERE phone IS NOT NULL;

-- Update the trigger function to include phone number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.phone
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();
  
  RETURN new;
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.phone IS 'User phone number (from auth.users.phone)';

