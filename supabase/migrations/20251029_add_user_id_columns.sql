-- Migration: Add user_id columns to gmb_locations and gmb_reviews tables
-- Created: 2025-10-29
-- Description: This migration adds user_id foreign key columns to enable multi-user support

-- Step 1: Add user_id column to gmb_locations table
ALTER TABLE gmb_locations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add user_id column to gmb_reviews table
ALTER TABLE gmb_reviews
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gmb_locations_user_id ON gmb_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_user_id ON gmb_reviews(user_id);

-- Step 4: Update existing rows to set user_id (if you have existing data)
-- Note: You'll need to manually update this query based on your actual user data
-- Example: UPDATE gmb_locations SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
-- Example: UPDATE gmb_reviews SET user_id = 'your-user-uuid' WHERE user_id IS NULL;

COMMENT ON COLUMN gmb_locations.user_id IS 'Foreign key to auth.users table - owner of this location';
COMMENT ON COLUMN gmb_reviews.user_id IS 'Foreign key to auth.users table - owner of this review';
