-- Create trigger to automatically create client_profiles for new users

-- Function to create default client profile for new user
CREATE OR REPLACE FUNCTION public.create_default_client_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default client profile for new user
  INSERT INTO public.client_profiles (user_id, brand_name, primary_color, secondary_color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Business'),
    '#FFA500',
    '#1A1A1A'
  )
  ON CONFLICT (user_id) DO NOTHING; -- Don't fail if profile already exists
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_create_client_profile ON auth.users;

-- Create trigger on auth.users insert
CREATE TRIGGER on_auth_user_created_create_client_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_client_profile();

-- Also create profiles for existing users who don't have one
INSERT INTO public.client_profiles (user_id, brand_name, primary_color, secondary_color)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'My Business'),
  '#FFA500',
  '#1A1A1A'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_profiles cp WHERE cp.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

