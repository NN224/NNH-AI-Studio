-- Migration: Add missing columns to gmb_accounts table
-- Created: 2025-11-04
-- Description: Adds email and google_account_id columns needed by OAuth callback

-- Add email column to store the Google account email
ALTER TABLE public.gmb_accounts 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add google_account_id column to store the Google user ID
ALTER TABLE public.gmb_accounts 
ADD COLUMN IF NOT EXISTS google_account_id TEXT;

-- Add index for better performance when querying by email
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_email ON public.gmb_accounts(email);

-- Add index for google_account_id
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_google_id ON public.gmb_accounts(google_account_id);

-- Add comment for documentation
COMMENT ON COLUMN public.gmb_accounts.email IS 'Google account email address';
COMMENT ON COLUMN public.gmb_accounts.google_account_id IS 'Google user ID from OAuth userinfo';
