-- Migration: Fix handle_new_user for phone authentication
-- Created: 2025-01-31
-- Description: Updates handle_new_user to properly handle phone-only signups

-- Temporarily disable RLS for the function to work properly
-- (RLS is re-enabled after the insert)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile, handling both email and phone signups
  INSERT INTO public.profiles (id, email, full_name, phone, created_at, updated_at)
  VALUES (
    new.id,
    new.email, -- Can be NULL for phone signups
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.email,
      new.phone,
      'User'
    ), -- Use phone as fallback for full_name
    new.phone, -- Can be NULL for email signups
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up. Handles both email and phone authentication.';

