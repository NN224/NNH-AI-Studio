-- Migration: Fix oauth_states foreign key to use auth.users instead of profiles
-- Created: 2025-02-02
-- Description: Changes oauth_states.user_id to reference auth.users(id) instead of profiles(id)
-- This fixes the critical issue where OAuth state cannot be saved because user.id from auth.users
-- doesn't match profiles.id in some cases.

-- Step 1: Drop the existing foreign key constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'oauth_states_user_id_fkey'
  ) THEN
    ALTER TABLE public.oauth_states 
    DROP CONSTRAINT oauth_states_user_id_fkey;
  END IF;
END $$;

-- Step 2: Add new foreign key constraint to auth.users
ALTER TABLE public.oauth_states
ADD CONSTRAINT oauth_states_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Update the RLS policies to work with auth.users
-- Note: The existing policies should work, but let's make sure they're correct
-- Drop existing policies if they reference profiles incorrectly
DROP POLICY IF EXISTS "Users can view their own oauth states" ON public.oauth_states;
DROP POLICY IF EXISTS "Users can insert their own oauth states" ON public.oauth_states;
DROP POLICY IF EXISTS "Users can update their own oauth states" ON public.oauth_states;
DROP POLICY IF EXISTS "Users can delete their own oauth states" ON public.oauth_states;

-- Recreate policies with correct auth.uid() check
CREATE POLICY "Users can view their own oauth states"
  ON public.oauth_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own oauth states"
  ON public.oauth_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own oauth states"
  ON public.oauth_states FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own oauth states"
  ON public.oauth_states FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON CONSTRAINT oauth_states_user_id_fkey ON public.oauth_states 
IS 'Foreign key to auth.users(id) - matches user.id from supabase.auth.getUser()';

